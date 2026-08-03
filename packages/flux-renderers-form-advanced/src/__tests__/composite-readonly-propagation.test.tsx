import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://composite-readonly-propagation"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

const comboItem = [{ type: 'input-text', name: 'name', placeholder: 'CName' }];
const tableItem = [{ type: 'input-text', name: 'sku', placeholder: 'TSKU' }];

describe('combo: readOnly/disabled propagate to item fields (C3.1 P1-2)', () => {
  it('readOnly: true renders item cell inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'A' }, { name: 'B' }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', readOnly: true, items: comboItem },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('CName')).toHaveLength(2);
    });

    // The browser blocks typing in a readonly input; the DOM contract is what
    // the host scenario asserts end-to-end (jsdom does not simulate the gate).
    for (const input of screen.getAllByPlaceholderText('CName') as HTMLInputElement[]) {
      expect(input.getAttribute('readonly')).not.toBeNull();
    }
  });

  it('disabled: true renders item cell inputs read-only (interaction off)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'A' }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', disabled: true, items: comboItem },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('CName')).toHaveLength(1);
    });

    expect(
      (screen.getAllByPlaceholderText('CName')[0] as HTMLInputElement).getAttribute('readonly'),
    ).not.toBeNull();
  });
});

describe('input-table: readOnly/disabled propagate to row cell fields (C3.1 P1-2)', () => {
  it('readOnly: true renders cell inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1' }, { sku: 'B2' }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: [{ label: 'SKU' }],
          readOnly: true,
          item: tableItem,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('TSKU')).toHaveLength(2);
    });

    for (const input of screen.getAllByPlaceholderText('TSKU') as HTMLInputElement[]) {
      expect(input.getAttribute('readonly')).not.toBeNull();
    }
  });

  it('disabled: true hides interactive chrome and renders cells non-editable', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ sku: 'A1' }] },
      body: [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: [{ label: 'SKU' }],
          disabled: true,
          item: tableItem,
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('TSKU')).toHaveLength(1);
    });

    expect(document.querySelectorAll('[data-slot="input-table-remove"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-slot="input-table-add"]')).toHaveLength(0);
    expect(
      (screen.getAllByPlaceholderText('TSKU')[0] as HTMLInputElement).getAttribute('readonly'),
    ).not.toBeNull();
  });
});

export {};
