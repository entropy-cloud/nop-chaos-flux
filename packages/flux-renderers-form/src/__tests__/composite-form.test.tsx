import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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

const formulaCompiler = createFormulaCompiler();

const allRenderers = [...basicRendererDefinitions, ...formRendererDefinitions];

function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(_api: unknown, ctx: ApiRequestContext): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

const baseEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

describe('composite form - object-field validation', () => {
  it('blocks submit when required child field is empty', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form-block',
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
              onClick: { action: 'component:submit', componentId: 'obj-form-block' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
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

  it('submits with valid object-field nested values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form-pass',
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
              onClick: { action: 'component:submit', componentId: 'obj-form-pass' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
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

  it('editing an object-field child field updates parent form values on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form-edit',
          data: { profile: { firstName: 'Jane', lastName: 'Doe' } },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form-edit' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Alice', lastName: 'Doe' }
    });
  });
});

describe('composite form - array-field add/remove', () => {
  it('renders existing items and supports add/remove', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: { tags: ['alpha', 'beta', 'gamma'] },
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
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Tags')).toBeTruthy());

    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBe(3);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBe(2);
    });
  });

  it('blocks submit when required array items have empty values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-form-req',
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
              onClick: { action: 'component:submit', componentId: 'arr-form-req' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);
  });

  it('submits valid array-field values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'arr-form-pass',
          data: { tags: ['alpha', 'beta'] },
          body: [
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'arr-form-pass' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const tags = (submitValues[0] as Record<string, unknown>).tags as unknown[];
    expect(tags.length).toBe(2);
  });
});

describe('composite form - variant-field branch-only validation', () => {
  it('submits when only active branch has valid values', async () => {
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
          fetcher: makeCapturingFetcher(submitValues)
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
  it('blocks confirm when child draft has required fields empty', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
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
          ]
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

  it('successful confirm writes back value and parent can submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'detail-field-submit',
          data: { address: { street: '1 Main St', city: 'Springfield' } },
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
              onClick: { action: 'component:submit', componentId: 'detail-field-submit' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '42 Oak Ave' } });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

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
          id: 'detail-cancel',
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
              onClick: { action: 'component:submit', componentId: 'detail-cancel' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
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
  it('blocks confirm when draft has required fields empty', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { title: '' },
              triggerLabel: 'Edit',
              surface: { mode: 'dialog', title: 'Edit Details' },
              content: [
                { type: 'input-text', name: 'title', label: 'Title', required: true }
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
    await waitFor(() => expect(screen.getByLabelText('Title', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Title', { exact: false })).toBeTruthy();
  });

  it('cancel closes without applying changes', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' }
              ]
            }
          ]
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('dark');
  });
});

describe('composite form - loop renders form data and is not a validation owner', () => {
  it('loop renders items from scope and does not interfere with form validation', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'loop-form',
          data: { note: '', items: ['alpha', 'beta'] },
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
              body: [{ type: 'text', text: '${$slot.item}' }]
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
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeTruthy();
      expect(screen.getByText('beta')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });

    expect(submitValues.length).toBe(0);

    fireEvent.change(screen.getByLabelText('Note', { exact: false }), { target: { value: 'My note' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({ note: 'My note' });
  });
});

describe('composite form - six-component integration', () => {
  it('renders all six components together and submits when valid', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'six-form',
          data: {
            profile: { firstName: 'Jane', lastName: 'Doe' },
            tags: ['alpha', 'beta'],
            contactMethod: { type: 'email', email: 'jane@example.com' },
            address: { street: '1 Main St', city: 'Townsville' },
            config: { theme: 'dark' },
            recentItems: ['alpha', 'beta']
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
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }]
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
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' }
              ]
            },
            {
              type: 'detail-view',
              scopePath: 'config',
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' }
              ]
            },
            {
              type: 'loop',
              items: '${recentItems}',
              body: [{ type: 'text', text: '${$slot.item}' }]
            }
          ],
          submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'six-form' }
            }
          ]
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeTruthy();
      expect(screen.getByText('Edit Address')).toBeTruthy();
      expect(screen.getByText('Edit Config')).toBeTruthy();
      expect(screen.getByText('alpha')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const result = submitValues[0] as Record<string, unknown>;
    expect(result).toMatchObject({
      profile: { firstName: 'Jane', lastName: 'Doe' }
    });
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('detail-field confirm gating works within combined form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'six-block',
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
                { type: 'input-text', name: 'name', label: 'Profile Name', required: true }
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

describe('composite form - submit supersedes debounced validation', () => {
  it('submit catches required errors even when fired before blur debounce fires', async () => {
    cleanup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      const submitValues: Record<string, unknown>[] = [];
      const SchemaRenderer = createSchemaRenderer(allRenderers);

      render(
        <SchemaRenderer
          schema={{
            type: 'form',
            id: 'debounce-form',
            data: { title: '' },
            body: [
              { type: 'input-text', name: 'title', label: 'Title', required: true }
            ],
            submitAction: { action: 'ajax', api: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'debounce-form' }
              }
            ]
          }}
          env={{
            ...baseEnv,
            fetcher: makeCapturingFetcher(submitValues)
          }}
          formulaCompiler={formulaCompiler}
        />
      );

      await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        const errors = screen.queryAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(submitValues.length).toBe(0);

      fireEvent.change(screen.getByLabelText('Title', { exact: false }), { target: { value: 'My Title' } });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

      expect(submitValues[0]).toMatchObject({ title: 'My Title' });
    } finally {
      vi.useRealTimers();
    }
  });
});
