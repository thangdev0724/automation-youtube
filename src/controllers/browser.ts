import { chromium, Browser, BrowserContext, Page } from "playwright";
import { logger } from "../utils/logger";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private userDataDir: string;

  private constructor() {
    // Tạo thư mục lưu user data nếu chưa tồn tại
    this.userDataDir = `/Users/thangdev/Library/Application Support/Google/Chrome/Profile1`;
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async launchPersistent(
    options = {
      headless: process.env.HEADLESS === "true",
      slowMo: parseInt(process.env.SLOW_MO || "50", 10),
    }
  ): Promise<BrowserContext> {
    if (!this.context) {
      logger.info("Launching persistent browser context", {
        headless: options.headless,
        userDataDir: this.userDataDir,
      });

      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: options.headless,
        slowMo: options.slowMo,
        viewport: { width: 1200, height: 847 },
        acceptDownloads: true,
      });

      this.browser = this.context.browser();
    }

    return this.context;
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      await this.launchPersistent();
    }

    logger.info("Creating new page");
    this.page = await this.context!.newPage();
    return this.page;
  }

  async getCurrentPage(): Promise<Page> {
    if (!this.page) {
      return await this.newPage();
    } else {
      try {
        console.log(this.page.url());
        await this.page.evaluate(() => true);
        return this.page;
      } catch (error) {
        logger.warn("Current page is no longer available, creating new page");
        return await this.newPage();
      }
    }
  }

  async navigateTo(
    url: string,
    options = { waitUntil: "networkidle" as "networkidle" }
  ): Promise<void> {
    try {
      const page = await this.getCurrentPage();
      logger.info(`Navigating to: ${url}`);
      await page.goto(url, options);
    } catch (error) {
      logger.error("Navigating =>>", {
        url,
        error,
      });
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      logger.info("Closing browser context");
      await this.context.close();
      this.context = null;
      this.page = null;
    }

    if (this.browser) {
      logger.info("Closing browser");
      await this.browser.close();
      this.browser = null;
    }
  }

  async saveScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error("No page available for screenshot");
    }

    const screenshotsDir = path.join(process.cwd(), "logs", "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);

    logger.info(`Taking screenshot: ${filepath}`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  async saveCookiesToFile(filename: string = "cookies.json"): Promise<void> {
    if (!this.context) {
      throw new Error("No browser context available");
    }

    const cookies = await this.context.cookies();
    const cookiesDir = path.join(process.cwd(), "data");

    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    const filepath = path.join(cookiesDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(cookies, null, 2));
    logger.info(`Cookies saved to ${filepath}`);
  }
}
