// 值对象级诊断（design §4 的 repeatAnchorMissing / rangeConflict + repeat/range 形状校验）。
// 表达式级诊断由 parseCron 承载；本函数先表达式后值对象。
import { parseCron } from './parse';
import type { CronDiagnosticCode, CronScheduleValue } from './types';

export type ValueDiagnosticCode = CronDiagnosticCode | 'repeatAnchorMissing' | 'rangeConflict';

export function validateCronScheduleValue(value: CronScheduleValue): { code: ValueDiagnosticCode | null } {
  const parsed = parseCron(value.cron);
  if (!parsed.ok) return { code: parsed.code };

  const { repeat, range } = value;
  if (repeat) {
    if (repeat.every < 1) return { code: 'outOfRange' };
    if (repeat.unit !== 'day' && repeat.unit !== 'week') return { code: 'badToken' };
    if (!repeat.anchor && !range?.start) return { code: 'repeatAnchorMissing' };
  }
  if (range) {
    // rangeConflict 先于 invertedRange（向量 VD-02 判别）
    if (range.end != null && range.count != null) return { code: 'rangeConflict' };
    if (range.start && range.end && range.start > range.end) return { code: 'invertedRange' };
    if (range.count != null && range.count < 1) return { code: 'outOfRange' };
  }
  return { code: null };
}
