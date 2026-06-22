import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
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
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-option-template"
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

const richOptions = [
  { label: 'Administrator', value: 'admin', description: 'Full system access' },
  { label: 'Editor', value: 'editor', description: 'Can edit content' },
  { label: 'Viewer', value: 'viewer', description: 'Read-only access' },
];

describe('select optionTemplate region (E3)', () => {
  it('renders custom option content via $slot.option binding', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: richOptions,
        optionTemplate: [
          {
            type: 'text',
            text: '${$slot.option.label} — ${$slot.option.description}',
          },
        ],
      },
    ]);

    openCombobox('Role');

    await waitFor(() => {
      expect(screen.getByText('Administrator — Full system access')).toBeTruthy();
    });
    expect(screen.getByText('Editor — Can edit content')).toBeTruthy();
    expect(screen.getByText('Viewer — Read-only access')).toBeTruthy();
  });

  it('preserves value-matching contract when optionTemplate is active', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: richOptions,
        optionTemplate: [
          {
            type: 'text',
            text: '${$slot.option.label} — ${$slot.option.description}',
          },
        ],
      },
      { type: 'form-state-probe', name: 'role' },
    ]);

    openCombobox('Role');
    const option = await screen.findByText('Editor — Can edit content');
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:role').textContent).toBe('"editor"');
    });
  });

  it('falls back to plain label when optionTemplate is not declared', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: richOptions,
      },
    ]);

    openCombobox('Role');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Administrator' })).toBeTruthy();
    });
    expect(screen.queryByText('Administrator — Full system access')).toBeNull();
    expect(screen.getByRole('option', { name: 'Editor' })).toBeTruthy();
  });

  it('degrades gracefully when optionTemplate references a missing field', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: richOptions,
        optionTemplate: [
          {
            type: 'text',
            text: '${$slot.option.label} [${$slot.option.missingField}]',
          },
        ],
      },
    ]);

    openCombobox('Role');

    await waitFor(() => {
      expect(screen.getByText('Administrator []')).toBeTruthy();
    });
  });

  it('renders custom content for virtualized options', async () => {
    virtualMockConfig.items = [
      { key: 'opt-0', index: 0, start: 0 },
      { key: 'opt-1', index: 1, start: 32 },
    ];

    const options = Array.from({ length: 200 }, (_, i) => ({
      label: `Option ${i}`,
      value: `opt-${i}`,
      description: `Desc ${i}`,
    }));

    renderForm([
      {
        type: 'select',
        name: 'big',
        label: 'Big',
        virtual: true,
        options,
        optionTemplate: [
          {
            type: 'text',
            text: '${$slot.option.label} · ${$slot.option.description}',
          },
        ],
      },
    ]);

    openCombobox('Big');

    await waitFor(() => {
      expect(screen.getByText('Option 0 · Desc 0')).toBeTruthy();
    });
    expect(screen.getByText('Option 1 · Desc 1')).toBeTruthy();
  });
});
