// src/utils/enhanced-random.ts
import enhancedLogger from "./enhanced-logger";

/**
 * Returns true with the given probability percentage
 * Enhanced version with logging and config context
 * @param percentage Probability percentage (0-100)
 * @param configName Optional name of the configuration section
 * @param configProperty Optional name of the specific property in configuration
 * @param configContext Additional context about where this check originated
 */
export function probabilityCheck(
  percentage: number,
  configName?: string,
  configProperty?: string,
  configContext?: any
): boolean {
  const randomValue = Math.random() * 100;
  const result = randomValue <= percentage;

  // Always log the probability check with detailed information
  enhancedLogger.logProbabilityCheck(
    "probabilityCheck",
    percentage,
    randomValue,
    result,
    "probability",
    configName,
    configProperty,
    configContext
  );

  return result;
}

/**
 * Returns a random integer between min and max (inclusive)
 * Enhanced version with logging and config context
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @param configName Optional name of the configuration section
 * @param configProperty Optional name of the specific property in configuration
 */
export function randomInt(
  min: number,
  max: number,
  configName?: string,
  configProperty?: string
): number {
  const result = Math.floor(Math.random() * (max - min + 1)) + min;

  // Always log the random int generation
  enhancedLogger.logRandomValue(
    "randomInt",
    { min, max },
    result,
    "random",
    configName,
    { property: configProperty, min, max }
  );

  return result;
}

/**
 * Waits for a random duration between min and max milliseconds
 * Enhanced version with logging and config context
 * @param min Minimum delay time in milliseconds
 * @param max Maximum delay time in milliseconds
 * @param configName Optional name of the configuration section
 * @param configProperty Optional name of the specific property in configuration
 */
export async function randomDelay(
  min: number,
  max: number,
  configName?: string,
  configProperty?: string
): Promise<void> {
  // Generate the random delay using randomInt to ensure we log that too
  const delayTime = randomInt(
    min,
    max,
    configName,
    `${configProperty || "unknown"}_randomDelay`
  );

  // Explicitly log the random delay operation (separate from the randomInt log)
  enhancedLogger.logRandomValue(
    "randomDelay",
    { min, max },
    delayTime,
    "delay",
    configName,
    { property: configProperty || "unknown", min, max }
  );

  await new Promise((resolve) => setTimeout(resolve, delayTime));
}

/**
 * Fixed delay with logging
 * @param time Delay time in milliseconds
 * @param reason Optional reason for the delay
 */
export async function delay(time: number, reason?: string): Promise<void> {
  enhancedLogger.logRandomValue("delay", { time, reason }, time, "delay");

  await new Promise((resolve) => setTimeout(resolve, time));
}
