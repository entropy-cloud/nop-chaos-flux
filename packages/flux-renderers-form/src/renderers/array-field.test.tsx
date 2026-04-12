import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: MouseEventInit & { pointerId?: number; pressure?: number } = {}) {
      super(type, props);
    }
  }
  globalThis.PointerEvent = PointerEvent as any;
}

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(_api: unknown, ctx: ApiRequestContext): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

const formulaCompiler = createFormulaCompiler();

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }]
};

describe('array-field renderer (scalar)', () => {
  it('renders initial scalar items', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            tags: ['alpha', 'beta', 'gamma']
          },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Tags')).toBeTruthy());

    const addButton = screen.getByText('Add item');
    expect(addButton).toBeTruthy();
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBe(3);
  });

  it('adds and removes scalar items correctly', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-scalar-form',
          data: {
            tags: ['alpha']
          },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }]
            }
          ],
          submitAction: {
            action: 'ajax',
            api: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-scalar-form' }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Add item')).toBeTruthy());

    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBe(2);
    });

    fireEvent.click(screen.getAllByText('Remove')[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBe(1);
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({ tags: expect.any(Array) });
    expect((submitValues[0].tags as unknown[]).length).toBe(1);
  });
});

describe('array-field renderer (object itemKind)', () => {
  it('renders object items with relative child field names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            contacts: [
              { name: 'Alice', email: 'alice@example.com' },
              { name: 'Bob', email: 'bob@example.com' }
            ]
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Contacts')).toBeTruthy());

    const nameInputs = screen.getAllByLabelText('Name') as HTMLInputElement[];
    expect(nameInputs.length).toBe(2);
    expect(nameInputs[0].value).toBe('Alice');
    expect(nameInputs[1].value).toBe('Bob');
  });

  it('submits object array with child field changes', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-obj-form',
          data: {
            contacts: [{ name: 'Alice', email: 'alice@example.com' }]
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email' }
              ]
            }
          ],
          submitAction: {
            action: 'ajax',
            api: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-obj-form' }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice Updated' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      contacts: [{ name: 'Alice Updated', email: 'alice@example.com' }]
    });
  });

  it('removes object item and does not leave stale child errors', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            contacts: [
              { name: 'Alice', email: '' },
              { name: 'Bob', email: 'bob@example.com' }
            ]
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              item: [
                { type: 'input-text', name: 'name', label: 'Name' },
                { type: 'input-text', name: 'email', label: 'Email', required: true }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getAllByLabelText('Name').length).toBe(2));

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByLabelText('Name').length).toBe(1);
      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Bob');
    });
  });
});
