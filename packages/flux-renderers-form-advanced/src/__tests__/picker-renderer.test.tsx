import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';

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

describe('picker: open → select → writeback + clear + handle', () => {
  it('opens the dialog, selects a candidate, confirms, and writes back the value', async () => {
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
          pickerDialog: { title: 'Pick owner' },
          options: [
            { label: 'Alice', value: 'alice' },
            { label: 'Bob', value: 'bob' },
          ],
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owner');

    fireEvent.click(screen.getByRole('radio', { name: 'Alice' }));
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('alice');
    });
  });

  it('multiple selection writes an array back', async () => {
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
          pickerDialog: { title: 'Pick owners' },
          options: [
            { label: 'Alice', value: 'alice' },
            { label: 'Bob', value: 'bob' },
          ],
        },
        { type: 'form-state-probe', name: 'owners' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owners');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Alice' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bob' }));
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
          pickerDialog: { title: 'Pick owner' },
          options: [{ label: 'Alice', value: 'alice' }],
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-clear"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBeNull();
    });
  });

  it('valueKey/labelKey normalization maps arbitrary option records', async () => {
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
          valueKey: 'id',
          labelKey: 'title',
          pickerDialog: { title: 'Pick owner' },
          options: [{ id: 'u1', title: 'Alice' }],
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
    });

    openDialog();
    await screen.findByText('Pick owner');

    fireEvent.click(screen.getByRole('radio', { name: 'Alice' }));
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

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
          pickerDialog: { title: 'Pick owner' },
          options: [{ label: 'Alice', value: 'alice' }],
        },
        { type: 'button', label: 'OpenBtn', onClick: { action: 'component:open', componentId: 'pk' } },
      ],
    });

    fireEvent.click(screen.getByText('OpenBtn'));
    await screen.findByText('Pick owner');
    expect(screen.getByRole('radio', { name: 'Alice' })).toBeTruthy();
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
          pickerDialog: { title: 'Pick owner' },
          options: [{ label: 'Alice', value: 'alice' }],
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
          pickerDialog: { title: 'Pick owner' },
          options: [{ label: 'Alice', value: 'alice' }],
        },
      ],
    });

    expect(document.querySelector('.nop-picker')).toBeTruthy();
  });
});

export {};
