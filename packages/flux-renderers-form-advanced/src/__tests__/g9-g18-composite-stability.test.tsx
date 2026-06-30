import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import type { RendererComponentProps, RendererDefinition, FormRuntime } from '@nop-chaos/flux-core';
import { useCurrentForm, useScopeSelector } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
  registerCalls.length = 0;
  updateCalls.length = 0;
});

afterEach(() => {
  cleanup();
});

// ---- spy probe: counts registerField / updateFieldRegistration on the form ----

const registerCalls: string[] = [];
const updateCalls: string[] = [];
const spiedForms = new WeakSet<object>();
let spiedForm: FormRuntime | undefined;

function installFormSpy(form: FormRuntime) {
  if (spiedForms.has(form)) {
    return;
  }
  spiedForms.add(form);
  spiedForm = form;
  const origRegister = form.registerField.bind(form);
  // Object.defineProperty avoids a direct assignment lint on a hook-returned value.
  Object.defineProperty(form, 'registerField', {
    configurable: true,
    value: (input: { path: string }) => {
      registerCalls.push(input.path);
      return origRegister(input as never);
    },
  });
  const origUpdate = form.updateFieldRegistration.bind(form);
  Object.defineProperty(form, 'updateFieldRegistration', {
    configurable: true,
    value: (id: string, patch: unknown) => {
      updateCalls.push(`${id}:${JSON.stringify((patch as { childPaths?: unknown } | null)?.childPaths ?? '')}`);
      return origUpdate(id, patch as never);
    },
  });
}

function FormRegisterSpyRenderer(_props: RendererComponentProps) {
  const form = useCurrentForm();
  React.useEffect(() => {
    if (form) {
      installFormSpy(form);
    }
  }, [form]);
  return null;
}

const formRegisterSpyRenderer: RendererDefinition = {
  type: 'form-register-spy',
  component: FormRegisterSpyRenderer,
};

// ---- scalar value display (no field registration) for array-field scalar items ----

function ScalarValueDisplayRenderer(_props: RendererComponentProps) {
  const value = useScopeSelector((scopeData) => (scopeData as { value?: unknown }).value);
  return <span data-testid="scalar-item">{String(value ?? '')}</span>;
}

const scalarValueDisplayRenderer: RendererDefinition = {
  type: 'scalar-value-display',
  component: ScalarValueDisplayRenderer,
};

function renderSchema(schema: object, extra: RendererDefinition[] = []) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formRegisterSpyRenderer,
    scalarValueDisplayRenderer,
    ...extra,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://g9-g18-composite-stability"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function flushEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================
// G9 — per-keystroke registration churn
// ============================================================

describe('G9: array-field scalar registration does not churn on data change', () => {
  it('changing one scalar value does not re-register scalar child paths', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: ['a', 'b', 'c', 'd', 'e'] },
      body: [
        { type: 'form-register-spy' },
        {
          type: 'array-field',
          id: 'af',
          name: 'rows',
          itemKind: 'scalar',
          item: { type: 'scalar-value-display' },
        },
      ],
    });

    await waitFor(() => expect(screen.getAllByTestId('scalar-item')).toHaveLength(5));
    await flushEffects();

    const scalarChildRegisterCalls = () =>
      registerCalls.filter((p) => /^rows\.\d+$/.test(p)).length;

    // The spy installs after the array-field's initial layout-effect
    // registration, so the initial 5 are not captured. That is fine: we measure
    // the delta induced by a data churn (the G9 regression signal).
    expect(spiedForm).toBeTruthy();

    // Simulate a keystroke: change one scalar value (new array reference, same length).
    spiedForm!.setValue('rows', ['a', 'b-changed', 'c', 'd', 'e']);
    await flushEffects();

    // A scalar-value change with unchanged length must NOT re-register the N
    // scalar child paths (the G9 churn). Before the fix this re-registered all
    // N paths on every keystroke.
    expect(scalarChildRegisterCalls()).toBe(0);
  });
});

describe('G9: array-editor registration does not re-run per keystroke', () => {
  it('editing a value does not trigger updateFieldRegistration', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: [{ id: 't1', value: 'alpha' }, { id: 't2', value: 'beta' }] },
      body: [
        { type: 'form-register-spy' },
        { type: 'array-editor', id: 'ae', name: 'tags' },
      ],
    });

    await waitFor(() =>
      expect((screen.getByDisplayValue('alpha') as HTMLInputElement)).toBeTruthy(),
    );
    await flushEffects();

    const baselineUpdates = updateCalls.length;
    fireEvent.change(screen.getByDisplayValue('alpha'), { target: { value: 'alpha-x' } });
    await flushEffects();

    expect(updateCalls.length).toBe(baselineUpdates);
  });
});

describe('G9: key-value registration does not re-run per keystroke', () => {
  it('editing a value does not trigger updateFieldRegistration', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { map: [{ id: 'p1', key: 'k1', value: 'v1' }, { id: 'p2', key: 'k2', value: 'v2' }] },
      body: [
        { type: 'form-register-spy' },
        { type: 'key-value', id: 'kv', name: 'map' },
      ],
    });

    await waitFor(() =>
      expect((screen.getByDisplayValue('v1') as HTMLInputElement)).toBeTruthy(),
    );
    await flushEffects();

    const baselineUpdates = updateCalls.length;
    fireEvent.change(screen.getByDisplayValue('v1'), { target: { value: 'v1-x' } });
    await flushEffects();

    expect(updateCalls.length).toBe(baselineUpdates);
  });
});

