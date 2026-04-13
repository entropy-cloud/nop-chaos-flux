import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
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

describe('detail-field renderer', () => {
  it('renders the trigger button when not readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Address')).toBeTruthy();
    });

    const field = screen.getByText('Edit Address').closest('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Address');
    expect(field?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy();
  });

  it('does not render trigger button when readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              readOnly: true,
              triggerLabel: 'Edit Address',
              content: [{ type: 'input-text', name: 'street', label: 'Street' }]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.queryByText('Edit Address')).toBeNull());
  });

  it('opens a dialog with the edit content when trigger is clicked', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
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
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => {
      expect(screen.getByLabelText('Street')).toBeTruthy();
      expect(screen.getByLabelText('City')).toBeTruthy();
    });

    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('123 Main St');
    expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Springfield');
  });

  it('cancel closes dialog without writing back to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const buttonRenderer = {
      type: 'button',
      component: (props: any) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? props.meta.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' as const }]
    };

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'cancel-form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }]
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
              onClick: { action: 'component:submit', componentId: 'cancel-form' }
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

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '999 Changed St' } });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '123 Main St' }
    });
  });

  it('confirm writes back edits to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const buttonRenderer = {
      type: 'button',
      component: (props: any) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? props.meta.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' as const }]
    };

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'confirm-form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
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
          submitAction: {
            action: 'ajax',
            api: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'confirm-form' }
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

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '456 Oak Ave' } });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '456 Oak Ave', city: 'Springfield' }
    });
  });

  it('second confirm writes second set of edits to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const buttonRenderer = {
      type: 'button',
      component: (props: any) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? props.meta.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' as const }]
    };

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'double-confirm-form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
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
          submitAction: {
            action: 'ajax',
            api: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'double-confirm-form' }
            }
          ]
        }}
        env={{ ...env, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '456 Oak Ave' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('456 Oak Ave');
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '789 Pine Rd' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      address: { street: '789 Pine Rd', city: 'Springfield' }
    });
  });

  it('blocks confirm if draft has required fields empty', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: { profile: { name: '' } },
          body: [
            {
              type: 'detail-field',
              name: 'profile',
              label: 'Profile',
              triggerLabel: 'Edit Profile',
              surface: { mode: 'dialog', title: 'Edit Profile' },
              content: [
                { type: 'input-text', name: 'name', label: 'Name', required: true }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Profile')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy());

    expect((screen.getByLabelText('Name', { exact: false }) as HTMLInputElement).value).toBe('');

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy();
  });
});
