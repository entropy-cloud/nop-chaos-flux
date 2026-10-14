// 频率档位派生（C6 向导输入面）：由 parse 结果判定 daily/weekly/monthly/yearly/custom。
// 判定不可解析 → custom；L/W/# 等动态日与复杂步进/区间均落 custom（向导重编译属于预期交互，design §7）。
import type { CronFrequency, ParsedCron } from './types.js';

function isAll(field: { items: { kind: string }[] }): boolean {
  if (field.items.length !== 1) return false;
  return field.items[0].kind === 'star';
}

function isSingleNumber(field: { items: { kind: string; v?: number }[] }): number | null {
  if (field.items.length !== 1 || field.items[0].kind !== 'single') return null;
  return field.items[0].v ?? null;
}

export function deriveFrequency(parsed: ParsedCron | null): CronFrequency {
  if (!parsed) return 'custom';
  // 时分秒须各为单值（步进/区间/星号均非单值，`*/10` 落 custom）
  const timeSingle =
    isSingleNumber(parsed.seconds) !== null && isSingleNumber(parsed.minutes) !== null && isSingleNumber(parsed.hours) !== null;
  if (!timeSingle) return 'custom';
  const monthAll = isAll(parsed.months);
  const dayAll = parsed.dynamicDay === null && isAll(parsed.daysOfMonth);
  const dowAll = parsed.dynamicWeek === null && isAll(parsed.daysOfWeek);
  const day = parsed.dynamicDay === null ? isSingleNumber(parsed.daysOfMonth) : null;
  const month = isSingleNumber(parsed.months);
  // C6（plan 541 裁决 1）：weekly 档向导产物为多选周位（列表/区间/单值皆可），
  // 提交后档位条回落派生须识别为 weekly；动态周描述符（#/L）仍归 custom。
  const dowExplicit = parsed.dynamicWeek === null && parsed.daysOfWeek.items.length > 0 && !dowAll;
  const dow = parsed.dynamicWeek === null ? isSingleNumber(parsed.daysOfWeek) : null;

  if (dayAll && dowAll && monthAll) return 'daily';
  if (dayAll && (dow !== null || dowExplicit) && monthAll) return 'weekly';
  if (day !== null && dowAll && monthAll) return 'monthly';
  if (day !== null && dowAll && month !== null) return 'yearly';
  return 'custom';
}
