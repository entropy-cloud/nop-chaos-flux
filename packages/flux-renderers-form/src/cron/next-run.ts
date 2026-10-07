// next-run：nop-entropy CronExpression doNext/findNext/findNextDay 的 TS 忠实移植（C2 扩展后语义）。
// 终止约定：运行期永不匹配（366 日扫描耗尽 / 4 年 runaway / 年段耗尽）一律返回 null，不抛异常（plan 539）。
import { addDays, civilFromMs, civilToMs, daysInMonth, nearestWeekdayOf, type Civil } from './calendar';
import type { ParsedCron } from './types';

// Java Calendar 常量位序（resets 语义）
const F_S = 0;
const F_MI = 1;
const F_H = 2;
const F_D = 3;
const F_MO = 4;

function getF(c: Civil, f: number): number {
  return [c.s, c.mi, c.h, c.d, c.mo][f];
}

function setF(c: Civil, f: number, v: number): void {
  if (f === F_S) c.s = v;
  else if (f === F_MI) c.mi = v;
  else if (f === F_H) c.h = v;
  else if (f === F_D) c.d = v;
  else c.mo = v;
}

/** 字段递增后整体规范化（Java Calendar.add 的进位语义：秒→分→时→日→月滚动） */
function normalize(c: Civil): void {
  const shifted = new Date(Date.UTC(c.y, c.mo, c.d, c.h, c.mi, c.s));
  c.y = shifted.getUTCFullYear();
  c.mo = shifted.getUTCMonth();
  c.d = shifted.getUTCDate();
  c.h = shifted.getUTCHours();
  c.mi = shifted.getUTCMinutes();
  c.s = shifted.getUTCSeconds();
}

function addField(c: Civil, f: number, n: number): void {
  if (f === 5) {
    c.y += n;
    return;
  }
  setF(c, f, getF(c, f) + n);
  normalize(c);
}

function resetFields(c: Civil, fields: number[]): void {
  for (const f of fields) {
    if (f === F_D) c.d = 1;
    else setF(c, f, 0);
  }
}

/** Bit 语义：values 升序数组中找首个 >= value 的元素，无则 -1 */
function nextFrom(values: number[], value: number): number {
  let lo = 0;
  let hi = values.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] >= value) {
      ans = values[mid];
      hi = mid - 1;
    } else lo = mid + 1;
  }
  return ans;
}

function findNext(
  values: number[],
  value: number,
  c: Civil,
  field: number,
  nextField: number,
  lowerOrders: number[]
): number {
  let next = nextFrom(values, value);
  if (next === -1) {
    addField(c, nextField, 1);
    resetFields(c, [field]);
    next = values[0];
  }
  if (next !== value) {
    setF(c, field, next);
    resetFields(c, lowerOrders);
  }
  return next;
}

function matchesDayOfMonth(pc: ParsedCron, c: Civil): boolean {
  if (pc.dynamicDay) {
    const max = daysInMonth(c.y, c.mo);
    if (pc.dynamicDay.kind === 'last') return c.d === max - pc.dynamicDay.off;
    if (pc.dynamicDay.kind === 'nearestWeekday') return c.d === nearestWeekdayOf(pc.dynamicDay.n, c.y, c.mo);
    return c.d === nearestWeekdayOf(max, c.y, c.mo);
  }
  return pc.daysOfMonth.set.has(c.d);
}

function matchesDayOfWeek(pc: ParsedCron, c: Civil): boolean {
  const dow = new Date(Date.UTC(c.y, c.mo, c.d)).getUTCDay();
  if (pc.dynamicWeek) {
    if (pc.dynamicWeek.kind === 'nth') {
      return dow === pc.dynamicWeek.dow && Math.floor((c.d - 1) / 7) + 1 === pc.dynamicWeek.n;
    }
    if (pc.dynamicWeek.kind === 'lastDow') {
      return dow === pc.dynamicWeek.dow && c.d + 7 > daysInMonth(c.y, c.mo);
    }
    return dow === 6;
  }
  return pc.daysOfWeek.set.has(dow);
}

function matchesDay(pc: ParsedCron, c: Civil): boolean {
  return matchesDayOfMonth(pc, c) && matchesDayOfWeek(pc, c);
}

/** 366 日扫描守卫：永不匹配返回 null */
function findNextDay(pc: ParsedCron, c: Civil, resets: number[]): number | null {
  let count = 0;
  const max = 366;
  while (!matchesDay(pc, c)) {
    if (count++ >= max) return null;
    addDays(c, 1);
    resetFields(c, resets);
  }
  return c.d;
}

function doNext(pc: ParsedCron, c: Civil, dot: number): Civil | null {
  if (pc.years) {
    if (!pc.years.includes(c.y)) {
      const next = pc.years.find((y) => y > c.y);
      if (next === undefined) return null; // 年段耗尽
      // 跳年递归以目标年重基 runaway 预算（dot = 目标年）
      c.y = next;
      c.mo = 0;
      c.d = 1;
      c.h = 0;
      c.mi = 0;
      c.s = 0;
      return doNext(pc, c, next);
    }
  }

  const resets: number[] = [];
  const second = c.s;
  const updS = findNext(pc.seconds.values, second, c, F_S, F_MI, []);
  if (second === updS) resets.push(F_S);

  const minute = c.mi;
  const updM = findNext(pc.minutes.values, minute, c, F_MI, F_H, resets);
  if (minute === updM) resets.push(F_MI);
  else return doNext(pc, c, dot);

  const hour = c.h;
  const updH = findNext(pc.hours.values, hour, c, F_H, F_D, resets);
  if (hour === updH) resets.push(F_H);
  else return doNext(pc, c, dot);

  const dom = c.d;
  const updD = findNextDay(pc, c, resets);
  if (updD === null) return null;
  if (dom === updD) resets.push(F_D);
  else return doNext(pc, c, dot);

  const month = c.mo;
  const updMo = findNext(pc.monthValues, month, c, F_MO, 5, resets);
  if (updMo !== month) {
    if (c.y - dot > 4) return null; // runaway 守卫
    return doNext(pc, c, dot);
  }
  return c;
}

/**
 * 下一次触发时刻（严格晚于 afterMs；种子命中 +1s 语义）。返回 null = 序列终止。
 * tzOffsetMinutes：固定 UTC 偏移（缺省 0=UTC）；DST 精确解析不在范围（design §12）。
 */
export function nextRunAfter(pc: ParsedCron, afterMs: number, tzOffsetMinutes = 0): number | null {
  const c = civilFromMs(afterMs, tzOffsetMinutes);
  const original = civilToMs(c, tzOffsetMinutes);
  let r = doNext(pc, c, c.y);
  if (r !== null && civilToMs(r, tzOffsetMinutes) === original) {
    c.s += 1;
    normalize(c);
    r = doNext(pc, c, c.y);
  }
  return r === null ? null : civilToMs(r, tzOffsetMinutes);
}
