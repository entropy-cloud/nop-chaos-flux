import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
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

const formulaCompiler = createFormulaCompiler();

const variantSchema = {
  type: 'form',
  data: {
    payload: null
  },
  body: [
    {
      type: 'variant-field',
      name: 'payload',
      label: 'Payload',
      defaultVariant: 'text',
      variants: [
        {
          key: 'text',
          label: 'Text',
          content: [{ type: 'input-text', name: 'value', label: 'Text Value' }],
          initialValue: { value: '' }
        },
        {
          key: 'number',
          label: 'Number',
          content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
          initialValue: { amount: 0 }
        }
      ]
    }
  ]
} as const;

describe('variant-field renderer', () => {
  it('renders with the default variant tab active', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={variantSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Text')).toBeTruthy();
      expect(screen.getByText('Number')).toBeTruthy();
    });

    const container = document.querySelector('[data-active-variant]');
    expect(container?.getAttribute('data-active-variant')).toBe('text');
    expect(container?.className).toBe('nop-field');
    expect(container?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(container?.querySelector('[data-slot="variant-field-selector"]')).toBeTruthy();
  });

  it('switching variant tab resets the field value to the new variant initial value', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={variantSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Number')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('number');
    });
  });

  it('detects variant by match rules when value is provided', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: 'hello world'
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              variants: [
                {
                  key: 'string-kind',
                  label: 'String',
                  content: [{ type: 'input-text', name: 'value', label: 'String Value' }],
                  match: { kind: 'typeof', value: 'string' }
                },
                {
                  key: 'object-kind',
                  label: 'Object',
                  content: [{ type: 'input-text', name: 'name', label: 'Object Name' }],
                  match: { kind: 'has-key', key: 'name' }
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('string-kind');
    });
  });

  it('falls back to first variant when no match rules match and no defaultVariant', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: null
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              variants: [
                {
                  key: 'first',
                  label: 'First',
                  content: [{ type: 'input-text', name: 'x', label: 'X' }]
                },
                {
                  key: 'second',
                  label: 'Second',
                  content: [{ type: 'input-text', name: 'y', label: 'Y' }]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('first');
    });
  });

  it('renders in select mode when selector.mode is select', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: null
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              selector: { mode: 'select' },
              variants: [
                {
                  key: 'text',
                  label: 'Text Option',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value' }]
                },
                {
                  key: 'number',
                  label: 'Number Option',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      const selectTrigger = document.querySelector('[data-slot="variant-field-selector"]');
      expect(selectTrigger).toBeTruthy();
    });
  });

  it('clears errors on variant switch', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: null
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value', required: true }],
                  initialValue: { value: '' }
                },
                {
                  key: 'number',
                  label: 'Number',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                  initialValue: { amount: 0 }
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Text')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('number');
    });

    const errors = screen.queryAllByText(/required/i);
    expect(errors.length).toBe(0);
  });

  it('switches between string and list editors and keeps repeated edits on the active variant', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'variant-submit-form',
          data: {
            payload: 'alpha'
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  match: { kind: 'typeof', value: 'string' },
                  initialValue: 'alpha',
                  content: [
                    { type: 'input-text', name: '', label: 'Text Value', required: true }
                  ]
                },
                {
                  key: 'list',
                  label: 'List',
                  match: { kind: 'array' },
                  initialValue: ['one'],
                  content: [
                    {
                      type: 'array-field',
                      name: '',
                      label: 'List Value',
                      itemKind: 'scalar',
                      item: [{ type: 'input-text', name: 'value', label: 'Item', required: true }]
                    }
                  ]
                }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'variant-submit-form' }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null as T };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'first text' } });
    fireEvent.click(screen.getByRole('tab', { name: 'List' }));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));

    const listItemInput = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(listItemInput, { target: { value: 'first item' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(2));

    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'second item' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({ payload: ['first item', 'second item'] });

    fireEvent.click(screen.getByRole('tab', { name: 'Text' }));

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(1));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('alpha');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'second text' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(2));
    expect(submitValues[1]).toMatchObject({ payload: 'second text' });
  });

});
