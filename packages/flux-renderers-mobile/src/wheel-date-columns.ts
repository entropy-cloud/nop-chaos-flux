import type { WheelPickerOption } from './schemas.js';

/**
 * Pure column-config generators for the wheel date/time pickers (plan 665
 * Phase 3, M7c). arco's "one kernel, four components" structure: these
 * functions are the ONLY difference between wheel-picker, wheel-date-picker
 * and wheel-time-picker — the WheelView kernel is untouched.
 */

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(value: string | null | undefined): DateParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function encodeDate(parts: [number, number, number]): string {
  return `${parts[0]}-${pad2(parts[1])}-${pad2(parts[2])}`;
}

/** Tuple form of {@link parseDateParts}; null for non-YYYY-MM-DD input. */
export function decodeDate(value: string | null | undefined): [number, number, number] | null {
  const parts = parseDateParts(value);
  return parts ? [parts.year, parts.month, parts.day] : null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampToRange(parts: DateParts, min: DateParts, max: DateParts): DateParts {
  const asKey = (p: DateParts) => p.year * 10000 + p.month * 100 + p.day;
  if (asKey(parts) < asKey(min)) return { ...min };
  if (asKey(parts) > asKey(max)) return { ...max };
  return parts;
}

/** Year column spans [min.year, max.year]; month/day columns span the full
 * conventional ranges — per-selection convergence happens in
 * `dateSelectionFor` (day count + range clamp), keeping the options stable
 * across year/month changes (no column re-keying while dragging). */
export function wheelDateColumns(
  min: string,
  max: string,
): WheelPickerOption[][] {
  const minParts = parseDateParts(min) ?? { year: MIN_YEAR, month: 1, day: 1 };
  const maxParts = parseDateParts(max) ?? { year: MAX_YEAR, month: 12, day: 31 };
  const years: WheelPickerOption[] = [];
  for (let y = minParts.year; y <= maxParts.year; y += 1) {
    years.push({ label: `${y}`, value: y });
  }
  // Same-year ranges clamp the month column to the range (vant parity);
  // multi-year ranges keep the full 1–12 sweep — per-selection range
  // convergence stays in `dateSelectionFor`.
  const monthFloor = minParts.year === maxParts.year ? minParts.month : 1;
  const monthCeil = minParts.year === maxParts.year ? maxParts.month : 12;
  const months: WheelPickerOption[] = [];
  for (let m = monthFloor; m <= monthCeil; m += 1) {
    months.push({ label: pad2(m), value: m });
  }
  const days: WheelPickerOption[] = [];
  for (let d = 1; d <= 31; d += 1) {
    days.push({ label: pad2(d), value: d });
  }
  return [years, months, days];
}

/** Reconcile a (year, month, day) selection: clamp into min/max, then
 * converge the day to the selected month's length (2024-02-29 →
 * 2023-02-28). */
export function dateSelectionFor(
  min: string,
  max: string,
  value: [number, number, number] | null,
): [number, number, number] {
  const minParts = parseDateParts(min) ?? { year: MIN_YEAR, month: 1, day: 1 };
  const maxParts = parseDateParts(max) ?? { year: MAX_YEAR, month: 12, day: 31 };
  const selected: DateParts = value
    ? { year: value[0], month: value[1], day: value[2] }
    : { ...minParts };
  const bounded = clampToRange(selected, minParts, maxParts);
  const maxDay = daysInMonth(bounded.year, bounded.month);
  const day = Math.min(Math.max(1, bounded.day), maxDay);
  const dayBounded = clampToRange(
    { year: bounded.year, month: bounded.month, day },
    minParts,
    maxParts,
  );
  return [dayBounded.year, dayBounded.month, dayBounded.day];
}

export function wheelTimeColumns(minuteStep: number): WheelPickerOption[][] {
  const step = minuteStep > 0 ? minuteStep : 1;
  const hours: WheelPickerOption[] = [];
  for (let h = 0; h < 24; h += 1) {
    hours.push({ label: pad2(h), value: h });
  }
  const minutes: WheelPickerOption[] = [];
  for (let m = 0; m < 60; m += step) {
    minutes.push({ label: pad2(m), value: m });
  }
  return [hours, minutes];
}

export function encodeTime(parts: [number, number]): string {
  return `${pad2(parts[0])}:${pad2(parts[1])}`;
}

export function timeSelectionFor(
  value: string | null,
  minuteStep = 1,
): [number, number] {
  const step = minuteStep > 0 ? minuteStep : 1;
  if (!value) return [0, 0];
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return [0, 0];
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return [hour, Math.floor(minute / step) * step];
}
