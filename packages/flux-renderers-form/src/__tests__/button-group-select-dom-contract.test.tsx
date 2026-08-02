import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * button-group-select 字段控件 DOM 契约测试
 *
 * button-group-select 是 AMIS 的按钮组单选/多选控件（按钮形态的 radio/checkbox），
 * 用于如角色授权页（assign-auth）的 siteId 选择。此前 flux 无此渲染器，导致
 * 含该控件的页面（drawer surface）整体编译失败。
 *
 * 真相冻结：
 *  - 外层 .nop-button-group-select[data-slot="button-group-select-wrapper"]
 *  - 选项容器 [data-slot="button-group-select-options"][role="group"]
 *  - 每个按钮 [data-slot="button-group-select-item"]，文本 = option.label
 *  - 选中态：data-selected + aria-pressed="true"
 *  - single：点击选中一个（其余取消）；multiple：点击 toggle
 */
const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(
  body: Record<string, unknown>[],
  data?: Record<string, unknown>,
  envOverride?: Record<string, unknown>,
) {
  return render(
    <SchemaRenderer
      schemaUrl="test://button-group-select-contract"
      schema={
        {
          type: 'form',
          ...(data ? { data } : {}),
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={{ ...env, ...envOverride }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('button-group-select DOM contract', () => {
  it('renders wrapper + options group + item buttons', () => {
    const { container } = renderForm([
      {
        type: 'button-group-select',
        name: 'site',
        label: 'Site',
        multiple: false,
        options: [
          { label: 'Main', value: 'main' },
          { label: 'Secondary', value: 'secondary' },
        ],
      },
    ]);
    expect(container.querySelector('.nop-button-group-select')).toBeTruthy();
    expect(
      container.querySelector('[data-slot="button-group-select-wrapper"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-slot="button-group-select-options"]'),
    ).toBeTruthy();
    const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
    expect(items.length).toBe(2);
    // 选项文本 = label
    expect(items[0].textContent).toContain('Main');
    expect(items[1].textContent).toContain('Secondary');
  });

  it('option button text is label, NOT value', () => {
    const { container } = renderForm([
      {
        type: 'button-group-select',
        name: 'gender',
        label: 'Gender',
        options: [
          { label: 'Male', value: '1' },
          { label: 'Female', value: '2' },
        ],
      },
    ]);
    const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
    expect(items[0].textContent).toContain('Male');
    expect(items[0].textContent).not.toContain('"1"');
  });

  it('reflects initial value as selected (single mode)', () => {
    const { container } = renderForm(
      [
        {
          type: 'button-group-select',
          name: 'site',
          label: 'Site',
          options: [
            { label: 'Main', value: 'main' },
            { label: 'Secondary', value: 'secondary' },
          ],
        },
        { type: 'form-state-probe', name: 'site' },
      ],
      { site: 'secondary' },
    );
    const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
    // 第二个选中
    expect(items[0].hasAttribute('data-selected')).toBe(false);
    expect(items[1].hasAttribute('data-selected')).toBe(true);
    expect(items[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('single mode: clicking an option selects it and updates form value', async () => {
    const { container } = renderForm([
      {
        type: 'button-group-select',
        name: 'site',
        label: 'Site',
        options: [
          { label: 'Main', value: 'main' },
          { label: 'Secondary', value: 'secondary' },
        ],
      },
      { type: 'form-state-probe', name: 'site' },
    ]);
    const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
    fireEvent.click(items[1]);
    await waitFor(() => {
      expect(screen.getByTestId('form-state:site').textContent).toBe('"secondary"');
    });
    // 选中态切换
    const updated = container.querySelectorAll('[data-slot="button-group-select-item"]');
    expect(updated[1].hasAttribute('data-selected')).toBe(true);
    expect(updated[0].hasAttribute('data-selected')).toBe(false);
  });

  it('multiple mode: clicking toggles selection independently', async () => {
    const { container } = renderForm([
      {
        type: 'button-group-select',
        name: 'tags',
        label: 'Tags',
        multiple: true,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      },
      { type: 'form-state-probe', name: 'tags' },
    ]);
    const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
    fireEvent.click(items[0]);
    fireEvent.click(items[1]);
    await waitFor(() => {
      const state = screen.getByTestId('form-state:tags').textContent;
      // 多选：两个都选中
      expect(state).toContain('a');
      expect(state).toContain('b');
    });
    // 再次点击取消
    fireEvent.click(items[0]);
    await waitFor(() => {
      const state = screen.getByTestId('form-state:tags').textContent;
      expect(state).not.toContain('a');
    });
  });

  it('direction prop renders the options group without layout regressions', () => {
    const { container } = renderForm([
      {
        type: 'button-group-select',
        name: 'site',
        label: 'Site',
        direction: 'vertical',
        options: [{ label: 'Main', value: 'main' }],
      },
    ]);
    expect(container.querySelector('[data-slot="button-group-select-options"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="button-group-select-item"]').length).toBe(1);
  });

  it('dict option source loads options through env.loadDict', async () => {
    const loadDict = vi.fn(async () => ({
      options: [
        { label: 'Dict A', value: 'a' },
        { label: 'Dict B', value: 'b' },
      ],
    }));
    const { container } = renderForm(
      [
        {
          type: 'button-group-select',
          name: 'site',
          label: 'Site',
          dict: 'siteDict',
        },
      ],
      undefined,
      { loadDict },
    );
    await waitFor(() => {
      const items = container.querySelectorAll('[data-slot="button-group-select-item"]');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('Dict A');
    });
    expect(loadDict).toHaveBeenCalledWith('siteDict');
  });
});
