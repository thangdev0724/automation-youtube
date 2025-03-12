// src/utils/monkey-patch.ts
import enhancedLogger from "./enhanced-logger";
import { checkProbability } from "./probability-helper";
import { randomInt, randomDelay, delay } from "./enhanced-random";

/**
 * Performs monkey patching of standard random functions to ensure all
 * random values are logged, even when called from original controllers
 */
export function setupMonkeyPatching(): void {
  const originalMathRandom = Math.random;

  // Override Math.random to log every call
  Math.random = function () {
    const result = originalMathRandom.call(this);

    // Log the raw random value
    enhancedLogger.logRandomValue(
      "Math.random",
      { source: new Error().stack?.split("\n")[2]?.trim() || "unknown" },
      result,
      "raw_random"
    );

    return result;
  };

  // Add global probabilityCheck function that uses our enhanced version
  if (!(global as any).probabilityCheck) {
    (global as any).probabilityCheck = (percentage: number) => {
      // Try to determine the caller
      const stack = new Error().stack;
      const callerInfo = stack?.split("\n")[2]?.trim() || "unknown";

      return checkProbability(percentage, "Unknown", "dynamic_probability", {
        callerInfo,
        stack: stack,
      });
    };
  }

  // Add global randomInt function
  if (!(global as any).randomInt) {
    (global as any).randomInt = randomInt;
  }

  // Add global randomDelay function
  if (!(global as any).randomDelay) {
    (global as any).randomDelay = randomDelay;
  }

  // Add global delay function
  if (!(global as any).delay) {
    (global as any).delay = delay;
  }

  console.log(
    "🔍 Enhanced logging: Random functions have been monkey patched for comprehensive logging"
  );
}

/**
 * Restore original Math.random and remove global functions
 */
export function restoreOriginalFunctions(): void {
  // This would be implemented if we need to restore the original functions
  // Currently not needed since the process ends after the session
  console.log("🔍 Enhanced logging: Original functions restored");
}
