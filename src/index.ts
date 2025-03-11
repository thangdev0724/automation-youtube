// src/index.ts (cải tiến)
import { getConfig } from "./config/sheets";
import { BrowserManager } from "./controllers/browser";
import { ChannelController } from "./controllers/channel";
import { HomeController } from "./controllers/home";
import { SearchController } from "./controllers/search";
import { VideoController } from "./controllers/video";
import { Session } from "./models/session";
import {
  IChannelConfig,
  IDetermineActionConfig,
  IHomeStateConfig,
  ISearchStateConfig,
  IWatchVideoConfig,
} from "./types/config";
import { ISessionConfig } from "./types/session";
import { logger } from "./utils/logger";
import { probabilityCheck, randomDelay } from "./utils/random";
import * as dotenv from "dotenv";

dotenv.config();
// Các controller toàn cục
let browserManager: BrowserManager;
let session: Session;
let homeController: HomeController;
let searchController: SearchController;
let videoController: VideoController;
let channelController: ChannelController;

// các cấu hình cần load
let searchConfig: ISearchStateConfig;
let videoConfig: IWatchVideoConfig;
let homeConfig: IHomeStateConfig;
let loadConfig: ISessionConfig;
let navigationConfig: IDetermineActionConfig;
let channelConfig: IChannelConfig;

/**
 * Xử lý việc chuyển sang xem video
 */
async function handleWatchVideo(
  videoTitle: string,
  source: string
): Promise<void> {
  logger.info(`Watching video: ${videoTitle || "Unknown"} from ${source}`);

  // Gọi VideoController để xem video
  const watchResult = await videoController.watchVideo(session, videoConfig);

  // Xử lý kết quả từ việc xem video
  if (
    watchResult.action === "videoCompleted" ||
    watchResult.action === "videoPartiallyWatched"
  ) {
    // Nếu cho phép tương tác
    if (watchResult.data?.allowInteraction) {
      // Quyết định tương tác
      const interactionResult = await videoController.decideInteractions(
        session,
        videoConfig,
        watchResult.data.videoInfo
      );

      logger.info("Interaction results:", {
        liked: interactionResult.liked,
        commented: interactionResult.commented,
        subscribed: interactionResult.subscribed,
      });

      // Quyết định hành động tiếp theo
      const nextAction = await videoController.decideNextAction(
        session,
        navigationConfig,
        watchResult.data.videoInfo
      );

      // Chuyển đến hành động tiếp theo
      await handleNextAction(nextAction);
    } else {
      logger.info("Video was not watched enough for interactions");
      // Quay lại trang chủ
      await homeController.navigateToHome();
    }
  } else if (watchResult.action === "endSession") {
    logger.info(
      `Session ended while watching video due to: ${
        watchResult.data?.reason || "unknown reason"
      }`
    );
  } else if (watchResult.action === "error") {
    logger.error("Error occurred during video watching", {
      error: watchResult.data?.error,
    });
    // Quay lại trang chủ khi gặp lỗi
    await homeController.navigateToHome();
  }
}

/**
 * Xử lý việc chuyển sang tìm kiếm
 */
async function handleSearch(): Promise<void> {
  logger.info("Performing search");

  await searchController.navigateToSearch();
  const searchResult = await searchController.performSearch(
    session,
    searchConfig
  );

  logger.info("Search completed with result:", {
    action: searchResult.action,
    data: searchResult.data,
  });

  // Xử lý kết quả tìm kiếm
  await handleNextAction(searchResult);
}

/**
 * Xử lý việc chuyển sang trang chủ
 */
async function handleHomePage(): Promise<void> {
  logger.info("Navigating to home page");
  await homeController.navigateToHome();
  const browseResult = await homeController.browseHomePage(session, homeConfig);

  logger.info("Home browsing completed with result:", {
    action: browseResult.action,
    data: browseResult.data,
  });

  // Xử lý kết quả duyệt trang chủ
  await handleNextAction(browseResult);
}

// Thêm hàm xử lý viewChannel
async function handleViewChannel(channelData: {
  channelUrl?: string;
  channelName?: string;
}): Promise<void> {
  logger.info(`Viewing channel: ${channelData.channelName || "Unknown"}`);

  const channelResult = await channelController.browseChannel(
    session,
    channelConfig,
    channelData
  );

  logger.info("Channel browsing completed with result:", {
    action: channelResult.action,
    data: channelResult.data,
  });

  // Xử lý kết quả từ việc duyệt kênh
  await handleNextAction(channelResult);
}

