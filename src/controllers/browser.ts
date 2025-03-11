import { chromium, Browser, BrowserContext, Page } from "playwright";
import { logger } from "../utils/logger";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";

dotenv.config();

export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private userDataDir: string;
  private endpointURL: string = "";

  private constructor() {
    // Tạo thư mục lưu user data nếu chưa tồn tại
    this.userDataDir = `../config/Profile1`;
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
    await this.loadProfile();
    if (!this.context) {
      logger.info("Launching persistent browser context", {
        headless: options.headless,
        userDataDir: this.userDataDir,
      });

      const browser = await chromium.connectOverCDP(this.endpointURL);
      this.browser = browser;
      this.context = browser.contexts()[0] || (await browser.newContext());
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
      // Nếu không có page nào, tạo mới
      return await this.newPage();
    } else {
      // Nếu đã có page, kiểm tra xem page có còn mở không
      try {
        // Thử thực hiện một hành động đơn giản để kiểm tra
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
    await axios.get("http://localhost:4980/api/v1/profiles/171656/close");
    this.context = null;
    this.browser = null;
    this.page = null;
  }

  async clearCookiesAndStorage(): Promise<void> {
    logger.info("Clearing cookies and storage");
    if (this.context) {
      await this.context.clearCookies();
    }

    if (this.page) {
      // Xóa localStorage và sessionStorage
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
  }

  async saveScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error("No page available for screenshot");
    }

    // Đảm bảo thư mục screenshots tồn tại
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

  // Thêm phương thức để lưu lại cookies hiện tại
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

  // Thêm phương thức để tải cookies từ file
  async loadCookiesFromFile(
    filename: string = "cookies.json"
  ): Promise<boolean> {
    const filepath = path.join(process.cwd(), "data", filename);

    if (!fs.existsSync(filepath)) {
      logger.warn(`Cookies file not found: ${filepath}`);
      return false;
    }

    if (!this.context) {
      await this.launchPersistent();
    }

    try {
      const cookiesJson = fs.readFileSync(filepath, "utf-8");
      const cookies = JSON.parse(cookiesJson);
      await this.context!.addCookies(cookies);
      logger.info(`Cookies loaded from ${filepath}`);
      return true;
    } catch (error) {
      logger.error("Error loading cookies from file", { error });
      return false;
    }
  }

  async loadProfile() {
    try {
      const response = await axios.get(
        "http://localhost:4980/api/v1/profiles/171656/open"
      );

      if (response.data && response.data.status) {
        this.endpointURL = response.data.data.ws;
      }
    } catch (error) {
      logger.info("Lỗi loading profile mkt", { error });
    }
  }
}
