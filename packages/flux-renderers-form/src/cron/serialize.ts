// serialize：canonical 输出（数字、`*`、7 段保年、`?`→`*`），parse∘serialize∘parse 幂等。
import type { FieldItem, ParsedCron } from './types';

function serializeField(items: FieldItem[]): string {
  if (items.length === 0) return '*';
  return items
    .map((item) => {
      if (item.kind === 'star') return '*';
      if (item.kind === 'single') return String(item.v);
      if (item.kind === 'range') return `${item.a}-${item.b}`;
      if (item.kind === 'step') return `${item.a ?? '*'}/${item.step}`;
      return `${item.a}-${item.b}/${item.step}`;
    })
    .join(',');
}

function serializeDayField(pc: ParsedCron): string {
  if (pc.dynamicDay) {
    if (pc.dynamicDay.kind === 'last') return pc.dynamicDay.off > 0 ? `L-${pc.dynamicDay.off}` : 'L';
    if (pc.dynamicDay.kind === 'nearestWeekday') return `${pc.dynamicDay.n}W`;
    return 'LW';
  }
  return serializeField(pc.daysOfMonth.items);
}

function serializeWeekField(pc: ParsedCron): string {
  if (pc.dynamicWeek) {
    if (pc.dynamicWeek.kind === 'nth') return `${pc.dynamicWeek.dow}#${pc.dynamicWeek.n}`;
    if (pc.dynamicWeek.kind === 'lastDow') return `${pc.dynamicWeek.dow}L`;
    return 'L';
  }
  return serializeField(pc.daysOfWeek.items);
}

export function serializeCron(pc: ParsedCron): string {
  const parts = [
    serializeField(pc.seconds.items),
    serializeField(pc.minutes.items),
    serializeField(pc.hours.items),
    serializeDayField(pc),
    serializeField(pc.months.items),
    serializeWeekField(pc)
  ];
  if (pc.years) {
    // 年段 canonical：压缩为 items 形式需要保留原始 items——years 仅存了物化数组，
    // canonical 用区间压缩表示（升序连续段合并、步进保持 2 项内可表达形）
    parts.push(compressYears(pc.years));
  }
  return parts.join(' ');
}

function compressYears(years: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < years.length) {
    let j = i;
    while (j + 1 < years.length && years[j + 1] === years[j] + 1) j++;
    if (j === i) parts.push(String(years[i]));
    else parts.push(`${years[i]}-${years[j]}`);
    i = j + 1;
  }
  return parts.join(',');
}
