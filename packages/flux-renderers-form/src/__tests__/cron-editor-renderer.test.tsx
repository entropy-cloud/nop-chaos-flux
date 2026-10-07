import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import example from '../../../../docs/components/cron-editor/example.json';
import { formRendererDefinitions } from '../index.js';
import { parseCron, validateCronScheduleValue, type CronScheduleValue } from '../cron/index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions, formStateProbeRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderForm(body: Array<Record<string, unknown>>) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/cron-editor"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function probeText(name: string): string {
  const probe = document.querySelector(`[data-testid="form-state:${name}"]`);
  expect(probe, `probe for '${name}' must render`).toBeTruthy();
  return probe!.textContent ?? '';
}

function segment(index: number): HTMLInputElement {
  return document.querySelectorAll<HTMLInputElement>('[data-slot="cron-editor"] [data-slot="segment-group"] input')[index]!;
}

function textInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('[data-slot="cron-editor"] [data-slot="text-input"]')!;
}

function switchToText(): void {
  fireEvent.click(document.querySelector('[data-slot="cron-editor"] [data-slot="mode-switch"] button:nth-child(2)')!);
}

function diagnostic(): string | null {
  return document.querySelector('[data-testid="cron-editor-diagnostic"]')?.textContent ?? null;
}

describe('cron-editor renderer (cron 轨道 C5, plan 540)', () => {
  it('marker 契约：根 marker + data-slot 组', () => {
    renderForm([{ type: 'cron-editor', name: 'sched' }]);
    const root = document.querySelector('.nop-cron-editor');
    expect(root).toBeTruthy();
    expect(root!.getAttribute('data-slot')).toBe('cron-editor');
    expect(root!.querySelector('[data-slot="segment-group"]')).toBeTruthy();
    expect(root!.querySelector('[data-slot="diagnostics"]')).toBeTruthy();
    expect(root!.querySelector('[data-slot="preview"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="segment-group"] input').length).toBe(7);
  });

  it('分段编辑：合法段修改提交 {cron}（按提交门控）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    fireEvent.change(segment(2), { target: { value: '10' } });
    const committed = JSON.parse(probeText('sched')) as CronScheduleValue;
    expect(committed.cron).toBe('0 0 10 * * *');
  });

  it('repeat/range 透传保留：编辑只覆写 cron 键（example 实例 2 判别）', () => {
    renderForm([
      {
        type: 'cron-editor',
        name: 'sched',
        value: {
          cron: '0 0 10 ? * MON',
          repeat: { every: 2, unit: 'week', anchor: '2026-01-05' },
          range: { start: '2026-01-05', count: 12 }
        },
      },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    fireEvent.change(segment(5), { target: { value: 'FRI' } });
    const committed = JSON.parse(probeText('sched')) as CronScheduleValue;
    expect(committed.cron).toBe('0 0 10 * * FRI');
    expect(committed.repeat).toEqual({ every: 2, unit: 'week', anchor: '2026-01-05' });
    expect(committed.range).toEqual({ start: '2026-01-05', count: 12 });
  });

  it('非法分段输入：诊断显示且不提交（值提交门控）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    fireEvent.change(segment(0), { target: { value: 'abc' } });
    expect(diagnostic()).toContain('token');
    // 上一合法值不回写表单
    expect(JSON.parse(probeText('sched')).cron).toBe('0 0 9 * * ?');
  });

  it('impossible 表达式 error 级拦截（前置，不提交）', () => {
    renderForm([{ type: 'cron-editor', name: 'sched' }, { type: 'form-state-probe', name: 'sched' }]);
    switchToText();
    fireEvent.change(textInput(), { target: { value: '0 0 0 30 2 ?' } });
    expect(diagnostic()).toContain('never matches');
    expect(probeText('sched')).toBe('null');
  });

  it('双模式切换往返：visual→text 携带草稿原文；text→visual 派生各段', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    // visual 编辑（未提交草稿：abc 非法留在段内）
    fireEvent.change(segment(0), { target: { value: 'abc' } });
    switchToText();
    // 携带草稿原文
    expect(textInput().value).toBe('abc 0 9 * * *');
    // 修正为合法 → 提交
    fireEvent.change(textInput(), { target: { value: '0 30 9 * * ?' } });
    expect(JSON.parse(probeText('sched')).cron).toBe('0 30 9 * * ?');
  });

  it('text 模式显示已提交原文（非 canonical 化）', () => {
    renderForm([{ type: 'cron-editor', name: 'sched', mode: 'text', value: { cron: '0  0  9 * * ?' } }]);
    expect(textInput().value).toBe('0  0  9 * * ?');
  });

  it('预览：合法值渲染且严格递增；previewCount 生效；showPreview=false 关闭', () => {
    renderForm([
      { type: 'cron-editor', name: 'a', value: { cron: '0 0 9 * * ?' } },
      { type: 'cron-editor', name: 'b', value: { cron: '0 0 9 * * ?' }, previewCount: 3 },
      { type: 'cron-editor', name: 'c', value: { cron: '0 0 9 * * ?' }, showPreview: false },
    ]);
    const lists = document.querySelectorAll('[data-testid="cron-editor-preview"]');
    expect(lists.length).toBe(2);
    const entries = Array.from(lists[0]!.querySelectorAll('li')).map((li) => new Date(li.textContent!).getTime());
    expect(entries.length).toBe(5);
    for (let i = 1; i < entries.length; i++) expect(entries[i]!).toBeGreaterThan(entries[i - 1]!);
    expect(lists[1]!.querySelectorAll('li').length).toBe(3);
    expect(document.querySelectorAll('[data-slot="preview"]').length).toBe(2);
  });

  it('preview-empty：序列已终止（range end 在过去）显示空态', () => {
    renderForm([{ type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?', range: { end: '2026-01-01' } } }]);
    expect(document.querySelector('[data-testid="cron-editor-preview-empty"]')).toBeTruthy();
  });

  it('clearable：清除按钮提交 undefined', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', clearable: true, value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    fireEvent.click(document.querySelector('[data-testid="cron-editor-clear"]')!);
    expect(probeText('sched')).toBe('null');
  });

  it('disabled：分段与模式切换禁用', () => {
    renderForm([{ type: 'cron-editor', name: 'sched', disabled: true }]);
    expect(segment(0).disabled).toBe(true);
    const switchButtons = document.querySelectorAll<HTMLButtonElement>('[data-slot="mode-switch"] button');
    expect(Array.from(switchButtons).every((b) => b.disabled)).toBe(true);
  });

  it('v2 prop 最小锚点：showRepeat/showRange/presets 声明存在、效果缺省（与缺省渲染一致）', () => {
    renderForm([
      { type: 'cron-editor', name: 'a', showRepeat: false, showRange: false, presets: [{ label: 'X', value: { cron: '0 0 9 * * ?' } }] },
      { type: 'cron-editor', name: 'b' },
    ]);
    expect(document.querySelectorAll('[data-slot="cron-editor"]').length).toBe(2);
    expect(document.querySelectorAll('[data-slot="segment-group"] input').length).toBe(14);
  });

  it('example.json 三实例全部零诊断（值合法性）', () => {
    const body = (example as { body: Array<{ value?: CronScheduleValue }> }).body;
    for (const node of body) {
      if (!node.value) continue;
      expect(validateCronScheduleValue(node.value as CronScheduleValue).code).toBeNull();
      expect(parseCron((node.value as CronScheduleValue).cron).ok).toBe(true);
    }
  });
});
