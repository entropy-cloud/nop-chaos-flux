import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ActionResult, ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { useCurrentForm, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

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

function ScopeSelectorProbeRenderer() {
  const snapshot = useScopeSelector((scope) => ({
    value: scope.value,
    readOnly: scope.readOnly
  }), Object.is) as Record<string, unknown>;
  return <span data-testid="scope-selector-probe">{JSON.stringify(snapshot)}</span>;
}

const scopeSelectorProbeRenderer: RendererDefinition = {
  type: 'scope-selector-probe',
  component: () => <ScopeSelectorProbeRenderer />
};

function ObjectScopeMutationRenderer() {
  const scope = useRenderScope();

  return (
    <>
      <button type="button" onClick={() => scope.update('firstName', 'Bob')}>
        Set First Name
      </button>
      <button type="button" onClick={() => scope.merge({ lastName: 'Jones' } as Record<string, unknown>)}>
        Merge Object
      </button>
      <button
        type="button"
        onClick={() => scope.merge({ value: { firstName: 'Merged', lastName: 'Value' } } as Record<string, unknown>)}
      >
        Merge Value Wrapper
      </button>
      <button
        type="button"
        onClick={() => {
          scope.replace?.({ firstName: 'Dana', lastName: 'Lane' } as Record<string, unknown>);
        }}
      >
        Replace Object
      </button>
      <button
        type="button"
        onClick={() => {
          scope.replace?.({ value: { firstName: 'Fay', lastName: 'Mills' } } as Record<string, unknown>);
        }}
      >
        Replace Value Wrapper
      </button>
    </>
  );
}

const objectScopeMutationRenderer: RendererDefinition = {
  type: 'object-scope-mutation-probe',
  component: () => <ObjectScopeMutationRenderer />
};

describe('object-field renderer', () => {
  it('renders child fields and reads relative paths correctly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, fieldValueProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#1"
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
              className: 'border',
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

    const field = screen.getByText('Profile').closest('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.className).toContain('border');
    expect(field?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Profile');
    expect(field?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="object-field-body"]')).toBeTruthy();

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
          {String(props.props.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#2"
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
            args: { url: '/api/test', method: 'post' }
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
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#3"
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

  it('publishes object-field scope as value and readOnly while keeping relative child names', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs, scopeSelectorProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            profile: { firstName: 'Alice', lastName: 'Smith' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              readOnly: true,
              body: [
                { type: 'text', text: 'Profile ${value.firstName} / ${readOnly}', testid: 'profile-scope' },
                { type: 'scope-selector-probe' },
                { type: 'input-text', name: 'firstName', label: 'First Name' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByTestId('profile-scope').textContent).toBe('Profile Alice / true'));
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(JSON.stringify({
      value: { firstName: 'Alice', lastName: 'Smith' },
      readOnly: true
    }));
    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice');
  });

  it('keeps relative payload paths writable through the shared projected owner scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#4b"
        schema={{
          type: 'form',
          data: {
            profile: { firstName: 'Alice', lastName: 'Smith' }
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
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

    const firstName = await screen.findByLabelText('First Name');
    fireEvent.change(firstName, { target: { value: 'Bob' } });

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Bob'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');
  });

  it('second edit to the same child field is reflected on submit', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: (props) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#5"
        schema={{
          type: 'form',
          id: 'obj-second-edit-form',
          data: { profile: { firstName: 'Alice', lastName: 'Smith' } },
          body: [{
            type: 'object-field', name: 'profile', label: 'Profile',
            body: [
              { type: 'input-text', name: 'firstName', label: 'First Name' },
              { type: 'input-text', name: 'lastName', label: 'Last Name' }
            ]
          }],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [{ type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'obj-second-edit-form' } }]
        }}
        env={{ ...env, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Charlie' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({ profile: { firstName: 'Charlie', lastName: 'Smith' } });
  });

  it('runs transformInAction before publishing child scope values', async () => {
    cleanup();
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            return {
              ok: true,
              data: {
                firstName: 'Adapted',
                lastName: 'User'
              }
            };
          }
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#6"
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
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformInAction: { action: 'objectLib:toDraft' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ]
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Adapted'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('User');
    expect(calls[0]).toEqual({ value: { firstName: 'Alice', lastName: 'Smith' }, name: 'profile', readOnly: false });
  });

  it('runs transformOutAction before writing child edits back to the parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            if (method === 'toPersisted') {
              const value = payload?.value as Record<string, unknown> | undefined;
              return {
                ok: true,
                data: {
                  firstName: String(value?.firstName ?? '').toUpperCase(),
                  lastName: value?.lastName ?? ''
                }
              };
            }

            return { ok: true };
          }
        })
      }))
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: (props) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#7"
        schema={{
          type: 'form',
          id: 'obj-transform-out-form',
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
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'obj-transform-out-form' } }
          ]
        }}
        env={{
          ...env,
          importLoader,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'BOB', lastName: 'Smith' }
    });
    expect(calls[0]).toEqual({
      value: { firstName: 'Bob', lastName: 'Smith' },
      originalValue: { firstName: 'Alice', lastName: 'Smith' },
      name: 'profile',
      readOnly: false
    });
  });

  it('suppresses stale async transformOutAction results', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const resolvers: Array<(value: { ok: boolean; data: Record<string, unknown> }) => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: (method: string, _payload: Record<string, unknown> | undefined): Promise<ActionResult> => {
            if (method !== 'toPersisted') {
              return Promise.resolve({ ok: true });
            }

            return new Promise((resolve) => {
              resolvers.push(resolve as (value: { ok: boolean; data: Record<string, unknown> }) => void);
            });
          }
        })
      }))
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: (props) => (
        <button type="button" onClick={() => void props.events.onClick?.()}>
          {String(props.props.label ?? 'Button')}
        </button>
      ),
      fields: [{ key: 'onClick', kind: 'event' }]
    };
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#8"
        schema={{
          type: 'form',
          id: 'obj-transform-out-race-form',
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
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' }
              ]
            }
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'obj-transform-out-race-form' } }
          ]
        }}
        env={{
          ...env,
          importLoader,
          fetcher: makeCapturingFetcher(submitValues)
        }}
        formulaCompiler={formulaCompiler}
      />
    );

    const input = await screen.findByLabelText('First Name');
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.change(input, { target: { value: 'Carol' } });

    await waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });
    resolvers[1]({ ok: true, data: { firstName: 'CAROL', lastName: 'Smith' } });
    resolvers[0]({ ok: true, data: { firstName: 'BOB', lastName: 'Smith' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'CAROL', lastName: 'Smith' }
    });
  });

  it('reflects parent-owned object replacement through the projected view when no transform actions are declared', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs, scopeSelectorProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#9"
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
              body: [
                { type: 'scope-selector-probe' },
                { type: 'input-text', name: 'firstName', label: 'First Name' }
              ]
            },
            {
              type: 'button',
              label: 'Replace Profile',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'profile',
                  value: { firstName: 'Dana', lastName: 'Jones' }
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice'));
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(JSON.stringify({
      value: { firstName: 'Alice', lastName: 'Smith' },
      readOnly: false
    }));

    fireEvent.click(screen.getByText('Replace Profile'));

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Dana'));
    expect(screen.getByTestId('scope-selector-probe').textContent).toBe(JSON.stringify({
      value: { firstName: 'Dana', lastName: 'Jones' },
      readOnly: false
    }));
  });

  it('supports projected child scope merge replace and nested updates in a form owner', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      objectScopeMutationRenderer
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#10"
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
              body: [
                { type: 'object-scope-mutation-probe' },
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

    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');

    fireEvent.click(screen.getByText('Set First Name'));
    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Bob'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Smith');

    fireEvent.click(screen.getByText('Merge Object'));
    await waitFor(() => expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Jones'));

    fireEvent.click(screen.getByText('Merge Value Wrapper'));
    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Merged'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Value');

    fireEvent.click(screen.getByText('Replace Object'));
    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Dana'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Lane');

    fireEvent.click(screen.getByText('Replace Value Wrapper'));
    await waitFor(() => expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Fay'));
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Mills');
  });

});
