// src/utils/probability-helper.ts
import { probabilityCheck } from "./enhanced-random";

/**
 * Helper to perform a probability check with proper configuration context
 * @param value The probability value to check (0-100)
 * @param configName The name of the configuration section (e.g., 'Home', 'Search', 'Video')
 * @param propertyName The specific property in the configuration
 * @param context Additional context information
 */
export function checkProbability(
  value: number,
  configName: string,
  propertyName: string,
  context?: any
): boolean {
  return probabilityCheck(value, configName, propertyName, {
    context,
    timestamp: new Date().toISOString(),
  });
}
