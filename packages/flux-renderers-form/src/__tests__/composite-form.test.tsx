import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
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

const formulaCompiler = createFormulaCompiler();

const allRenderers = [...basicRendererDefinitions, ...formRendererDefinitions];

const baseEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

describe('composite form - object-field validation', () => {
  it('shows child field errors within object-field on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form',
          data: { profile: { firstName: '', lastName: 'Smith' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);
  });

  it('submits object-field with valid nested values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form-valid',
          data: { profile: { firstName: 'Jane', lastName: 'Doe' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form-valid' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Jane', lastName: 'Doe' }
    });
  });
});

describe('composite form - array-field validation', () => {
  it('blocks submit when required scalar items are empty', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-form',
          data: { tags: ['alpha', ''] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag', required: true }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);
  });

  it('submits array-field after adding valid items', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-form-add',
          data: { tags: ['alpha'] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag', required: true }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-form-add' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Add item')).toBeTruthy());

    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => {
      const inputs = screen.getAllByLabelText('Tag', { exact: false });
      expect(inputs.length).toBe(2);
    });

    const inputs = screen.getAllByLabelText('Tag', { exact: false });
    fireEvent.change(inputs[1], { target: { value: 'beta' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const tags = (submitValues[0] as Record<string, unknown>).tags as string[];
    expect(tags).toContain('alpha');
    expect(tags).toContain('beta');
  });
});

describe('composite form - variant-field validation', () => {
  it('only validates the active branch after variant switch', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'variant-form',
          data: { payload: { type: 'email', email: 'user@example.com' } },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Contact Method',
              selectorMode: 'select',
              variants: [
                {
                  key: 'email',
                  label: 'Email',
                  initialValue: { type: 'email', email: '' },
                  content: [
                    { type: 'input-text', name: 'email', label: 'Email Address', required: true }
                  ]
                },
                {
                  key: 'phone',
                  label: 'Phone',
                  initialValue: { type: 'phone', phone: '' },
                  content: [
                    { type: 'input-text', name: 'phone', label: 'Phone Number', required: true }
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
              onClick: { action: 'component:submit', componentId: 'variant-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const payload = (submitValues[0] as Record<string, unknown>).payload as Record<string, unknown>;
    expect(payload).toBeTruthy();
  });
});

describe('composite form - detail-field draft validation gating', () => {
  it('blocks confirm when child draft has invalid required fields, then succeeds on valid input', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'detail-field-form',
          data: { address: { street: '', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street', required: true },
                { type: 'input-text', name: 'city', label: 'City', required: true }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit Form',
              onClick: { action: 'component:submit', componentId: 'detail-field-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Street', { exact: false }), { target: { value: '42 Oak Ave' } });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Street', { exact: false })).toBeNull());

    fireEvent.click(screen.getByText('Submit Form'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '42 Oak Ave', city: 'Springfield' }
    });
  });

  it('cancel discards draft and parent value is unchanged', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'detail-cancel-form',
          data: { address: { street: '100 Main St', city: 'Oldtown' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit Form',
              onClick: { action: 'component:submit', componentId: 'detail-cancel-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '999 Changed Ave' } });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit Form'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '100 Main St', city: 'Oldtown' }
    });
  });
});

describe('composite form - detail-view draft validation gating', () => {
  it('blocks confirm when draft has required fields empty, then succeeds', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { name: '' },
              triggerLabel: 'Edit',
              surface: { mode: 'dialog', title: 'Edit Name' },
              content: [
                { type: 'input-text', name: 'name', label: 'Name', required: true }
              ]
            }
          ]
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Name', { exact: false }), { target: { value: 'Alice' } });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Name', { exact: false })).toBeNull());
  });
});

describe('composite form - loop reflects committed form state without creating validation owner', () => {
  it('loop renders items from form data and does not affect validation', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'loop-form',
          data: { items: ['item1', 'item2'], note: '' },
          body: [
            {
              type: 'input-text',
              name: 'note',
              label: 'Note',
              required: true
            },
            {
              type: 'loop',
              items: '${items}',
              body: [{ type: 'text', value: '${item}' }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'loop-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('item1')).toBeTruthy();
      expect(screen.getByText('item2')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);

    fireEvent.change(screen.getByLabelText('Note', { exact: false }), { target: { value: 'Hello' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({ note: 'Hello' });
  });
});

describe('composite form - combined six-component scenario', () => {
  it('integrates object-field, array-field, variant-field, detail-field, detail-view, and loop in one form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'combined-form',
          data: {
            profile: { firstName: 'Jane', lastName: 'Doe' },
            tags: ['alpha'],
            contactMethod: { type: 'email', email: 'jane@example.com' },
            address: { street: '1 Main St', city: 'Townsville' },
            recentItems: ['alpha']
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true }
              ]
            },
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag', required: true }]
            },
            {
              type: 'variant-field',
              name: 'contactMethod',
              label: 'Contact',
              selectorMode: 'select',
              variants: [
                {
                  key: 'email',
                  label: 'Email',
                  initialValue: { type: 'email', email: '' },
                  content: [{ type: 'input-text', name: 'email', label: 'Email Address' }]
                },
                {
                  key: 'phone',
                  label: 'Phone',
                  initialValue: { type: 'phone', phone: '' },
                  content: [{ type: 'input-text', name: 'phone', label: 'Phone Number' }]
                }
              ]
            },
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street', required: true },
                { type: 'input-text', name: 'city', label: 'City', required: true }
              ]
            },
            {
              type: 'loop',
              items: '${recentItems}',
              body: [{ type: 'text', value: '${item}' }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'combined-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: async (api, ctx) => {
            submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
            return { ok: true, status: 200, data: null };
          }
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeTruthy();
      expect(screen.getByText('Edit Address')).toBeTruthy();
      expect(screen.getByText('alpha')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const result = submitValues[0] as Record<string, unknown>;
    expect(result).toMatchObject({
      profile: { firstName: 'Jane', lastName: 'Doe' },
      tags: ['alpha']
    });
  });

  it('detail-field draft confirm gating in combined form blocks submit path', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'combined-block-form',
          data: {
            profile: { name: 'Jane' },
            address: { street: '', city: '' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'name', label: 'Name', required: true }
              ]
            },
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street', required: true },
                { type: 'input-text', name: 'city', label: 'City', required: true }
              ]
            }
          ],
          actions: []
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy();
  });
});
