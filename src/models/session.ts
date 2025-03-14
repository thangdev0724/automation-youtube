// src/models/session.ts
import { Action, ISessionConfig } from "../types/config";
import { generateHTMLReport } from "../utils/helper";
import { logger } from "../utils/logger";
// src/utils/enhanced-logger.ts
import fs from "fs";
import path from "path";

interface IRandom {
  configValue: number;
  configName: string;
  actualValue: number;
  result: boolean;
}

interface IError {
  message: string;
  stack?: string;
  source: string;
}

interface IAction {
  action: Action;
  source: string;
  data?: any;
}

interface IState {
  stateFrom: string;
  stateTo: string;
}
export class Session {
  private sessionId: string;
  private accountId?: string;
  public readonly startTime: Date;

  private videosWatched: number = 0;

  private searchesPerformed: number = 0;

  private lastActivityTime: Date;

  // Các giới hạn phiên
  private readonly sessionDuration: number;
  private readonly maxVideos: number;
  private readonly idleTimeout: number;

  private interactions = {
    likes: 0,
    comments: 0,
    subscribes: 0,
  };

  private summarize = {
    random: [] as IRandom[],
    error: [] as IError[],
    stateTransition: [] as IState[],
    activities: [] as IAction[],
  };

  constructor(config: ISessionConfig) {
    this.sessionId = `accounnt-${config.accountId}-session-${Date.now()}`;
    this.startTime = new Date();
    this.lastActivityTime = new Date();
    this.accountId = config.accountId;

    this.sessionDuration = config.sessionDuration;
    this.maxVideos = config.maxVideos;
    this.idleTimeout = config.idleTimeout;

    logger.info("Session initialized", {
      startTime: this.startTime.toISOString(),
      sessionDuration: this.sessionDuration,
      maxVideos: this.maxVideos,
      idleTimeout: this.idleTimeout,
    });
  }

  /**
   * Cập nhật thời gian hoạt động
   */
  updateActivity(): void {
    this.lastActivityTime = new Date();
    logger.debug("Activity updated", {
      lastActivityTime: this.lastActivityTime.toISOString(),
    });
  }

  /**
   * Tăng số lượng video đã xem
   */
  incrementVideosWatched(): void {
    this.videosWatched++;
    logger.info("Video watched", { count: this.videosWatched });
  }

  /**
   * Tăng số lượng tìm kiếm đã thực hiện
   */
  incrementSearches(): void {
    this.searchesPerformed++;
    logger.info("Search performed", { count: this.searchesPerformed });
  }

  /**
   * Ghi nhận tương tác
   */
  recordInteraction(type: "likes" | "comments" | "subscribes"): void {
    this.interactions[type]++;
    logger.info(`Interaction recorded: ${type}`, {
      count: this.interactions[type],
      totalInteractions: this.getTotalInteractions(),
    });
  }

  recordRandom(configValue: number, configName: string, actualValue: number) {
    this.summarize.random.push({
      configValue,
      configName,
      actualValue,
      result: actualValue <= configValue,
    });
  }

  recordError(error: any, stack: string, source: string) {
    this.summarize.error.push({
      source,
      message: error,
      stack,
    });
  }

  recordActivities(action: Action, source: string, data?: any) {
    this.summarize.activities.push({
      action,
      source,
      data,
    });
  }

  recordStateTransition(stateFrom: string, stateTo: string) {
    this.summarize.stateTransition.push({
      stateFrom,
      stateTo,
    });
  }

  /**
   * Lấy tổng số tương tác
   */
  getTotalInteractions(): number {
    return (
      this.interactions.likes +
      this.interactions.comments +
      this.interactions.subscribes
    );
  }

  /**
   * Lấy tất cả thông tin tương tác
   */
  getInteractions() {
    return { ...this.interactions };
  }

  /**
   * Tính thời gian phiên đã trôi qua (phút)
   */
  getSessionDuration(): number {
    return (new Date().getTime() - this.startTime.getTime()) / (60 * 1000);
  }

  /**
   * Tính thời gian không hoạt động (phút)
   */
  getIdleTime(): number {
    return (
      (new Date().getTime() - this.lastActivityTime.getTime()) / (60 * 1000)
    );
  }

  /**
   * Lấy số lượng video đã xem
   */
  getVideosWatched(): number {
    return this.videosWatched;
  }

  /**
   * Lấy số lượng tìm kiếm đã thực hiện
   */
  getSearchesPerformed(): number {
    return this.searchesPerformed;
  }

  getAccountId(): string | undefined {
    return this.accountId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Kiểm tra giới hạn phiên
   * Trả về thông tin nếu vượt quá giới hạn
   */
  checkLimits(): { exceedsLimit: boolean; reason?: string } {
    const sessionDuration = this.getSessionDuration();
    const idleTime = this.getIdleTime();

    // Kiểm tra thời lượng phiên
    if (sessionDuration >= this.sessionDuration) {
      logger.info("Session duration limit exceeded", {
        current: sessionDuration,
        limit: this.sessionDuration,
      });
      return { exceedsLimit: true, reason: "duration" };
    }

    // Kiểm tra số lượng video
    if (this.videosWatched >= this.maxVideos) {
      logger.info("Video count limit exceeded", {
        current: this.videosWatched,
        limit: this.maxVideos,
      });
      return { exceedsLimit: true, reason: "videoCount" };
    }

    // Kiểm tra thời gian không hoạt động
    if (idleTime >= this.idleTimeout) {
      logger.info("Idle timeout exceeded", {
        current: idleTime,
        limit: this.idleTimeout,
      });
      return { exceedsLimit: true, reason: "idle" };
    }

    // Tất cả giới hạn đều trong phạm vi cho phép
    return { exceedsLimit: false };
  }

  saveLogs() {}

  /**
   * Save the HTML report to a file
   */
  saveHTMLReport(): string {
    const htmlContent = {
      ...this.summarize,
      summary: this.generateSessionSummary(),
    };

    const html = generateHTMLReport(htmlContent);

    const reportFilename = `${this.sessionId}_report.html`;
    const logDirectory = path.join(process.cwd(), "logs", "reports");
    const reportPath = path.join(logDirectory, reportFilename);
    fs.writeFileSync(reportPath, html);
    logger.info(`HTML report saved to: ${reportPath}`);

    return reportPath;
  }

  /**
   * Tạo báo cáo tóm tắt phiên
   */
  generateSessionSummary() {
    const endTime = new Date();
    const sessionDurationMs = endTime.getTime() - this.startTime.getTime();
    const sessionDurationMinutes = sessionDurationMs / (60 * 1000);

    return {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: {
        ms: sessionDurationMs,
        minutes: sessionDurationMinutes,
      },
      videosWatched: this.videosWatched,
      searchesPerformed: this.searchesPerformed,
      interactions: {
        ...this.interactions,
        total: this.getTotalInteractions(),
      },
    };
  }
}
