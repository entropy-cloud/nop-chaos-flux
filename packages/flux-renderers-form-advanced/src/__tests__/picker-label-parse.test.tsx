import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object, env: RendererEnv) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://picker-label-parse"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function pickerBody(args: { labelTpl?: string } = {}) {
  return [
    {
      type: 'picker',
      id: 'pk',
      name: 'owner',
      label: 'Owner',
      valueField: 'id',
      labelField: 'title',
      ...(args.labelTpl ? { labelTpl: args.labelTpl } : {}),
      pickerPopup: { title: 'Pick owner' },
      pickerSchema: {
        type: 'list',
        items: [{ label: 'Alice', value: 'alice' }],
        item: {
          type: 'button',
          label: '${item.label}',
          onClick: { action: 'pick', args: { value: '${item.value}', rows: '${item}' } },
        },
      },
      labelResolveAction: { action: 'ajax', args: { url: '/api/owners' } },
    },
    { type: 'form-state-probe', name: 'owner' },
  ];
}

function selectedLabel(): string {
  return screen.getByTestId('picker-selected-label').textContent ?? '';
}

describe('picker: reactive label resolution from stored values', () => {
  it('resolves the stored value into its label on mount via labelResolveAction', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'u1' },
        body: pickerBody(),
      },
      {
        fetcher: async function <T>() {
          return { status: 0, data: { items: [{ id: 'u1', title: 'Resolved Alice' }] } as T };
        },
        notify: () => undefined,
      },
    );

    await waitFor(() => {
      expect(selectedLabel()).toBe('Resolved Alice');
    });
  });

  it('re-resolves when the external value changes', async () => {
    let call = 0;
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'u1' },
        body: [
          ...pickerBody(),
          { type: 'button', label: 'SetU2', onClick: { action: 'setValue', args: { path: 'owner', value: 'u2' } } },
        ],
      },
      {
        fetcher: async function <T>() {
          call += 1;
          const id = call === 1 ? 'u1' : 'u2';
          return { status: 0, data: { items: [{ id, title: `Resolved ${id.toUpperCase()}` }] } as T };
        },
        notify: () => undefined,
      },
    );

    await waitFor(() => {
      expect(selectedLabel()).toBe('Resolved U1');
    });

    fireEvent.click(screen.getByText('SetU2'));
    await waitFor(() => {
      expect(selectedLabel()).toBe('Resolved U2');
    });
  });

  it('falls back to the raw value when the resolve result does not contain the valueField', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'u1' },
        body: pickerBody(),
      },
      {
        fetcher: async function <T>() {
          return { status: 0, data: { items: [{ id: 'x9', title: 'Other' }] } as T };
        },
        notify: () => undefined,
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId('picker-selected-label')).toBeTruthy();
    });
    expect(selectedLabel()).toBe('u1');
  });

  it('labelTpl renders a compound template from the resolved row', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'u1' },
        body: pickerBody({ labelTpl: '${row.title} ★' }),
      },
      {
        fetcher: async function <T>() {
          return { status: 0, data: { items: [{ id: 'u1', title: 'Resolved Alice' }] } as T };
        },
        notify: () => undefined,
      },
    );

    await waitFor(() => {
      expect(selectedLabel()).toBe('Resolved Alice ★');
    });
  });
});

export {};
