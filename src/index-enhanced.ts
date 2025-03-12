// src/index-enhanced.ts
import * as dotenv from "dotenv";
import { getConfig } from "./config/sheets";
import { Session } from "./models/session";
import {
  IChannelConfig,
  IDetermineActionConfig,
  IHomeStateConfig,
  ISearchStateConfig,
  IWatchVideoConfig,
} from "./types/config";
import { ISessionConfig } from "./types/session";
import enhancedLogger from "./utils/enhanced-logger";
import { logger } from "./utils/logger";

// Import enhanced controllers instead of the original ones
import {
  EnhancedBrowserManager,
  EnhancedChannelController,
  EnhancedHomeController,
  EnhancedSearchController,
  EnhancedVideoController,
} from "./controllers/enhanced";

// Import enhanced random functions and monkey-patching
import { randomDelay } from "./utils/enhanced-random";
import {
  restoreOriginalFunctions,
  setupMonkeyPatching,
} from "./utils/monkey-patch";
import { checkProbability } from "./utils/probability-helper";

// Import logging utilities
import {
  generateReport,
  logAction,
  logConfig,
  logSessionInfo,
  saveRawLogs,
} from "./utils/state-logger";

dotenv.config();
// Các controller toàn cục
let browserManager: EnhancedBrowserManager;
let session: Session;
let homeController: EnhancedHomeController;
let searchController: EnhancedSearchController;
let videoController: EnhancedVideoController;
let channelController: EnhancedChannelController;

// các cấu hình cần load
let searchConfig: ISearchStateConfig;
let videoConfig: IWatchVideoConfig;
let homeConfig: IHomeStateConfig;
let loadConfig: ISessionConfig;
let navigationConfig: IDetermineActionConfig;
let channelConfig: IChannelConfig;

/**
 * Xử lý việc chuyển sang xem video
 */
async function handleWatchVideo(
  videoTitle: string,
  source: string
): Promise<void> {
  logAction("handleWatchVideo", { videoTitle, source });
  logger.info(`Watching video: ${videoTitle || "Unknown"} from ${source}`);

  // Gọi VideoController để xem video
  const watchResult = await videoController.watchVideo(session, videoConfig);

  // Xử lý kết quả từ việc xem video
  if (
    watchResult.action === "videoCompleted" ||
    watchResult.action === "videoPartiallyWatched"
  ) {
    // Nếu cho phép tương tác
    if (watchResult.data?.allowInteraction) {
      // Quyết định tương tác
      const interactionResult = await videoController.decideInteractions(
        session,
        videoConfig,
        watchResult.data.videoInfo
      );

      logAction("videoInteractions", {
        liked: interactionResult.liked,
        commented: interactionResult.commented,
        subscribed: interactionResult.subscribed,
      });

      logger.info("Interaction results:", {
        liked: interactionResult.liked,
        commented: interactionResult.commented,
        subscribed: interactionResult.subscribed,
      });

      // Quyết định hành động tiếp theo
      const nextAction = await videoController.decideNextAction(
        session,
        navigationConfig,
        watchResult.data.videoInfo
      );

      // Chuyển đến hành động tiếp theo
      await handleNextAction(nextAction);
    } else {
      logAction("noInteraction", { reason: "not watched enough" });
      logger.info("Video was not watched enough for interactions");
      // Quay lại trang chủ
      await homeController.navigateToHome();
      await handleHomePage();
    }
  } else if (watchResult.action === "endSession") {
    logAction("endSession", { reason: watchResult.data?.reason });
    logger.info(
      `Session ended while watching video due to: ${
        watchResult.data?.reason || "unknown reason"
      }`
    );
  } else if (watchResult.action === "error") {
    enhancedLogger.logError("Video watching error", watchResult.data?.error);
    logger.error("Error occurred during video watching", {
      error: watchResult.data?.error,
    });
    // Quay lại trang chủ khi gặp lỗi
    await homeController.navigateToHome();
  }
}

/**
 * Xử lý việc chuyển sang tìm kiếm
 */
async function handleSearch(): Promise<void> {
  logAction("handleSearch", null);
  logger.info("Performing search");

  await searchController.navigateToSearch();
  const searchResult = await searchController.performSearch(
    session,
    searchConfig
  );

  logAction("searchCompleted", {
    action: searchResult.action,
    data: searchResult.data,
  });

  logger.info("Search completed with result:", {
    action: searchResult.action,
    data: searchResult.data,
  });

  // Xử lý kết quả tìm kiếm
  await handleNextAction(searchResult);
}

