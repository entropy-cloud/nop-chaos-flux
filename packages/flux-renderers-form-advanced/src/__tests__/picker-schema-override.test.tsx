import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

const OWNER_ROWS = [
  { id: 'a0', title: 'Alpha' },
  { id: 'b1', title: 'Beta' },
  { id: 'c2', title: 'Gamma' },
];

const crudPickerEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: { items: OWNER_ROWS, total: OWNER_ROWS.length } as T };
  },
  notify: () => undefined,
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function makeRenderSchema(env: RendererEnv) {
  return function renderSchema(schema: object) {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      ...dataRendererDefinitions,
      formStateProbeRenderer,
    ]);
    return render(
      <SchemaRenderer
        schemaUrl="test://picker-schema-override"
        schema={schema as never}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  };
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

const crudPickerSchema = {
  type: 'crud',
  loadAction: { action: 'ajax', args: { url: '/api/owners' } },
  rowKey: 'id',
  columns: [{ name: 'title', label: 'Title' }],
  selection: { type: 'radio' },
  selectionOwnership: 'scope',
  selectionStatePath: '$_picker.selection',
  dataStatePath: '$_picker.rows',
  autoClearSelectionOnRefresh: false,
};

describe('picker: pickerSchema is the sole content definition (v3 override contract)', () => {
  it('renders an explicit CRUD pickerSchema and commits its published selection', async () => {
    const renderSchema = makeRenderSchema(crudPickerEnv);
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owner: undefined },
      body: [
        {
          type: 'picker',
          id: 'pk',
          name: 'owner',
          label: 'Owner',
          valueField: 'id',
          labelField: 'title',
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: crudPickerSchema,
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="picker-dialog-content"] [aria-label="Select Row"]'),
      ).toHaveLength(3);
    });

    fireEvent.click(
      document.querySelectorAll<HTMLInputElement>(
        '[data-slot="picker-dialog-content"] [aria-label="Select Row"]',
      )[2],
    );
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('c2');
    });
  });

  it('without pickerSchema there is no default content build: popup-only opens empty and Confirm is a no-op close (G1)', async () => {
    const notifications: Array<[string, string]> = [];
    const renderSchema = makeRenderSchema({
      fetcher: async function <T>() {
        return { status: 0, data: null as T };
      },
      notify: (type, msg) => notifications.push([type, msg]),
    });
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owner: 'a0' },
      body: [
        {
          type: 'picker',
          id: 'pk',
          name: 'owner',
          label: 'Owner',
          pickerPopup: { title: 'Pick owner' },
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
    expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull();

    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('a0');
    });
    expect(notifications).toHaveLength(0);
  });

  it('clicking the trigger with neither pickerSchema nor pickerPopup warns and renders no popup', async () => {
    const notifications: Array<[string, string]> = [];
    const renderSchema = makeRenderSchema({
      fetcher: async function <T>() {
        return { status: 0, data: null as T };
      },
      notify: (type, msg) => notifications.push([type, msg]),
    });
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owner: undefined },
      body: [
        { type: 'picker', id: 'pk', name: 'owner', label: 'Owner' },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    expect(document.querySelector('[data-slot="picker-trigger"]')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);

    await waitFor(() => {
      expect(notifications).toHaveLength(1);
      expect(notifications[0][0]).toBe('warning');
    });
    expect(document.querySelector('[data-slot="picker-confirm"]')).toBeNull();
  });
});

export {};
