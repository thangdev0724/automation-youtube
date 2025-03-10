// src/states/youtube-machine.ts
import { createMachine, assign } from "xstate";
import { Session } from "../models/session";
import { logger } from "../utils/logger";
import { probabilityCheck } from "../utils/random";

// Context cho máy trạng thái
export interface YouTubeContext {
  session: Session;
  config: any;
  videoWatchCount: number;
  searchCount: number;
  lastSearchQuery?: string;
  currentVideoURL?: string;
  currentChannelURL?: string;
  endReason?: string;
  lastAction?: string;
  lastActionData?: any;
}

// Tập các sự kiện có thể xảy ra
type YouTubeEvent =
  | { type: "START" }
  | {
      type: "ACTION_COMPLETE";
      data: { action: string; nextState?: string; data?: any };
    }
  | { type: "SESSION_LIMIT_EXCEEDED"; reason: string }
  | { type: "END_SESSION" };

// Định nghĩa máy trạng thái
export const youtubeMachine = createMachine<YouTubeContext, YouTubeEvent>(
  {
    id: "youtubeAutomation",
    initial: "initializing",
    context: {
      session: {} as Session,
      config: {} as any,
      videoWatchCount: 0,
      searchCount: 0,
    },
    states: {
      initializing: {
        on: {
          START: {
            target: "browsing",
            actions: assign({
              session: (_, event) => new Session(_.config),
            }),
          },
        },
      },
      browsing: {
        initial: "checkingLimits",
        states: {
          checkingLimits: {
            always: [
              {
                target: "homePage",
                cond: "withinLimits",
              },
              {
                target: "#youtubeAutomation.terminating",
                actions: assign({
                  endReason: (context) => {
                    const limits = context.session.checkLimits();
                    return limits.reason || "unknown";
                  },
                }),
              },
            ],
          },
          homePage: {
            invoke: {
              src: "browseHomePage",
              onDone: {
                target: "decidingNext",
                actions: assign({
                  lastAction: (_, event) => event.data.action,
                  lastActionData: (_, event) => event.data.data,
                }),
              },
            },
          },
          search: {
            invoke: {
              src: "performSearch",
              onDone: {
                target: "decidingNext",
                actions: [
                  assign({
                    lastAction: (_, event) => event.data.action,
                    lastActionData: (_, event) => event.data.data,
                    searchCount: (context) => context.searchCount + 1,
                  }),
                  "logSearch",
                ],
              },
            },
          },
          watchingVideo: {
            invoke: {
              src: "watchVideo",
              onDone: {
                target: "decidingInteractions",
                actions: assign({
                  lastAction: (_, event) => event.data.action,
                  lastActionData: (_, event) => event.data.data,
                  videoWatchCount: (context) => context.videoWatchCount + 1,
                }),
              },
            },
          },
          browsingChannel: {
            invoke: {
              src: "browseChannel",
              onDone: {
                target: "decidingNext",
                actions: assign({
                  lastAction: (_, event) => event.data.action,
                  lastActionData: (_, event) => event.data.data,
                }),
              },
            },
          },
          decidingInteractions: {
            invoke: {
              src: "decideInteractions",
              onDone: {
                target: "decidingNext",
              },
            },
          },
          decidingNext: {
            always: [
              {
                target: "checkingLimits",
                cond: "shouldCheckLimits",
              },
              {
                target: "homePage",
                cond: "shouldGoToHome",
              },
              {
                target: "search",
                cond: "shouldGoToSearch",
              },
              {
                target: "watchingVideo",
                cond: "shouldWatchVideo",
              },
              {
                target: "browsingChannel",
                cond: "shouldBrowseChannel",
              },
              {
                target: "#youtubeAutomation.terminating",
                cond: "shouldEndSession",
                actions: assign({
                  endReason: () => "userDecision",
                }),
              },
            ],
          },
        },
      },
      terminating: {
        invoke: {
          src: "terminateSession",
          onDone: {
            target: "collectingStatistics",
          },
        },
      },
      collectingStatistics: {
        invoke: {
          src: "collectStatistics",
          onDone: {
            target: "completed",
          },
        },
      },
      completed: {
        type: "final",
        entry: "logSessionCompleted",
      },
    },
  },
  {
    guards: {
      withinLimits: (context) => {
        const limits = context.session.checkLimits();
        return !limits.exceedsLimit;
      },
      shouldCheckLimits: (context) => {
        // Kiểm tra limit sau mỗi hành động
        return true;
      },
      shouldGoToHome: (context) => {
        if (context.lastAction === "goToHome") return true;
        return context.lastAction === "search" && probabilityCheck(10);
      },
      shouldGoToSearch: (context) => {
        if (context.lastAction === "search") return true;
        if (context.lastAction === "homePage" && probabilityCheck(40))
          return true;
        if (context.lastAction === "browseChannel" && probabilityCheck(15))
          return true;
        if (context.lastAction === "watchVideo" && probabilityCheck(45))
          return true;
        return false;
      },
      shouldWatchVideo: (context) => {
        if (context.lastAction === "watchVideo") return true;
        if (context.lastAction === "homePage" && probabilityCheck(60))
          return true;
        if (context.lastAction === "search" && probabilityCheck(90))
          return true;
        if (context.lastAction === "browseChannel" && probabilityCheck(70))
          return true;
        return false;
      },
      shouldBrowseChannel: (context) => {
        if (context.lastAction === "browseChannel") return true;
        if (context.lastAction === "watchVideo" && probabilityCheck(10))
          return true;
        return false;
      },
      shouldEndSession: (context) => {
        if (context.lastAction === "endSession") return true;
        if (context.lastAction === "watchVideo" && probabilityCheck(10))
          return true;
        return false;
      },
    },
    actions: {
      logSearch: (context) => {
        logger.info(`Performed search: ${context.lastSearchQuery}`);
      },
      logSessionCompleted: (context) => {
        logger.info("YouTube session completed", {
          videosWatched: context.videoWatchCount,
          searches: context.searchCount,
          duration: context.session.getSessionDuration(),
          reason: context.endReason,
        });
      },
    },
    services: {
      // Các services sẽ được implement trong file riêng
      browseHomePage: () => Promise.resolve({ action: "homePage" }),
      performSearch: () => Promise.resolve({ action: "search" }),
      watchVideo: () => Promise.resolve({ action: "watchVideo" }),
      browseChannel: () => Promise.resolve({ action: "browseChannel" }),
      decideInteractions: () => Promise.resolve(),
      terminateSession: () => Promise.resolve(),
      collectStatistics: () => Promise.resolve(),
    },
  }
);
