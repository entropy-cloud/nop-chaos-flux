import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formulaCompiler, installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allDefinitions = [...basicRendererDefinitions, ...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

/**
 * V12f Phase 3 — [G2-R2-视角4-02] composite 家族（array-editor / combo /
 * input-table）到达 maxItems 后 Add 按钮静默禁用，无计数无提示。
 * 契约（对齐 table-selection-cap 的 role="status" 模式）：at maxItems 时
 * 渲染可见的计数提示 `<data-slot="*-max-items">`，含 count/max；
 * 未达上限时不渲染。
 */
function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  render(
    <SchemaRenderer
      schemaUrl="test://composite-maxitems-feedback"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('V12f [G2-R2-视角4-02] composite Add buttons announce the maxItems cap', () => {
  it('array-editor: shows count/cap hint when at maxItems', () => {
    renderSchema({
      type: 'form',
      data: {
        reviewers: [
          { id: 'item-1', value: 'alice' },
          { id: 'item-2', value: 'bob' },
          { id: 'item-3', value: 'carol' },
        ],
      },
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
          maxItems: 3,
        },
      ],
    });

    const addButton = screen.getByText('Add item') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    const hint = document.querySelector('[data-slot="array-editor-max-items"]');
    expect(hint).not.toBeNull();
    expect(hint!.getAttribute('role')).toBe('status');
    expect(hint!.textContent).toContain('3/3');
  });

  it('array-editor: no hint below the cap', () => {
    renderSchema({
      type: 'form',
      data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
          maxItems: 3,
        },
      ],
    });

    const addButton = screen.getByText('Add item') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
    expect(document.querySelector('[data-slot="array-editor-max-items"]')).toBeNull();
  });

  it('combo: shows count/cap hint when at maxItems', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        lines: [
          { name: 'apple', qty: 2 },
          { name: 'pear', qty: 1 },
        ],
      },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          maxItems: 2,
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
      ],
    });

    await waitFor(() => {
      const addButton = document.querySelector<HTMLButtonElement>('[data-slot="combo-add"]');
      expect(addButton).not.toBeNull();
      expect(addButton!.disabled).toBe(true);
    });
    const hint = document.querySelector('[data-slot="combo-max-items"]');
    expect(hint).not.toBeNull();
    expect(hint!.getAttribute('role')).toBe('status');
    expect(hint!.textContent).toContain('2/2');
  });

  it('input-table: shows count/cap hint when at maxItems', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        rows: [
          { sku: 'A1', amount: 3 },
          { sku: 'B2', amount: 4 },
        ],
      },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          maxItems: 2,
          columns: [{ label: 'SKU' }, { label: 'Amount' }],
          item: [
            { type: 'input-text', name: 'sku', placeholder: 'SKU' },
            { type: 'input-number', name: 'amount', placeholder: 'Amount' },
          ],
        },
      ],
    });

    await waitFor(() => {
      const addButton = document.querySelector<HTMLButtonElement>('[data-slot="input-table-add"]');
      expect(addButton).not.toBeNull();
      expect(addButton!.disabled).toBe(true);
    });
    const hint = document.querySelector('[data-slot="input-table-max-items"]');
    expect(hint).not.toBeNull();
    expect(hint!.getAttribute('role')).toBe('status');
    expect(hint!.textContent).toContain('2/2');
  });
});
