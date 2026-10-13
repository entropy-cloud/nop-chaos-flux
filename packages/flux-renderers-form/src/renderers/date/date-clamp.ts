import { isWithinRange } from './date-utils.js';

/** Clamp a number into `[min, max]` (hour/minute numeric-entry bounds). */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Clamp a date into `[minDate, maxDate]` (calendar-local bounds). `undefined`
 * passes through; a date below `minDate` snaps to a `minDate` copy, a date
 * above `maxDate` snaps to a `maxDate` copy, anything else returns as-is
 * (invalid/NaN dates included — they fall through both comparisons).
 */
export function clampToRange(
  date: Date | undefined,
  minDate: Date | undefined,
  maxDate: Date | undefined,
): Date | undefined {
  if (!date) return date;
  if (minDate && date.getTime() < minDate.getTime()) return new Date(minDate);
  if (maxDate && date.getTime() > maxDate.getTime()) return new Date(maxDate);
  return date;
}

/**
 * Clamp a date into the `[minTime, maxTime]` window (isWithinRange fast-path
 * first). Asymmetric by contract: with only `maxDate` declared, anything
 * outside the window snaps to `maxDate`; `undefined`/invalid dates fall
 * through when no bound catches them.
 */
export function clampIntoWindow(
  date: Date,
  minDate: Date | undefined,
  maxDate: Date | undefined,
): Date {
  if (isWithinRange(date, minDate, maxDate)) {
    return date;
  }
  if (minDate && date.getTime() < minDate.getTime()) {
    return new Date(minDate);
  }
  if (maxDate) {
    return new Date(maxDate);
  }
  return date;
}
