// repeat 锚点过滤（C3 语义对齐 AnchorRepeatTrigger）：fire 引擎时区日历日 >= anchor 且
// day 单位整日差 mod every == 0；week 单位周奇偶锚定 floor(整日差/7) mod every == 0（RP-04 判别）。
import { civilFromMs } from './calendar';
import type { Civil } from './calendar';

export interface RepeatSpec {
  every: number;
  unit: 'day' | 'week';
  anchor?: string;
}

function daysFromCivilDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function civilDayIndex(c: Civil): number {
  return Math.floor(Date.UTC(c.y, c.mo, c.d) / 86400000);
}

/** anchor=null 表示未启用锚点过滤（调用方装配层已做回退裁决，TriggerBuilder 同口径保持严格） */
export function matchesRepeatAnchor(fireMs: number, repeat: RepeatSpec, anchor: string | null, tzOffsetMinutes: number): boolean {
  if (!repeat || anchor === null) return true;
  const fireDay = civilDayIndex(civilFromMs(fireMs, tzOffsetMinutes));
  const anchorDay = daysFromCivilDate(anchor);
  if (fireDay < anchorDay) return false;
  const diff = fireDay - anchorDay;
  if (repeat.unit === 'week') return Math.floor(diff / 7) % repeat.every === 0;
  return diff % repeat.every === 0;
}
