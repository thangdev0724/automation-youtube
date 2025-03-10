import { getConfig } from "./config/sheets";
import { BrowserManager } from "./controllers/browser";
import { HomeController } from "./controllers/home";
import { SearchController } from "./controllers/search";
import { VideoController } from "./controllers/video";
import { Session } from "./models/session";
import { ISearchStateConfig } from "./types/config";
import { ISessionConfig } from "./types/session";
import { logger } from "./utils/logger";
import { randomDelay } from "./utils/random";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    logger.info("Starting YouTube automation test");
    const loadConfig = await getConfig("Config");
    const searchConfig = await getConfig("Search");
    const homeConfig = await getConfig("Home");
    searchConfig.searchKeywords =
      searchConfig.searchKeywords && searchConfig.searchKeywords.split(",");
    // 1. Initialize session
    const session = new Session(loadConfig as ISessionConfig);
    logger.info("Session initialized successfully");

    // 2. Setup browser
    const browserManager = BrowserManager.getInstance();
    logger.info("Browser manager initialized");

    // 3. Launch browser and create page
    await browserManager.launchPersistent();
    logger.info("Browser launched successfully");

    // 4. Initialize HomeController
    const homeController = new HomeController();
    // 4. Initialize controllers
    const searchController = new SearchController();
    const videoController = new VideoController();
    logger.info("Controllers initialized");
    logger.info("Home controller initialized");

    // 5. Navigate to YouTube home page
    const navigationResult = await homeController.navigateToHome();
    if (!navigationResult) {
      throw new Error("Failed to navigate to YouTube home page");
    }
    logger.info("Navigated to YouTube home page");

    // 6. Browse home page
    logger.info("Starting to browse home page with config:", homeConfig);
    const browseResult = await homeController.browseHomePage(
      session,
      homeConfig
    );

    // 7. Handle the result of browsing
    logger.info("Home browsing completed with result:", {
      action: browseResult.action,
      data: browseResult.data,
    });

    // 8. Take actions based on browse result
    switch (browseResult.action) {
      case "watchVideo":
        logger.info(
          `Would watch video: ${browseResult.data?.videoTitle || "Unknown"}`
        );
        const watchResult = await videoController.watchVideo(
          session,
          loadConfig
        );

        logger.info("Video watching completed with result:", {
          action: watchResult.action,
          data: watchResult.data,
        });

        break;

      case "search":
        logger.info("Transitioning to search");
        // Gọi SearchController
        await searchController.navigateToSearch();
        const searchResult = await searchController.performSearch(
          session,
          searchConfig
        );

        logger.info("Search completed with result:", {
          action: searchResult.action,
          data: searchResult.data,
        });
        break;

      case "endSession":
        logger.info(
          `Session ended due to: ${
            browseResult.data?.reason || "unknown reason"
          }`
        );
        break;

      case "error":
        logger.error("Error occurred during home browsing", {
          error: browseResult.data?.error,
        });
        break;

      default:
        logger.info(`Continuing with action: ${browseResult.action}`);
    }

    // 9. Generate session summary
    const summary = session.generateSessionSummary();
    logger.info("Session summary", { summary });
    // 10. Take a final screenshot
    await browserManager.saveScreenshot("final_state");

    // 11. Close browser
    await randomDelay(5000, 10000);
    await browserManager.close();
    logger.info("Browser closed");

    logger.info("Test completed successfully");
  } catch (error) {
    logger.error("Error in main process", { error });

    // Ensure browser is closed on error
    try {
      await BrowserManager.getInstance().close();
    } catch (closeError) {
      logger.error("Error closing browser", { error: closeError });
    }

    process.exit(1);
  }
}

testSearchController();
async function testSearchController() {
  try {
    logger.info("Testing SearchController");
    logger.info("Starting YouTube automation test");
    const config = await getConfig("Search");
    config.searchKeywords = config.searchKeywords.split(",");
    // 1. Initialize session
    const session = new Session(config as ISessionConfig);
    // Khởi tạo session và browser nếu cần
    const browserManager = BrowserManager.getInstance();
    await browserManager.launchPersistent();

    // Khởi tạo SearchController
    const searchController = new SearchController();

    // Điều hướng đến trang YouTube
    await browserManager.navigateTo("https://www.youtube.com");

    // Điều hướng đến tìm kiếm
    await searchController.navigateToSearch();

    // Thực hiện tìm kiếm
    const searchResult = await searchController.performSearch(
      session,
      config as ISearchStateConfig
    );

    // Xử lý kết quả tìm kiếm
    logger.info("Search result:", {
      action: searchResult.action,
      data: searchResult.data,
    });

    // Đóng trình duyệt sau khi test
    await randomDelay(5000, 10000);
    await browserManager.close();
  } catch (error) {
    logger.error("Error testing SearchController", { error });

    // Đảm bảo đóng trình duyệt khi có lỗi
    try {
      await BrowserManager.getInstance().close();
    } catch (closeError) {
      logger.error("Error closing browser", { error: closeError });
    }
  }
}

// Hoặc tích hợp vào main() để chạy theo luồng
// Ví dụ: Nếu kết quả từ HomeController là 'search', gọi SearchController
// if (browseResult.action === 'search') {
//   const searchController = new SearchController();
//   const searchResult = await searchController.performSearch(session, searchConfig);
//   // Xử lý kết quả tìm kiếm
// }
