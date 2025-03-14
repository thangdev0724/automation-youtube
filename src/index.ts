import * as dotenv from "dotenv";
import { getConfig } from "./config/sheets";
import { CONFIG_OBJECT } from "./constants/config";
import { BrowserManager } from "./controllers/browser";
import { HomeController } from "./controllers/home";
import { Session } from "./models/session";
import {
  IAppConfig,
  IChannelConfig,
  IEvaluateHomeVideoConfig,
  IEvaluateSearchVideoConfig,
  IEvaluateWatchDirectVideoConfig,
  IHomeConfig,
  IResultState,
  ISearchStateConfig,
  ISessionConfig,
} from "./types/config";
import { logger } from "./utils/logger";
import { probabilityCheck, randomDelay } from "./utils/random";
import { SearchController } from "./controllers/search";
import { WatchDirectVideo } from "./controllers/direct-video";
import { ChannelController } from "./controllers/channel";

dotenv.config();
// Các controller toàn cục
let browserManager: BrowserManager;
let session: Session;
let homeController: HomeController;
let searchController: SearchController;
let watchDirectController: WatchDirectVideo;
let channelController: ChannelController;

// Các cấu hình toàn cục
let sessionConfig: ISessionConfig;
let homeConfig: IHomeConfig;
let evaluateHomeVIdeo: IEvaluateHomeVideoConfig;
let appConfig: IAppConfig;
let searchConfig: ISearchStateConfig;
let evaluateSearchVideo: IEvaluateSearchVideoConfig;
let evaluateWatchDirectVideo: IEvaluateWatchDirectVideoConfig;
let channelConfig: IChannelConfig;

/**
 * Hàm xử lý hành động tiếp theo dựa trên kết quả từ controller
 */
async function handleNextAction(actionResult: IResultState): Promise<void> {
  // Cập nhật thời gian hoạt động
  session.updateActivity();
  session.recordActivities(
    actionResult.action,
    actionResult.stateName || "Unknow"
  );

  // Kiểm tra giới hạn phiên
  const limits = session.checkLimits();
  if (limits.exceedsLimit) {
    logger.info(`Session limit exceeded: ${limits.reason}`);
    await browserManager.close();
    return; // Kết thúc phiên
  }

  session.recordStateTransition(
    actionResult.stateName || "Unknow",
    actionResult.action
  );

  switch (actionResult.action) {
    case "homeBrowsing":
      logger.info("Starting home browsing flow");
      await handleHomePage();
      break;

    case "endHomeBrowseEarly":
      logger.info("Ending home browse early, returning to home page");
      await handleHomePage();
      break;

    case "Search":
      logger.info("Starting search flow");
      await handleSearchPage();
      break;

    case "WatchDirect":
      logger.info("Starting direct watch flow");
      await handleWatchDirectVideo();
      break;

    case "viewChannel":
      logger.info("Starting channel browsing flow");
      await handleChannelBrowse();
      break;

    case "watchVideo":
      logger.info("Starting video watching flow");
      await handleWatchVideo(actionResult.data);
      break;

    case "endNow":
      logger.info("Ending session now as requested");
      await randomDelay(2000, 5000);
      await browserManager.close();
      return; // Kết thúc phiên

    case "None":
    default:
      logger.info(
        `Unknown action: ${actionResult.action}, returning to home page`
      );
      // await handleHomePage();
      break;
  }
}

/**
 * Hàm xử lý trang tìm kiếm
 */
async function handleSearchPage(): Promise<void> {
  logger.info("Handling search page");
  const keyw = searchConfig.keywords as any;
  const keywords = keyw.split("|");
  searchConfig = {
    ...searchConfig,
    ...evaluateSearchVideo,
    keywords,
  };
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
 * Hàm xử lý trực tiếp xem video
 */
async function handleWatchDirectVideo(): Promise<void> {
  logger.info("Handling direct video watching");

  const result = await watchDirectController.watchVideoDriect(
    session,
    evaluateWatchDirectVideo
  );

  logger.info("Watch video direct completed with result:", {
    action: result.action,
    data: result.data,
  });

  await handleNextAction(result);
}

/**
 * Hàm xử lý duyệt kênh
 */
async function handleChannelBrowse(): Promise<void> {
  logger.info("Handling channel browsing");
  const result = await channelController.browseChannel(session, channelConfig);

  logger.info("Channel completed with result:", {
    action: result.action,
    data: result.data,
  });

  await handleNextAction(result);
}

/**
 * Hàm xử lý xem video
 */
async function handleWatchVideo(videoData?: any): Promise<void> {
  logger.info("Handling video watching", { videoData });
}

async function handleHomePage() {
  logger.info("Handling home page");
  await homeController.navigateToHome();
  const result = await homeController.browseHomePage(session, {
    ...homeConfig,
    ...evaluateHomeVIdeo,
  });

  await handleNextAction(result);
}

async function main() {
  try {
    sessionConfig = await getConfig(CONFIG_OBJECT.Sessions);
    homeConfig = await getConfig(CONFIG_OBJECT.HomeBrowsing);
    evaluateHomeVIdeo = await getConfig(CONFIG_OBJECT.EvaluateHomeVideo);
    appConfig = await getConfig(CONFIG_OBJECT.App);
    searchConfig = await getConfig(CONFIG_OBJECT.Search);
    evaluateSearchVideo = await getConfig(CONFIG_OBJECT.EvaluateSearchVideo);
    evaluateWatchDirectVideo = await getConfig(
      CONFIG_OBJECT.EvaluateDirectVideo
    );
    channelConfig = await getConfig(CONFIG_OBJECT.ChannelBrowsing);
    logger.info("Config loaded successfully");

    // 1. Initialize session
    session = new Session(sessionConfig);
    logger.info("Session initialized successfully");

    // 2. Setup browser
    browserManager = BrowserManager.getInstance();

    logger.info("Browser manager initialized");
    homeController = new HomeController();
    searchController = new SearchController();
    watchDirectController = new WatchDirectVideo();
    channelController = new ChannelController();

    // 3. Launch browser and create page
    await browserManager.launchPersistent();
    logger.info("Browser launched successfully");
    await browserManager.navigateTo("https://www.youtube.com/");
    await randomDelay(2000, 3000);
    if (
      probabilityCheck(appConfig.probHomeBrowsing, "probHomeBrowsing", session)
    ) {
      await handleNextAction({
        action: "homeBrowsing",
        stateName: "MainProcess",
      });
    } else if (probabilityCheck(appConfig.probSearch, "probSearch", session)) {
      await handleNextAction({
        action: "Search",
        stateName: "MainProcess",
      });
    } else if (
      probabilityCheck(appConfig.probWatchDirect, "probWatchDirect", session)
    ) {
      await handleNextAction({
        action: "WatchDirect",
        stateName: "MainProcess",
      });
    } else if (
      probabilityCheck(
        appConfig.probEndSessionNow,
        "probEndSessionNow",
        session
      )
    ) {
      await handleNextAction({
        action: "endNow",
        stateName: "MainProcess",
      });
    } else if (
      probabilityCheck(
        appConfig.probChannelBrowse,
        "probChannelBrowse",
        session
      )
    ) {
      await handleNextAction({
        action: "viewChannel",
        stateName: "MainProcess",
      });
    } else {
      console.log("NO actigon ");
    }

    await randomDelay(3000, 5000);

    session.saveHTMLReport();

    await randomDelay(5000, 10000); // Wait a bit before closing
    await browserManager.close();
    logger.info("Browser closed");

    logger.info("Session completed successfully");
  } catch (error) {
    logger.error("Error in main process", error);

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
