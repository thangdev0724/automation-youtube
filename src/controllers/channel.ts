// src/controllers/channel.ts
import { Page } from "playwright";
import {
  CHANNEL_ABOUT,
  CHANNEL_SELECTOR,
  CHANNEL_TAB_ITEM,
  CHANNEL_TAB_VIDEO,
  CHANNEL_VIDEO_ITEM,
  HOME_SELECTOR,
  SEARCH_INPUT,
} from "../constants/selector";
import { Session } from "../models/session";
import { IChannelConfig } from "../types/config";
import { logger } from "../utils/logger";
import { checkProbability } from "../utils/probability-helper";
import { randomDelay, randomInt } from "../utils/random";
import { BrowserManager } from "./browser";

export class ChannelController {
  private browserManager: BrowserManager;

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  /**
   * Duyệt một kênh YouTube
   * @param session Session hiện tại
   * @param config Cấu hình xác suất cho việc duyệt kênh
   * @param channelData Dữ liệu kênh (URL, tên)
   */
  async browseChannel(
    session: Session,
    config: IChannelConfig,
    channelData?: {
      channelUrl?: string;
      channelName?: string;
    }
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info(`Browsing channel: ${channelData?.channelName || "Unknown"}`);
      const page = await this.browserManager.getCurrentPage();

      // Cập nhật thời gian hoạt động
      session.updateActivity();

      // 1. Tải trang kênh
      await this.loadChannelPage(page, channelData?.channelUrl);

      // 2. Xem thông tin kênh hoặc danh sách video (dựa trên xác suất)
      if (
        checkProbability(config.viewChannelInfo, "Channel", "viewChannelInfo")
      ) {
        await this.viewChannelInfo(page);
      } else {
        await this.viewVideosList(page);
      }

      // 3. Cuộn xem video kênh và thực hiện hành động
      const browsingResult = await this.browseChannelVideos(
        page,
        session,
        config
      );

      return browsingResult;
    } catch (error) {
      logger.error("Error browsing channel", { error });
      await this.browserManager.saveScreenshot("channel_error");
      return { action: "error", data: { error } };
    }
  }

  /**
   * Tải trang kênh
   */
  private async loadChannelPage(
    page: Page,
    channelUrl?: string
  ): Promise<void> {
    // Nếu có URL kênh cụ thể, điều hướng đến đó
    if (channelUrl) {
      logger.info(`Navigating to channel URL: ${channelUrl}`);
      await page.goto(channelUrl, { waitUntil: "networkidle" });
    } else {
      // Nếu đang ở trang video, click vào tên kênh
      logger.info("Attempting to navigate to channel from current page");
      try {
        const channelLink = await page.$(CHANNEL_SELECTOR);
        if (channelLink) {
          await channelLink.click();
          await randomDelay(2000, 4000);
        } else {
          throw new Error("Channel link not found");
        }
      } catch (error) {
        logger.error("Error navigating to channel", { error });
        throw error;
      }
    }

    // Đợi cho trang kênh tải xong
    await randomDelay(2000, 4000);

    // Kiểm tra xem đã ở trang kênh chưa
    const isChannelPage = await page.evaluate(() => {
      return (
        window.location.pathname.includes("/channel/") ||
        window.location.pathname.includes("/c/") ||
        window.location.pathname.includes("/user/") ||
        window.location.pathname.includes("/@")
      );
    });

    if (!isChannelPage) {
      logger.warn("Not on a channel page, navigation might have failed");
    } else {
      logger.info("Successfully loaded channel page");
    }
  }

  /**
   * Xem thông tin kênh
   */
  async viewChannelInfo(page: Page): Promise<void> {
    logger.info("Viewing channel information");

    // Cuộn lên đầu trang để xem thông tin kênh
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await randomDelay(1000, 2000);

    // Lấy thông tin kênh (tên, số người đăng ký)
    // const channelInfo = await this.getChannelInfo(page);
    // logger.info("Channel info:", channelInfo);

    try {
      // Tìm tab About/Giới thiệu
      const aboutTab = await page.$(CHANNEL_ABOUT);
      if (aboutTab) {
        await aboutTab.click();
        logger.info("Clicked on About tab");
        await randomDelay(2000, 3000);
        await page.keyboard.press("Escape");
        await randomDelay(1000, 2000);
      }
    } catch (error) {
      logger.warn("Could not navigate to About tab", { error });
    }
  }

  /**
   * Xem danh sách video
   */
  async viewVideosList(page: Page): Promise<void> {
    logger.info("Viewing videos list");

    // Tìm tab Videos
    try {
      const videosTab = await page.$(CHANNEL_TAB_VIDEO);
      if (videosTab) {
        await videosTab.click();
        logger.info("Clicked on Videos tab");
        await randomDelay(2000, 3000);
      }
    } catch (error) {
      logger.warn("Could not navigate to Videos tab, might already be on it", {
        error,
      });
    }

    // Đợi danh sách video tải
    await randomDelay(1000, 2000);
  }

  /**
   * Lấy thông tin kênh
   */
  private async getChannelInfo(page: Page): Promise<{
    name: string;
    subscribers: string;
    videoCount: string;
    isSubscribed: boolean;
  }> {
    try {
      const channelInfo = await page.evaluate(() => {
        // Tên kênh
        const nameElement = document.querySelector(
          "#channel-name yt-formatted-string, #channel-header yt-formatted-string"
        );
        const name = nameElement ? nameElement.textContent?.trim() : "Unknown";

        // Số người đăng ký
        const subscriberElement = document.querySelector("#subscriber-count");
        const subscribers = subscriberElement
          ? subscriberElement.textContent?.trim()
          : "Unknown";

        // Số video
        const videoCountElement = document.querySelector("#videos-count");
        const videoCount = videoCountElement
          ? videoCountElement.textContent?.trim()
          : "Unknown";

        // Kiểm tra đã đăng ký kênh chưa
        const subscribeButton = document.querySelector(
          "#subscribe-button paper-button, #subscribe-button button"
        );
        const isSubscribed = subscribeButton
          ? subscribeButton.getAttribute("subscribed") === "" ||
            subscribeButton.getAttribute("aria-label")?.includes("Unsubscribe")
          : false;

        return {
          name: name || "Unknown",
          subscribers: subscribers || "Unknown",
          videoCount: videoCount || "Unknown",
          isSubscribed: isSubscribed || false,
        };
      });

      return channelInfo;
    } catch (error) {
      logger.warn("Error getting channel info", { error });
      return {
        name: "Unknown",
        subscribers: "Unknown",
        videoCount: "Unknown",
        isSubscribed: false,
      };
    }
  }

  /**
   * Cuộn xem video kênh và quyết định hành động tiếp theo
   */
  async browseChannelVideos(
    page: Page,
    session: Session,
    config: IChannelConfig
  ): Promise<{ action: string; data?: any }> {
    logger.info("Browsing channel videos");

    // Số lần cuộn tối đa
    const maxScrolls = randomInt(2, 5);

    for (let i = 0; i < maxScrolls; i++) {
      // Cập nhật hoạt động
      session.updateActivity();

      // Kiểm tra giới hạn phiên
      const limits = session.checkLimits();
      if (limits.exceedsLimit) {
        logger.info("Session limit exceeded while browsing channel", {
          reason: limits.reason,
        });
        return {
          action: "endSession",
          data: { reason: limits.reason },
        };
      }

      // Cuộn để xem thêm video
      await page.evaluate(() => {
        window.scrollBy({
          top: window.innerHeight * 0.7,
          behavior: "smooth",
        });
      });

      await randomDelay(1500, 3000);

      // Quyết định hành động: chọn video, chuyển tab, hoặc rời khỏi kênh

      // 1. Chọn video từ kênh (70% khả năng)
      if (
        checkProbability(
          config.selectChannelVideo,
          "Channel",
          "selectChannelVideo"
        )
      ) {
        // Chọn một video ngẫu nhiên từ danh sách
        const channelVideos = await page.$$(
          "ytd-grid-video-renderer, ytd-rich-item-renderer"
        );

        if (channelVideos.length > 0) {
          const randomIndex = randomInt(0, channelVideos.length - 1);
          const selectedVideo = channelVideos[randomIndex];

          // Scroll đến video
          await selectedVideo.scrollIntoViewIfNeeded();
          await randomDelay(500, 1500);

          // Lấy tiêu đề video
          const videoTitle = await selectedVideo
            .$eval(
              "#video-title",
              (el: HTMLElement) => el.textContent?.trim() || "Unknown"
            )
            .catch(() => "Unknown");

          // Hover và click
          await selectedVideo.hover();
          await randomDelay(1000, 2000);
          await selectedVideo.click();

          logger.info(`Selected channel video: ${videoTitle}`);
          await randomDelay(2000, 4000);

          // Trả về action watchVideo theo xác suất channelToVideo
          if (
            checkProbability(config.channelToVideo, "Channel", "channelToVideo")
          ) {
            return {
              action: "watchVideo",
              data: {
                source: "channel",
                videoTitle,
              },
            };
          } else {
            // Trường hợp hiếm, click nhưng quay lại
            await page.goBack();
            await randomDelay(1000, 2000);
          }
        }
      }
      // 2. Chuyển tab kênh (20% khả năng)
      else if (
        checkProbability(config.switchChannelTab, "Channel", "switchChannelTab")
      ) {
        await this.switchChannelTab(page);
      }
      // 3. Rời khỏi kênh (10% khả năng còn lại)
      else {
        // Quyết định xem sẽ đi đâu sau khi rời kênh
        return await this.leaveChannel(page, config);
      }
    }

    // Sau khi cuộn hết, quyết định hành động cuối cùng
    return await this.leaveChannel(page, config);
  }

  /**
   * Chuyển giữa các tab kênh
   */
  private async switchChannelTab(page: Page): Promise<void> {
    logger.info("Switching channel tab");

    // Danh sách các tab có thể có
    const tabSelectors = await page.evaluate(() => {
      const tabElements = document.querySelectorAll(
        "#tabsContent > yt-tab-group-shape > div.yt-tab-group-shape-wiz__tabs > yt-tab-shape"
      );

      const arr: string[] = [];

      tabElements.forEach((el, idx) => {
        if (idx < tabElements.length) {
          arr.push(CHANNEL_TAB_ITEM);
        }
      });

      return arr;
    });

    // Lấy tất cả các tab hiện có
    const availableTabs = [];
    for (const selector of tabSelectors) {
      const tab = await page.$(selector);
      if (tab) {
        availableTabs.push(tab);
      }
    }

    if (availableTabs.length > 0) {
      // Chọn một tab ngẫu nhiên
      const randomTab = availableTabs[randomInt(0, availableTabs.length - 1)];

      // Click vào tab
      await randomTab.click();
      logger.info("Switched to another channel tab");

      // Đợi nội dung tải
      await randomDelay(2000, 4000);
    } else {
      logger.warn("No channel tabs found to switch");
    }
  }

  /**
   * Rời khỏi kênh và quyết định hành động tiếp theo
   */
  private async leaveChannel(
    page: Page,
    config: any
  ): Promise<{ action: string; data?: any }> {
    logger.info("Leaving channel");

    // Tạo một mảng các hành động có thể và xác suất tương ứng
    const actions = [
      {
        name: "channelToVideo",
        action: "watchVideo",
        probability: config.channelToVideo,
      },
      {
        name: "channelToSearch",
        action: "search",
        probability: config.channelToSearch,
      },
      {
        name: "channelToHome",
        action: "goToHome",
        probability: config.channelToHome,
      },
    ];

    // Chọn hành động
    let selectedAction = actions[0].action;

    for (const action of actions) {
      if (checkProbability(action.probability, "Channel", action.name)) {
        selectedAction = action.action;
        break;
      }
    }

    // Thực hiện hành động rời kênh
    switch (selectedAction) {
      case "watchVideo":
        // Tìm một video để xem (có thể là video đề xuất ở sidebar)
        logger.info("Leaving channel to watch a video");

        // Tìm video đề xuất
        const suggestedVideos = await page.$$(CHANNEL_VIDEO_ITEM);

        if (suggestedVideos.length > 0) {
          // Chọn một video ngẫu nhiên
          const randomIndex = randomInt(0, suggestedVideos.length - 1);
          const selectedVideo = suggestedVideos[randomIndex];

          // Scroll đến video
          await selectedVideo.scrollIntoViewIfNeeded();
          await randomDelay(500, 1500);

          // Lấy tiêu đề video
          const videoTitle = await selectedVideo
            .$eval(
              "#video-title",
              (el: HTMLElement) => el.textContent?.trim() || "Unknown"
            )
            .catch(() => "Unknown");

          // Click vào video
          await selectedVideo.click();
          await randomDelay(2000, 3000);

          return {
            action: "watchVideo",
            data: {
              source: "channelSuggested",
              videoTitle,
            },
          };
        } else {
          // Nếu không tìm thấy video đề xuất, quay về trang chủ
          return { action: "goToHome" };
        }

      case "search":
        logger.info("Leaving channel to perform search");
        // Click vào ô tìm kiếm
        await page.click(SEARCH_INPUT);
        return { action: "search" };

      case "goToHome":
      default:
        logger.info("Leaving channel to go to home page");
        // Click vào logo YouTube
        try {
          await page.click(HOME_SELECTOR);
          await randomDelay(1000, 2000);
        } catch (error) {
          logger.warn("Error clicking YouTube logo, navigating directly", {
            error,
          });
          await page.goto("https://www.youtube.com");
        }

        return { action: "goToHome" };
    }
  }

  /**
   * Kiểm tra xem kênh đã đăng ký chưa
   */
  async isChannelSubscribed(page: Page): Promise<boolean> {
    try {
      const isSubscribed = await page.evaluate(() => {
        const subscribeButton = document.querySelector(
          "#subscribe-button paper-button, #subscribe-button button"
        );
        if (!subscribeButton) return false;

        return (
          subscribeButton.getAttribute("subscribed") === "" ||
          subscribeButton.getAttribute("aria-label")?.includes("Unsubscribe")
        );
      });

      return isSubscribed || false;
    } catch (error) {
      logger.error("Error checking if channel is subscribed", { error });
      return false;
    }
  }
}
