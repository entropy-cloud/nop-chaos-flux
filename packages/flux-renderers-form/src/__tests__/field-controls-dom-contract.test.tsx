import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * 字段控件 DOM 契约测试
 *
 * 目的：冻结每个常见表单控件渲染出的 DOM 结构，作为下游（nop-chaos-next e2e-shared
 * FluxAdapter、主题 CSS、辅助技术）依赖的稳定接口真相。任何 data-slot / role / id
 * 命名约定的变更都必须在此文件中显式更新，避免下游选择器反复试错。
 *
 * 覆盖范围：input-text、textarea、checkbox、switch、radio-group、checkbox-group、
 * input-number。select/combobox 是下游最容易踩坑的控件，已拆到同目录
 * `select-combobox-dom-contract.test.tsx`。
 *
 * 配套文档：`docs/architecture/renderer-markers-and-selectors.md` § Field selector contract attributes。
 */
const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://field-controls-dom-contract"
      schema={
        {
          type: 'form',
          ...(data ? { data } : {}),
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// ── 通用约定：所有 wrap 字段 control 元素 id = `${name}-control` ──
// 这是下游最稳定的 hook（host-visible id），先单独断言。

// ── 生产常驻契约属性（flux-guide 13-testing.md "字段定位契约"）──
//  - data-field="name"  → 字段根 .nop-field（所有 wrap 字段，含 checkbox/switch）
//  - data-renderer="input-text" → 字段根，控件类型（schema type），确定性分派
//  - data-value="1" → combobox-item（select 选项），按 value 精确选择
//  - td[data-field="col"] → 表格单元格，按列名定位
// 这些属性由本契约测试冻结；变更必须在此显式更新。

describe('field root contract: data-field + data-renderer on .nop-field', () => {
  it('input-text field root exposes data-field=name and data-renderer=input-text', () => {
    renderForm([{ type: 'input-text', name: 'userName', label: 'User Name' }]);
    const root = document.querySelector('.nop-field[data-field="userName"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-renderer')).toBe('input-text');
  });

  it('select field root exposes data-renderer=select', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const root = document.querySelector('.nop-field[data-field="role"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-renderer')).toBe('select');
  });

  it('checkbox field root exposes data-field + data-renderer=checkbox', () => {
    renderForm([{ type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } }]);
    const root = document.querySelector('.nop-field[data-field="agree"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-renderer')).toBe('checkbox');
  });

  it('switch field root exposes data-field + data-renderer=switch', () => {
    renderForm([{ type: 'switch', name: 'active', label: 'Active' }]);
    const root = document.querySelector('.nop-field[data-field="active"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-renderer')).toBe('switch');
  });

  it('textarea field root exposes data-renderer=textarea', () => {
    renderForm([{ type: 'textarea', name: 'remark', label: 'Remark' }]);
    const root = document.querySelector('.nop-field[data-field="remark"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-renderer')).toBe('textarea');
  });
});

describe('field control id contract: every control exposes id=`${name}-control`', () => {
  it('input-text control has id=name-control', () => {
    renderForm([{ type: 'input-text', name: 'userName', label: 'User Name' }]);
    const control = document.getElementById('userName-control');
    expect(control).toBeTruthy();
    expect(control?.tagName).toBe('INPUT');
  });

  it('select control has id=name-control on its trigger input/button', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const control = document.getElementById('role-control');
    expect(control).toBeTruthy();
  });

  // ⚠ 重要：checkbox / switch 的 interactive 元素**没有** `${name}-control` id。
  // Base UI 的 CheckboxPrimitive / SwitchPrimitive 自带自增 id（base-ui-_r_*）。
  // `${name}-control` 只存在于 wrapper LABEL 上，形式为 `${name}-control-label`。
  // 下游 adapter 定位 checkbox/switch 必须用 [data-slot=checkbox-wrapper/switch-wrapper]
  // + 内部 [role=checkbox/switch]，**不能**依赖 `#${name}-control`。
  it('checkbox interactive element does NOT carry ${name}-control id (it is on wrapper label)', () => {
    renderForm([{ type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } }]);
    // interactive span 的 id 是 base-ui 自动生成，不是 agree-control
    const interactive = document.querySelector('[data-slot="checkbox"][role="checkbox"]');
    expect(interactive?.id).not.toBe('agree-control');
    // wrapper label 才带 agree-control-label
    expect(document.getElementById('agree-control-label')).toBeTruthy();
  });

  it('switch interactive element does NOT carry ${name}-control id', () => {
    renderForm([{ type: 'switch', name: 'active', label: 'Active' }]);
    const interactive = document.querySelector('[data-slot="switch"][role="switch"]');
    expect(interactive?.id).not.toBe('active-control');
    expect(document.getElementById('active-control-label')).toBeTruthy();
  });
});