// ============================================================
// G18 — stable row identity on structural edit (no remount / focus loss)
// ============================================================

function removeButtonsForCombo(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="combo-remove"]'));
}

describe('G18: combo rows without ids keep identity when an earlier row is removed', () => {
  it('does not remount the subsequent row input', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lines: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
      body: [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          items: [{ type: 'input-text', name: 'name', testid: 'combo-name' }],
        },
      ],
    });

    await waitFor(() => expect(screen.getAllByTestId('combo-name')).toHaveLength(3));

    const rowBInput = screen.getByDisplayValue('b') as HTMLInputElement;
    const rowBContainer = rowBInput.closest('[data-slot="combo-item"]');
    expect(rowBContainer).toBeTruthy();
    fireEvent.click(removeButtonsForCombo()[0]);

    await waitFor(() =>
      expect((screen.getByDisplayValue('b') as HTMLInputElement)).toBeTruthy(),
    );
    // The row CONTAINER (ComboItem) must keep its identity — i.e. the row did
    // not remount when an earlier id-less row was removed (G18 row-key stability).
    const afterContainer = (screen.getByDisplayValue('b') as HTMLInputElement).closest(
      '[data-slot="combo-item"]',
    );
    expect(afterContainer).toBe(rowBContainer);
  });
});

describe('G18: input-table rows without ids keep identity when an earlier row is removed', () => {
  it('does not remount the subsequent row input', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
      body: [
        {
          type: 'input-table',
          id: 'it',
          name: 'rows',
          columns: [{ label: 'Name' }],
          item: [{ type: 'input-text', name: 'name', testid: 'row-name' }],
        },
      ],
    });

    await waitFor(() => expect(screen.getAllByTestId('row-name')).toHaveLength(3));

    const rowBInput = screen.getByDisplayValue('b') as HTMLInputElement;
    const rowBContainer = rowBInput.closest('[data-slot="input-table-row"]');
    expect(rowBContainer).toBeTruthy();
    const removeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="input-table-remove"]'),
    );
    fireEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect((screen.getByDisplayValue('b') as HTMLInputElement)).toBeTruthy(),
    );
    const afterContainer = (screen.getByDisplayValue('b') as HTMLInputElement).closest(
      '[data-slot="input-table-row"]',
    );
    expect(afterContainer).toBe(rowBContainer);
  });
});

describe('G18: array-field object rows without ids keep identity when an earlier row is removed', () => {
  it('does not remount the subsequent row container', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
      body: [
        {
          type: 'array-field',
          id: 'af',
          name: 'rows',
          itemKind: 'object',
          item: [{ type: 'input-text', name: 'name', testid: 'row-name' }],
        },
      ],
    });

    await waitFor(() => expect(screen.getAllByTestId('row-name')).toHaveLength(3));

    const rowBInput = screen.getByDisplayValue('b') as HTMLInputElement;
    const rowBContainer = rowBInput.closest('[data-slot="array-field-item"]');
    expect(rowBContainer).toBeTruthy();
    const removeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="array-field-item"] button'),
    ).filter((btn) => btn.textContent === 'Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect((screen.getByDisplayValue('b') as HTMLInputElement)).toBeTruthy(),
    );
    const afterContainer = (screen.getByDisplayValue('b') as HTMLInputElement).closest(
      '[data-slot="array-field-item"]',
    );
    expect(afterContainer).toBe(rowBContainer);
  });
});

describe('G18: array-editor rows without ids keep identity when an earlier row is removed', () => {
  it('does not remount the subsequent row input', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] },
      body: [{ type: 'array-editor', id: 'ae', name: 'tags', minItems: 0 }],
    });

    await waitFor(() => expect(screen.getByDisplayValue('b')).toBeTruthy());

    const rowBInput = screen.getByDisplayValue('b') as HTMLInputElement;
    const removeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button'),
    ).filter((btn) => /Remove Item \d+/.test(btn.getAttribute('aria-label') ?? ''));
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect((screen.getByDisplayValue('b') as HTMLInputElement)).toBeTruthy(),
    );
    expect(screen.getByDisplayValue('b')).toBe(rowBInput);
  });
});

describe('G18: key-value rows without ids keep identity when an earlier row is removed', () => {
  it('does not remount the subsequent row input', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        map: [
          { key: 'k1', value: 'v1' },
          { key: 'k2', value: 'v2' },
          { key: 'k3', value: 'v3' },
        ],
      },
      body: [{ type: 'key-value', id: 'kv', name: 'map', minItems: 0 }],
    });

    await waitFor(() => expect(screen.getByDisplayValue('v2')).toBeTruthy());

    const rowBInput = screen.getByDisplayValue('v2') as HTMLInputElement;
    const removeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button'),
    ).filter((btn) => /Remove entry \d+/.test(btn.getAttribute('aria-label') ?? ''));
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect((screen.getByDisplayValue('v2') as HTMLInputElement)).toBeTruthy(),
    );
    expect(screen.getByDisplayValue('v2')).toBe(rowBInput);
  });
});

export {};
