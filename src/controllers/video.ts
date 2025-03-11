// src/controllers/video.ts
import { BrowserManager } from "./browser";
import { logger } from "../utils/logger";
import {
  randomDelay,
  probabilityCheck,
  randomInt,
  delay,
} from "../utils/random";
import { Session } from "../models/session";
import { Page } from "playwright";
import { IWatchVideoConfig } from "../types/config";

export class VideoController {
  private browserManager: BrowserManager;

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  /**
   * Xem video YouTube với các hành vi theo cấu hình
   * @param session Session hiện tại
   * @param config Cấu hình xác suất cho quá trình xem video
   */
  async watchVideo(
    session: Session,
    config: IWatchVideoConfig
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Starting to watch YouTube video");
      const page = await this.browserManager.getCurrentPage();

      // Cập nhật thời gian hoạt động của phiên
      session.updateActivity();

      // Tăng số lượng video đã xem
      session.incrementVideosWatched();

      // Lấy thông tin video
      const videoInfo = await this.getVideoInfo(page);
      logger.info(
        `Watching video: "${videoInfo.title}" by ${videoInfo.channelName}`
      );

      // 1. Xử lý quảng cáo
      await this.handleAds(page, config);

      // 2. Điều chỉnh âm lượng (nếu cần)
      if (probabilityCheck(config.adjustVolume)) {
        await this.adjustVolume(page);
      }

      // 3. Xem video
      const watchResult = await this.viewVideoContent(
        page,
        session,
        videoInfo,
        config
      );

      // Trả về kết quả xem video
      return watchResult;
    } catch (error) {
      logger.error("Error watching video", { error });
      await this.browserManager.saveScreenshot("video_error");
      return { action: "error", data: { error } };
    }
  }

  /**
   * Lấy thông tin của video đang xem
   */
  private async getVideoInfo(page: any): Promise<{
    title: string;
    channelName: string;
    channelUrl: string;
    duration: number; // seconds
    likes: number;
    views: string;
  }> {
    try {
      // Lấy tiêu đề video
      const title = await page.evaluate(() => {
        return (
          document
            .querySelector(
              "h1.title.style-scope.ytd-video-primary-info-renderer"
            )
            ?.textContent?.trim() || "Unknown"
        );
      });

      // Lấy tên kênh
      const channelName = await page.evaluate(() => {
        return (
          document.querySelector("#channel-name #text")?.textContent?.trim() ||
          "Unknown"
        );
      });

      // Lấy URL kênh
      const channelUrl = await page.evaluate(() => {
        const channelElement = document.querySelector("#channel-name a");
        return channelElement ? (channelElement as HTMLAnchorElement).href : "";
      });

      // Lấy thời lượng video
      const duration = await page.evaluate(() => {
        const timeText =
          document.querySelector(".ytp-time-duration")?.textContent;
        if (!timeText) return 300; // Default value

        const parts = timeText.split(":").map(Number);
        if (parts.length === 2) {
          // MM:SS format
          return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          // HH:MM:SS format
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 300; // Default
      });

      // Lấy số lượt like (nếu có thể)
      const likes = await page.evaluate(() => {
        const likeButton = document.querySelector(
          "ytd-toggle-button-renderer.ytd-menu-renderer button"
        );
        const likeText = likeButton?.getAttribute("aria-label");
        if (likeText) {
          const match = likeText.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }
        return 0;
      });

      // Lấy số lượt xem
      const views = await page.evaluate(() => {
        const viewCountText =
          document.querySelector(".view-count")?.textContent;
        return viewCountText || "Unknown views";
      });

      return { title, channelName, channelUrl, duration, likes, views };
    } catch (error) {
      logger.warn("Error getting video info", { error });
      return {
        title: "Unknown",
        channelName: "Unknown",
        channelUrl: "",
        duration: 300, // 5 minutes default
        likes: 0,
        views: "Unknown views",
      };
    }
  }

  /**
   * Xử lý quảng cáo trước hoặc trong video
   */
  private async handleAds(
    page: Page,
    config: IWatchVideoConfig
  ): Promise<void> {
    // Xác định có quảng cáo không theo xác suất
    const ads = await this.checkForAds(page);

    if (ads.hasAds) {
      logger.info("Advertisement detected");

      // Kiểm tra xem có nút skip quảng cáo không
      const skipButton = await page.$("#skip-button\\:2");
      if (skipButton && probabilityCheck(config.skipAd)) {
        // Đợi đủ thời gian để nút skip xuất hiện (thường là 5 giây)
        logger.info(`Waiting ${config.skipAdDelay}s to skip ad`);
        await randomDelay(
          config.skipAdDelay * 1000,
          (config.skipAdDelay + 1) * 1000
        );

        // Click nút skip
        await skipButton.click();
        logger.info("Ad skipped");
      } else {
        // Xem toàn bộ quảng cáo
        logger.info("Watching full advertisement");

        await delay(ads.duration);
      }
    } else {
      logger.info("No advertisement");
    }
  }

  private async checkForAds(page: Page): Promise<{
    hasAds: boolean;
    duration: number;
  }> {
    console.log("Đang kiểm tra quảng cáo...");
    const result = {
      hasAds: false,
      duration: 0,
    };
    await page.evaluate(() => {
      const el = document.querySelector(
        "#movie_player > div.video-ads.ytp-ad-module"
      );
      if (el && el?.hasChildNodes()) {
        const videoElement = document.querySelector(
          "#movie_player > div.html5-video-container > video"
        );
        const duration = videoElement
          ? (videoElement as HTMLVideoElement).duration
          : 0;
        result.duration = duration;
        result.hasAds = true;
      }
      console.log("Không có quảng cáo");
    });

    await randomDelay(1000, 3000);

    console.log("Kiểm tra quảng cáo kết thúc");

    return result;
  }

  /**
   * Điều chỉnh âm lượng
   */
  private async adjustVolume(page: any): Promise<void> {
    logger.info("Adjusting volume");

    // Quyết định tăng hay giảm âm lượng
    const increaseVolume = Math.random() > 0.5;

    // Số lần nhấn phím mũi tên lên/xuống
    const adjustCount = randomInt(1, 4);

    for (let i = 0; i < adjustCount; i++) {
      if (increaseVolume) {
        await page.keyboard.press("ArrowUp");
      } else {
        await page.keyboard.press("ArrowDown");
      }
      await randomDelay(300, 800);
    }
  }

  /**
   * Xem nội dung video với các hành vi ngẫu nhiên
   */
  private async viewVideoContent(
    page: Page,
    session: Session,
    videoInfo: any,
    config: any
  ): Promise<{ action: string; data?: any }> {
    logger.info("Viewing video content");

    // Quyết định xem bao nhiêu phần trăm video
    const watchPercentage = randomInt(
      config.minWatchPercentage,
      config.watchToEnd
    );
    const watchDuration = Math.floor(
      (videoInfo.duration * watchPercentage) / 100
    );

    logger.info(
      `Plan to watch ${watchPercentage}% (${watchDuration}s) of video`
    );

    // Thời gian đã xem
    let watchedTime = 0;

    // Xem video theo các đoạn
    while (watchedTime < watchDuration) {
      // Kiểm tra giới hạn phiên
      const limits = session.checkLimits();
      if (limits.exceedsLimit) {
        logger.info("Session limit exceeded while watching video", {
          reason: limits.reason,
        });
        return {
          action: "endSession",
          data: {
            reason: limits.reason,
            videoInfo,
            watchedSeconds: watchedTime,
            watchedPercentage: Math.round(
              (watchedTime / videoInfo.duration) * 100
            ),
          },
        };
      }

      // Cập nhật hoạt động
      session.updateActivity();

      // Đoạn xem liên tục
      const continuousWatchingSegment = Math.min(
        randomInt(10, 30),
        watchDuration - watchedTime
      );
      await randomDelay(
        continuousWatchingSegment * 1000,
        continuousWatchingSegment * 1000 + 1000
      );
      watchedTime += continuousWatchingSegment;

      // Quyết định hành vi tiếp theo dựa trên xác suất
      if (watchedTime < watchDuration) {
        // Tạo một mảng các hành vi có thể xảy ra và xác suất tương ứng
        const behaviors = [
          {
            name: "interestingSection",
            probability: config.interestingSection,
          },
          { name: "boringSection", probability: config.boringSection },
          { name: "tabInactive", probability: config.tabInactive },
          { name: "continueWatching", probability: config.continueWatching },
        ];

        // Chuẩn hóa xác suất để tổng = 100%
        const totalProbability = behaviors.reduce(
          (sum, b) => sum + b.probability,
          0
        );
        behaviors.forEach(
          (b) => (b.probability = (b.probability / totalProbability) * 100)
        );

        // Chọn hành vi
        let randomValue = Math.random() * 100;
        let cumulativeProbability = 0;
        let selectedBehavior = "continueWatching";

        for (const behavior of behaviors) {
          cumulativeProbability += behavior.probability;
          if (randomValue <= cumulativeProbability) {
            selectedBehavior = behavior.name;
            break;
          }
        }

        // Thực hiện hành vi đã chọn
        switch (selectedBehavior) {
          case "interestingSection":
            // Phát hiện đoạn hay
            await this.handleInterestingSection(page, config, watchedTime);
            break;

          case "boringSection":
            // Phát hiện đoạn chán
            const skipAmount = await this.handleBoringSection(page, config);
            watchedTime = Math.min(watchDuration, watchedTime + skipAmount);
            break;

          case "tabInactive":
            // Tab không hoạt động
            const tabInactiveResult = await this.handleTabInactive(
              session,
              config
            );
            if (tabInactiveResult.exceedsIdle) {
              return {
                action: "endSession",
                data: {
                  reason: "idle",
                  videoInfo,
                  watchedSeconds: watchedTime,
                  watchedPercentage: Math.round(
                    (watchedTime / videoInfo.duration) * 100
                  ),
                },
              };
            }
            break;

          case "continueWatching":
          default:
            // Tiếp tục xem bình thường
            break;
        }
      }
    }

    logger.info(
      `Video watched: ${watchedTime}s (${Math.round(
        (watchedTime / videoInfo.duration) * 100
      )}%)`
    );

    // Đã xem đủ tỷ lệ video tối thiểu để cân nhắc tương tác?
    if ((watchedTime / videoInfo.duration) * 100 >= config.minWatchPercentage) {
      return {
        action: "videoCompleted",
        data: {
          videoInfo,
          watchedSeconds: watchedTime,
          watchedPercentage: Math.round(
            (watchedTime / videoInfo.duration) * 100
          ),
          allowInteraction: true,
        },
      };
    } else {
      return {
        action: "videoPartiallyWatched",
        data: {
          videoInfo,
          watchedSeconds: watchedTime,
          watchedPercentage: Math.round(
            (watchedTime / videoInfo.duration) * 100
          ),
          allowInteraction: false,
        },
      };
    }
  }

  /**
   * Xử lý khi phát hiện đoạn hay
   */
  private async handleInterestingSection(
    page: Page,
    config: IWatchVideoConfig,
    currentTime: number
  ): Promise<void> {
    logger.info("Interesting part detected");

    // 50% xác suất tạm dừng, 50% xác suất tua lại
    if (Math.random() > 0.5) {
      // Tạm dừng
      logger.info(
        `Pausing video for ${config.pauseDuration}s at time ${currentTime}s`
      );

      await page.click(".ytp-play-button");
      await randomDelay(
        config.pauseDuration * 1000,
        (config.pauseDuration + 1) * 1000
      );

      // Tiếp tục phát
      await page.click(".ytp-play-button");
    } else {
      // Tua lại
      logger.info(
        `Rewinding video by ${config.rewindTime}s from time ${currentTime}s`
      );

      // Tùy thuộc vào số giây cần tua, nhấn phím Left Arrow nhiều lần
      // Mỗi lần nhấn Left Arrow tua lại 5 giây
      const presses = Math.ceil(config.rewindTime / 5);
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press("ArrowLeft");
        await randomDelay(100, 300);
      }
    }
  }

  /**
   * Xử lý khi phát hiện đoạn chán
   */
  private async handleBoringSection(
    page: any,
    config: IWatchVideoConfig
  ): Promise<number> {
    const skipAmount = config.skipTime;
    logger.info(`Boring part detected, skipping forward ${skipAmount}s`);

    // Tùy thuộc vào số giây cần tua, nhấn phím Right Arrow nhiều lần
    // Mỗi lần nhấn Right Arrow tua đi 5 giây
    const presses = Math.ceil(skipAmount / 5);
    for (let i = 0; i < presses; i++) {
      await page.keyboard.press("ArrowRight");
      await randomDelay(100, 300);
    }

    return skipAmount;
  }

  /**
   * Xử lý khi tab không hoạt động
   */
  private async handleTabInactive(
    session: Session,
    config: IWatchVideoConfig
  ): Promise<{ exceedsIdle: boolean }> {
    logger.info("Tab becomes inactive");

    // Thời gian không hoạt động (3-10 giây)
    const inactiveTime = randomInt(3000, 10000);
    await randomDelay(inactiveTime, inactiveTime + 500);

    // Kiểm tra xem có vượt quá thời gian không hoạt động tối đa không
    const idleCheck = session.checkLimits();
    if (idleCheck.exceedsLimit && idleCheck.reason === "idle") {
      logger.info("Idle timeout exceeded");
      return { exceedsIdle: true };
    }

    // Quay lại tab
    logger.info("Returning to video tab");
    session.updateActivity();
    return { exceedsIdle: false };
  }

  /**
   * Quyết định tương tác với video
   */
  async decideInteractions(
    session: Session,
    config: {
      likeVideo: number; // Tỷ lệ thực hiện like video
      commentVideo: number; // Tỷ lệ thực hiện bình luận video
      subscribeChannel: number; // Tỷ lệ thực hiện đăng ký kênh
      noInteraction: number; // Tỷ lệ không tương tác
      hoverLikeDelay: number; // Thời gian hover trước khi click like (giây)
      editComment: number; // Tỷ lệ chỉnh sửa bình luận
      completeComment: number; // Tỷ lệ hoàn thành bình luận không chỉnh sửa
      hoverSubscribeDelay: number; // Thời gian hover trước khi click subscribe (giây)
      enableNotifications: number; // Tỷ lệ bật thông báo sau khi đăng ký kênh
      skipNotifications: number; // Tỷ lệ không bật thông báo sau khi đăng ký kênh
    },
    videoInfo: any
  ): Promise<{
    liked: boolean;
    commented: boolean;
    subscribed: boolean;
  }> {
    try {
      logger.info("Deciding interactions for video");
      const page = await this.browserManager.getCurrentPage();

      const result = {
        liked: false,
        commented: false,
        subscribed: false,
      };

      // Cuộn xuống để hiển thị các nút tương tác
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      await randomDelay(1000, 2000);

      // 1. Like video
      if (probabilityCheck(config.likeVideo)) {
        result.liked = await this.performLikeVideo(page, config);
        if (result.liked) {
          session.recordInteraction("likes");
        }
      }

      // 2. Bình luận video
      if (probabilityCheck(config.commentVideo)) {
        result.commented = await this.performCommentVideo(
          page,
          config,
          videoInfo
        );
        if (result.commented) {
          session.recordInteraction("comments");
        }
      }

      // 3. Đăng ký kênh
      if (probabilityCheck(config.subscribeChannel)) {
        result.subscribed = await this.performSubscribeChannel(page, config);
        if (result.subscribed) {
          session.recordInteraction("subscribes");
        }
      }

      // Cuộn lên lại để xem video
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await randomDelay(1000, 2000);

      return result;
    } catch (error) {
      logger.error("Error deciding interactions", { error });
      return { liked: false, commented: false, subscribed: false };
    }
  }

  /**
   * Thực hiện like video
   */
  private async performLikeVideo(page: any, config: any): Promise<boolean> {
    try {
      logger.info("Attempting to like video");

      // Tìm nút like
      const likeButton = await page.$(
        '.ytd-toggle-button-renderer.style-scope.ytd-menu-renderer button[aria-label*="like"]'
      );

      if (!likeButton) {
        logger.warn("Like button not found");
        return false;
      }

      // Hover lên nút like
      await likeButton.hover();
      await randomDelay(
        config.hoverLikeDelay * 1000,
        (config.hoverLikeDelay + 1) * 1000
      );

      // Click nút like
      await likeButton.click();
      logger.info("Liked video successfully");

      await randomDelay(1000, 2000);
      return true;
    } catch (error) {
      logger.error("Error liking video", { error });
      return false;
    }
  }

  /**
   * Thực hiện bình luận video
   */
  private async performCommentVideo(
    page: any,
    config: any,
    videoInfo: any
  ): Promise<boolean> {
    try {
      logger.info("Attempting to comment on video");

      // Mẫu bình luận
      const comments = [
        "Great video!",
        "Thanks for sharing this",
        "Very interesting content",
        "I really enjoyed this video",
        "This was helpful",
        "Nice explanation",
        "Great content, keep it up!",
        "Looking forward to more videos like this",
        "Just discovered your channel, love your content",
        "This was exactly what I was looking for",
      ];

      // Cuộn xuống khu vực bình luận
      await page.evaluate(() => {
        document
          .querySelector("#comments")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      await randomDelay(2000, 3000);

      // Click vào ô bình luận
      const commentBox = await page.$("#placeholder-area");
      if (!commentBox) {
        logger.warn("Comment box not found");
        return false;
      }

      await commentBox.click();
      await randomDelay(1000, 2000);

      // Chọn bình luận ngẫu nhiên
      const commentText = comments[randomInt(0, comments.length - 1)];

      // Nhập bình luận với tốc độ giống người thật
      for (const char of commentText) {
        await page.keyboard.type(char, { delay: randomInt(50, 150) });
      }

      // Xác suất chỉnh sửa bình luận
      if (probabilityCheck(config.editComment)) {
        logger.info("Editing comment before posting");

        // Thêm một cụm từ vào cuối
        const additions = [
          "! :)",
          ". Thanks!",
          "! Subscribed.",
          ". Very helpful.",
          "! Great work.",
        ];

        const addition = additions[randomInt(0, additions.length - 1)];
        await randomDelay(1000, 2000);

        for (const char of addition) {
          await page.keyboard.type(char, { delay: randomInt(50, 150) });
        }
      }

      await randomDelay(1000, 2000);

      // Nhấn nút đăng bình luận
      const submitButton = await page.$("#submit-button");
      if (!submitButton) {
        logger.warn("Comment submit button not found");
        return false;
      }

      await submitButton.click();
      logger.info("Posted comment successfully");

      await randomDelay(2000, 4000);
      return true;
    } catch (error) {
      logger.error("Error commenting on video", { error });
      return false;
    }
  }

  /**
   * Thực hiện đăng ký kênh
   */
  private async performSubscribeChannel(
    page: any,
    config: any
  ): Promise<boolean> {
    try {
      logger.info("Attempting to subscribe to channel");

      // Kiểm tra xem đã đăng ký chưa
      const isSubscribed = await page.evaluate(() => {
        const subscribeButton = document.querySelector(
          "#subscribe-button paper-button, #subscribe-button button"
        );
        if (!subscribeButton) return true; // Không tìm thấy nút đăng ký

        return (
          subscribeButton.getAttribute("subscribed") === "" ||
          subscribeButton.getAttribute("aria-label")?.includes("Unsubscribe")
        );
      });

      if (isSubscribed) {
        logger.info("Already subscribed to channel");
        return false;
      }

      // Tìm nút đăng ký
      const subscribeButton = await page.$(
        "#subscribe-button paper-button, #subscribe-button button"
      );
      if (!subscribeButton) {
        logger.warn("Subscribe button not found");
        return false;
      }

      // Hover lên nút đăng ký
      await subscribeButton.hover();
      await randomDelay(
        config.hoverSubscribeDelay * 1000,
        (config.hoverSubscribeDelay + 1) * 1000
      );

      // Click nút đăng ký
      await subscribeButton.click();
      logger.info("Subscribed to channel successfully");

      await randomDelay(1000, 2000);

      // Xử lý hộp thoại thông báo (nếu xuất hiện)
      const hasNotificationDialog = await page.evaluate(() => {
        return document.querySelector('paper-dialog[role="dialog"]') !== null;
      });

      if (hasNotificationDialog) {
        // Xác suất bật thông báo
        if (probabilityCheck(config.enableNotifications)) {
          logger.info("Enabling notifications");

          // Chọn một tùy chọn thông báo ngẫu nhiên
          const options = [
            "#items ytd-menu-service-item-renderer:nth-child(1)", // Tất cả
            "#items ytd-menu-service-item-renderer:nth-child(2)", // Tùy chỉnh
            "#items ytd-menu-service-item-renderer:nth-child(3)",
          ]; // Chỉ thông báo quan trọng

          const selectedOption = options[randomInt(0, options.length - 1)];
          await page.click(selectedOption);
        } else {
          // Không bật thông báo, click nút "không"
          logger.info("Skipping notifications");
          await page.click("#items ytd-menu-service-item-renderer:last-child");
        }

        await randomDelay(1000, 2000);
      }

      return true;
    } catch (error) {
      logger.error("Error subscribing to channel", { error });
      return false;
    }
  }

  /**
   * Quyết định hành động tiếp theo sau khi xem video
   */
  async decideNextAction(
    session: Session,
    config: {
      watchSuggested: number; // Tỷ lệ chọn video đề xuất
      backToSearchResults: number; // Tỷ lệ quay lại kết quả tìm kiếm
      newSearch: number; // Tỷ lệ thực hiện tìm kiếm mới
      viewCurrentChannel: number; // Tỷ lệ xem kênh hiện tại
      endSessionEarly: number; // Tỷ lệ kết thúc phiên ngay
    },
    videoInfo: any
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Deciding next action after video");
      const page = await this.browserManager.getCurrentPage();

      // Kiểm tra giới hạn phiên
      const limits = session.checkLimits();
      if (limits.exceedsLimit) {
        logger.info("Session limit exceeded after watching video", {
          reason: limits.reason,
        });
        return {
          action: "endSession",
          data: { reason: limits.reason },
        };
      }

      // Cập nhật thời gian hoạt động
      session.updateActivity();

      // Tạo một mảng các hành động có thể và xác suất tương ứng
      const actions = [
        { name: "watchSuggested", probability: config.watchSuggested },
        {
          name: "backToSearchResults",
          probability: config.backToSearchResults,
        },
        { name: "newSearch", probability: config.newSearch },
        { name: "viewCurrentChannel", probability: config.viewCurrentChannel },
        { name: "endSessionEarly", probability: config.endSessionEarly },
      ];

      // Chuẩn hóa xác suất để tổng = 100%
      const totalProbability = actions.reduce(
        (sum, a) => sum + a.probability,
        0
      );
      actions.forEach(
        (a) => (a.probability = (a.probability / totalProbability) * 100)
      );

      // Chọn hành động
      let randomValue = Math.random() * 100;
      let cumulativeProbability = 0;
      let selectedAction = "watchSuggested";

      for (const action of actions) {
        cumulativeProbability += action.probability;
        if (randomValue <= cumulativeProbability) {
          selectedAction = action.name;
          break;
        }
      }

      // Thực hiện hành động đã chọn
      switch (selectedAction) {
        case "watchSuggested":
          return await this.handleWatchSuggestedVideo(page);

        case "backToSearchResults":
          return await this.handleBackToSearchResults(page);

        case "newSearch":
          return await this.handleNewSearch(page);

        case "viewCurrentChannel":
          return await this.handleViewCurrentChannel(page, videoInfo);

        case "endSessionEarly":
          logger.info("Deciding to end session early");
          return {
            action: "endSession",
            data: { reason: "userDecision" },
          };

        default:
          // Mặc định chọn video đề xuất
          return await this.handleWatchSuggestedVideo(page);
      }
    } catch (error) {
      logger.error("Error deciding next action", { error });
      return { action: "error", data: { error } };
    }
  }

  /**
   * Xử lý việc chọn video đề xuất
   */
  private async handleWatchSuggestedVideo(
    page: any
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Selecting a suggested video");

      // Cuộn xuống để xem các video đề xuất
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      await randomDelay(1000, 2000);

      // Lấy danh sách video đề xuất
      const suggestedVideos = await page.$$("ytd-compact-video-renderer");

      if (suggestedVideos.length === 0) {
        logger.warn("No suggested videos found");
        return { action: "newSearch" };
      }

      // Chọn một video ngẫu nhiên
      const randomIndex = randomInt(0, Math.min(suggestedVideos.length - 1, 5)); // Ưu tiên 5 video đầu tiên
      const selectedVideo = suggestedVideos[randomIndex];

      // Scroll đến video
      await selectedVideo.scrollIntoViewIfNeeded();
      await randomDelay(500, 1500);

      // Lấy tiêu đề video
      const videoTitle = await selectedVideo
        .$eval(
          "span#video-title",
          (el: HTMLElement) => el.textContent?.trim() || "Unknown"
        )
        .catch(() => "Unknown");

      // Hover và click
      await selectedVideo.hover();
      await randomDelay(1000, 2000);
      await selectedVideo.click();

      logger.info(`Selected suggested video: ${videoTitle}`);
      await randomDelay(2000, 4000);

      return {
        action: "watchVideo",
        data: {
          source: "suggested",
          videoTitle,
        },
      };
    } catch (error) {
      logger.error("Error selecting suggested video", { error });
      return { action: "newSearch" };
    }
  }

  /**
   * Xử lý việc quay lại kết quả tìm kiếm
   */
  private async handleBackToSearchResults(
    page: any
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Going back to search results");

      // Nhấn nút back của trình duyệt
      await page.goBack();
      await randomDelay(2000, 4000);

      // Kiểm tra xem có phải trang kết quả tìm kiếm không
      const isSearchPage = await page.evaluate(() => {
        return (
          window.location.pathname.includes("/results") ||
          document.querySelector("ytd-search") !== null
        );
      });

      if (isSearchPage) {
        logger.info("Successfully returned to search results");
        return { action: "search" };
      } else {
        // Nếu không quay lại được trang tìm kiếm, thực hiện tìm kiếm mới
        logger.info(
          "Could not return to search results, initiating new search"
        );
        return { action: "newSearch" };
      }
    } catch (error) {
      logger.error("Error going back to search results", { error });
      return { action: "newSearch" };
    }
  }

  /**
   * Xử lý việc thực hiện tìm kiếm mới
   */
  private async handleNewSearch(
    page: any
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Initiating new search");

      // Click vào logo YouTube để về trang chủ
      try {
        await page.click("a#logo");
        await randomDelay(2000, 4000);
      } catch (error) {
        // Nếu không click được logo, điều hướng trực tiếp
        logger.warn("Could not click logo, navigating directly to home", {
          error,
        });
        await page.goto("https://www.youtube.com");
        await randomDelay(2000, 4000);
      }

      // Click vào thanh tìm kiếm
      await page.click("input#search");
      await randomDelay(500, 1500);

      return { action: "search" };
    } catch (error) {
      logger.error("Error initiating new search", { error });
      return { action: "goToHome" };
    }
  }

  /**
   * Xử lý việc xem kênh hiện tại
   */
  private async handleViewCurrentChannel(
    page: any,
    videoInfo: any
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Viewing current channel");

      // Click vào tên kênh
      const channelLink = await page.$("#channel-name a");
      if (!channelLink) {
        logger.warn("Channel link not found");
        return { action: "watchSuggested" };
      }

      await channelLink.click();
      await randomDelay(2000, 4000);

      return {
        action: "viewChannel",
        data: {
          channelName: videoInfo.channelName,
          channelUrl: videoInfo.channelUrl,
        },
      };
    } catch (error) {
      logger.error("Error viewing channel", { error });
      return { action: "watchSuggested" };
    }
  }
}
