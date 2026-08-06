import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl="test://field-control-dedup"
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

// FieldFrame 是 `data-slot="field-control"` 的唯一契约 owner（field-frame.tsx:258）。
// 这些 renderer 均被 FieldFrame 包裹（wrap: true），根节点不得重复输出同名 data-slot。
// 复合字段（object/array/combo 等）内部还包含自身被 wrap 的子字段，因此用
// 「根节点不再输出 data-slot="field-control"」作为契约断言，而不是整棵子树计数。

describe('field-control data-slot dedup contract (form-advanced family)', () => {
  it.each([
    ['combo', '.nop-combo', { type: 'combo', name: 'lines', label: 'Lines', items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }] }],
    ['input-table', '.nop-input-table', { type: 'input-table', name: 'rows', label: 'Rows', columns: [{ label: 'SKU' }], item: [{ type: 'input-text', name: 'sku', placeholder: 'TSKU' }] }],
    ['object-field', '.nop-object-field', { type: 'object-field', name: 'address', label: 'Address', body: [{ type: 'input-text', name: 'street', label: 'Street' }] }],
    ['array-field', '.nop-array-field', { type: 'array-field', name: 'contacts', label: 'Contacts', itemKind: 'object', item: [{ type: 'input-text', name: 'name', label: 'Name' }] }],
    ['picker', '.nop-picker', { type: 'picker', name: 'owner', label: 'Owner' }],
    ['key-value', '.nop-key-value', { type: 'key-value', name: 'meta', label: 'Meta' }],
    ['icon-picker', '.nop-icon-picker', { type: 'icon-picker', name: 'icon', label: 'Icon' }],
    ['transfer', '.nop-transfer', { type: 'transfer', name: 'roles', label: 'Roles', options: [{ label: 'Admin', value: 'admin' }] }],
    ['detail-field', '.nop-detail-field', { type: 'detail-field', name: 'address', label: 'Address', content: [{ type: 'input-text', name: 'street', label: 'Street' }] }],
  ])('%s root no longer emits data-slot="field-control"', async (_type, rootSelector, field) => {
    const { container } = renderForm([field as never]);
    await waitFor(() => {
      expect(container.querySelector(rootSelector)).toBeTruthy();
    });
    const root = container.querySelector(rootSelector);
    expect(root?.getAttribute('data-slot')).not.toBe('field-control');
    expect(root?.getAttribute('data-slot')).toBeNull();
  });
});
