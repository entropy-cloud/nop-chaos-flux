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

function openCustomTier(): void {
  // C6：visual 缺省档位为派生档（向导）；分段编辑器在自定义档
  fireEvent.click(document.querySelector('[data-testid="cron-editor-tier-custom"]')!);
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
    openCustomTier();
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
    openCustomTier();
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
    openCustomTier();
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
    // visual 编辑（未提交草稿：abc 非法留在段内；先切自定义档）
    openCustomTier();
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

  it('v2 prop 行为：showRepeat/showRange 关闭区块、presets 覆盖内置（C6 翻转 v1 锚点）', () => {
    renderForm([
      { type: 'cron-editor', name: 'a', showRepeat: false, showRange: false, presets: [{ label: 'X', value: { cron: '0 0 21 * * ?' } }] },
    ]);
    // 区块关闭：repeat/range fieldset 不渲染
    expect(document.querySelector('[data-slot="repeat-block"]')).toBeNull();
    expect(document.querySelector('[data-slot="range-block"]')).toBeNull();
    // 预设覆盖：选项 label 为宿主注入的 X
    const options = Array.from(document.querySelectorAll('#cron-editor-preset-select option')).map((o) => o.textContent);
    expect(options).toContain('X');
    expect(options).not.toContain('每天 9:00');
  });

  it('v2 单关 prop：showRepeat=false 仅隐藏 repeat 区块、range 区块保留（audit M-1 判别）', () => {
    renderForm([
      { type: 'cron-editor', name: 'a', value: { cron: '0 0 9 * * ?', repeat: { every: 2, unit: 'day', anchor: '2026-01-05' } }, showRepeat: false },
    ]);
    expect(document.querySelector('[data-slot="repeat-block"]')).toBeNull();
    expect(document.querySelector('[data-slot="range-block"]')).not.toBeNull();
  });

  it('v2 单关 prop 对偶：showRange=false 仅隐藏 range 区块、repeat 区块保留（audit M-1 判别）', () => {
    renderForm([
      { type: 'cron-editor', name: 'b', value: { cron: '0 0 9 * * ?', range: { end: '2026-03-01' } }, showRange: false },
    ]);
    expect(document.querySelector('[data-slot="range-block"]')).toBeNull();
    expect(document.querySelector('[data-slot="repeat-block"]')).not.toBeNull();
  });

  it('模式切换丢弃向导草稿与手选档位，回落已提交派生（裁决 1/3，audit M-2 判别）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    // 手选 weekly + 改时间（周几未选：合成非法不提交，字段成草稿；初值透传保留原文 ?）
    fireEvent.click(document.querySelector('[data-testid="cron-editor-tier-weekly"]')!);
    const hour = document.querySelector<HTMLInputElement>('[data-testid="cron-editor-wizard-h"]')!;
    fireEvent.change(hour, { target: { value: '8' } });
    expect(JSON.parse(probeText('sched')).cron).toBe('0 0 9 * * ?');
    // 切 text 再回 visual：草稿丢弃、档位回落派生 daily、字段为已提交派生 9
    switchToText();
    fireEvent.click(document.querySelector('[data-slot="mode-switch"] button:nth-child(1)')!);
    expect(document.querySelector('[data-testid="cron-editor-tier-daily"]')!.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector<HTMLInputElement>('[data-testid="cron-editor-wizard-h"]')!.value).toBe('9');
    expect(JSON.parse(probeText('sched')).cron).toBe('0 0 9 * * ?');
  });

  it('向导档位：daily 派生档编译提交；切 custom 回落分段（C6）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    // 派生档 daily → 向导时间字段已派生 9 点
    const hour = document.querySelector<HTMLInputElement>('[data-testid="cron-editor-wizard-h"]');
    expect(hour?.value).toBe('9');
    fireEvent.change(hour!, { target: { value: '8' } });
    expect(JSON.parse(probeText('sched')).cron).toBe('0 0 8 * * *');
    // 切 custom → 分段编辑器（canonical 已提交值派生）
    openCustomTier();
    expect(segment(2).value).toBe('8');
  });

  it('a11y：档位条 radiogroup（roving tabindex + 方向键换档）+ 区块 fieldset/legend + 预设应用档位重定位（C6）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?', repeat: { every: 2, unit: 'week', anchor: '2026-01-05' } } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    // radiogroup 语义：唯一档位条、roving tabindex（仅选中档可 Tab）
    const bar = document.querySelector('[data-slot="tier-bar"]')!;
    expect(bar.getAttribute('role')).toBe('radiogroup');
    const radios = Array.from(bar.querySelectorAll('[role="radio"]')) as HTMLElement[];
    expect(radios).toHaveLength(5);
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    // 方向键换档：ArrowRight → weekly 选中且焦点随动；ArrowLeft → 回 daily
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    const weekly = bar.querySelector<HTMLElement>('[data-testid="cron-editor-tier-weekly"]')!;
    expect(weekly.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(weekly);
    fireEvent.keyDown(weekly, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(radios[0]);
    // 区块 fieldset/legend 语义
    expect(document.querySelector('[data-slot="repeat-block"]')?.tagName).toBe('FIELDSET');
    expect(document.querySelector('[data-slot="repeat-block"] legend')?.textContent).toBeTruthy();
    expect(document.querySelector('[data-slot="range-block"]')?.tagName).toBe('FIELDSET');
    // 预设应用 = replace 整值 + 档位条随 deriveFrequency 重定位（裁决 4）
    const select = document.querySelector<HTMLSelectElement>('#cron-editor-preset-select');
    const option = Array.from(select!.options).find((o) => o.textContent === 'Daily at 9:00')!;
    fireEvent.change(select!, { target: { value: option.value } });
    expect(JSON.parse(probeText('sched')).cron).toBe('0 0 9 * * *');
    expect(bar.querySelector('[data-testid="cron-editor-tier-daily"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('repeat/range 区块：结构提交 + rangeConflict 就近诊断（C6）', () => {
    renderForm([
      { type: 'cron-editor', name: 'sched', value: { cron: '0 0 9 * * ?' } },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    fireEvent.change(document.querySelector('[data-testid="cron-editor-repeat-every"]')!, { target: { value: '2' } });
    fireEvent.change(document.querySelector('[data-testid="cron-editor-repeat-anchor"]')!, { target: { value: '2026-01-05' } });
    expect(JSON.parse(probeText('sched')).repeat).toEqual({ every: 2, unit: 'day', anchor: '2026-01-05' });
    // end+count 同填：形状照实提交 + 诊断就近显示
    fireEvent.change(document.querySelector('[data-testid="cron-editor-range-end"]')!, { target: { value: '2026-03-01' } });
    fireEvent.change(document.querySelector('[data-testid="cron-editor-range-count"]')!, { target: { value: '5' } });
    expect(JSON.parse(probeText('sched')).range).toEqual({ end: '2026-03-01', count: 5 });
    expect(document.querySelector('[data-testid="cron-editor-range-diagnostic"]')).toBeTruthy();
  });

  it('预设应用：replace 整值提交（裁决 4）', () => {
    renderForm([
      {
        type: 'cron-editor',
        name: 'sched',
        value: { cron: '0 0 10 ? * MON', repeat: { every: 2, unit: 'week', anchor: '2026-01-05' } },
      },
      { type: 'form-state-probe', name: 'sched' },
    ]);
    const select = document.querySelector<HTMLSelectElement>('#cron-editor-preset-select');
    const option = Array.from(select!.options).find((o) => o.textContent === 'Daily at 9:00');
    fireEvent.change(select!, { target: { value: option!.value } });
    const committed = JSON.parse(probeText('sched')) as CronScheduleValue;
    expect(committed.cron).toBe('0 0 9 * * *');
    // replace 语义：builtin 预设不含 repeat/range → 应用即重置
    expect(committed.repeat).toBeUndefined();
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
