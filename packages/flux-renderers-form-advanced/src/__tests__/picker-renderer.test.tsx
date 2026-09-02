import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

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
      schemaUrl="test://picker"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

function openDialog() {
  fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
}

function pickListButton(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

function staticListPickerSchema(args: {
  items: Array<Record<string, unknown>>;
  itemLabelField: string;
  itemValueField: string;
}) {
  return {
    type: 'list',
    items: args.items,
    item: {
      type: 'button',
      label: `\${item.${args.itemLabelField}}`,
      onClick: {
        action: 'pick',
        args: { value: `\${item.${args.itemValueField}}`, rows: '${item}' },
      },
    },
  };
}

describe('picker: open → select → writeback + clear + handle', () => {
  it('opens the dialog, picks a candidate, and writes back the value', async () => {
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
          pickerSchema: staticListPickerSchema({
            items: [
              { label: 'Alice', value: 'alice' },
              { label: 'Bob', value: 'bob' },
            ],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owner');

    pickListButton('Alice');

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('alice');
    });
  });

  it('multiple selection accumulates on pick and Confirm writes the array back', async () => {
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
          pickerPopup: { title: 'Pick owners' },
          pickerSchema: staticListPickerSchema({
            items: [
              { label: 'Alice', value: 'alice' },
              { label: 'Bob', value: 'bob' },
            ],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
        { type: 'form-state-probe', name: 'owners' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owners');

    pickListButton('Alice');
    pickListButton('Bob');
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owners')).toEqual(['alice', 'bob']);
    });
  });

  it('clear button empties the field value', async () => {
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
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: staticListPickerSchema({
            items: [{ label: 'Alice', value: 'alice' }],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-clear"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBeNull();
    });
  });

  it('valueField/labelField normalization maps arbitrary option records', async () => {
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
          pickerSchema: staticListPickerSchema({
            items: [{ id: 'u1', title: 'Alice' }],
            itemLabelField: 'title',
            itemValueField: 'id',
          }),
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owner');

    pickListButton('Alice');

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('u1');
    });
  });

  it('component:open handle opens the dialog', async () => {
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
          pickerSchema: staticListPickerSchema({
            items: [{ label: 'Alice', value: 'alice' }],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
        { type: 'button', label: 'OpenBtn', onClick: { action: 'component:open', componentId: 'pk' } },
      ],
    });

    fireEvent.click(screen.getByText('OpenBtn'));
    await screen.findByText('Pick owner');
    expect(screen.getByRole('button', { name: 'Alice' })).toBeTruthy();
  });

  it('component:clear handle clears the value', async () => {
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
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: staticListPickerSchema({
            items: [{ label: 'Alice', value: 'alice' }],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
        { type: 'button', label: 'ClearBtn', onClick: { action: 'component:clear', componentId: 'pk' } },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(screen.getByText('ClearBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBeNull();
    });
  });

  it('emits nop-picker marker', () => {
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
          pickerSchema: staticListPickerSchema({
            items: [{ label: 'Alice', value: 'alice' }],
            itemLabelField: 'label',
            itemValueField: 'value',
          }),
        },
      ],
    });

    expect(document.querySelector('.nop-picker')).toBeTruthy();
  });
});

export {};
