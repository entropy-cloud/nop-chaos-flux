import { describe, expect, it } from 'vitest';
import { resolveRendererPropContracts } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '../definitions.js';
import { parseCron, validateCronScheduleValue, fireSequence } from '../cron/index.js';
import { validateCronEditorSchema } from '../renderers/cron-editor-schema-validator.js';

// plan 540（cron 轨道 C5）Proof 骨架：definition 契约 / 值提交门控 / 偏移符号判别。
// 先于实现落盘（definition/renderer 缺位时本套件红）。

describe('cron-editor definition 契约（五点）', () => {
  const definition = formRendererDefinitions.find((d) => d.type === 'cron-editor');

  it('definition 已收录且五点齐备', () => {
    expect(definition).toBeDefined();
    expect(definition!.sourcePackage).toBe('@nop-chaos/flux-renderers-form');
    expect(definition!.wrap).toBe(true);
    expect(Object.keys(resolveRendererPropContracts(definition!))).toEqual(
      expect.arrayContaining(['mode', 'showPreview', 'previewCount', 'clearable'])
    );
    const handles = (definition!.componentCapabilityContracts ?? []).map((c) => c.handle);
    expect(handles).toEqual(['clear', 'reset', 'focus']);
  });

  it('schemaValidator 创作期初值预检：非法 value error 级上报（plan 540 audit M-2 钉）', () => {
    const issues: Array<{ code: string; severity?: string }> = [];
    validateCronEditorSchema({
      schema: { type: 'cron-editor', name: 's', value: { cron: '0 0 0 30 2 ?' } } as never,
      path: 'body[0]',
      emit: (issue) => issues.push(issue),
    });
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe('invalid-property-value');
    expect(issues[0].severity).toBe('error');

    const clean: Array<{ code: string }> = [];
    validateCronEditorSchema({
      schema: { type: 'cron-editor', name: 's', value: { cron: '0 0 9 * * ?' } } as never,
      path: 'body[0]',
      emit: (issue) => clean.push(issue),
    });
    expect(clean.length).toBe(0);
  });

  it('fields 覆盖 v1 消费 prop（mode/previewCount/showPreview）', () => {
    const keys = (definition!.fields ?? []).map((f) => (typeof f === 'object' && 'key' in f ? f.key : null));
    expect(keys).toEqual(expect.arrayContaining(['mode', 'previewCount', 'showPreview']));
  });
});

describe('值提交门控判别（引擎侧）', () => {
  it('非法表达式解析失败且携带诊断码（不提交的依据）', () => {
    const bad = parseCron('0 0 0 30 2 ?');
    if (bad.ok) throw new Error('expected parse failure');
    expect(bad.code).toBe('impossible');
  });

  it('repeat/range 透传保留：编辑只覆写 cron 键', () => {
    // 组件提交形状 {...boundValue, cron: next} 的引擎侧不变式：透传后值仍通过 validate
    const bound = {
      cron: '0 0 10 ? * MON',
      repeat: { every: 2, unit: 'week' as const, anchor: '2026-01-05' },
      range: { start: '2026-01-05', count: 12 }
    };
    const edited = { ...bound, cron: '0 0 10 ? * FRI' };
    expect(validateCronScheduleValue(edited).code).toBeNull();
    expect(edited.repeat).toEqual(bound.repeat);
    expect(edited.range).toEqual(bound.range);
  });
});

describe('预览偏移符号判别（引擎约定 Date.UTC(本地) − tzOffsetMinutes*60000）', () => {
  it('固定 UTC+8（+480）下 range.start 当地 0 点边界', () => {
    // start 2026-01-05，UTC+8：当地 01-05 00:00 = UTC 01-04T16:00Z；01-05T09:00 当地 = 01-05T01:00Z
    const result = fireSequence({ cron: '0 0 9 * * ?', range: { start: '2026-01-05' } }, Date.parse('2026-01-01T00:00:00Z'), 3, 480);
    expect(result.fires.map((ms) => new Date(ms).toISOString().replace('.000Z', 'Z'))).toEqual([
      '2026-01-05T01:00:00Z',
      '2026-01-06T01:00:00Z',
      '2026-01-07T01:00:00Z'
    ]);
  });

  it('固定 UTC-8（-480）下同一 start 的边界偏移方向相反', () => {
    const result = fireSequence({ cron: '0 0 9 * * ?', range: { start: '2026-01-05' } }, Date.parse('2026-01-01T00:00:00Z'), 1, -480);
    expect(result.fires.map((ms) => new Date(ms).toISOString().replace('.000Z', 'Z'))).toEqual(['2026-01-05T17:00:00Z']);
  });
});
