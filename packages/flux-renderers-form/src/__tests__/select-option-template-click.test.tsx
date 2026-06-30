import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
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

function StopPropLinkRenderer(_props: RendererComponentProps) {
  return (
    <a
      href="#stop-prop-link"
      data-slot="stop-prop-link"
      onClick={(event) => event.stopPropagation()}
    >
      stop-prop-content
    </a>
  );
}

const stopPropLinkRenderer: RendererDefinition = {
  type: 'stop-prop-link',
  component: StopPropLinkRenderer,
};

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    stopPropLinkRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-option-template-click"
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

describe('S12: optionTemplate — click anywhere on the option selects it', () => {
  it('clicks deep inside a nested plain template and still commits the selection', async () => {
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
    const target = await screen.findByText('Editor — Can edit content');
    fireEvent.click(target);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:role').textContent).toBe('"editor"');
    });
  });

  it('virtual + multiple: clicking an option inside a virtualised list commits each toggle', async () => {
    virtualMockConfig.items = [
      { key: 'opt-0', index: 0, start: 0 },
      { key: 'opt-1', index: 1, start: 32 },
    ];

    renderForm([
      {
        type: 'select',
        name: 'tags',
        label: 'Tags',
        multiple: true,
        virtual: true,
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
        ],
        optionTemplate: [
          {
            type: 'text',
            text: 'tag:${$slot.option.label}',
          },
        ],
      },
      { type: 'form-state-probe', name: 'tags' },
    ]);

    openCombobox('Tags');
    const first = await screen.findByText('tag:Stable');
    fireEvent.click(first);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable"]');
    });
  });

  it('documents the nested-stopPropagation boundary: content that stops click propagation blocks selection (commit is on the bubbling click)', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: richOptions,
        optionTemplate: [{ type: 'stop-prop-link' }],
      },
      { type: 'form-state-probe', name: 'role' },
    ]);

    openCombobox('Role');
    await screen.findAllByText('stop-prop-content');
    const links = document.querySelectorAll('[data-slot="stop-prop-link"]');
    expect(links.length).toBe(richOptions.length);

    // base-ui ComboboxItem commits selection on the bubbling `click`. A nested
    // element that calls stopPropagation() swallows that event before it reaches
    // the item wrapper, so selection does NOT fire. Contract: optionTemplate
    // content must not stopPropagation on click (use pointerdown or no handler).
    fireEvent.click(links[1]);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId('form-state:role').textContent).toBe('null');
  });
});
