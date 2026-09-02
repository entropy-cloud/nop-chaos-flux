import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

// AMIS-aligned field contract, adapted to the v3.4 implementation:
//  - resetValue is fully implemented (clear writes the declared reset value).
//  - delimiter/joinValues stay on the array value channel (string-join is
//    deferred with the tag UI successor plan); itemClearable/onItemClick are
//    declared-inert until that tag UI lands.

installFormAdvancedTestHooks();

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
    ...dataRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://picker-amis-fields"
      schema={schema as never}
      env={{
        fetcher: async function <T>() {
          return { status: 0, data: null as T };
        },
        notify: () => undefined,
      }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function listPickerSchema() {
  return {
    type: 'list',
    items: [
      { label: 'Alice', value: 'alice' },
      { label: 'Bob', value: 'bob' },
    ],
    item: {
      type: 'button',
      label: '${item.label}',
      onClick: { action: 'pick', args: { value: '${item.value}', rows: '${item}' } },
    },
  };
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

describe('picker: AMIS-aligned value/label fields', () => {
  it('delimiter is declared-inert: multiple selection stays on the array value channel', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owners: [] },
      body: [
        {
          type: 'picker',
          id: 'pk',
          name: 'owners',
          label: 'Owners',
          multiple: true,
          joinValues: true,
          delimiter: '|',
          pickerPopup: { title: 'Pick owners' },
          pickerSchema: listPickerSchema(),
        },
        { type: 'form-state-probe', name: 'owners' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owners');
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owners')).toEqual(['alice', 'bob']);
    });
  });

  it('itemClearable false: the whole-group clear affordance still empties the field', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owner: 'alice' },
      body: [
        {
          type: 'picker',
          id: 'pk',
          name: 'owner',
          label: 'Owner',
          itemClearable: false,
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: listPickerSchema(),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-clear"]')!);
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBeNull();
    });
  });

  it('resetValue customizes the value written on clear', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { owner: 'alice' },
      body: [
        {
          type: 'picker',
          id: 'pk',
          name: 'owner',
          label: 'Owner',
          resetValue: 'none',
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: listPickerSchema(),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-clear"]')!);
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('none');
    });
  });

  it('onItemClick is declared-inert (tag UI deferred): declaration does not disturb the pick flow', async () => {
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
          onItemClick: { action: 'ajax', args: { url: '/api/tag-clicked' } },
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: listPickerSchema(),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('alice');
    });
  });

  it('list-type pickerSchema renders and the pick action maps value/label onto the bound field', async () => {
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
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: listPickerSchema(),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('bob');
    });
    expect(screen.getByTestId('picker-selected-label').textContent).toBe('bob');
  });
});

export {};
