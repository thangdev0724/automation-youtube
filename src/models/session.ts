// src/models/session.ts
import { ISessionConfig } from "../types/session";
import { logger } from "../utils/logger";

export class Session {
  // Thời gian bắt đầu phiên
  public readonly startTime: Date;

  // Số lượng video đã xem
  private videosWatched: number = 0;

  // Số lượng tìm kiếm đã thực hiện
  private searchesPerformed: number = 0;

  // Thời gian hoạt động cuối cùng
  private lastActivityTime: Date;

  // Các giới hạn phiên
  private readonly sessionDuration: number; // minutes
  private readonly maxVideos: number;
  private readonly idleTimeout: number; // minutes

  // Các thông số khác
  private interactions = {
    likes: 0,
    comments: 0,
    subscribes: 0,
  };

  /**
   * Khởi tạo một phiên mới
   */
  constructor(config: ISessionConfig) {
    this.startTime = new Date();
    this.lastActivityTime = new Date();

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
      averageVideosPerMinute:
        this.videosWatched / (sessionDurationMinutes || 1),
      averageSearchesPerMinute:
        this.searchesPerformed / (sessionDurationMinutes || 1),
    };
  }
}