/**
 * Xử lý việc chuyển sang trang chủ
 */
async function handleHomePage(): Promise<void> {
  logAction("handleHomePage", null);
  logger.info("Navigating to home page");
  await homeController.navigateToHome();
  const browseResult = await homeController.browseHomePage(session, homeConfig);

  logAction("homeBrowsingCompleted", {
    action: browseResult.action,
    data: browseResult.data,
  });

  logger.info("Home browsing completed with result:", {
    action: browseResult.action,
    data: browseResult.data,
  });

  // Xử lý kết quả duyệt trang chủ
  await handleNextAction(browseResult);
}

// Thêm hàm xử lý viewChannel
async function handleViewChannel(channelData: {
  channelUrl?: string;
  channelName?: string;
}): Promise<void> {
  logAction("handleViewChannel", channelData);
  logger.info(`Viewing channel: ${channelData.channelName || "Unknown"}`);

  const channelResult = await channelController.browseChannel(
    session,
    channelConfig,
    channelData
  );

  logAction("channelBrowsingCompleted", {
    action: channelResult.action,
    data: channelResult.data,
  });

  logger.info("Channel browsing completed with result:", {
    action: channelResult.action,
    data: channelResult.data,
  });

  // Xử lý kết quả từ việc duyệt kênh
  await handleNextAction(channelResult);
}

/**
 * Hàm xử lý hành động tiếp theo dựa trên kết quả từ controller
 */
async function handleNextAction(actionResult: {
  action: string;
  data?: any;
}): Promise<void> {
  // Cập nhật thời gian hoạt động
  session.updateActivity();

  // Log the next action decision
  logAction("nextAction", {
    action: actionResult.action,
    data: actionResult.data,
  });

  // Kiểm tra giới hạn phiên
  const limits = session.checkLimits();
  if (limits.exceedsLimit) {
    logAction("sessionLimitExceeded", { reason: limits.reason });
    logger.info(`Session limit exceeded: ${limits.reason}`);
    return; // Kết thúc phiên
  }

  // Xử lý action
  switch (actionResult.action) {
    case "watchVideo":
      await handleWatchVideo(
        actionResult.data?.videoTitle || "Unknown",
        actionResult.data?.source || "unknown"
      );
      break;

    case "search":
      await handleSearch();
      break;

    case "goToHome": {
      await handleHomePage();
      break;
    }
    case "endHomeBrowsing": {
      logAction("endHomeBrowsing");

      if (
        checkProbability(
          loadConfig.endHomeBrowsingToSearch,
          "AfterHomeBrowsingDecision",
          "search",
          {
            location: "handleNextAction",
          }
        )
      ) {
        logger.info("Home browsing ended, switching to search");
        await handleSearch();
      } else if (
        checkProbability(
          loadConfig.endHomeBrowsingToBrowsing,
          "AfterHomeBrowsingDecision",
          "goToHome",
          {
            location: "handleNextAction",
          }
        )
      ) {
        logger.info("Home browsing ended, refreshing home page");
        await handleHomePage();
      } else if (
        checkProbability(
          loadConfig.endHomeBrowsingToEnd,
          "AfterHomeBrowsingDecision",
          "endSession",
          {
            location: "handleNextAction",
          }
        )
      ) {
        logger.info("Home browsing ended, ending session");
        return; // Kết thúc phiên
      }
      break;
    }

    case "finishSearch":
      if (
        checkProbability(
          loadConfig.finishSearchToHome,
          "AfterSearchDecision",
          "returnToHome",
          {
            location: "handleNextAction",
          }
        )
      ) {
        logAction("decideAfterSearch", { decision: "goHome", probability: 70 });
        logger.info("Search completed, returning to home page");
        await handleHomePage();
      } else if (
        checkProbability(
          loadConfig.finishSearchToSearch,
          "AfterSearchDecision",
          "returnToHome",
          {
            location: "handleNextAction",
          }
        )
      ) {
        logAction("decideAfterSearch", {
          decision: "newSearch",
          probability: 30,
        });
        logger.info("Search completed, starting a new search");
        await handleSearch();
      }
      break;

    case "viewChannel":
      logAction("viewChannel", {
        channelName: actionResult.data?.channelName || "Unknown",
      });
      logger.info(
        `Would view channel: ${actionResult.data?.channelName || "Unknown"}`
      );
      await handleViewChannel(actionResult.data);
      break;

    case "endSession":
      logAction("endSession", {
        reason: actionResult.data?.reason || "unknown",
      });
      logger.info(
        `Session ended due to: ${actionResult.data?.reason || "unknown reason"}`
      );
      break;

    case "error":
      enhancedLogger.logError("General error", actionResult.data?.error);
      logger.error("Error occurred", { error: actionResult.data?.error });
      // Quay về trang chủ khi gặp lỗi
      await handleHomePage();
      break;

    default:
      logAction("unknownAction", { action: actionResult.action });
      logger.info(`Unknown action: ${actionResult.action}, returning to home`);
      await handleHomePage();
  }
}

