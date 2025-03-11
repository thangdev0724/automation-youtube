// src/controllers/home.ts
import { BrowserManager } from "./browser";
import { logger } from "../utils/logger";
import { randomDelay, probabilityCheck, randomInt } from "../utils/random";
import { Session } from "../models/session";
import { ISessionConfig } from "../types/session";
import { IHomeStateConfig } from "../types/config";

export class HomeController {
  private browserManager: BrowserManager;

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  /**
   * Điều hướng đến trang chủ YouTube
   */
  async navigateToHome(): Promise<boolean> {
    try {
      logger.info("Navigating to YouTube home page");
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
    config: IHomeStateConfig
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Browsing YouTube home page");
      const page = await this.browserManager.getCurrentPage();

      // Cập nhật thời gian hoạt động của phiên
      session.updateActivity();

      // Kiểm tra thông báo với xác suất đã cấu hình
      if (probabilityCheck(config.checkNotifications)) {
        logger.info("Checking notifications");
        try {
          // Tìm kiếm nút thông báo
          const notificationButton = await this.getHomePageElements().then(
            (elements) => elements.notificationButton
          );
          if (notificationButton) {
            await notificationButton.click();
            await randomDelay(2000, 4000);

            // Đóng menu thông báo
            await page.keyboard.press("Escape");
            await randomDelay(500, 1500);
          } else {
            logger.warn("Notification button not found");
          }
        } catch (notificationError) {
          logger.warn("Error checking notifications", {
            error: notificationError,
          });
        }
      }

      logger.info("Giá trị homeToSearch: " + config.homeToSearch);
      logger.info("Giá trị homeToVideo: " + config.homeToVideo);
      logger.info("Giá trị clickHomeVideo: " + config.clickHomeVideo);

      if (probabilityCheck(config.homeToSearch)) {
        return { action: "search" };
      }

      if (probabilityCheck(config.homeToVideo)) {
        await this.playRandomVideo();
        return {
          action: "watchVideo",
          data: {
            source: "home",
            videoTitle: "Unknown",
          },
        };
      }

      // Cuộn trang
      logger.info("Scrolling through home page");
      const scrollCount = randomInt(3, 10);

      for (let i = 0; i < scrollCount; i++) {
        // Cuộn xuống
        await page.evaluate(() => {
          window.scrollBy({
            top: window.innerHeight * 0.7,
            behavior: "smooth",
          });
        });

        await randomDelay(1500, 3500);

        // Dừng cuộn để xem một video?

        logger.info(
          "Giá trị stopScrollingToWatchVideo: " +
            config.stopScrollingToWatchVideo
        );
        if (probabilityCheck(config.stopScrollingToWatchVideo)) {
          logger.info("Pausing on video thumbnail");

          // Lấy danh sách thumbnails
          const thumbnails = await this.getHomePageElements().then(
            (elements) => elements.videoThumbnails
          );

          if (thumbnails.length > 0) {
            // Chọn một thumbnail ngẫu nhiên
            const randomIndex = randomInt(0, thumbnails.length - 1);
            const thumbnail = thumbnails[randomIndex];

            // Scroll để thumbnail hiển thị trong viewport
            await thumbnail.scrollIntoViewIfNeeded();
            await randomDelay(500, 1500);

            // Hover lên thumbnail
            await thumbnail.hover();
            await randomDelay(1000, 3000);

            logger.info(
              "Giá trị homeVideoToSearch: " + config.homeVideoToSearch
            );
            if (probabilityCheck(config.homeVideoToSearch)) {
              logger.info("Switching to search from home");
              const searchBox = await this.getHomePageElements().then(
                (elements) => elements.searchBox
              );
              if (searchBox) {
                await searchBox.click();
                return { action: "search" };
              }
            }

            logger.info(" Giá trị clickHomeVideo: " + config.clickHomeVideo);
            if (probabilityCheck(config.clickHomeVideo)) {
              logger.info("Clicking on home page video");

              let videoTitle = "Unknown";
              try {
                const titleElement = await thumbnail.$("a#video-title-link");
                if (titleElement) {
                  videoTitle =
                    (await titleElement.getAttribute("title")) || "Unknown";
                }
              } catch (e) {
                logger.warn("Could not get video title", { error: e });
              }

              // Click vào thumbnail
              await thumbnail.$eval("a#video-title-link", (el: HTMLElement) =>
                el.click()
              );
              await randomDelay(2000, 4000);

              return {
                action: "watchVideo",
                data: {
                  source: "home",
                  videoTitle,
                },
              };
            }

            logger.info("Ending home browsing after pausing on video");
            return { action: "endHomeBrowsing" };
          }
        } else {
          if (probabilityCheck(config.endHomeBrowsing)) {
            logger.info("Ending home browsing while scrolling");
            return { action: "endHomeBrowsing" };
          }
        }

        // Kiểm tra giới hạn phiên sau mỗi lần cuộn
        const limits = session.checkLimits();
        if (limits.exceedsLimit) {
          logger.info("Session limit exceeded while browsing home", {
            reason: limits.reason,
          });
          return {
            action: "endSession",
            data: { reason: limits.reason },
          };
        }
      }

      // Mặc định nếu đã cuộn hết mà không có quyết định cụ thể
      logger.info("Finished scrolling home page, deciding next action");
      if (probabilityCheck(config.homeToSearch)) {
        return { action: "search" };
      } else if (probabilityCheck(config.homeToVideo)) {
        this.playRandomVideo();
        return {
          action: "watchVideo",
          data: {
            source: "home",
            videoTitle: "Unknown",
          },
        };
      } else {
        return { action: "endHomeBrowsing" };
      }
    } catch (error) {
      logger.error("Error browsing home page", { error });
      await this.browserManager.saveScreenshot("home_error");
      return { action: "error", data: { error } };
    }
  }

