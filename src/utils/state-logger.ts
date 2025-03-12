// src/utils/state-logger.ts
import enhancedLogger from "./enhanced-logger";

/**
 * Log state transitions from the XState machine
 */
export function logStateTransition(
  fromState: string,
  toState: string,
  data?: any
): void {
  enhancedLogger.logStateTransition(fromState, toState, data);
}

/**
 * Log actions being performed
 */
export function logAction(action: string, data?: any): void {
  enhancedLogger.logAction(action, data);
}

/**
 * Log configuration loaded
 */
export function logConfig(configName: string, config: any): void {
  enhancedLogger.logConfig(configName, config);
}

/**
 * Log session information updates
 */
export function logSessionInfo(sessionInfo: any): void {
  enhancedLogger.logSessionInfo(sessionInfo);
}

/**
 * Generate and save HTML report
 */
export function generateReport(): string {
  return enhancedLogger.saveHTMLReport();
}

/**
 * Save raw logs as JSON
 */
export function saveRawLogs(): string {
  return enhancedLogger.saveRawLogs();
}
