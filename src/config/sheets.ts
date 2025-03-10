import { google } from "googleapis";
import { JWT } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));

const auth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

export async function getConfig(sheetName: string) {
  logger.info("=>GoogleSheet: Start reading Google Sheet");
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      logger.info("=> GoogleSheet: No data found.");
      return [];
    }

    logger.info("=> GoogleSheet: found data");
    if (rows.length > 1) {
      const headers = rows[0];
      const data = rows.slice(1).map((row) => {
        let obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || null;
        });
        return obj;
      });

      // Hàm chuẩn hóa dữ liệu
      const normalizeData = (data = []) => {
        return data.map((item: any) => {
          return {
            [item.key.trim()]:
              item.value === "string" ? item.value.trim() : item.value,
            key: item.key.trim(),
          };
        });
      };

      const datas = normalizeData(data as any);
      const mergedObject = datas.reduce((acc: any, item) => {
        const key = item.key;
        acc[key] = item[key];
        return acc;
      }, {});
      return mergedObject;
    }
    return [];
  } catch (error) {
    logger.error("Error reading Google Sheet:", error);
  }
}