async function main() {
  try {
    // Setup monkey patching to capture all random values
    setupMonkeyPatching();

    logAction("startSession", { time: new Date().toISOString() });
    logger.info("Starting YouTube automation session");

    // Load configurations
    loadConfig = await getConfig("AppConfig");
    logConfig("AppConfig", loadConfig);

    const searchConfigLoad = await getConfig("Search");
    searchConfigLoad.searchKeywords =
      searchConfigLoad.searchKeywords &&
      searchConfigLoad.searchKeywords.split(",");
    searchConfig = searchConfigLoad;
    logConfig("Search", searchConfig);

    homeConfig = await getConfig("Home");
    logConfig("Home", homeConfig);

    videoConfig = await getConfig("Video");
    logConfig("Video", videoConfig);

    navigationConfig = await getConfig("NavigationDecision");
    logConfig("NavigationDecision", navigationConfig);

    channelConfig = await getConfig("Channel");
    logConfig("Channel", channelConfig);

    logger.info("Config loaded successfully");

    // 1. Initialize session
    session = new Session(loadConfig);
    console.log(session.getSessionDuration(), "========= SESION =>>>>>>>");
    console.log(loadConfig.sessionDuration, "========= SESION =>>>>>>>");
    logSessionInfo({
      sessionStarted: true,
      startTime: session.startTime,
      sessionDuration: loadConfig.sessionDuration,
      maxVideos: loadConfig.maxVideos,
      idleTimeout: loadConfig.idleTimeout,
    });
    logger.info("Session initialized successfully");

    // 2. Setup browser - use enhanced browser manager
    browserManager = EnhancedBrowserManager.getInstance();
    logger.info("Browser manager initialized");

    // 3. Launch browser and create page
    await browserManager.launchPersistent();
    logAction("browserLaunched");
    logger.info("Browser launched successfully");

    // 4. Initialize enhanced controllers
    homeController = new EnhancedHomeController();
    searchController = new EnhancedSearchController();
    videoController = new EnhancedVideoController();
    channelController = new EnhancedChannelController();
    logAction("controllersInitialized");
    logger.info("Controllers initialized");

    // 5. Bắt đầu từ trang chủ
    await handleHomePage();

    // 6. Generate session summary
    const summary = session.generateSessionSummary();
    logSessionInfo({ sessionSummary: summary });
    logger.info("Session summary", { summary });

    // 7. Take a final screenshot
    await browserManager.saveScreenshot("final_state");

    // 8. Generate HTML report
    const reportPath = generateReport();
    logger.info(`HTML report generated at: ${reportPath}`);

    // 9. Save raw logs
    const logsPath = saveRawLogs();
    logger.info(`Raw logs saved at: ${logsPath}`);

    // 10. Close browser
    await randomDelay(5000, 10000, "Session", "endingDelay"); // Wait a bit before closing
    await browserManager.close();
    logAction("browserClosed");
    logger.info("Browser closed");

    logAction("sessionCompleted", {
      success: true,
      duration: (new Date().getTime() - session.startTime.getTime()) / 1000,
    });
    logger.info("Session completed successfully");

    // Display report path in console
    console.log("\n==================================");
    console.log(`Session Report: ${reportPath}`);
    console.log(`Raw Logs: ${logsPath}`);
    console.log("==================================\n");

    // Clean up
    restoreOriginalFunctions();
  } catch (error) {
    enhancedLogger.logError("Fatal error in main process", error);
    logger.error("Error in main process", { error });

    // Generate report even on error
    try {
      const reportPath = generateReport();
      logger.info(`HTML report generated at: ${reportPath}`);
      console.log(`Error Report: ${reportPath}`);
    } catch (reportError) {
      console.log(reportError);
      logger.error("Failed to generate report", { error: reportError });
    }

    // Ensure browser is closed on error
    try {
      await browserManager.close();
      logAction("browserClosedOnError");
    } catch (closeError) {
      enhancedLogger.logError("Error closing browser", closeError);
      logger.error("Error closing browser", { error: closeError });
    }

    // Clean up
    restoreOriginalFunctions();

    process.exit(1);
  }
}

// Run the main function
main();
