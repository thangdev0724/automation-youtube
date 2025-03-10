/**
 * Returns true with the given probability percentage
 */
export function probabilityCheck(percentage: number): boolean {
  return Math.random() * 100 <= percentage;
}

/**
 * Returns a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Waits for a random duration between min and max milliseconds
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const delay = randomInt(min, max);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
