// src/controllers/enhanced/channel-controller.ts
import { ChannelController } from "../channel";
import { Session } from "../../models/session";
import { IChannelConfig } from "../../types/config";
import enhancedLogger from "../../utils/enhanced-logger";
import { checkProbability } from "../../utils/probability-helper";

/**
 * Enhanced ChannelController with logging
 */
export class EnhancedChannelController extends ChannelController {
  /**
   * Override the original probabilityCheck method for internal controller use
   */
  protected _checkProbability(
    value: number,
    propertyName: string,
    context?: any
  ): boolean {
    return checkProbability(value, "Channel", propertyName, context);
  }

  /**
   * Override browseChannel to add logging
   */
  async browseChannel(
    session: Session,
    config: IChannelConfig,
    channelData?: {
      channelUrl?: string;
      channelName?: string;
    }
  ): Promise<{ action: string; data?: any }> {
    enhancedLogger.logControllerMethod(
      "ChannelController",
      "browseChannel",
      {
        sessionId: session.startTime.toISOString(),
        channelName: channelData?.channelName || "Unknown",
        channelUrl: channelData?.channelUrl || "Unknown",
      },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for the duration of this call
      (global as any).probabilityCheck = (percentage: number) => {
        // Try to guess which channel config is being used based on percentage value
        let propertyName = "unknown";

        if (percentage === config.channelToVideo)
          propertyName = "channelToVideo";
        else if (percentage === config.channelToSearch)
          propertyName = "channelToSearch";
        else if (percentage === config.channelToHome)
          propertyName = "channelToHome";
        else if (percentage === config.viewChannelInfo)
          propertyName = "viewChannelInfo";
        else if (percentage === config.viewChannelVideos)
          propertyName = "viewChannelVideos";
        else if (percentage === config.selectChannelVideo)
          propertyName = "selectChannelVideo";
        else if (percentage === config.switchChannelTab)
          propertyName = "switchChannelTab";
        else if (percentage === config.leaveChannel)
          propertyName = "leaveChannel";

        return checkProbability(percentage, "Channel", propertyName, {
          method: "browseChannel",
          channelName: channelData?.channelName,
        });
      };

      const result = await super.browseChannel(session, config, channelData);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "ChannelController",
        "browseChannel_result",
        null,
        result,
        config
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in ChannelController.browseChannel",
        error
      );

      throw error;
    }
  }

  /**
   * Override isChannelSubscribed to add logging
   */
  async isChannelSubscribed(page: any): Promise<boolean> {
    enhancedLogger.logControllerMethod(
      "ChannelController",
      "isChannelSubscribed"
    );

    try {
      const result = await super.isChannelSubscribed(page);

      enhancedLogger.logControllerMethod(
        "ChannelController",
        "isChannelSubscribed_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in ChannelController.isChannelSubscribed",
        error
      );

      throw error;
    }
  }

  /**
   * Override viewChannelInfo to add logging
   */
  public async viewChannelInfo(page: any): Promise<void> {
    enhancedLogger.logControllerMethod("ChannelController", "viewChannelInfo");

    try {
      // Call the original method via super, but this requires changing the private method to protected in the original class
      await super["viewChannelInfo"](page);

      enhancedLogger.logControllerMethod(
        "ChannelController",
        "viewChannelInfo_result"
      );
    } catch (error) {
      enhancedLogger.logError(
        "Error in ChannelController.viewChannelInfo",
        error
      );

      throw error;
    }
  }

  /**
   * Override viewVideosList to add logging
   */
  public async viewVideosList(page: any): Promise<void> {
    enhancedLogger.logControllerMethod("ChannelController", "viewVideosList");

    try {
      // Call the original method via super, but this requires changing the private method to protected in the original class
      await super["viewVideosList"](page);

      enhancedLogger.logControllerMethod(
        "ChannelController",
        "viewVideosList_result"
      );
    } catch (error) {
      enhancedLogger.logError(
        "Error in ChannelController.viewVideosList",
        error
      );

      throw error;
    }
  }

  /**
   * Override browseChannelVideos to add logging
   */
  async browseChannelVideos(
    page: any,
    session: Session,
    config: IChannelConfig
  ): Promise<{ action: string; data?: any }> {
    enhancedLogger.logControllerMethod(
      "ChannelController",
      "browseChannelVideos",
      {
        sessionId: session.startTime.toISOString(),
      },
      null,
      config
    );

    try {
      // Call the original method via super, but this requires changing the private method to protected in the original class
      const result = await super["browseChannelVideos"](page, session, config);

      enhancedLogger.logControllerMethod(
        "ChannelController",
        "browseChannelVideos_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in ChannelController.browseChannelVideos",
        error
      );

      throw error;
    }
  }
}