// ─────────────────────────── input-text ───────────────────────────

describe('input-text DOM contract', () => {
  it('plain input renders input[data-slot="input"] with id=name-control', () => {
    const { container } = renderForm([{ type: 'input-text', name: 'a', label: 'A' }]);
    const input = container.querySelector('input#a-control[data-slot="input"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('text');
  });

  it('input with prefix/suffix wraps in input-group with data-slot markers', () => {
    const { container } = renderForm([
      { type: 'input-text', name: 'price', label: 'Price', prefix: '$', suffix: 'USD' },
    ]);
    // 外层 input-group
    expect(container.querySelector('[data-slot="input-group"]')).toBeTruthy();
    // input 自身带 input-group-control slot
    const control = container.querySelector(
      'input#price-control[data-slot="input-group-control"]',
    );
    expect(control).toBeTruthy();
    // prefix / suffix addon
    expect(container.querySelector('[data-slot="input-group-addon"]')).toBeTruthy();
  });

  it('reflects value from form data', () => {
    const { container } = renderForm(
      [{ type: 'input-text', name: 'a', label: 'A' }],
      { a: 'hello' },
    );
    const input = container.querySelector('input#a-control') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });
});

// ─────────────────────────── textarea ───────────────────────────

describe('textarea DOM contract', () => {
  it('renders textarea[data-slot="textarea"] with id=name-control', () => {
    const { container } = renderForm([{ type: 'textarea', name: 'remark', label: 'Remark' }]);
    const ta = container.querySelector(
      'textarea#remark-control[data-slot="textarea"]',
    ) as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
    expect(ta.tagName).toBe('TEXTAREA');
  });

  it('reflects value from form data', () => {
    const { container } = renderForm(
      [{ type: 'textarea', name: 'remark', label: 'Remark' }],
      { remark: 'some text' },
    );
    expect((container.querySelector('textarea#remark-control') as HTMLTextAreaElement).value).toBe(
      'some text',
    );
  });
});

// ─────────────────────────── checkbox ───────────────────────────

describe('checkbox DOM contract', () => {
  it('renders checkbox wrapper + span[data-slot="checkbox"][role="checkbox"]', () => {
    const { container } = renderForm([
      { type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } },
    ]);
    expect(container.querySelector('[data-slot="checkbox-wrapper"]')).toBeTruthy();
    const cb = container.querySelector('[data-slot="checkbox"][role="checkbox"]');
    expect(cb).toBeTruthy();
    // ⚠ interactive 元素是 SPAN（Base UI CheckboxPrimitive），不是 BUTTON
    expect(cb?.tagName).toBe('SPAN');
  });

  it('aria-checked / data-checked reflect boolean value', () => {
    const { container } = renderForm(
      [{ type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } }],
      { agree: true },
    );
    const cb = container.querySelector('[data-slot="checkbox"][role="checkbox"]');
    expect(cb?.getAttribute('aria-checked')).toBe('true');
    expect(cb?.hasAttribute('data-checked')).toBe(true);
    // 未选中时
    const { container: c2 } = renderForm(
      [{ type: 'checkbox', name: 'x', label: 'X', option: { label: 'L' } }],
      { x: false },
    );
    const cb2 = c2.querySelector('[data-slot="checkbox"][role="checkbox"]');
    expect(cb2?.getAttribute('aria-checked')).toBe('false');
    expect(cb2?.hasAttribute('data-checked')).toBe(false);
  });
});

// ─────────────────────────── switch ───────────────────────────

