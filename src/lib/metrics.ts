export type SeriesPoint = { date: string; value: number };

/**
 * Calculate percentage delta between current and previous values
 * Handles edge cases: NaN, Infinity, division by zero
 */
export function pctDelta(curr: number, prev: number) {
  if (!isFinite(curr) || !isFinite(prev)) return { delta: 0, label: "0%" };
  if (prev === 0) return { delta: curr > 0 ? 100 : 0, label: curr > 0 ? "+100%" : "0%" };
  const d = ((curr - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(d * 10) / 10;
  return { delta: rounded, label: `${rounded > 0 ? "+" : ""}${rounded}%` };
}

/**
 * Sum an array of numbers
 */
export function sum(arr: number[]) { 
  return arr.reduce((a, b) => a + b, 0); 
}

/**
 * Split an array into current and previous periods of equal length
 * Useful for period-over-period comparisons
 * 
 * @param arr - Array to split
 * @param lenCurr - Length of current period
 * @returns Object with `curr` and `prev` arrays
 */
export function splitCurrentPrev<T>(arr: T[], lenCurr: number) {
  const curr = arr.slice(-lenCurr);
  const prev = arr.slice(-(lenCurr * 2), -lenCurr);
  return { curr, prev };
}

