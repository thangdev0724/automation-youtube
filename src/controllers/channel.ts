// src/controllers/channel.ts
import { Page } from "playwright";
import {
  CHANNEL_ABOUT,
  CHANNEL_SELECTOR,
  CHANNEL_TAB_ITEM,
  CHANNEL_TAB_VIDEO,
  HOME_VIDEO_LINK_TITLE,
} from "../constants/selector";
import { Session } from "../models/session";
import { IChannelConfig, IResultState } from "../types/config";
import { logger } from "../utils/logger";
import { probabilityCheck, randomDelay, randomInt } from "../utils/random";
import { HelperViewPort } from "./helper";

export class ChannelController extends HelperViewPort {
  constructor() {
    super();
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
  ): Promise<IResultState> {
    try {
      logger.info(`Browsing channel: ${channelData?.channelName || "Unknown"}`);
      const page = await this.getBrowserManager().getCurrentPage();

      // Cập nhật thời gian hoạt động
      session.updateActivity();
      await this.loadChannelPage(page, session);
      // 2. Xem thông tin kênh hoặc danh sách video (dựa trên xác suất)
      if (
        probabilityCheck(
          config.probReadChannelInfo,
          "probReadChannelInfo",
          session
        )
      ) {
        await this.viewChannelInfo(page, session);
      } else {
        await this.viewVideosList(page, session);
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
      return {
        action: "Error",
        stateName: "Channel",
        error,
        data: error,
      };
    }
  }

  /**
   * Tải trang kênh
   */
  private async loadChannelPage(page: Page, session: Session): Promise<void> {
    const isPageChannel = page.url().includes("@") || page.url().includes("/@");
    if (isPageChannel) {
      logger.info("Successfully loaded channel page");
    } else {
      // Nếu đang ở trang video, click vào tên kênh
      if (
        page.url() === "https://www.youtube.com/" ||
        page.url().includes("search_query") ||
        page.url().includes("results?search_query")
      ) {
        await this.elementsInViewport({
          selector: "#text-container #text > a",
          classCus: "automated-channel-name",
        });

        const elements = await page.$$(`.automated-channel-name`);
        const randomIndex = randomInt(0, elements.length - 1);
        const randomElement = elements[randomIndex];
        const title = await randomElement.textContent();
        session.recordActivities("viewChannel", "ChannelBrowse", {
          title: title,
        });
        logger.info(`Hovering over channel ${title}`);
        await randomElement.hover();
        await randomDelay(1000, 2000);
        await randomElement.click();
        return;
      }
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
        session.recordError(error, "viewChannel", "ChannelBrowse");
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
  private async viewChannelInfo(page: Page, session: Session): Promise<void> {
    logger.info("Viewing channel information");

    // Cuộn lên đầu trang để xem thông tin kênh
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await randomDelay(1000, 2000);

    try {
      const aboutTab = await page.$(CHANNEL_ABOUT);
      if (aboutTab) {
        session.recordActivities("viewChannel", "ChannelInfo", "Viewing...");
        await aboutTab.click();
        logger.info("Clicked on About tab");
        await randomDelay(2000, 3000);
        await page.keyboard.press("Escape");
        await randomDelay(1000, 2000);
      }
    } catch (error) {
      logger.warn("Could not navigate to About tab", error);
      session.recordError(error, "viewChannel", "ChannelInfo");
      await page.keyboard.press("Escape");

      throw new Error("Could not navigate to About tab");
    }
  }

  /**
   * Xem danh sách video
   */
  private async viewVideosList(page: Page, session: Session): Promise<void> {
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
      session.recordError(error, "viewChannel", "viewVideosList");
      logger.warn("Could not navigate to Videos tab, might already be on it", {
        error,
      });
    }

    // Đợi danh sách video tải
    await randomDelay(1000, 2000);
  }

  /**
   * Cuộn xem video kênh và quyết định hành động tiếp theo
   */
  private async browseChannelVideos(
    page: Page,
    session: Session,
    config: IChannelConfig
  ): Promise<IResultState> {
    logger.info("Browsing channel videos");
    let result: IResultState = {
      action: "None",
      data: null,
      stateName: "Channel",
    };
    let count = 0;

    while (true) {
      // Cập nhật hoạt động
      session.updateActivity();

      if (count >= 3) {
        // Kiểm tra giới hạn phiên
        const limits = session.checkLimits();
        if (limits.exceedsLimit) {
          logger.info("Session limit exceeded while browsing search results", {
            reason: limits.reason,
          });
          return {
            action: "endSession",
            data: limits.reason,
            stateName: "Search",
          };
        }

        await this.scrollDown();
        await randomDelay(1000, 3000);
        const classCus = "automated-video-title-from-channel";
        logger.info("Evaluate video...");
        await this.elementsInViewport({
          selector: HOME_VIDEO_LINK_TITLE,
          classCus: classCus,
        });

        if (
          probabilityCheck(
            config.probScrollChannelVideo,
            "probScrollChannelVideo",
            session
          )
        ) {
          session.recordActivities("watchVideo", "ChannelBrowse");
          this.playRandomVideo(page, session, classCus, "ChannelBrowse");
          await randomDelay(2000, 4000);
          result.action = "watchVideo";
          break;
        } else {
          session.recordActivities("endNow", "ChannelBrowse");
          this.playRandomVideo(page, session, classCus, "ChannelBrowse");
          await randomDelay(2000, 4000);
          break;
        }
      }

      count++;
    }

    return result;
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
