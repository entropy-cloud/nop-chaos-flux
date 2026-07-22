const MS_PER_DAY = 86400000;

export function diffInDays(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aUtc - bUtc) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getUTCDay(date: Date): number {
  return date.getUTCDay();
}

export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = getUTCDay(result);
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function getWeekEnd(date: Date): Date {
  const result = getWeekStart(date);
  result.setUTCDate(result.getUTCDate() + 6);
  return result;
}

export function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
}

export function getMonthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
}

export function getQuarterStart(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3);
  return new Date(Date.UTC(date.getFullYear(), q * 3, 1));
}

export function getQuarterEnd(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return new Date(Date.UTC(date.getFullYear(), q * 3, 0));
}

export function getYearStart(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), 0, 1));
}

export function getYearEnd(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), 11, 31));
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const FORMAT_TOKENS: Record<string, (d: Date) => string> = {
  'Y': (d) => String(d.getUTCFullYear()).padStart(4, '0'),
  'y': (d) => String(d.getUTCFullYear()).slice(-2).padStart(2, '0'),
  'm': (d) => String(d.getUTCMonth() + 1).padStart(2, '0'),
  'n': (d) => String(d.getUTCMonth() + 1),
  'd': (d) => String(d.getUTCDate()).padStart(2, '0'),
  'e': (d) => String(d.getUTCDate()),
  'H': (d) => String(d.getUTCHours()).padStart(2, '0'),
  'M': (d) => String(d.getUTCMinutes()).padStart(2, '0'),
  'S': (d) => String(d.getUTCSeconds()).padStart(2, '0'),
  'b': (d) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()],
  'B': (d) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()],
  'V': (d) => String(getISOWeek(d)).padStart(2, '0'),
  'W': (d) => {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const diff = ((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7;
    return String(Math.ceil(diff)).padStart(2, '0');
  },
  'q': (d) => String(Math.floor(d.getUTCMonth() / 3) + 1),
};

export function formatDate(date: Date, format: string): string {
  let result = '';
  let i = 0;
  while (i < format.length) {
    if (format[i] === '%' && i + 1 < format.length) {
      const token = format[i + 1];
      const formatter = FORMAT_TOKENS[token];
      if (formatter) {
        result += formatter(date);
      } else {
        result += token;
      }
      i += 2;
    } else {
      result += format[i];
      i++;
    }
  }
  return result;
}

export function unitStart(date: Date, unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'): Date {
  switch (unit) {
    case 'hour':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()));
    case 'day':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    case 'week':
      return getWeekStart(date);
    case 'month':
      return getMonthStart(date);
    case 'quarter':
      return getQuarterStart(date);
    case 'year':
      return getYearStart(date);
  }
}

export function unitEnd(date: Date, unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'): Date {
  switch (unit) {
    case 'hour':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() + 1));
    case 'day':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
    case 'week':
      return new Date(getWeekEnd(date).getTime() + MS_PER_DAY);
    case 'month':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    case 'quarter': {
      const q = Math.floor(date.getUTCMonth() / 3) + 1;
      const m = q * 3;
      const y = date.getUTCFullYear() + (m >= 12 ? 1 : 0);
      return new Date(Date.UTC(y, m >= 12 ? 0 : m, 1));
    }
    case 'year':
      return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
  }
}

export function addUnit(date: Date, unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year', count: number): Date {
  const d = new Date(date);
  switch (unit) {
    case 'hour':
      d.setUTCHours(d.getUTCHours() + count);
      break;
    case 'day':
      d.setUTCDate(d.getUTCDate() + count);
      break;
    case 'week':
      d.setUTCDate(d.getUTCDate() + count * 7);
      break;
    case 'month':
      d.setUTCMonth(d.getUTCMonth() + count);
      break;
    case 'quarter':
      d.setUTCMonth(d.getUTCMonth() + count * 3);
      break;
    case 'year':
      d.setUTCFullYear(d.getUTCFullYear() + count);
      break;
  }
  return d;
}

export function msToDays(ms: number): number {
  return ms / MS_PER_DAY;
}

export function daysToMs(days: number): number {
  return days * MS_PER_DAY;
}
