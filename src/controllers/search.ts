// src/controllers/search.ts
import { Page } from "playwright";
import { PERCENTAGE_SCROLL_PAGE } from "../constants/config";
import { SEARCH_INPUT, SEARCH_VIDEO_LINK_TITLE } from "../constants/selector";
import { Session } from "../models/session";
import { IResultState, ISearchStateConfig } from "../types/config";
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
  async navigateToSearch(session: Session): Promise<boolean> {
    try {
      const page = await this.browserManager.getCurrentPage();
      logger.info("Navigating to search");
      // Tìm và click vào thanh tìm kiếm
      await page.click(SEARCH_INPUT);
      await randomDelay(500, 1500);

      return true;
    } catch (error) {
      logger.error("Error navigating to search", { error });
      session.recordError(error, "CHuyển tới tìm kiếm", "navigateToSearch");
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
  ): Promise<IResultState> {
    try {
      logger.info("Performing YouTube search");
      const page = await this.browserManager.getCurrentPage();
      this.searchTerms = config.keywords;
      // Cập nhật thời gian hoạt động của phiên
      session.updateActivity();
      // Kiểm tra trạng thái session
      session.checkLimits();

      // === NHẬP TÌM KIẾM ===
      await this.executeSearchInput(page, session, config);

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
      return { action: "Error", data: error, stateName: "Search" };
    }
  }

  /**
   * Thực hiện việc nhập từ khóa tìm kiếm
   */
  private async executeSearchInput(
    page: Page,
    session: Session,
    config: ISearchStateConfig
  ): Promise<string> {
    // Chọn từ khóa tìm kiếm ngẫu nhiên hoặc sử dụng từ khóa cụ thể
    const searchTerm =
      this.searchTerms[randomInt(0, this.searchTerms.length - 1)];
    logger.info(`Searching for: ${searchTerm}`);
    session.recordActivities("Search", "Search", {
      keyword: searchTerm,
    });

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
    if (
      probabilityCheck(config.probInputCorrect, "probInputCorrect", session)
    ) {
      logger.info("Correcting typo in search");
      session.recordActivities("Search", "Search");
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
  ): Promise<IResultState> {
    logger.info("Browsing search results");
    const resultBrowse: IResultState = {
      action: "None",
      stateName: "Search",
      data: {},
    };
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
          data: limits.reason,
          stateName: "Search",
        };
      }

      await this.scrollDown();
      await randomDelay(1000, 3000);

      logger.info("Evaluate video...");
      await this.elementsInViewport(SEARCH_VIDEO_LINK_TITLE);

      if (
        probabilityCheck(
          config.probSearchVideoGood,
          "probSearchVideoGood",
          session
        )
      ) {
        logger.info("Evaluated video is good...");

        if (
          probabilityCheck(
            config.probWatchIfGoodSearch,
            "probWatchIfGoodSearch",
            session
          )
        ) {
          session.recordActivities("WatchVidGood", "Search");
          this.playRandomVideo(page, session);
          await randomDelay(2000, 4000);
          resultBrowse.action = "watchVideo";
          break;
        } else {
          session.recordActivities("skipWatchVideo", "Search");
          break;
        }
      } else {
        logger.info("Evaluated video is bad...");
        if (
          probabilityCheck(
            config.probWatchIfBadSearch,
            "probWatchIfBadSearch",
            session
          )
        ) {
          session.recordActivities("WatchVidBad", "Search");
          this.playRandomVideo(page, session);
          await randomDelay(2000, 4000);
          resultBrowse.action = "watchVideo";

          break;
        } else {
          session.recordActivities("skipWatchVideo", "Search");
          break;
        }
      }
    }
    return resultBrowse;
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
          el.classList.add(`automated-element-from-search`);
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
      const elements = await page.$$(".automated-element-from-Search");
      const randomIndex = randomInt(0, elements.length - 1);
      const randomElement = elements[randomIndex];
      const title = await randomElement.textContent();
      session.recordActivities("playVideo", "Search", {
        title: title,
      });
      logger.info(`Hovering over video ${title}`);
      await randomElement.hover();
      await randomDelay(1000, 2000);
      logger.info(`Watching video: ${title}`);
      await randomElement.click();
    } catch (error) {
      session.recordError(error, "playRandomVideo", "Search");
      throw Error("Error playing random video");
    }
  }
}
