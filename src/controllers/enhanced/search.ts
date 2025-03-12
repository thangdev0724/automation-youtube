// src/controllers/enhanced/search-controller.ts
import { SearchController } from "../search";
import { Session } from "../../models/session";
import { ISearchStateConfig } from "../../types/config";
import enhancedLogger from "../../utils/enhanced-logger";
import { checkProbability } from "../../utils/probability-helper";

/**
 * Enhanced SearchController with logging
 */
export class EnhancedSearchController extends SearchController {
  /**
   * Override the original probabilityCheck method for internal controller use
   */
  protected _checkProbability(
    value: number,
    propertyName: string,
    context?: any
  ): boolean {
    return checkProbability(value, "Search", propertyName, context);
  }

  /**
   * Override navigateToSearch to add logging
   */
  async navigateToSearch(): Promise<boolean> {
    enhancedLogger.logControllerMethod("SearchController", "navigateToSearch");

    try {
      const result = await super.navigateToSearch();

      enhancedLogger.logControllerMethod(
        "SearchController",
        "navigateToSearch_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in SearchController.navigateToSearch",
        error
      );

      throw error;
    }
  }

  /**
   * Override performSearch to add logging
   */
  async performSearch(
    session: Session,
    config: ISearchStateConfig,
    specificTerm?: string
  ): Promise<{ action: string; data?: any }> {
    enhancedLogger.logControllerMethod(
      "SearchController",
      "performSearch",
      {
        sessionId: session.startTime.toISOString(),
        specificTerm,
      },
      null,
      config
    );

    try {
      // Save the original probabilityCheck function
      const originalProbabilityCheck = (global as any).probabilityCheck;

      // Override the global probabilityCheck for the duration of this call
      (global as any).probabilityCheck = (percentage: number) =>
        checkProbability(percentage, "Search", "dynamic", {
          method: "performSearch",
        });

      const result = await super.performSearch(session, config, specificTerm);

      // Restore the original function
      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "SearchController",
        "performSearch_result",
        null,
        result,
        config
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in SearchController.performSearch", error);

      throw error;
    }
  }

  /**
   * Override executeSearchInput to add logging
   */
  async executeSearchInput(
    page: any,
    specificTerm?: string,
    correctSearchTypo: number = 15
  ): Promise<string> {
    enhancedLogger.logControllerMethod(
      "SearchController",
      "executeSearchInput",
      { specificTerm, correctSearchTypo }
    );

    try {
      // Let's directly expose this internal method for use with enhanced logging
      // This may require modifying the original SearchController to make this method public

      // Use checkProbability for the typo correction check
      const originalProbabilityCheck = (global as any).probabilityCheck;
      (global as any).probabilityCheck = (percentage: number) =>
        checkProbability(percentage, "Search", "correctSearchTypo", {
          specificTerm,
          originalValue: correctSearchTypo,
        });

      const result = await super["executeSearchInput"](
        page,
        specificTerm,
        correctSearchTypo
      );

      (global as any).probabilityCheck = originalProbabilityCheck;

      enhancedLogger.logControllerMethod(
        "SearchController",
        "executeSearchInput_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in SearchController.executeSearchInput",
        error
      );

      throw error;
    }
  }

  /**
   * Override getSuggestedSearchTerms to add logging
   */
  async getSuggestedSearchTerms(partialTerm: string): Promise<string[]> {
    enhancedLogger.logControllerMethod(
      "SearchController",
      "getSuggestedSearchTerms",
      { partialTerm }
    );

    try {
      const result = await super.getSuggestedSearchTerms(partialTerm);

      enhancedLogger.logControllerMethod(
        "SearchController",
        "getSuggestedSearchTerms_result",
        null,
        result
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in SearchController.getSuggestedSearchTerms",
        error
      );

      throw error;
    }
  }
}
