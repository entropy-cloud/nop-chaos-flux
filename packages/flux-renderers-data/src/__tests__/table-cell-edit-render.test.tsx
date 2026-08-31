import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { validateTableSchema } from '../data-schema-validation.js';
import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';

afterEach(cleanup);

const ROWS = [
  { id: '1', name: 'Alice', level: 'high' },
  { id: '2', name: 'Bob', level: 'low' },
];

function renderEditTable(options: {
  columns?: Array<Record<string, unknown>>;
  rowSelection?: Record<string, unknown>;
  selectionStatePath?: string;
}) {
  const SchemaRenderer = createDataSchemaRenderer([]);
  render(
    <SchemaRenderer
      schemaUrl="test://data/table-cell-edit-render"
      schema={{
        type: 'page',
        body: [
          {
            type: 'table',
            id: 'edit-table',
            rowKey: 'id',
            source: ROWS,
            rowSelection: options.rowSelection as never,
            selectionStatePath: options.selectionStatePath,
            columns: (options.columns ?? [
              { name: 'name', label: 'Name', editable: true },
              { name: 'level', label: 'Level' },
            ]) as never,
          },
          { type: 'text', text: 'SEL:${selection}' },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function editableCells(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('[data-slot="table-editable-cell"]'),
  ) as HTMLElement[];
}

describe('table cell edit — zero regression & declaration gate', () => {
  it('renders no editable cells when no column declares editable', () => {
    renderEditTable({ columns: [{ name: 'name', label: 'Name' }] });
    expect(editableCells()).toHaveLength(0);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders the navigation-state editable cell with the display text', () => {
    renderEditTable({});
    const cells = editableCells();
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toBe('Alice');
    expect(cells[0].getAttribute('data-editor')).toBe('text');
    expect(cells[0].getAttribute('tabindex')).toBe('0');
  });

  it('Enter enters editing and Enter commits through the scope write channel', async () => {
    renderEditTable({});
    const cell = editableCells()[0];

    fireEvent.keyDown(cell, { key: 'Enter' });
    const input = editingInput();
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(editableCells()[0].textContent).toBe('Alicia');
    });
  });
});

function editingInput(): HTMLInputElement {
  return document.querySelector(
    '[data-slot="table-editable-cell"][data-editing="true"] input, [data-slot="table-editable-cell"][data-editing="true"] select',
  ) as HTMLInputElement;
}

describe('table cell edit — quickEdit coexistence (gd-cell-edit-quickedit-coexist)', () => {
  it('editable takes precedence: quickEdit control is not rendered, one-time dev warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderEditTable({
      columns: [{ name: 'name', label: 'Name', editable: true, quickEdit: true }],
    });

    expect(editableCells()).toHaveLength(2);
    expect(document.querySelectorAll('[data-slot="table-quick-edit"]')).toHaveLength(0);
    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes('gd-cell-edit-quickedit-coexist'),
    );
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('table cell edit — read-only fallbacks', () => {
  it('unknown editor kind falls back to a read-only cell with a dev warn (gd-cell-edit-no-editor)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderEditTable({
      columns: [{ name: 'name', label: 'Name', editable: { editor: 'color-picker' } }],
    });

    expect(editableCells()).toHaveLength(0);
    expect(screen.getByText('Alice')).toBeTruthy();
    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes('gd-cell-edit-no-editor'),
    );
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });

  it('editable without a column name falls back to read-only with a dev warn (gd-cell-edit-no-name)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderEditTable({
      columns: [{ label: 'Nameless', editable: true }],
    });

    expect(editableCells()).toHaveLength(0);
    const calls = warn.mock.calls.filter(([message]) =>
      String(message).includes('gd-cell-edit-no-name'),
    );
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('table cell edit — row gesture isolation', () => {
  it('clicking an editable cell does not toggle the row selection (toggleOnRowClick)', () => {
    renderEditTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
      selectionStatePath: 'selection',
    });

    fireEvent.click(editableCells()[0]);
    expect(screen.getByText(/^SEL:/).textContent).toBe('SEL:');

    const input = editingInput();
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText(/^SEL:/).textContent).toBe('SEL:');
  });
});

describe('table cell edit — schema validation', () => {
  function validate(schema: Record<string, unknown>) {
    const diagnostics: Array<{ code: string; path: string; message: string }> = [];
    const context = {
      schema: { type: 'table', ...schema } as never,
      path: 'body[0]',
      emit: (diagnostic: never) => diagnostics.push(diagnostic as never),
    } as unknown as RendererSchemaValidationContext<never>;
    validateTableSchema(context as never);
    return diagnostics;
  }

  it('rejects invalid editable editor kinds on columns', () => {
    const diagnostics = validate({
      columns: [{ name: 'a', editable: { editor: 'color-picker' } }],
    });
    expect(
      diagnostics.some(
        (d) => d.code === 'invalid-property-shape' && d.path.endsWith('columns/0/editable/editor'),
      ),
    ).toBe(true);
  });
});
