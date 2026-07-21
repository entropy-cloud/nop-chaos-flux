import type { CalendarDateRange } from '../calendar.types.js';

const MS_PER_DAY = 86400000;

export function getMonthStartEnd(date: Date): CalendarDateRange {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
  const end = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export function getWeekStartEnd(date: Date, firstDayOfWeek: 0 | 1 = 0): CalendarDateRange {
  const day = date.getDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - diff));
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export function getDayStartEnd(date: Date): CalendarDateRange {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const end = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));
  return { start, end };
}

export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return isSameDay(date, utcToday);
}

export function formatDate(date: Date, locale: string = 'zh-CN'): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const d = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== d) {
    result.setUTCDate(0);
  }
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function diffInDays(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / MS_PER_DAY);
}

export function toISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseISODate(dateStr: string): Date | undefined {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function getDaysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0)).getUTCDate();
}

export function getMonthDays(date: Date, firstDayOfWeek: 0 | 1 = 0): Date[] {
  const monthStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
  const startDay = monthStart.getUTCDay();
  const diff = (startDay < firstDayOfWeek ? 7 : 0) + startDay - firstDayOfWeek;
  const gridStart = addDays(monthStart, -diff);
  return getDateRange(gridStart, addDays(monthEnd, 6 - monthEnd.getUTCDay()));
}