describe('switch DOM contract', () => {
  it('renders switch wrapper + span[data-slot="switch"][role="switch"]', () => {
    const { container } = renderForm([{ type: 'switch', name: 'active', label: 'Active' }]);
    expect(container.querySelector('[data-slot="switch-wrapper"]')).toBeTruthy();
    const sw = container.querySelector('[data-slot="switch"][role="switch"]');
    expect(sw).toBeTruthy();
    // ⚠ interactive 元素是 SPAN（Base UI SwitchPrimitive），不是 BUTTON
    expect(sw?.tagName).toBe('SPAN');
  });

  it('aria-checked / data-checked reflect boolean value', () => {
    const { container } = renderForm([{ type: 'switch', name: 'active', label: 'Active' }], {
      active: true,
    });
    const sw = container.querySelector('[data-slot="switch"][role="switch"]');
    expect(sw?.getAttribute('aria-checked')).toBe('true');
    expect(sw?.hasAttribute('data-checked')).toBe(true);
  });
});

// ─────────────────────────── radio-group ───────────────────────────

describe('radio-group DOM contract', () => {
  it('renders radio-group wrapper + options with data-slot markers', () => {
    const { container } = renderForm([
      {
        type: 'radio-group',
        name: 'size',
        label: 'Size',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Large', value: 'lg' },
        ],
      },
    ]);
    expect(container.querySelector('[data-slot="radio-group-wrapper"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="radio-group-options"]')).toBeTruthy();
    // 每个选项 label 文本可定位
    expect(container.querySelector('[data-slot="radio-group-item-label"]')?.textContent).toContain(
      'Small',
    );
  });
});

// ─────────────────────────── checkbox-group ───────────────────────────

describe('checkbox-group DOM contract', () => {
  it('renders group with role="group" and item labels', () => {
    const { container } = renderForm([
      {
        type: 'checkbox-group',
        name: 'tags',
        label: 'Tags',
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
        ],
      },
    ]);
    expect(container.querySelector('[data-slot="checkbox-group-wrapper"]')).toBeTruthy();
    expect(container.querySelector('[role="group"]')).toBeTruthy();
    expect(
      container.querySelector('[data-slot="checkbox-group-item-label"]')?.textContent,
    ).toContain('Stable');
  });
});

// ─────────────────────────── input-number ───────────────────────────

describe('input-number DOM contract', () => {
  it('renders .nop-input-number with input role="spinbutton" id=name-control', () => {
    const { container } = renderForm([{ type: 'input-number', name: 'age', label: 'Age' }]);
    expect(container.querySelector('.nop-input-number')).toBeTruthy();
    const input = container.querySelector('input#age-control') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('number');
  });

  it('reflects numeric value from form data', () => {
    const { container } = renderForm(
      [{ type: 'input-number', name: 'age', label: 'Age' }],
      { age: 42 },
    );
    expect((container.querySelector('input#age-control') as HTMLInputElement).value).toBe('42');
  });
});

// ─────────────────────────── field-control 去重契约 ───────────────────────────
// FieldFrame 是 `data-slot="field-control"` 的唯一契约 owner（field-frame.tsx）。
// 被 wrap 的 renderer 根节点不得再输出同名 data-slot（重复会破坏下游选择器）。

describe('field-control data-slot dedup contract (FieldFrame owns the marker)', () => {
  it.each([
    ['input-number', '.nop-input-number', { type: 'input-number', name: 'n', label: 'N' }],
    ['input-date', '.nop-input-date', { type: 'input-date', name: 'd', label: 'D' }],
    ['input-datetime', '.nop-input-datetime', { type: 'input-datetime', name: 'dt', label: 'DT' }],
    ['input-time', '.nop-input-time', { type: 'input-time', name: 't', label: 'T' }],
    ['date-range', '.nop-date-range', { type: 'date-range', name: 'r', label: 'R' }],
  ])('%s renders exactly one data-slot="field-control" and its root drops the duplicate', (_type, rootSelector, field) => {
    const { container } = renderForm([field as never]);
    const controls = container.querySelectorAll('[data-slot="field-control"]');
    expect(controls.length).toBe(1);
    const root = container.querySelector(rootSelector);
    expect(root?.getAttribute('data-slot')).toBeNull();
  });
});
