// src/controllers/search.ts
import { Page } from "playwright";
import { SEARCH_INPUT } from "../constants/selector";
import { Session } from "../models/session";
import { ISearchStateConfig } from "../types/config";
import { logger } from "../utils/logger";
import { probabilityCheck, randomDelay, randomInt } from "../utils/random";
import { BrowserManager } from "./browser";

export class SearchController {
  private browserManager: BrowserManager;
  private searchTerms: string[] = [];

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  /**
   * Điều hướng đến tìm kiếm YouTube
   */
  async navigateToSearch(): Promise<boolean> {
    try {
      const page = await this.browserManager.getCurrentPage();
      logger.info("Navigating to search");
      // Tìm và click vào thanh tìm kiếm
      await page.click(SEARCH_INPUT);
      await randomDelay(500, 1500);

      return true;
    } catch (error) {
      logger.error("Error navigating to search", { error });
      return false;
    }
  }

  /**
   * Thực hiện tìm kiếm YouTube
   * @param session Session hiện tại
   * @param config Cấu hình xác suất cho quá trình tìm kiếm
   * @param specificTerm Từ khóa tìm kiếm cụ thể (nếu có)
   */
  async performSearch(
    session: Session,
    config: ISearchStateConfig,
    specificTerm?: string
  ): Promise<{ action: string; data?: any }> {
    try {
      logger.info("Performing YouTube search");
      const page = await this.browserManager.getCurrentPage();
      this.searchTerms = config.searchKeywords;
      // Cập nhật thời gian hoạt động của phiên
      session.updateActivity();

      // === NHẬP TÌM KIẾM ===
      await this.executeSearchInput(
        page,
        specificTerm,
        config.correctSearchTypo
      );

      // Tăng số lần tìm kiếm trong phiên
      session.incrementSearches();

      // Đợi kết quả tìm kiếm hiển thị
      await this.waitForSearchResults(page);

      // === DUYỆT KẾT QUẢ TÌM KIẾM ===
      const searchOutcome = await this.browseSearchResults(
        page,
        session,
        config
      );

      // Trả về kết quả cuối cùng của quá trình tìm kiếm
      return searchOutcome;
    } catch (error) {
      logger.error("Error performing search", { error });
      await this.browserManager.saveScreenshot("search_error");
      return { action: "error", data: { error } };
    }
  }

  /**
   * Thực hiện việc nhập từ khóa tìm kiếm
   */
  private async executeSearchInput(
    page: Page,
    specificTerm?: string,
    correctSearchTypo: number = 15
  ): Promise<string> {
    // Chọn từ khóa tìm kiếm ngẫu nhiên hoặc sử dụng từ khóa cụ thể
    const searchTerm =
      specificTerm ||
      this.searchTerms[randomInt(0, this.searchTerms.length - 1)];
    logger.info(`Searching for: ${searchTerm}`);

    // Đảm bảo đang focus vào ô tìm kiếm
    await page.click(SEARCH_INPUT);
    await randomDelay(500, 1000);

    // Xóa nội dung thanh tìm kiếm
    const isMac = process.platform === "darwin";
    if (isMac) {
      await page.keyboard.press("Meta+a");
    } else {
      await page.keyboard.press("Control+a");
    }
    await page.keyboard.press("Delete");
    await randomDelay(500, 1000);

    // Nhập từng ký tự một để giống người dùng thật
    for (const char of searchTerm) {
      await page.keyboard.type(char, { delay: randomInt(50, 150) });
    }

    // Xác suất sửa lỗi đánh máy
    if (probabilityCheck(correctSearchTypo)) {
      logger.info("Correcting typo in search");
      // Xóa 1-3 ký tự cuối và gõ lại
      const charsToDelete = randomInt(1, 3);
      for (let i = 0; i < charsToDelete; i++) {
        await page.keyboard.press("Backspace");
        await randomDelay(100, 300);
      }

      // Gõ lại ký tự đã xóa
      const endPart = searchTerm.slice(-charsToDelete);
      await page.keyboard.type(endPart, { delay: randomInt(50, 150) });
    }

    // Nhấn Enter để tìm kiếm
    await randomDelay(500, 1500);
    await page.keyboard.press("Enter");

    return searchTerm;
  }