  /**
   * Xử lý việc kéo xuống và cuộn trang
   */
  async scrollPage(scrollDistance: number = 0.7): Promise<void> {
    try {
      const page = await this.browserManager.getCurrentPage();

      await page.evaluate((distance) => {
        window.scrollBy({
          top: window.innerHeight * distance,
          behavior: "smooth",
        });
      }, scrollDistance);

      await randomDelay(1000, 3000);
    } catch (error) {
      logger.error("Error scrolling page", { error });
    }
  }

  /**
   * Xử lý việc cuộn lên trên
   */
  async scrollUp(scrollDistance: number = 0.5): Promise<void> {
    try {
      const page = await this.browserManager.getCurrentPage();

      await page.evaluate((distance) => {
        window.scrollBy({
          top: -window.innerHeight * distance,
          behavior: "smooth",
        });
      }, scrollDistance);

      await randomDelay(1000, 2000);
    } catch (error) {
      logger.error("Error scrolling page up", { error });
    }
  }

  /**
   * Nắm bắt các element trên trang cho việc xử lý sự kiện
   */
  async getHomePageElements() {
    const page = await this.browserManager.getCurrentPage();

    try {
      return {
        videoThumbnails: await page.$$("ytd-rich-item-renderer"),
        searchBox: await page.$(
          "#center > yt-searchbox > div.ytSearchboxComponentInputBox > form > input"
        ),
        notificationButton: await page.$("#button > yt-icon-badge-shape"),
        homeButton: await page.$('a[aria-label="Home"]'),
      };
    } catch (error) {
      logger.error("Error getting home page elements", { error });
      return {
        videoThumbnails: [],
        searchBox: null,
        notificationButton: null,
        homeButton: null,
      };
    }
  }

  private async playRandomVideo() {
    try {
      // Lấy danh sách thumbnails
      const thumbnails = await this.getHomePageElements().then(
        (elements) => elements.videoThumbnails
      );

      if (thumbnails.length > 0) {
        // Chọn một thumbnail ngẫu nhiên
        const randomIndex = randomInt(0, thumbnails.length - 1);
        const thumbnail = thumbnails[randomIndex];

        // Scroll để thumbnail hiển thị trong viewport
        await thumbnail.scrollIntoViewIfNeeded();
        await randomDelay(500, 1500);

        // Hover lên thumbnail
        await thumbnail.hover();
        await randomDelay(1000, 3000);

        let videoTitle = "Unknown";
        try {
          const titleElement = await thumbnail.$("a#video-title-link");
          if (titleElement) {
            videoTitle =
              (await titleElement.getAttribute("title")) || "Unknown";
          }
        } catch (e) {
          logger.warn("Could not get video title", { error: e });
        }

        // Click vào thumbnail
        await thumbnail.$eval("a#video-title-link", (el: HTMLElement) =>
          el.click()
        );
        await randomDelay(2000, 4000);
      }
    } catch (error) {
      logger.error("Error getting home page elements", { error });
    }
  }
}
