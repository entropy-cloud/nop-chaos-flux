// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';

const allFormDefs = [
  ...basicRendererDefinitions,
  ...dataRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);
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

    fireEvent.click(screen.getByLabelText('Alice'));
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

    fireEvent.click(screen.getByLabelText('Alice'));
    fireEvent.click(screen.getByLabelText('Bob'));
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

    fireEvent.click(screen.getByLabelText('Alice'));
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
    expect(screen.getByLabelText('Alice')).toBeTruthy();
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

  it('loadAction mode renders embedded CRUD and writes back valueKey', async () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://picker-load"
        schema={{
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
              columns: [{ name: 'title', label: 'Title' }],
              loadAction: { action: 'probe:load' },
              pickerDialog: { title: 'Pick owner' },
            },
            { type: 'form-state-probe', name: 'owner' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: any) {
              if (method === 'load') {
                calls.push(ctx.evaluationBindings);
                return {
                  ok: true,
                  data: { items: [{ id: 'u1', title: 'Alice' }, { id: 'u2', title: 'Bob' }], total: 2 },
                };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    openDialog();
    await screen.findByText('Pick owner');
    await screen.findByText('Alice');
    expect(calls.length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('u1');
    });
  });

  it('labelResolveAction caches trigger label and autoFill writes sibling field', async () => {
    let resolveCalls = 0;
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://picker-label-resolve"
        schema={{
          type: 'form',
          id: 'f',
          data: { owner: 'u2', ownerName: '' },
          body: [
            {
              type: 'picker',
              id: 'pk',
              name: 'owner',
              label: 'Owner',
              valueKey: 'id',
              labelKey: 'title',
              columns: [{ name: 'title', label: 'Title' }],
              loadAction: { action: 'probe:load' },
              labelResolveAction: { action: 'probe:resolve' },
              autoFill: { ownerName: '${row.title}' },
              pickerDialog: { title: 'Pick owner' },
            },
            { type: 'form-state-probe', name: 'owner' },
            { type: 'form-state-probe', name: 'ownerName' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) {
            return;
          }
          actionScope.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'load') {
                return {
                  ok: true,
                  data: { items: [{ id: 'u1', title: 'Alice' }, { id: 'u2', title: 'Bob' }], total: 2 },
                };
              }
              if (method === 'resolve') {
                resolveCalls += 1;
                return { ok: true, data: { items: [{ id: 'u2', title: 'Bob' }] } };
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('picker-selected-label').textContent).toContain('Bob');
    });
    expect(resolveCalls).toBe(1);

    openDialog();
    await screen.findByText('Pick owner');
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('u1');
      expect(resolveFormState('form-state:ownerName')).toBe('Alice');
      expect(screen.getByTestId('picker-selected-label').textContent).toContain('Alice');
    });

    openDialog();
    await screen.findByText('Pick owner');
    expect(resolveCalls).toBe(1);
  });
});

export {};
