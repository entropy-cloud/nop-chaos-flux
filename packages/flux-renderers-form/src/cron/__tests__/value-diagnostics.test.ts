import { describe, expect, it } from 'vitest';
import vectors from '../../../../../docs/components/cron-editor/golden-vectors.json';
import { validateCronScheduleValue, type CronScheduleValue } from '../index';

interface GoldenValueDiagnostic {
  id: string;
  category: string;
  value: CronScheduleValue;
  tsCode: string;
}

const VALUE_DIAGNOSTICS = vectors.valueDiagnostics as GoldenValueDiagnostic[];

describe('validateCronScheduleValue（值对象级诊断, design §4）', () => {
  it.each(VALUE_DIAGNOSTICS.map((v) => [v.id, v] as const))('%s', (_id, v) => {
    expect(validateCronScheduleValue(v.value).code).toBe(v.tsCode);
  });

  it('repeat 锚点缺省回退 range.start 合法（RP-06 装配语义）', () => {
    const value: CronScheduleValue = {
      cron: '0 0 9 * * ?',
      repeat: { every: 2, unit: 'day' },
      range: { start: '2026-01-05' }
    };
    const result = validateCronScheduleValue(value);
    expect(result.code).toBeNull();
  });

  it('合法值零诊断', () => {
    const value: CronScheduleValue = {
      cron: '0 0 10 ? * MON',
      repeat: { every: 2, unit: 'week', anchor: '2026-01-05' },
      range: { start: '2026-01-05', count: 12 }
    };
    expect(validateCronScheduleValue(value).code).toBeNull();
    expect(validateCronScheduleValue({ cron: '0 0 9 * * ?' }).code).toBeNull();
  });

  it('cron 串本身非法时报告表达式级诊断码', () => {
    expect(validateCronScheduleValue({ cron: '0 0 0 30 2 ?' }).code).toBe('impossible');
    expect(validateCronScheduleValue({ cron: '61 0 0 * * *' }).code).toBe('outOfRange');
  });

  it('rangeConflict 判别先于 invertedRange（start>end 且带 count）', () => {
    const value: CronScheduleValue = {
      cron: '0 0 9 * * ?',
      range: { start: '2026-01-05', end: '2026-01-01', count: 3 }
    };
    expect(validateCronScheduleValue(value).code).toBe('rangeConflict');
  });
});
