import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEventHandler, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import {
  FormContext,
  RuntimeContext,
  ScopeContext,
  ValidationContext,
  createSchemaRenderer,
} from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { useFormFieldController } from '../field-utils.js';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

type FieldEvents = Readonly<Record<string, RendererEventHandler | undefined>>;

function fieldEvents(events: Record<string, unknown>): FieldEvents {
  return events as FieldEvents;
}

function makeScope(initial: Record<string, unknown>): {
  scope: ScopeRef;
  data: Record<string, unknown>;
  update: ReturnType<typeof vi.fn>;
} {
  const data: Record<string, unknown> = { ...initial };
  const update = vi.fn((path: string, value: unknown) => {
    data[path] = value;
  });
  const scope: ScopeRef = {
    id: 'scope-event-dispatch',
    path: '$',
    value: data,
    get(path: string) {
      return data[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(data, path);
    },
    readOwn() {
      return data;
    },
    readVisible() {
      return data;
    },
    materializeVisible() {
      return { ...data };
    },
    update,
    merge: vi.fn(),
  };
  return { scope, data, update };
}

function makeMockRuntime(notify: ReturnType<typeof vi.fn> = vi.fn()): RendererRuntime {
  return {
    env: { notify },
  } as unknown as RendererRuntime;
}

function wrapInContexts(
  scope: ScopeRef,
  children: React.ReactNode,
  options?: {
    runtime?: RendererRuntime;
    form?: unknown;
    validationScope?: unknown;
  },
) {
  return (
    <RuntimeContext.Provider value={options?.runtime ?? makeMockRuntime()}>
      <FormContext.Provider value={(options?.form ?? undefined) as any}>
        <ValidationContext.Provider value={(options?.validationScope ?? undefined) as any}>
          <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
        </ValidationContext.Provider>
      </FormContext.Provider>
    </RuntimeContext.Provider>
  );
}

describe('useFormFieldController field event dispatch', () => {
  it('dispatches onChange action with { name, value } payload when the value changes', () => {
    cleanup();
    const { scope } = makeScope({ status: 'active' });
    const onChange = vi.fn();

    function Probe() {
      const ctrl = useFormFieldController('status', {
        events: fieldEvents({ onChange }),
      });
      return (
        <button type="button" data-testid="probe" onClick={() => ctrl.handlers.onChange('next')}>
          change
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />));
    fireEvent.click(screen.getByTestId('probe'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toEqual({ name: 'status', value: 'next' });
  });

  it('dispatches onBlur action with { name, value } payload on blur', () => {
    cleanup();
    const { scope } = makeScope({ status: 'active' });
    const onBlur = vi.fn();

    function Probe() {
      const ctrl = useFormFieldController('status', {
        events: fieldEvents({ onBlur }),
      });
      return (
        <button type="button" data-testid="probe" onClick={() => ctrl.handlers.onBlur()}>
          blur
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />));
    fireEvent.click(screen.getByTestId('probe'));

    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlur.mock.calls[0]?.[0]).toEqual({ name: 'status', value: 'active' });
  });

  it('orders setValue before events and events before validate on change', async () => {
    cleanup();
    const { scope } = makeScope({ status: 'active' });
    const validateField = vi.fn(async () => undefined);
    const setValue = vi.fn();
    const notify = vi.fn();
    const currentForm = {
      store: {
        subscribe: vi.fn(() => () => undefined),
        subscribeToPath: vi.fn(() => () => undefined),
        subscribeToPaths: vi.fn(() => () => undefined),
        subscribeToSubmitting: vi.fn(() => () => undefined),
        getState: () => ({
          values: { status: 'active' },
          fieldStates: {},
          submitting: false,
          submitAttempted: false,
        }),
      },
      visitField: vi.fn(),
      touchField: vi.fn(),
      validateField,
      setValue,
      validation: {
        behavior: { triggers: ['change'], showErrorOn: ['dirty'] },
        nodes: {},
      },
    } as any;
    const onChange = vi.fn(() => {
      expect(setValue).toHaveBeenCalledWith('status', 'next');
      expect(validateField).not.toHaveBeenCalled();
    });

    function Probe() {
      const ctrl = useFormFieldController('status', {
        events: fieldEvents({ onChange }),
      });
      return (
        <button type="button" data-testid="probe" onClick={() => ctrl.handlers.onChange('next')}>
          change
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />, { runtime: makeMockRuntime(notify), form: currentForm }));
    fireEvent.click(screen.getByTestId('probe'));

    expect(onChange).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(validateField).toHaveBeenCalled();
    });
  });

  it('does not dispatch onChange when the default value is pushed on mount', () => {
    cleanup();
    const { scope, data } = makeScope({});
    const onChange = vi.fn();

    function Probe() {
      useFormFieldController('status', {
        defaultValue: 'pushed',
        events: fieldEvents({ onChange }),
      });
      return <span data-testid="probe">ok</span>;
    }

    render(wrapInContexts(scope, <Probe />));

    expect(data.status).toBe('pushed');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not dispatch onChange/onBlur when the field is readOnly', () => {
    cleanup();
    const { scope, update } = makeScope({ status: 'active' });
    const onChange = vi.fn();
    const onBlur = vi.fn();

    function Probe() {
      const ctrl = useFormFieldController('status', {
        readOnly: true,
        events: fieldEvents({ onChange, onBlur }),
      });
      return (
        <button
          type="button"
          data-testid="probe"
          onClick={() => {
            ctrl.handlers.onChange('blocked');
            ctrl.handlers.onBlur();
          }}
        >
          change
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />));
    fireEvent.click(screen.getByTestId('probe'));

    expect(onChange).not.toHaveBeenCalled();
    expect(onBlur).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reports a failing onChange action via runtime host issue and keeps the value bound', () => {
    cleanup();
    const { scope, data } = makeScope({ status: 'active' });
    const notify = vi.fn();
    const onChange = vi.fn(() => {
      throw new Error('onChange boom');
    });

    function Probe() {
      const ctrl = useFormFieldController('status', {
        events: fieldEvents({ onChange }),
      });
      return (
        <button type="button" data-testid="probe" onClick={() => ctrl.handlers.onChange('next')}>
          change
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />, { runtime: makeMockRuntime(notify) }));
    fireEvent.click(screen.getByTestId('probe'));

    expect(notify).toHaveBeenCalledWith(
      'warning',
      expect.stringContaining('onChange action failed'),
    );
    expect(data.status).toBe('next');
  });

  it('reports a rejected onChange action via runtime host issue', async () => {
    cleanup();
    const { scope, data } = makeScope({ status: 'active' });
    const notify = vi.fn();
    const onChange = vi.fn(() => Promise.reject(new Error('onChange reject')));

    function Probe() {
      const ctrl = useFormFieldController('status', {
        events: fieldEvents({ onChange }),
      });
      return (
        <button type="button" data-testid="probe" onClick={() => ctrl.handlers.onChange('next')}>
          change
        </button>
      );
    }

    render(wrapInContexts(scope, <Probe />, { runtime: makeMockRuntime(notify) }));
    fireEvent.click(screen.getByTestId('probe'));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('onChange action failed'),
      );
    });
    expect(data.status).toBe('next');
  });
});

describe('schema-driven field event dispatch through renderers', () => {
  it('dispatches schema-declared onChange action when an input-text value changes', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/event-dispatch-onchange"
        schema={{
          type: 'form',
          data: {
            qty: '1',
            echo: null,
          },
          body: [
            {
              type: 'input-text',
              name: 'qty',
              label: 'Qty',
              onChange: {
                action: 'setValue',
                args: { path: 'echo', value: '${qty}' },
              },
            },
            {
              type: 'form-state-probe',
              name: 'echo',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText('Qty');
    fireEvent.change(input, { target: { value: '5' } });

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:echo').textContent ?? 'null')).toBe('5');
    });
  });

  it('dispatches schema-declared onBlur action when an input-text blurs', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/event-dispatch-onblur"
        schema={{
          type: 'form',
          data: {
            name: 'a',
            blurred: false,
          },
          body: [
            {
              type: 'input-text',
              name: 'name',
              label: 'Name',
              onBlur: {
                action: 'setValue',
                args: { path: 'blurred', value: true },
              },
            },
            {
              type: 'form-state-probe',
              name: 'blurred',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.blur(screen.getByLabelText('Name'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:blurred').textContent ?? 'null')).toBe(true);
    });
  });
});
