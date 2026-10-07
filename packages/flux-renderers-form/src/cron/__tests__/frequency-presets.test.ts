import { describe, expect, it } from 'vitest';
import { builtinPresets, deriveFrequency, parseCron, type ParsedCron } from '../index';

function mustParse(expr: string): ParsedCron {
  const r = parseCron(expr);
  if (!r.ok) throw new Error(`parse failed: ${expr} (${r.code})`);
  return r.value;
}



describe('deriveFrequency（档位派生，C6 向导输入面）', () => {
  it('daily：时分秒单值 + 日/月通配', () => {
    expect(deriveFrequency(mustParse('0 0 9 * * *'))).toBe('daily');
    expect(deriveFrequency(mustParse('30 30 8 * * *'))).toBe('daily');
  });

  it('weekly：周位单值（数字或名字），日位通配', () => {
    expect(deriveFrequency(mustParse('0 0 10 ? * MON'))).toBe('weekly');
    expect(deriveFrequency(mustParse('0 0 10 ? * 1'))).toBe('weekly');
    expect(deriveFrequency(mustParse('0 0 10 ? * MON-FRI'))).not.toBe('weekly');
  });

  it('monthly：日位单值数字，周位通配', () => {
    expect(deriveFrequency(mustParse('0 0 3 15 * *'))).toBe('monthly');
    expect(deriveFrequency(mustParse('0 0 3 15 1-3 *'))).not.toBe('monthly');
  });

  it('yearly：日/月位单值数字', () => {
    expect(deriveFrequency(mustParse('0 0 0 1 1 *'))).toBe('yearly');
  });

  it('不可解析与复杂形状 → custom', () => {
    expect(deriveFrequency(mustParse('0 0 0 L * ?'))).toBe('custom');
    expect(deriveFrequency(mustParse('*/10 * * * * *'))).toBe('custom');
    expect(deriveFrequency(mustParse('0 0 0 ? 1 MON#1'))).toBe('custom');
    expect(deriveFrequency(null)).toBe('custom');
  });
});

describe('builtinPresets（内置预设数据，稳定 id 供 i18n）', () => {
  it('id 唯一且 cron 全部零诊断', () => {
    const ids = new Set(builtinPresets.map((p) => p.id));
    expect(ids.size).toBe(builtinPresets.length);
    for (const preset of builtinPresets) {
      mustParse(preset.cron);
    }
  });

  it('覆盖 Office 五档代表形', () => {
    const freqs = new Set(builtinPresets.map((p) => deriveFrequency(mustParse(p.cron))));
    for (const f of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      expect(freqs.has(f), `missing preset for ${f}`).toBe(true);
    }
    // nop 存量形态代表：月末最后一天（L 语法）
    expect(builtinPresets.some((p) => p.cron.includes('L '))).toBe(true);
  });
});
