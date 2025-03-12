// src/controllers/enhanced/video-controller.ts
import { VideoController } from "../video";
import { Session } from "../../models/session";
import { IWatchVideoConfig, IDetermineActionConfig } from "../../types/config";
import enhancedLogger from "../../utils/enhanced-logger";
import { checkProbability } from "../../utils/probability-helper";

/**
 * Enhanced VideoController with logging
 */
export class EnhancedVideoController extends VideoController {
  /**
   * Override the original probabilityCheck method for internal controller use
   */
  protected _checkProbability(
    value: number,
    propertyName: string,
    context?: any
  ): boolean {
    return checkProbability(value, "Video", propertyName, context);
  }

  /**
   * Override watchVideo to add logging
   */
  async watchVideo(
    session: Session,
    config: IWatchVideoConfig
  ): Promise<{ action: string; data?: any }> {
    enhancedLogger.logControllerMethod(
      "VideoController",
      "watchVideo",
      {
        sessionId: session.startTime.toISOString(),
        videosWatched: session.getVideosWatched(),
      },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for the duration of this call
      (global as any).probabilityCheck = (percentage: number) =>
        checkProbability(percentage, "Video", "dynamic", {
          method: "watchVideo",
        });

      const result = await super.watchVideo(session, config);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "VideoController",
        "watchVideo_result",
        null,
        {
          action: result.action,
          dataKeys: result.data ? Object.keys(result.data) : [],
        },
        config
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in VideoController.watchVideo", error);

      throw error;
    }
  }

  /**
   * Override decideInteractions to add logging
   */
  async decideInteractions(
    session: Session,
    config: IWatchVideoConfig,
    videoInfo: any
  ): Promise<{
    liked: boolean;
    commented: boolean;
    subscribed: boolean;
  }> {
    enhancedLogger.logControllerMethod(
      "VideoController",
      "decideInteractions",
      {
        sessionId: session.startTime.toISOString(),
        videoTitle: videoInfo?.title || "Unknown",
      },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for interactions
      (global as any).probabilityCheck = (percentage: number) => {
        // Try to guess which interaction is being checked based on percentage
        let propertyName = "unknown";

        if (percentage === config.likeVideo) propertyName = "likeVideo";
        else if (percentage === config.commentVideo)
          propertyName = "commentVideo";
        else if (percentage === config.subscribeChannel)
          propertyName = "subscribeChannel";
        else if (percentage === config.enableNotifications)
          propertyName = "enableNotifications";
        else if (percentage === config.editComment)
          propertyName = "editComment";

        return checkProbability(percentage, "Video", propertyName, {
          method: "decideInteractions",
          videoTitle: videoInfo?.title,
        });
      };

      const result = await super.decideInteractions(session, config, videoInfo);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "VideoController",
        "decideInteractions_result",
        null,
        result,
        config
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in VideoController.decideInteractions",
        error
      );

      throw error;
    }
  }

  /**
   * Override decideNextAction to add logging
   */
  async decideNextAction(
    session: Session,
    config: IDetermineActionConfig,
    videoInfo: any
  ): Promise<{ action: string; data?: any }> {
    enhancedLogger.logControllerMethod(
      "VideoController",
      "decideNextAction",
      {
        sessionId: session.startTime.toISOString(),
        videoTitle: videoInfo?.title || "Unknown",
      },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for next action decisions
      (global as any).probabilityCheck = (percentage: number) => {
        // Try to guess which action decision is being checked
        let propertyName = "unknown";

        if (percentage === config.watchSuggested)
          propertyName = "watchSuggested";
        else if (percentage === config.backToSearchResults)
          propertyName = "backToSearchResults";
        else if (percentage === config.newSearch) propertyName = "newSearch";
        else if (percentage === config.viewCurrentChannel)
          propertyName = "viewCurrentChannel";
        else if (percentage === config.endSessionEarly)
          propertyName = "endSessionEarly";

        return checkProbability(
          percentage,
          "NavigationDecision",
          propertyName,
          {
            method: "decideNextAction",
            videoTitle: videoInfo?.title,
          }
        );
      };

      const result = await super.decideNextAction(session, config, videoInfo);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "VideoController",
        "decideNextAction_result",
        null,
        result,
        config
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in VideoController.decideNextAction",
        error
      );

      throw error;
    }
  }

  /**
   * Handle interesting section with logging
   */
  async handleInterestingSection(
    page: any,
    config: IWatchVideoConfig,
    currentTime: number
  ): Promise<void> {
    enhancedLogger.logControllerMethod(
      "VideoController",
      "handleInterestingSection",
      { currentTime },
      null,
      {
        pauseDuration: config.pauseDuration,
        rewindTime: config.rewindTime,
      }
    );

    try {
      // Choose to pause or rewind using enhanced logging
      const pauseOrRewind = Math.random() > 0.5;
      enhancedLogger.logRandomValue(
        "interestingSectionDecision",
        { options: ["pause", "rewind"] },
        pauseOrRewind ? "pause" : "rewind",
        "decision",
        "Video",
        {
          property: "interestingSection",
          decision: pauseOrRewind ? "pause" : "rewind",
        }
      );

      // Call the original method - make sure it's accessible via super
      await super["handleInterestingSection"](page, config, currentTime);

      enhancedLogger.logControllerMethod(
        "VideoController",
        "handleInterestingSection_result"
      );
    } catch (error) {
      enhancedLogger.logError(
        "Error in VideoController.handleInterestingSection",
        error
      );

      throw error;
    }
  }

  /**
   * Handle boring section with logging
   */
  async handleBoringSection(
    page: any,
    config: IWatchVideoConfig
  ): Promise<number> {
    enhancedLogger.logControllerMethod(
      "VideoController",
      "handleBoringSection",
      null,
      null,
      { skipTime: config.skipTime }
    );

    try {
      const result = await super["handleBoringSection"](page, config);

      enhancedLogger.logControllerMethod(
        "VideoController",
        "handleBoringSection_result",
        null,
        { skippedSeconds: result }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in VideoController.handleBoringSection",
        error
      );

      throw error;
    }
  }
}
