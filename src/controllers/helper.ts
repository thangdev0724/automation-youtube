import { Page } from "playwright";
import { Session } from "../models/session";
import { randomInt } from "crypto";
import { probabilityCheck, randomDelay } from "../utils/random";
import { logger } from "../utils/logger";
import { PERCENTAGE_SCROLL_PAGE } from "../constants/config";
import { BrowserManager } from "./browser";

export class HelperViewPort {
  private browserManager: BrowserManager;

  constructor() {
    this.browserManager = BrowserManager.getInstance();
  }

  getBrowserManager() {
    return this.browserManager;
  }

  async scrollDown() {
    const page = await this.browserManager.getCurrentPage();
    await page.evaluate((percen: number) => {
      window.scrollBy({
        top: window.innerHeight * percen,
        behavior: "smooth",
      });
    }, PERCENTAGE_SCROLL_PAGE);
  }

  async elementsInViewport(obj: {
    selector: string;
    classCus: string;
  }): Promise<Element[]> {
    const page = await this.browserManager.getCurrentPage();
    return await page.evaluate((obj) => {
      return Array.from(document.querySelectorAll(obj.selector))
        .map((el, id) => {
          el.classList.add(obj.classCus);
          return el;
        })
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
          );
        });
    }, obj);
  }

  async playRandomVideo(
    page: Page,
    session: Session,
    classCus: string,
    recordAtvNm: string
  ) {
    try {
      const elements = await page.$$(`.${classCus}`);
      const randomIndex = randomInt(0, elements.length - 1);
      const randomElement = elements[randomIndex];
      const title = await randomElement.textContent();
      session.recordActivities("playVideo", recordAtvNm, {
        title: title,
      });
      logger.info(`Hovering over video ${title}`);
      await randomElement.hover();
      await randomDelay(1000, 2000);
      logger.info(`Watching video: ${title}`);
      await randomElement.click();
    } catch (error) {
      console.log(error);
      session.recordError(error, "playRandomVideo", recordAtvNm);
      throw new Error("Error playing random video");
    }
  }
}
