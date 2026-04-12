import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
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

function FieldValueProbeRenderer(props: { name: string; 'data-testid': string }) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const value = form
    ? (form.scope.get(props.name) ?? '')
    : (scope.get(props.name) ?? '');
  return <span data-testid={props['data-testid']}>{JSON.stringify(value)}</span>;
}

const fieldValueProbeRenderer: RendererDefinition = {
  type: 'field-value-probe',
  component: (p) => (
    <FieldValueProbeRenderer
      name={String((p.props as Record<string, unknown>).name ?? '')}
      data-testid={String((p.props as Record<string, unknown>).testid ?? 'field-value')}
    />
  )
};

describe('object-field renderer', () => {
  it('renders child fields and reads relative paths correctly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, fieldValueProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith'
            }
          },
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
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeTruthy();
    });

    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice');
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');
  });

  it('writes child field changes through prefixed path to parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: (props) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? props.meta.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          id: 'obj-form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith'
            }
          },
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
          submitAction: {
            action: 'ajax',
            api: { url: '/api/test', method: 'post' }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-form' }
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

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'Bob', lastName: 'Smith' }
    });
  });

  it('shows child field validation errors via the object-prefixed path', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            profile: { email: '' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                {
                  type: 'input-text',
                  name: 'email',
                  label: 'Email',
                  required: true
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Email', { exact: false })).toBeTruthy());

    fireEvent.blur(screen.getByLabelText('Email', { exact: false }));
    fireEvent.change(screen.getByLabelText('Email', { exact: false }), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Email', { exact: false }));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