  /**
   * Đợi kết quả tìm kiếm hiển thị
   */
  private async waitForSearchResults(page: any): Promise<boolean> {
    try {
      // Đợi kết quả tìm kiếm xuất hiện
      await page.waitForSelector("ytd-video-renderer, ytd-shelf-renderer", {
        timeout: 10000,
      });
      await randomDelay(1000, 3000);
      return true;
    } catch (error) {
      logger.warn("Timeout waiting for search results", { error });
      return false;
    }
  }

  /**
   * Duyệt các kết quả tìm kiếm
   */
  private async browseSearchResults(
    page: Page,
    session: Session,
    config: ISearchStateConfig
  ): Promise<{ action: string; data?: any }> {
    logger.info("Browsing search results");

    // Số lần cuộn tối đa
    // const maxScrolls = randomInt(2, 8);

    while (true) {
      // Cập nhật hoạt động
      session.updateActivity();

      // Kiểm tra giới hạn phiên
      const limits = session.checkLimits();
      if (limits.exceedsLimit) {
        logger.info("Session limit exceeded while browsing search results", {
          reason: limits.reason,
        });
        return {
          action: "endSession",
          data: { reason: limits.reason },
        };
      }

      // Cuộn xuống để xem thêm kết quả
      await page.evaluate(() => {
        window.scrollBy({
          top: window.innerHeight * 0.7,
          behavior: "smooth",
        });
      });

      await randomDelay(1000, 3000);

      // Xác suất hover vào thumbnail
      if (probabilityCheck(config.hoverThumbnail)) {
        logger.info("Hovering over search result thumbnail");

        // Lấy danh sách kết quả tìm kiếm
        const searchResults = await page.$$("ytd-video-renderer");

        if (searchResults.length > 0) {
          // Chọn một kết quả ngẫu nhiên
          const randomIndex = randomInt(0, searchResults.length - 1);
          const result = searchResults[randomIndex];

          // Scroll để kết quả hiển thị trong viewport
          await result.scrollIntoViewIfNeeded();
          await randomDelay(500, 1500);

          // Hover lên thumbnail
          await result.hover();
          await randomDelay(1000, 3000);

          // Xác suất click vào video sau khi hover
          logger.info(
            "loaded config clickVideoAfterHover" + config.clickVideoAfterHover
          );
          if (probabilityCheck(config.clickVideoAfterHover)) {
            logger.info("Clicking on search result after hover");

            // Lấy tiêu đề video trước khi click
            const videoTitle = await result
              .$eval(
                "a#video-title",
                (el: HTMLElement) => el.textContent?.trim() || "Unknown"
              )
              .catch(() => "Unknown");

            // Click vào thumbnail
            await result.$eval("a#video-title", (el: HTMLElement) =>
              el.click()
            );
            await randomDelay(2000, 4000);

            // Mô phỏng tỷ lệ chuyển từ search sang video
            if (probabilityCheck(config.searchToVideo)) {
              return {
                action: "watchVideo",
                data: {
                  source: "search",
                  videoTitle,
                },
              };
            } else {
              // Trường hợp hiếm gặp khi click vào video nhưng không xem
              await page.goBack();
              await randomDelay(1000, 2000);
              return { action: "search" };
            }
          }

          // Nếu không click, xác suất tiếp tục cuộn
          if (probabilityCheck(config.continueScrollAfterHover)) {
            logger.info("Continuing to scroll after hover");
            continue;
          } else {
            // Nếu không tiếp tục cuộn, kết thúc tìm kiếm
            logger.info("Ending search after hover");
            break;
          }
        }
      } else {
        // Nếu không hover, xác suất cuộn tiếp
        if (probabilityCheck(config.continueScrollResults)) {
          // Tiếp tục vòng lặp cuộn
          continue;
        } else {
          // Các lựa chọn khác: kết thúc tìm kiếm, cuộn lên, v.v.
          if (probabilityCheck(config.endSearch)) {
            logger.info("Ending search while scrolling");
            break;
          } else if (probabilityCheck(config.scrollUp)) {
            logger.info("Scrolling up in search results");
            await page.evaluate(() => {
              window.scrollBy({
                top: -window.innerHeight * 0.7,
                behavior: "smooth",
              });
            });
            await randomDelay(1000, 2000);

            // Sau khi cuộn lên, xác suất hover
            if (probabilityCheck(config.hoverAfterScrollUp)) {
              // Quay lại logic hover ở trên
              const searchResults = await page.$$("ytd-video-renderer");
              if (searchResults.length > 0) {
                const randomIndex = randomInt(0, searchResults.length - 1);
                const result = searchResults[randomIndex];
                await result.scrollIntoViewIfNeeded();
                await result.hover();
                await randomDelay(1000, 3000);
                logger.info("Loaded config clickVideoAfterHover", {
                  clickVideoAfterHover: config.clickVideoAfterHover,
                });
                if (probabilityCheck(config.clickVideoAfterHover)) {
                  logger.info(
                    "Clicking on search result after scroll up and hover"
                  );
                  const videoTitle = await result
                    .$eval(
                      "a#video-title",
                      (el: HTMLElement) => el.textContent?.trim() || "Unknown"
                    )
                    .catch(() => "Unknown");
                  await result.click();
                  await randomDelay(2000, 4000);

                  return {
                    action: "watchVideo",
                    data: {
                      source: "search",
                      videoTitle,
                    },
                  };
                }
              }
            } else if (probabilityCheck(config.continueScrollAfterScrollUp)) {
              // Tiếp tục cuộn sau khi cuộn lên
              continue;
            } else {
              // Kết thúc sau khi cuộn lên
              break;
            }
          } else if (probabilityCheck(config.continueScrollAgain)) {
            // Tiếp tục cuộn lại
            continue;
          } else {
            // Kết thúc trong trường hợp khác
            break;
          }
        }
      }
    }

    // Khi kết thúc duyệt kết quả tìm kiếm, quyết định hành động tiếp theo
    if (probabilityCheck(config.searchToVideo)) {
      // Chọn một video ngẫu nhiên từ kết quả
      logger.info("Selecting random video from search results");
      const results = await page.$$("ytd-video-renderer");

      if (results.length > 0) {
        const randomIndex = randomInt(0, results.length - 1);
        const result = results[randomIndex];

        // Scroll đến video
        await result.scrollIntoViewIfNeeded();
        await randomDelay(500, 1500);

        // Lấy tiêu đề trước khi click
        const videoTitle = await result
          .$eval(
            "a#video-title",
            (el: HTMLElement) => el.textContent?.trim() || "Unknown"
          )
          .catch(() => "Unknown");
        logger.info("Video title là: " + videoTitle);
        // Click vào video
        await result.$eval("a#video-title", (el: HTMLElement) => el.click());
        await randomDelay(2000, 4000);

        return {
          action: "watchVideo",
          data: {
            source: "search",
            videoTitle,
          },
        };
      }
    } else if (probabilityCheck(config.searchToHome)) {
      // Quay về trang chủ
      logger.info("Returning to home page from search");

      try {
        // Click vào logo YouTube để về trang chủ
        await page.click("a#logo");
        await randomDelay(2000, 4000);

        return { action: "goToHome" };
      } catch (error) {
        logger.warn("Error navigating to home, using direct URL", { error });
        await this.browserManager.navigateTo("https://www.youtube.com");
        return { action: "goToHome" };
      }
    }

    // Mặc định, ở lại trang tìm kiếm
    return { action: "finishSearch" };
  }

  /**
   * Lấy danh sách từ khóa tìm kiếm đề xuất
   */
  async getSuggestedSearchTerms(partialTerm: string): Promise<string[]> {
    try {
      const page = await this.browserManager.getCurrentPage();

      // Nhập một phần từ khóa để xem gợi ý
      await page.click(SEARCH_INPUT);
      await page.keyboard.type(partialTerm, { delay: randomInt(50, 150) });

      // Đợi gợi ý xuất hiện
      await page.waitForSelector("ytd-suggestion-entity-renderer", {
        timeout: 5000,
      });

      // Lấy danh sách gợi ý
      const suggestions = await page.$$eval(
        "ytd-suggestion-entity-renderer",
        (elements) => elements.map((el) => el.textContent?.trim() || "")
      );

      return suggestions;
    } catch (error) {
      logger.error("Error getting suggested search terms", { error });
      return [];
    }
  }
}
