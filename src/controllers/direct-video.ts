import { HOME_VIDEO_LINK_TITLE } from "../constants/selector";
import { Session } from "../models/session";
import { IEvaluateWatchDirectVideoConfig, IResultState } from "../types/config";
import { logger } from "../utils/logger";
import { delay, probabilityCheck, randomDelay } from "../utils/random";
import { HelperViewPort } from "./helper";

export class WatchDirectVideo extends HelperViewPort {
  constructor() {
    super();
  }

  async watchVideoDriect(
    session: Session,
    config: IEvaluateWatchDirectVideoConfig
  ): Promise<IResultState> {
    const result: IResultState = {
      action: "None",
      stateName: "WatchDirect",
    };
    logger.info("Watch direct video starting...");
    const page = await this.getBrowserManager().getCurrentPage();
    await this.elementsInViewport({
      selector: HOME_VIDEO_LINK_TITLE,
      classCus: "automated-video-directed",
    });
    await randomDelay(1000, 2000);
    try {
      if (
        probabilityCheck(
          config.probDirectVideoGood,
          "probDirectVideoGood",
          session
        )
      ) {
        logger.info("Evaluated video is good...");

        if (
          probabilityCheck(
            config.probWatchIfGoodDirect,
            "probWatchIfGoodDirect",
            session
          )
        ) {
          session.recordActivities("WatchVidGood", "DriectVideo");
          await this.playRandomVideo(
            page,
            session,
            "automated-video-directed",
            "DirectVideo"
          );
          await randomDelay(2000, 4000);
          result.action = "watchVideo";
        } else {
          session.recordActivities("skipWatchVideo", "DriectVideo");
        }
      } else {
        logger.info("Evaluated video is bad...");
        if (
          probabilityCheck(
            config.probWatchIfBadDirect,
            "probWatchIfBadDirect",
            session
          )
        ) {
          session.recordActivities("WatchVidBad", "DriectVideo");
          await this.playRandomVideo(
            page,
            session,
            "automated-video-directed",
            "DirectVideo"
          );
          await randomDelay(2000, 4000);
          result.action = "watchVideo";
        } else {
          session.recordActivities("skipWatchVideo", "DriectVideo");
        }
      }
    } catch (error) {
      console.log(error);
      session.recordError(error, "WatchDirectVideo", "watchVideoDriect");
    } finally {
      return result;
    }
  }
}
