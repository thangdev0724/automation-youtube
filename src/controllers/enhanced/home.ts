// src/controllers/enhanced/home-controller.ts
import { HomeController } from "../home";
import { Session } from "../../models/session";
import { IHomeStateConfig } from "../../types/config";
import enhancedLogger from "../../utils/enhanced-logger";
import { randomDelay, randomInt } from "../../utils/enhanced-random";
import { checkProbability } from "../../utils/probability-helper";

/**
 * Enhanced HomeController with logging
 */
export class EnhancedHomeController extends HomeController {
  /**
   * Override the original probabilityCheck method to add config context
   * This is used within the original HomeController class
   */
  protected _checkProbability(
    value: number,
    propertyName: string,
    context?: any
  ): boolean {
    return checkProbability(value, "Home", propertyName, context);
  }

  /**
   * Duyệt trang chủ YouTube với logging
   */
  async browseHomePage(
    session: Session,
    config: IHomeStateConfig
  ): Promise<{ action: string; data?: any }> {
    // Log the method call with config
    enhancedLogger.logControllerMethod(
      "HomeController",
      "browseHomePage",
      { sessionId: session.startTime.toISOString() },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for the duration of this call
      // This ensures existing code will use our enhanced version
      (global as any).probabilityCheck = (percentage: number) =>
        checkProbability(percentage, "Home", "dynamic", {
          method: "browseHomePage",
        });

      // Call the original method
      const result = await super.browseHomePage(session, config);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      // Log the result
      enhancedLogger.logControllerMethod(
        "HomeController",
        "browseHomePage_result",
        null,
        result,
        config
      );

      return result;
    } catch (error) {
      // Log any errors
      enhancedLogger.logError("Error in HomeController.browseHomePage", error);

      throw error;
    }
  }

  /**
   * Override navigateToHome to add logging
   */
  async navigateToHome(): Promise<boolean> {
    enhancedLogger.logControllerMethod("HomeController", "navigateToHome");

    try {
      const result = await super.navigateToHome();

      enhancedLogger.logControllerMethod(
        "HomeController",
        "navigateToHome_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in HomeController.navigateToHome", error);

      throw error;
    }
  }

  /**
   * Override scrollPage to add logging
   */
  async scrollPage(scrollDistance: number = 0.7): Promise<void> {
    enhancedLogger.logControllerMethod("HomeController", "scrollPage", {
      scrollDistance,
    });

    try {
      await super.scrollPage(scrollDistance);

      enhancedLogger.logControllerMethod("HomeController", "scrollPage_result");
    } catch (error) {
      enhancedLogger.logError("Error in HomeController.scrollPage", error);

      throw error;
    }
  }

  /**
   * Override scrollUp to add logging
   */
  async scrollUp(scrollDistance: number = 0.5): Promise<void> {
    enhancedLogger.logControllerMethod("HomeController", "scrollUp", {
      scrollDistance,
    });

    try {
      await super.scrollUp(scrollDistance);

      enhancedLogger.logControllerMethod("HomeController", "scrollUp_result");
    } catch (error) {
      enhancedLogger.logError("Error in HomeController.scrollUp", error);

      throw error;
    }
  }

  /**
   * Enhanced getHomePageElements with logging
   */
  async getHomePageElements() {
    enhancedLogger.logControllerMethod("HomeController", "getHomePageElements");

    try {
      const result = await super.getHomePageElements();

      enhancedLogger.logControllerMethod(
        "HomeController",
        "getHomePageElements_result",
        null,
        {
          thumbnailsCount: result.videoThumbnails
            ? result.videoThumbnails.length
            : 0,
          hasSearchBox: !!result.searchBox,
          hasNotificationButton: !!result.notificationButton,
          hasHomeButton: !!result.homeButton,
        }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in HomeController.getHomePageElements",
        error
      );

      throw error;
    }
  }
}
