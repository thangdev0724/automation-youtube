// src/controllers/home.ts
import { Page } from "playwright";
import {
  HOME_NOTIFICATIONS,
  HOME_SELECTOR,
  HOME_VIDEO_LINK_TITLE,
  HOME_VIDEO_THUMBNAILS,
  SEARCH_INPUT,
} from "../constants/selector";
import { Session } from "../models/session";
import { IHomeConfig, IResultState } from "../types/config";
import { logger } from "../utils/logger";
import { probabilityCheck, randomDelay } from "../utils/random";
import { BrowserManager } from "./browser";
import { randomInt } from "crypto";

const PERCENTAGE_SCROLL_PAGE = 0.7;

export class HomeController {
  private browserManager: BrowserManager;

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  /**
   * Điều hướng đến trang chủ YouTube
   */
  async navigateToHome(): Promise<boolean> {
    const page = await this.browserManager.getCurrentPage();
    try {
      logger.info("Navigating to YouTube home page");
      if (page.url() === "https://www.youtube.com/") {
        return true;
      }
      await this.browserManager.navigateTo("https://www.youtube.com");
      return true;
    } catch (error) {
      logger.error("Error navigating to home page", { error });
      return false;
    }
  }

  /**
   * Duyệt trang chủ YouTube
   * @param session Session hiện tại
   * @param config Cấu hình xác suất các hành vi
   * @returns Kết quả và hành động tiếp theo
   */
  async browseHomePage(
    session: Session,
    config: IHomeConfig
  ): Promise<IResultState> {
    try {
      logger.info("Browsing YouTube home page");
      const page = await this.browserManager.getCurrentPage();

      // Cập nhật thời gian hoạt động của phiên
      session.updateActivity();
      // Kiểm tra trạng thái session
      session.checkLimits();
      const resultBrowse: IResultState = {
        action: "None",
        data: null,
        stateName: "HomeBrowsing",
      };

      if (
        probabilityCheck(
          config.probCheckNotifications,
          "probCheckNotifications",
          session
        )
      ) {
        logger.info("Checked notifications");
        session.recordActivities("CheckNoti", "home");
        try {
          const notificationButton = await this.getHomePageElements().then(
            (elements) => elements.notificationButton
          );
          if (notificationButton) {
            await notificationButton.click();
            await randomDelay(2000, 4000);

            await page.keyboard.press("Escape");
            await randomDelay(500, 1500);
          } else {
            logger.warn("Notification button not found");
          }
        } catch (notificationError) {
          session.recordError(notificationError, "check notification", "home");
        }

        // End browsing home early
        if (
          probabilityCheck(
            100 - config.probPauseOnVideo,
            "endHomeBrowingEarly",
            session
          )
        ) {
          logger.info("End browsing home early");
          resultBrowse.action = "endNow";
          return resultBrowse;
        }

        // Browsing video on Home
        let exitScroll = false;
        while (!exitScroll) {
          session.checkLimits();
          this.scrollDown();
          await randomDelay(1500, 3500);
          if (
            probabilityCheck(
              config.probPauseOnVideo,
              "probPauseOnVideo",
              session
            )
          ) {
            logger.info("Evaluate video...");
            await this.elementsInViewport(HOME_VIDEO_LINK_TITLE);

            if (
              probabilityCheck(
                config.probHomeVideoGood,
                "probHomeVideoGood",
                session
              )
            ) {
              logger.info("Evaluated video is good...");

              if (
                probabilityCheck(
                  config.probWatchIfGoodHome,
                  "probWatchIfGoodHome",
                  session
                )
              ) {
                session.recordActivities("WatchVidGood", "home");
                this.playRandomVideo(page, session);
                await randomDelay(2000, 4000);
                resultBrowse.action = "watchVideo";
                break;
              } else {
                session.recordActivities("skipWatchVideo", "home");
                break;
              }
            } else {
              logger.info("Evaluated video is bad...");
              if (
                probabilityCheck(
                  config.probWatchIfBadHome,
                  "probWatchIfBadHome",
                  session
                )
              ) {
                session.recordActivities("WatchVidBad", "home");
                this.playRandomVideo(page, session);
                await randomDelay(2000, 4000);
                resultBrowse.action = "watchVideo";

                break;
              } else {
                session.recordActivities("skipWatchVideo", "home");
                break;
              }
            }
          }
        }
      }
      return resultBrowse;
    } catch (e) {
      session.recordError(e, "browseHomePage", "home");
      return {
        action: "Error",
        error: e,
      };
    }
  }

  private async getHomePageElements() {
    const page = await this.browserManager.getCurrentPage();

    try {
      return {
        videoThumbnails: await page.$$(HOME_VIDEO_THUMBNAILS),
        searchBox: await page.$(SEARCH_INPUT),
        notificationButton: await page.$(HOME_NOTIFICATIONS),
        homeButton: await page.$(HOME_SELECTOR),
      };
    } catch (error) {
      logger.error("Error getting home page elements", error);
      return {
        videoThumbnails: [],
        searchBox: null,
        notificationButton: null,
        homeButton: null,
      };
    }
  }

  private async scrollDown() {
    const page = await this.browserManager.getCurrentPage();
    await page.evaluate((percen: number) => {
      window.scrollBy({
        top: window.innerHeight * percen,
        behavior: "smooth",
      });
    }, PERCENTAGE_SCROLL_PAGE);
  }

  private async elementsInViewport(selector: string): Promise<Element[]> {
    const page = await this.browserManager.getCurrentPage();
    return await page.evaluate((selector: string) => {
      return Array.from(document.querySelectorAll(selector))
        .map((el, id) => {
          el.classList.add(`automated-element-from-home`);
          return el;
        })
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
          );
        });
    }, selector);
  }

  private async playRandomVideo(page: Page, session: Session) {
    try {
      const elements = await page.$$(".automated-element-from-home");
      const randomIndex = randomInt(0, elements.length - 1);
      const randomElement = elements[randomIndex];
      const title = await randomElement.textContent();
      session.recordActivities("playVideo", "home", {
        title: title,
      });
      logger.info(`Hovering over video ${title}`);
      await randomElement.hover();
      await randomDelay(1000, 2000);
      logger.info(`Watching video: ${title}`);
      await randomElement.click();
    } catch (error) {
      session.recordError(error, "playRandomVideo", "home");
      logger.error("Error getting home page elements", { error });
    }
  }
}
