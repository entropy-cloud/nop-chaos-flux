import { describe, expect, it } from 'vitest';
import { resolveRendererPropContracts } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '../definitions.js';
import { deriveFrequency, parseCron, serializeCron } from '../cron/index.js';
// Proof 先行（plan 541）：以下模块尚不存在 → import 失败级红
import { buildWizardCron } from '../renderers/cron-editor-wizard.js';

describe('cron-editor v2 契约（cron 轨道 C6, plan 541）', () => {
  it('definition 挂接 v2 prop 契约（翻转 v1 锚点）', () => {
    const def = formRendererDefinitions.find((d) => d.type === 'cron-editor');
    const resolved = resolveRendererPropContracts(def!);
    for (const key of ['showRepeat', 'showRange', 'presets']) {
      expect(resolved[key], `propContracts.${key}`).toBeDefined();
    }
    const keys = (def?.fields ?? []).map((f) => (typeof f === 'object' && 'key' in f ? f.key : null));
    expect(keys).toEqual(expect.arrayContaining(['showRepeat', 'showRange', 'presets']));
  });

  it('向导编译：四档模板 → canonical 归一（裁决 5）', () => {
    // daily：时间三段
    expect(buildWizardCron('daily', { h: 9, mi: 0, s: 0 })).toBe('0 0 9 * * *');
    // weekly：周几多选（排序 + 数字 canonical）
    expect(buildWizardCron('weekly', { h: 10, mi: 30, s: 0, dows: [5, 1] })).toBe('0 30 10 ? * 1,5');
    expect(buildWizardCron('weekly', { h: 8, mi: 0, s: 0, dows: [1, 2, 3, 4, 5] })).toBe('0 0 8 ? * 1-5');
    // monthly / yearly
    expect(buildWizardCron('monthly', { h: 3, mi: 0, s: 0, day: 15 })).toBe('0 0 3 15 * ?');
    expect(buildWizardCron('yearly', { h: 0, mi: 0, s: 0, day: 1, month: 1 })).toBe('0 0 0 1 1 ?');
  });

  it('向导编译：不完整字段返回 null（提交门控不提交）', () => {
    expect(buildWizardCron('weekly', { h: 10, mi: 0, s: 0, dows: [] })).toBeNull();
    expect(buildWizardCron('monthly', { h: 3, mi: 0, s: 0 })).toBeNull();
  });

  it('canonical 归一：提交面为 serializeCron 输出（? 归 *，裁决 5）', () => {
    const expr = buildWizardCron('weekly', { h: 10, mi: 30, s: 0, dows: [5, 1] });
    expect(expr).not.toBeNull();
    const parsed = parseCron(expr!);
    if (!parsed.ok) throw new Error(`wizard output unparseable: ${expr}`);
    const canonical = serializeCron(parsed.value);
    expect(canonical).toBe('0 30 10 * * 1,5');
    // 二次归一稳定
    const reparsed = parseCron(canonical);
    if (!reparsed.ok) throw new Error(`canonical unparseable: ${canonical}`);
    expect(serializeCron(reparsed.value)).toBe(canonical);
  });

  it('deriveFrequency 对向导产物定位档位（提交后回落派生，裁决 1）', () => {
    const cases: Array<[string, string]> = [
      ['0 0 9 * * *', 'daily'],
      ['0 0 8 ? * 1-5', 'weekly'],
      ['0 0 3 15 * ?', 'monthly'],
      ['0 0 0 1 1 ?', 'yearly'],
    ];
    for (const [expr, expected] of cases) {
      const parsed = parseCron(expr);
      if (!parsed.ok) throw new Error(`unparseable: ${expr}`);
      expect(deriveFrequency(parsed.value)).toBe(expected);
    }
    void 0;
  });
});
