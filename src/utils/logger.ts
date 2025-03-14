import winston from "winston";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
});
