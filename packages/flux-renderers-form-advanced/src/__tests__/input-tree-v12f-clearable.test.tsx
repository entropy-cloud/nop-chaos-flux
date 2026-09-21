import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

afterEach(() => cleanup());

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
}

function renderTree(clearable: boolean | undefined, treeMode: 'radio' | 'checkbox') {
  const SchemaRenderer = createTestRenderer();
  const initialData =
    treeMode === 'checkbox' ? { deptId: ['platform'] } : { deptId: 'platform' };
  return render(
    <SchemaRenderer
      schemaUrl={`test://input-tree-v12f-clearable#${String(clearable)}-${treeMode}`}
      schema={
        {
          type: 'form',
          data: initialData,
          body: [
            {
              type: 'input-tree',
              name: 'deptId',
              label: 'Dept',
              treeMode,
              clearable: clearable,
              options: [
                {
                  label: 'Platform',
                  value: 'platform',
                  children: [{ label: 'Runtime', value: 'runtime' }],
                },
                { label: 'Biz', value: 'biz' },
              ],
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

/**
 * V12f Phase 1 — [G7-R2-视角4-01] input-tree 残余缺口：schema `clearable`
 * 暴露/默认接线。tree-select 已有 `clearable` + 清除按钮
 * （tree-controls.tsx:426），input-tree 的 schema 类型与 renderer fields
 * 均未暴露 `clearable`，清除路径对该控件不可达。
 * 契约：`clearable: true` 且有选择时渲染清除按钮（data-slot=input-tree-clear），
 * 点击后单选清为 undefined、多选清为 []；未开启时不渲染。
 */
describe('V12f [G7-R2-视角4-01] input-tree schema clearable exposure', () => {
  it('renders the clear button when clearable is true and a single selection exists', async () => {
    renderTree(true, 'radio');
    const clearButton = await waitFor(() => {
      const btn = document.querySelector<HTMLButtonElement>('[data-slot="input-tree-clear"]');
      expect(btn).toBeTruthy();
      return btn!;
    });
    fireEvent.click(clearButton);
    // single-select clear resets the value: no option stays selected
    await waitFor(() => {
      const selected = screen.queryAllByRole('treeitem').filter(
        (item) => item.getAttribute('aria-selected') === 'true',
      );
      expect(selected.length).toBe(0);
    });
  });

  it('clears all selections in multiple mode', async () => {
    renderTree(true, 'checkbox');
    fireEvent.click(screen.getByRole('treeitem', { name: 'Runtime' }));
    const clearButton = document.querySelector<HTMLButtonElement>('[data-slot="input-tree-clear"]');
    expect(clearButton).toBeTruthy();
    fireEvent.click(clearButton!);
    await waitFor(() => {
      const checked = screen.queryAllByRole('treeitem').filter(
        (item) => item.getAttribute('aria-checked') === 'true',
      );
      expect(checked.length).toBe(0);
    });
  });

  it('does not render the clear button when clearable is not enabled', () => {
    renderTree(undefined, 'radio');
    expect(document.querySelector('[data-slot="input-tree-clear"]')).toBeNull();
  });
});
