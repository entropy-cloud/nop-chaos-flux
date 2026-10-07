// civil 日历算术（固定 UTC 偏移口径，plan 539 Decision：固定偏移下与 Java Calendar add/set 逐秒等价）

export interface Civil {
  y: number;
  /** 0-11 */
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

export function daysInMonth(y: number, mo: number): number {
  return new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
}

/** civil 日期 → 星期（0=周日）。目标日允许超出当月天数（Java lenient Calendar 溢出语义，next-month 滚动） */
function weekdayOfCivilLenient(y: number, mo: number, d: number): number {
  return new Date(Date.UTC(y, mo, d)).getUTCDay();
}

export function civilToMs(c: Civil, tzOffsetMinutes: number): number {
  return Date.UTC(c.y, c.mo, c.d, c.h, c.mi, c.s) - tzOffsetMinutes * 60000;
}

export function civilFromMs(ms: number, tzOffsetMinutes: number): Civil {
  const shifted = new Date(ms + tzOffsetMinutes * 60000);
  return {
    y: shifted.getUTCFullYear(),
    mo: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    h: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
    s: shifted.getUTCSeconds()
  };
}

export function addDays(c: Civil, n: number): void {
  const shifted = new Date(Date.UTC(c.y, c.mo, c.d + n, c.h, c.mi, c.s));
  c.y = shifted.getUTCFullYear();
  c.mo = shifted.getUTCMonth();
  c.d = shifted.getUTCDate();
}

/** 就近工作日（W）：周末回退/前进一日，匹配日本身不跨月。探针 target 允许超出当月（lenient 溢出口径） */
export function nearestWeekdayOf(target: number, y: number, mo: number): number {
  const dow = weekdayOfCivilLenient(y, mo, target);
  const max = daysInMonth(y, mo);
  if (dow === 6) return target > 1 ? target - 1 : target + 2;
  if (dow === 0) return target < max ? target + 1 : target - 2;
  return target;
}
