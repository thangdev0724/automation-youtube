// src/controllers/enhanced/browser-manager.ts
import { BrowserManager } from "../browser";
import { Page, BrowserContext, Browser } from "playwright";
import enhancedLogger from "../../utils/enhanced-logger";

/**
 * Enhanced BrowserManager with logging
 */
export class EnhancedBrowserManager {
  private static instance: EnhancedBrowserManager;
  private originalManager: BrowserManager;

  private constructor() {
    this.originalManager = BrowserManager.getInstance();
  }

  public static getInstance(): EnhancedBrowserManager {
    if (!EnhancedBrowserManager.instance) {
      EnhancedBrowserManager.instance = new EnhancedBrowserManager();
    }
    return EnhancedBrowserManager.instance;
  }

  /**
   * Launch browser with persistent context and logging
   */
  async launchPersistent(options?: {
    headless?: boolean;
    slowMo?: number;
  }): Promise<BrowserContext> {
    enhancedLogger.logControllerMethod(
      "BrowserManager",
      "launchPersistent",
      options
    );

    try {
      const result = await this.originalManager.launchPersistent({
        headless: options?.headless || false,
        slowMo: options?.slowMo || 50,
      });

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "launchPersistent_result",
        null,
        { success: true }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError(
        "Error in BrowserManager.launchPersistent",
        error
      );

      throw error;
    }
  }

  /**
   * Create a new page with logging
   */
  async newPage(): Promise<Page> {
    enhancedLogger.logControllerMethod("BrowserManager", "newPage");

    try {
      const result = await this.originalManager.newPage();

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "newPage_result",
        null,
        { success: true }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in BrowserManager.newPage", error);

      throw error;
    }
  }

  /**
   * Get current page with logging
   */
  async getCurrentPage(): Promise<Page> {
    enhancedLogger.logControllerMethod("BrowserManager", "getCurrentPage");

    try {
      const result = await this.originalManager.getCurrentPage();

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "getCurrentPage_result",
        null,
        { success: true }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in BrowserManager.getCurrentPage", error);

      throw error;
    }
  }

  /**
   * Navigate to a URL with logging
   */
  async navigateTo(
    url: string,
    options?: { waitUntil: "networkidle" }
  ): Promise<void> {
    enhancedLogger.logControllerMethod("BrowserManager", "navigateTo", {
      url,
      options,
    });

    try {
      await this.originalManager.navigateTo(url, options);

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "navigateTo_result",
        null,
        { success: true }
      );
    } catch (error) {
      enhancedLogger.logError("Error in BrowserManager.navigateTo", error);

      throw error;
    }
  }

  /**
   * Close browser with logging
   */
  async close(): Promise<void> {
    enhancedLogger.logControllerMethod("BrowserManager", "close");

    try {
      await this.originalManager.close();

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "close_result",
        null,
        { success: true }
      );
    } catch (error) {
      enhancedLogger.logError("Error in BrowserManager.close", error);

      throw error;
    }
  }

  /**
   * Save screenshot with logging
   */
  async saveScreenshot(name: string): Promise<string> {
    enhancedLogger.logControllerMethod("BrowserManager", "saveScreenshot", {
      name,
    });

    try {
      const result = await this.originalManager.saveScreenshot(name);

      enhancedLogger.logControllerMethod(
        "BrowserManager",
        "saveScreenshot_result",
        null,
        { path: result }
      );

      return result;
    } catch (error) {
      enhancedLogger.logError("Error in BrowserManager.saveScreenshot", error);

      throw error;
    }
  }

  /**
   * All other methods are passthrough to the original manager
   */
  async clearCookiesAndStorage(): Promise<void> {
    return this.originalManager.clearCookiesAndStorage();
  }

  async saveCookiesToFile(filename?: string): Promise<void> {
    return this.originalManager.saveCookiesToFile(filename);
  }

  async loadCookiesFromFile(filename?: string): Promise<boolean> {
    return this.originalManager.loadCookiesFromFile(filename);
  }
}
