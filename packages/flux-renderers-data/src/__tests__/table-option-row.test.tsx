import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SOURCE = [
  { id: 'r1', name: 'Alice' },
  { id: 'r2', name: 'Bob' },
  { id: 'r3', name: 'Carol' },
];

function bodyRows() {
  return Array.from(document.querySelectorAll('tbody [data-slot="table-row"]'));
}

afterEach(cleanup);

describe('table option-row compat matrix (opt-row-compat)', () => {
  it('emits zero option-row attributes when optionRow is not declared', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-compat"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    for (const row of bodyRows()) {
      expect(row.hasAttribute('data-option-row')).toBe(false);
      expect(row.hasAttribute('data-state')).toBe(false);
      expect(row.hasAttribute('data-selected')).toBe(false);
      expect(row.hasAttribute('aria-selected')).toBe(false);
    }
  });
});

describe('table option-row attribute/class output matrix', () => {
  it('marks the binding-matched row (data-option-row/data-state/data-selected/aria-selected)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              optionRow: { value: '${activeId}' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        data={{ activeId: 'r2' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    const [r1, r2, r3] = bodyRows();
    expect(r2!.getAttribute('data-option-row')).toBe('true');
    expect(r2!.getAttribute('data-state')).toBe('selected');
    expect(r2!.getAttribute('data-selected')).toBe('true');
    expect(r2!.getAttribute('aria-selected')).toBe('true');
    expect(r1!.getAttribute('data-option-row')).toBe('true');
    expect(r1!.getAttribute('aria-selected')).toBe('false');
    expect(r1!.getAttribute('data-selected')).toBeNull();
    expect(r3!.getAttribute('aria-selected')).toBe('false');
  });

  it('applies optionRow.selectedClass and honors valueField', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-selected-class"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              optionRow: { value: '${activeName}', valueField: 'name', selectedClass: 'row-on' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        data={{ activeName: 'Carol' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Carol')).toBeTruthy());
    expect(bodyRows()[2]!.className).toContain('row-on');
    expect(bodyRows()[0]!.className).not.toContain('row-on');
  });

  it('consumes the internal rowSelection selection through the standard channel when no binding is declared', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-internal-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              rowSelection: { type: 'checkbox' },
              optionRow: {},
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    const checkbox = document.querySelector('tbody [data-slot="table-select-cell"] input, tbody [role="checkbox"]');
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);
    await waitFor(() => {
      expect(bodyRows()[0]!.getAttribute('data-option-row')).toBe('true');
      expect(bodyRows()[0]!.getAttribute('data-state')).toBe('selected');
      expect(bodyRows()[0]!.getAttribute('data-selected')).toBe('true');
      expect(bodyRows()[0]!.getAttribute('aria-selected')).toBe('true');
    });
  });

  it('emits the disabled token + aria-disabled when the owner node is disabled', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              disabled: true,
              optionRow: { value: '${activeId}' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        data={{ activeId: 'r1' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    expect(bodyRows()[0]!.getAttribute('data-state')).toBe('selected disabled');
    expect(bodyRows()[0]!.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('table option-row failure paths', () => {
  it('degrades to no selection for an unresolved binding without crashing (opt-row-value-invalid)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-invalid-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              optionRow: { value: '${notDefinedAnywhere}' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    for (const row of bodyRows()) {
      expect(row.getAttribute('data-selected')).toBeNull();
      expect(row.getAttribute('data-state')).toBeNull();
      expect(row.getAttribute('aria-selected')).toBe('false');
    }
  });
});

describe('table option-row coexistence (opt-row-selection-clash)', () => {
  it('binding drives markers exclusively; rowSelection checkboxes keep working + dev warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-option-row-clash"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              rowSelection: { type: 'checkbox' },
              optionRow: { value: '${activeId}' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        data={{ activeId: 'r2' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[flux:table] optionRow.value'));

    // Binding drives the markers: r2 selected, r1 not — regardless of clicks.
    const checkbox = document.querySelector('tbody [data-slot="table-select-cell"] input, tbody [role="checkbox"]');
    fireEvent.click(checkbox!);
    await waitFor(() => {
      expect(checkbox).toHaveProperty('checked', true);
    });
    expect(bodyRows()[0]!.getAttribute('data-selected')).toBeNull();
    expect(bodyRows()[0]!.getAttribute('aria-selected')).toBe('false');
    expect(bodyRows()[1]!.getAttribute('data-selected')).toBe('true');

    warn.mockRestore();
  });
});
