// @vitest-environment happy-dom

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
      schemaUrl="test://combo-handles"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

const comboItemRegion = [
  {
    type: 'input-text',
    name: 'name',
    testid: 'combo-name',
    placeholder: 'Name',
  },
  {
    type: 'input-number',
    name: 'qty',
    testid: 'combo-qty',
    placeholder: 'Qty',
  },
];

describe('combo: composite handle addItem / removeItem / moveItem', () => {
  it('renders the initial items and writes item field edits back to form', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'apple', qty: 2 }] },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: comboItemRegion,
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([{ name: 'apple', qty: 2 }]);
    });

    const qtyInput = screen.getByPlaceholderText('Qty') as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: '9' } });

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([{ name: 'apple', qty: 9 }]);
    });
  });

  it('add button appends a new empty object item', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'apple', qty: 1 }] },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: comboItemRegion,
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="combo-add"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toHaveLength(2);
    });
    expect((resolveFormState('form-state:lines') as unknown[])[1]).toEqual({});
  });

  it('component:addItem handle appends an item (staged owner writeback)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'apple', qty: 1 }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'c' } },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toHaveLength(2);
    });
  });

  it('component:removeItem removes the item at the given index', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', qty: 1 }, { name: 'b', qty: 2 }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'c', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([{ name: 'b', qty: 2 }]);
    });
  });

  it('component:moveItem reorders items', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', qty: 1 }, { name: 'b', qty: 2 }, { name: 'c', qty: 3 }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion },
        {
          type: 'button',
          label: 'MoveBtn',
          onClick: { action: 'component:moveItem', componentId: 'c', args: { from: 0, to: 2 } },
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    fireEvent.click(screen.getByText('MoveBtn'));
    await waitFor(() => {
      expect(
        (resolveFormState('form-state:lines') as Array<{ name: string }>).map((i) => i.name),
      ).toEqual(['b', 'c', 'a']);
    });
  });

  it('add button is disabled when maxItems reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', qty: 1 }, { name: 'b', qty: 2 }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion, maxItems: 2 },
      ],
    });

    expect(
      (document.querySelector('[data-slot="combo-add"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('remove button is disabled when minItems floor reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', qty: 1 }] },
      body: [
        { type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion, minItems: 1 },
      ],
    });

    expect(
      (document.querySelector('[data-slot="combo-remove"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('emits nop-combo and nop-combo__item markers', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', qty: 1 }] },
      body: [{ type: 'combo', id: 'c', name: 'lines', label: 'Lines', items: comboItemRegion }],
    });

    expect(document.querySelector('.nop-combo')).toBeTruthy();
    expect(document.querySelectorAll('.nop-combo__item')).toHaveLength(1);
  });
});

export {};
