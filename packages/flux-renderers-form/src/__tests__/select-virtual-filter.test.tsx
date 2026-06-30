import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

const virtualMockConfig = vi.hoisted(() => ({
  items: [] as Array<{ key: string; index: number; start: number }>,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () =>
      virtualMockConfig.items.length > 0
        ? virtualMockConfig.items[virtualMockConfig.items.length - 1].start + 32
        : 0,
    getVirtualItems: () => virtualMockConfig.items,
  }),
}));

afterEach(() => {
  cleanup();
  virtualMockConfig.items = [];
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-virtual-filter"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function openCombobox(label: string) {
  const control = screen.getByRole('combobox', { name: label });
  fireEvent.mouseDown(control);
  fireEvent.click(control);
}

describe('S6: virtualised list survives filtering after a deep scroll offset', () => {
  it('renders an item at a deep offset without crashing (getItemKey guard)', async () => {
    virtualMockConfig.items = [{ key: 'opt-700', index: 700, start: 22400 }];

    const options = Array.from({ length: 1000 }, (_, i) => ({
      label: `Option ${i}`,
      value: `opt-${i}`,
    }));

    renderForm([
      {
        type: 'select',
        name: 'big',
        label: 'Big',
        searchable: true,
        virtual: true,
        options,
      },
    ]);

    openCombobox('Big');

    await waitFor(() => {
      expect(screen.getByText('Option 700')).toBeTruthy();
    });
  });

  it('does not crash when the virtualiser reports a stale index beyond the filtered list length (null guard)', async () => {
    const options = Array.from({ length: 200 }, (_, i) => ({
      label: `Option ${i}`,
      value: `opt-${i}`,
    }));

    // The virtualiser window still references index 0 (valid after filter) plus a
    // stale index 400 that no longer exists once the list is narrowed. The null
    // guard at select-combobox-lists.tsx must drop the stale entry without throwing.
    virtualMockConfig.items = [
      { key: 'opt-0', index: 0, start: 0 },
      { key: 'opt-400', index: 400, start: 12800 },
    ];

    renderForm([
      {
        type: 'select',
        name: 'big',
        label: 'Big',
        searchable: true,
        virtual: true,
        options,
      },
    ]);

    openCombobox('Big');

    const input = screen.getByRole('combobox', { name: 'Big' }) as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'Option 0' } });

    await waitFor(() => {
      expect(screen.getByText('Option 0')).toBeTruthy();
    });
    // The stale index-400 entry must not throw or render garbage.
    expect(screen.queryByText('Option 400')).toBeNull();
  });
});
