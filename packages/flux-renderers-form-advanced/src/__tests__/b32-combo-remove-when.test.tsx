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
      schemaUrl="test://b32-combo-remove-when"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

function getRemoveButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="combo-remove"]'));
}

const comboItemRegion = [
  { type: 'input-text', name: 'name', testid: 'combo-name', placeholder: 'Name' },
  { type: 'input-text', name: 'locked', testid: 'combo-locked', placeholder: 'Locked' },
];

describe('combo: per-row delete gating via removeWhen (B3.2 C3)', () => {
  it('disables remove for rows where removeWhen is falsy and allows remove where truthy', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        lines: [
          { name: 'persisted', locked: 'true' },
          { name: 'new', locked: '' },
        ],
      },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: comboItemRegion,
          removeWhen: '${value.locked !== "true"}',
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toHaveLength(2);
    });

    const removeButtons = getRemoveButtons();
    expect(removeButtons).toHaveLength(2);
    // Row 0 (locked) -> removeWhen falsy -> disabled
    expect(removeButtons[0].disabled).toBe(true);
    // Row 1 (not locked) -> removeWhen truthy -> enabled
    expect(removeButtons[1].disabled).toBe(false);

    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([{ name: 'persisted', locked: 'true' }]);
    });
  });

  it('allows removing every row up to minItems when removeWhen is not configured', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a', locked: '' }, { name: 'b', locked: '' }] },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: comboItemRegion,
          minItems: 1,
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toHaveLength(2);
    });

    const removeButtons = getRemoveButtons();
    expect(removeButtons[0].disabled).toBe(false);
    expect(removeButtons[1].disabled).toBe(false);

    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([{ name: 'a', locked: '' }]);
    });

    // minItems floor still applies after removeWhen-less removal
    expect(getRemoveButtons()[0].disabled).toBe(true);
  });

  it('allows remove when removeWhen evaluates truthy for the row', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'ok', locked: '' }] },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: comboItemRegion,
          removeWhen: '${value.locked !== "true"}',
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toHaveLength(1);
    });

    const removeButtons = getRemoveButtons();
    expect(removeButtons[0].disabled).toBe(false);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(resolveFormState('form-state:lines')).toEqual([]);
    });
  });
});

describe('array-field: per-row delete gating via removeWhen (B3.2 C3)', () => {
  it('disables remove for rows where removeWhen is falsy and allows remove where truthy', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        rows: [
          { name: 'persisted', locked: 'true' },
          { name: 'new', locked: '' },
        ],
      },
      body: [
        {
          type: 'array-field',
          id: 'a',
          name: 'rows',
          itemKind: 'object',
          removeWhen: '${value.locked !== "true"}',
          item: [
            { type: 'input-text', name: 'name', label: 'Name' },
            { type: 'input-text', name: 'locked', label: 'Locked' },
          ],
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toHaveLength(2);
    });

    const removeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="array-field-item"] [data-slot="button"]'),
    ).filter((btn) => btn.textContent === 'Remove');
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0].disabled).toBe(true);
    expect(removeButtons[1].disabled).toBe(false);

    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(resolveFormState('form-state:rows')).toEqual([{ name: 'persisted', locked: 'true' }]);
    });
  });
});

export {};
