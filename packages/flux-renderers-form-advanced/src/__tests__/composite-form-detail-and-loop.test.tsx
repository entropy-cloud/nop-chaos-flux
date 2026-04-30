import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allRenderers, baseEnv, formulaCompiler, makeCapturingFetcher } from './composite-form-support';

describe('composite form - variant-field branch-only validation', () => {
  it('submits when only active branch has valid values', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#1"
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
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#2"
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#3"
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
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#4"
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
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
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

  it('open invalid draft blocks parent submit until the child owner is resolved', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#4b"
        schema={{
          type: 'form',
          id: 'detail-open-blocks-submit',
          data: { address: { street: '', city: 'Oldtown' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street', required: true },
                { type: 'input-text', name: 'city', label: 'City' }
              ]
            }
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit Form',
              onClick: { action: 'component:submit', componentId: 'detail-open-blocks-submit' }
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

    fireEvent.click(screen.getByText('Submit Form'));

    await waitFor(() => {
      expect(submitValues.length).toBe(0);
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });
  });
});

describe('composite form - detail-view draft validation gating', () => {
  it('blocks confirm when draft has required fields empty', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#5"
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#6"
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
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-detail-and-loop.test.tsx#7"
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
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
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
