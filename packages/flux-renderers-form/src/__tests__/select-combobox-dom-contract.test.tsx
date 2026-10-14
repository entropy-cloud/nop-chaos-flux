import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * select / combobox DOM 契约测试
 *
 * 从 field-controls-dom-contract.test.tsx 拆出——combobox 是下游最容易踩坑的控件，
 * 单独成文件以便契约独立演进，也避免主契约文件越过 500 行拆分阈值。
 *
 * 冻结范围与主契约文件一致，见该文件头部说明。
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
      schemaUrl="test://select-combobox-dom-contract"
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

// ─────────────────────────── select / combobox ───────────────────────────
// 这是下游最容易踩坑的控件。冻结以下真相：
//  - 外层 .nop-select-wrapper[data-slot="select-wrapper"]
//  - searchable=true  → 触发器是 input[role="combobox"]
//  - searchable=false → 触发器是 button[data-slot="combobox-trigger"]
//  - 选项可见文本 = option.label（**非 value**）；选项暴露 data-value=option.value（可按 value 精确定位）
//  - 弹出层 portaled 到 document.body，用 screen.getByRole('option') 查询

describe('select / combobox DOM contract', () => {
  it('wrapper emits nop-select-wrapper + data-slot="select-wrapper"', () => {
    const { container } = renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const wrapper = container.querySelector('.nop-select-wrapper[data-slot="select-wrapper"]');
    expect(wrapper).toBeTruthy();
  });

  it('non-searchable trigger is a button[data-slot="combobox-trigger"]', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: false,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);
    const trigger = document.querySelector('[data-slot="combobox-trigger"]');
    expect(trigger).toBeTruthy();
    expect(trigger?.tagName).toBe('BUTTON');
    // 触发器 id = name-control（host-visible）
    expect(document.getElementById('role-control')).toBeTruthy();
  });

  it('searchable trigger is an input[role="combobox"]', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);
    const control = document.getElementById('role-control');
    expect(control).toBeTruthy();
    expect(control?.tagName).toBe('INPUT');
    expect(control?.getAttribute('role')).toBe('combobox');
    // searchable input 的 data-slot 是 input-group-control（在 input-group 内）
    expect(control?.getAttribute('data-slot')).toBe('input-group-control');
  });

  it('option visible text is option.label, NOT value', async () => {
    renderForm([
      {
        type: 'select',
        name: 'gender',
        label: 'Gender',
        searchable: true,
        options: [
          { label: 'Male', value: '1' },
          { label: 'Female', value: '2' },
        ],
      },
    ]);
    const control = screen.getByRole('combobox', { name: 'Gender' });
    fireEvent.mouseDown(control);
    fireEvent.click(control);

    await waitFor(() => {
      // 选项文本是 label "Male"/"Female"，不是 value "1"/"2"
      expect(screen.getByRole('option', { name: 'Male' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Female' })).toBeTruthy();
    });
  });

  it('combobox-item exposes data-value equal to option.value', async () => {
    renderForm([
      {
        type: 'select',
        name: 'gender',
        label: 'Gender',
        searchable: true,
        options: [{ label: 'Male', value: '1' }],
      },
    ]);
    const control = screen.getByRole('combobox', { name: 'Gender' });
    fireEvent.mouseDown(control);
    fireEvent.click(control);

    await waitFor(() => {
      const item = document.querySelector('[data-slot="combobox-item"]');
      expect(item).toBeTruthy();
    });
    const item = document.querySelector('[data-slot="combobox-item"]');
    // 选项暴露 data-value：下游可用 [data-value="1"] 精确定位（替代文本模糊匹配）
    expect(item?.getAttribute('data-value')).toBe('1');
    // 选项 data-slot 标记
    expect(item?.getAttribute('data-slot')).toBe('combobox-item');
    // combobox-item 自身不带 role="option"（Base UI ComboboxItem 渲染为 div）；
    // role="option" 由 ARIA 语义层提供，screen.getByRole('option') 仍可定位。
    expect(item?.tagName).toBe('DIV');
  });

  it('closed popup does NOT carry data-open; opened one does', async () => {
    renderForm([
      {
        type: 'select',
        name: 'gender',
        label: 'Gender',
        searchable: true,
        options: [{ label: 'Male', value: '1' }],
      },
    ]);

    expect(document.querySelector('[data-slot="combobox-content"][data-open]')).toBeNull();

    const control = screen.getByRole('combobox', { name: 'Gender' });
    fireEvent.mouseDown(control);
    fireEvent.click(control);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="combobox-content"][data-open]')).toBeTruthy();
    });
  });

  it('scoping options by the [data-open] popup yields exactly the opened field options', async () => {
    renderForm([
      {
        type: 'select',
        name: 'gender',
        label: 'Gender',
        searchable: true,
        options: [
          { label: 'Male', value: '1' },
          { label: 'Female', value: '2' },
        ],
      },
      {
        type: 'select',
        name: 'status',
        label: 'Status',
        searchable: true,
        options: [
          { label: 'Active', value: 'a' },
          { label: 'Closed', value: 'c' },
        ],
      },
    ]);

    const scopedOptionValues = () =>
      Array.from(
        document.querySelectorAll(
          '[data-slot="combobox-content"][data-open] [data-slot="combobox-item"]',
        ),
      ).map((el) => el.getAttribute('data-value'));

    // 弹层打开期间是 modal，其余字段不可访问——逐个开关验证
    const toggle = async (name: string, expected: string[]) => {
      const control = screen.getByRole('combobox', { name });
      fireEvent.mouseDown(control);
      fireEvent.click(control);
      await waitFor(() => {
        expect(document.querySelector('[data-slot="combobox-content"][data-open]')).toBeTruthy();
      });
      expect(scopedOptionValues().sort()).toEqual(expected);

      fireEvent.keyDown(control, { key: 'Escape' });
      await waitFor(() => {
        expect(document.querySelector('[data-slot="combobox-content"][data-open]')).toBeNull();
      });
    };

    await toggle('Gender', ['1', '2']);
    await toggle('Status', ['a', 'c']);
  });

  it('selected value is rendered inside combobox-trigger (non-searchable)', async () => {
    const { container } = renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: false,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'admin' },
    );
    await waitFor(() => {
      expect(screen.getByTestId('form-state:role').textContent).toBe('"admin"');
    });
    // ⚠ 选中值显示在 trigger 按钮内的普通 <span>（无 data-slot="combobox-value"）。
    // 下游读取选中值应查 combobox-trigger 内的文本，而非 combobox-value。
    const trigger = container.querySelector('[data-slot="combobox-trigger"]');
    expect(trigger?.textContent).toContain('Admin');
    expect(container.querySelector('[data-slot="combobox-value"]')).toBeNull();
  });
});