/**
 * Hàm xử lý hành động tiếp theo dựa trên kết quả từ controller
 */
async function handleNextAction(actionResult: {
  action: string;
  data?: any;
}): Promise<void> {
  // Cập nhật thời gian hoạt động
  session.updateActivity();

  // Kiểm tra giới hạn phiên
  const limits = session.checkLimits();
  if (limits.exceedsLimit) {
    logger.info(`Session limit exceeded: ${limits.reason}`);
    return; // Kết thúc phiên
  }

  // Xử lý action
  switch (actionResult.action) {
    case "watchVideo":
      await handleWatchVideo(
        actionResult.data?.videoTitle || "Unknown",
        actionResult.data?.source || "unknown"
      );
      break;

    case "search":
      await handleSearch();
      break;

    case "goToHome": {
      await handleHomePage();
      break;
    }
    case "endHomeBrowsing": {
      const randomAction = Math.random() * 100;

      if (randomAction < 40) {
        // 40% xác suất chuyển sang tìm kiếm
        logger.info("Home browsing ended, switching to search");
        await handleSearch();
      } else if (randomAction < 80) {
        // 40% xác suất tiếp tục duyệt trang chủ (làm mới)
        logger.info("Home browsing ended, refreshing home page");
        await handleHomePage();
      } else {
        // 20% xác suất kết thúc phiên
        logger.info("Home browsing ended, ending session");
        return; // Kết thúc phiên
      }
    }

    case "finishSearch":
      if (probabilityCheck(70)) {
        logger.info("Search completed, returning to home page");
        await handleHomePage();
      } else {
        logger.info("Search completed, starting a new search");
        await handleSearch();
      }
      break;

    case "viewChannel":
      logger.info(
        `Would view channel: ${actionResult.data?.channelName || "Unknown"}`
      );
      await handleViewChannel(actionResult.data);
      break;

    case "endSession":
      logger.info(
        `Session ended due to: ${actionResult.data?.reason || "unknown reason"}`
      );
      break;

    case "error":
      logger.error("Error occurred", { error: actionResult.data?.error });
      // Quay về trang chủ khi gặp lỗi
      await handleHomePage();
      break;

    default:
      logger.info(`Unknown action: ${actionResult.action}, returning to home`);
      await handleHomePage();
  }
}

async function main() {
  try {
    logger.info("Starting YouTube automation session");
    loadConfig = await getConfig("AppConfig");
    const searchConfigLoad = await getConfig("Search");
    searchConfigLoad.searchKeywords =
      searchConfigLoad.searchKeywords &&
      searchConfigLoad.searchKeywords.split(",");
    searchConfig = searchConfigLoad;
    homeConfig = await getConfig("Home");
    videoConfig = await getConfig("Video");
    navigationConfig = await getConfig("NavigationDecision");
    channelConfig = await getConfig("Channel");

    logger.info("Config loaded successfully");

    // 1. Initialize session
    session = new Session(loadConfig);
    logger.info("Session initialized successfully");

    // 2. Setup browser
    browserManager = BrowserManager.getInstance();
    logger.info("Browser manager initialized");

    // 3. Launch browser and create page
    await browserManager.launchPersistent();
    logger.info("Browser launched successfully");

    // 4. Initialize controllers
    homeController = new HomeController();
    searchController = new SearchController();
    videoController = new VideoController();
    channelController = new ChannelController();
    logger.info("Controllers initialized");

    // 5. Bắt đầu từ trang chủ
    await handleHomePage();

    // 6. Generate session summary
    const summary = session.generateSessionSummary();
    logger.info("Session summary", { summary });

    // 7. Take a final screenshot
    await browserManager.saveScreenshot("final_state");

    // 8. Close browser
    await randomDelay(5000, 10000); // Wait a bit before closing
    await browserManager.close();
    logger.info("Browser closed");

    logger.info("Session completed successfully");
  } catch (error) {
    logger.error("Error in main process", { error });

    // Ensure browser is closed on error
    try {
      await browserManager.close();
    } catch (closeError) {
      logger.error("Error closing browser", { error: closeError });
    }

    process.exit(1);
  }
}

// Run the main function
main();
