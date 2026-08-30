import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, buttonRenderer, env, formulaCompiler } from '../test-support.js';

const ROWS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

function items() {
  return Array.from(document.querySelectorAll('[data-slot="list-item"]'));
}

afterEach(cleanup);

describe('list option-row compat matrix (opt-row-compat)', () => {
  it('emits zero option-row attributes when optionRow is not declared', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-compat"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    for (const item of items()) {
      expect(item.hasAttribute('data-option-row')).toBe(false);
      expect(item.hasAttribute('data-state')).toBe(false);
      expect(item.hasAttribute('aria-selected')).toBe(false);
      expect(item.hasAttribute('data-selected')).toBe(false);
    }
  });

  it('keeps legacy internal-selection output intact (data-selected/aria-current, no aria-selected)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-legacy-selection"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              selectionMode: 'single',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    fireEvent.click(items()[0]!);
    await waitFor(() => {
      expect(items()[0]!.getAttribute('data-selected')).toBe('true');
      expect(items()[0]!.getAttribute('aria-current')).toBe('true');
      expect(items()[0]!.hasAttribute('aria-selected')).toBe(false);
      expect(items()[0]!.hasAttribute('data-state')).toBe(false);
    });
  });
});

describe('list option-row attribute/class output matrix', () => {
  it('marks the binding-matched row (data-option-row/data-state/data-selected/aria-selected)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${activeId}' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS, activeId: 'b' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Beta')).toBeTruthy());
    const [a, b, c] = items();
    expect(b!.getAttribute('data-option-row')).toBe('true');
    expect(b!.getAttribute('data-state')).toBe('selected');
    expect(b!.getAttribute('data-selected')).toBe('true');
    expect(b!.getAttribute('aria-selected')).toBe('true');
    expect(a!.getAttribute('data-option-row')).toBe('true');
    expect(a!.getAttribute('data-state')).toBeNull();
    expect(a!.getAttribute('aria-selected')).toBe('false');
    expect(c!.getAttribute('aria-selected')).toBe('false');
  });

  it('reacts to binding updates via scope writes (state source reactivity)', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-reactive"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${activeId}' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
            {
              type: 'button',
              onClick: { action: 'setValue', args: { path: 'activeId', value: 'b' } },
            },
          ],
        }}
        data={{ rows: ROWS, activeId: 'a' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(items()[0]!.getAttribute('data-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(items()[0]!.getAttribute('data-selected')).toBeNull();
      expect(items()[1]!.getAttribute('data-selected')).toBe('true');
      expect(items()[1]!.getAttribute('data-state')).toBe('selected');
    });
  });

  it('applies optionRow.selectedClass to the selected row only', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-selected-class"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${activeId}', selectedClass: 'my-selected-row' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS, activeId: 'c' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Gamma')).toBeTruthy());
    expect(items()[2]!.className).toContain('my-selected-row');
    expect(items()[0]!.className).not.toContain('my-selected-row');
  });

  it('matches any entry for array bindings', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-array-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${pickedIds}' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS, pickedIds: ['a', 'c'] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(items()[0]!.getAttribute('data-selected')).toBe('true');
    expect(items()[1]!.getAttribute('data-selected')).toBeNull();
    expect(items()[2]!.getAttribute('data-selected')).toBe('true');
  });

  it('honors optionRow.valueField over keyField for the compared item field', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-value-field"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${activeCode}', valueField: 'code' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{
          rows: [
            { id: 'a', code: 'x1', label: 'Alpha' },
            { id: 'b', code: 'x2', label: 'Beta' },
          ],
          activeCode: 'x2',
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Beta')).toBeTruthy());
    expect(items()[1]!.getAttribute('data-selected')).toBe('true');
    expect(items()[0]!.getAttribute('data-selected')).toBeNull();
  });

  it('falls back to internal selection when optionRow carries no value (state-source reuse)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-internal-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              selectionMode: 'single',
              optionRow: {},
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    fireEvent.click(items()[1]!);
    await waitFor(() => {
      expect(items()[1]!.getAttribute('data-option-row')).toBe('true');
      expect(items()[1]!.getAttribute('data-state')).toBe('selected');
      expect(items()[1]!.getAttribute('data-selected')).toBe('true');
      expect(items()[1]!.getAttribute('aria-selected')).toBe('true');
    });
  });

  it('emits the disabled token + aria-disabled when the owner node is disabled', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              disabled: true,
              optionRow: { value: '${activeId}' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS, activeId: 'a' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    const first = items()[0]!;
    expect(first.getAttribute('data-state')).toBe('selected disabled');
    expect(first.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('list option-row failure paths', () => {
  it('degrades to no selection for an unresolved/empty binding without crashing (opt-row-value-invalid)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-invalid-binding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: { value: '${notDefinedAnywhere}' },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    for (const item of items()) {
      expect(item.getAttribute('data-selected')).toBeNull();
      expect(item.getAttribute('data-state')).toBeNull();
      expect(item.getAttribute('aria-selected')).toBe('false');
    }
  });

  it('does not attach JS hover state handlers (hover channel is CSS-pseudo-class only, opt-row-hover-touch)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-hover-noop"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              optionRow: {},
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    const first = items()[0]!;
    fireEvent.mouseOver(first);
    fireEvent.mouseEnter(first);
    expect(first.getAttribute('data-state')).toBeNull();
    expect(Object.keys(first).some((key) => key.toLowerCase().includes('hover'))).toBe(false);
  });
});

describe('list option-row coexistence (opt-row-selection-clash)', () => {
  it('binding drives markers exclusively; internal selection still dispatches events + dev warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-option-row-clash"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              selectionMode: 'single',
              optionRow: { value: '${activeId}' },
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'selectionReported', value: true },
              },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
            {
              type: 'text',
              text: 'selection:${selectionReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{ rows: ROWS, activeId: 'b' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Beta')).toBeTruthy());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[flux:list] optionRow.value'));

    fireEvent.click(items()[0]!);
    await waitFor(() => expect(screen.getByText('selection:reported')).toBeTruthy());
    expect(items()[0]!.getAttribute('data-selected')).toBeNull();
    expect(items()[0]!.getAttribute('aria-selected')).toBe('false');
    expect(items()[1]!.getAttribute('data-selected')).toBe('true');

    warn.mockRestore();
  });
});
