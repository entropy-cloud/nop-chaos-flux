// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, formRenderer, pageRenderer, textRenderer } from '../test-support-core.js';

const formulaCompiler = createFormulaCompiler();

let capturedNativeEvent: Event | undefined;
let parentClickCount: number;

beforeEach(() => {
  capturedNativeEvent = undefined;
  parentClickCount = 0;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const btnRenderer: RendererDefinition = {
  type: 'btn',
  component: (props) => (
    <button
      type="button"
      data-testid="btn"
      onClick={(reactEvent) => {
        capturedNativeEvent = reactEvent.nativeEvent;
        props.events.onClick?.(reactEvent);
      }}
    >
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

const parentBtnRenderer: RendererDefinition = {
  type: 'parent-btn',
  component: (props) => (
    <div
      data-testid="parent"
      onClick={() => {
        parentClickCount++;
      }}
    >
      <button
        type="button"
        data-testid="child-btn"
        onClick={(reactEvent) => {
          capturedNativeEvent = reactEvent.nativeEvent;
          props.events.onClick?.(reactEvent);
        }}
      >
        {String(props.props.label ?? 'Child')}
      </button>
    </div>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

const formBtnRenderer: RendererDefinition = {
  type: 'form-btn',
  component: (props) => (
    <form
      data-testid="form"
      onSubmit={(reactEvent) => {
        capturedNativeEvent = reactEvent.nativeEvent;
        props.events.onSubmit?.(reactEvent);
      }}
    >
      <button type="submit" data-testid="submit-btn">
        {String(props.props.label ?? 'Submit')}
      </button>
    </form>
  ),
  fields: [{ key: 'onSubmit', kind: 'event' }],
};

function makeRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([
    pageRenderer,
    formRenderer,
    textRenderer,
    btnRenderer,
    parentBtnRenderer,
    formBtnRenderer,
    ...extra,
  ]);
}

describe('X2 schema-driven preventDefault', () => {
  it('calls event.preventDefault() synchronously when preventDefault: true on click', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/prevent-true"
        schema={{
          type: 'btn',
          label: 'Prevent',
          onClick: {
            action: 'setValue',
            args: { path: 'x', value: 1 },
            preventDefault: true,
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(true);
  });

  it('calls event.preventDefault() synchronously on form submit when preventDefault: true', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/prevent-submit"
        schema={{
          type: 'form-btn',
          label: 'Submit',
          onSubmit: {
            action: 'setValue',
            args: { path: 'x', value: 1 },
            preventDefault: true,
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(true);
  });

  it('prevents default when expression evaluates truthy', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/prevent-expr-true"
        schema={{
          type: 'form',
          data: { shouldPrevent: true },
          body: [
            {
              type: 'btn',
              label: 'ExprTrue',
              onClick: {
                action: 'setValue',
                args: { path: 'x', value: 1 },
                preventDefault: '${shouldPrevent}',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(true);
  });

  it('does NOT prevent default when expression evaluates falsy', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/prevent-expr-false"
        schema={{
          type: 'form',
          data: { shouldPrevent: false },
          body: [
            {
              type: 'btn',
              label: 'ExprFalse',
              onClick: {
                action: 'setValue',
                args: { path: 'x', value: 1 },
                preventDefault: '${shouldPrevent}',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(false);
  });

  it('does NOT prevent default when preventDefault field is absent (backward compat)', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/prevent-absent"
        schema={{
          type: 'btn',
          label: 'NoPrevent',
          onClick: { action: 'setValue', args: { path: 'x', value: 1 } },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(false);
  });

  it('stops propagation when stopPropagation: true (parent onClick not fired)', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/stop-prop"
        schema={{
          type: 'parent-btn',
          label: 'StopProp',
          onClick: {
            action: 'setValue',
            args: { path: 'x', value: 1 },
            stopPropagation: true,
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('child-btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(parentClickCount).toBe(0);
  });

  it('still bubbles to parent onClick when stopPropagation absent', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/no-stop-prop"
        schema={{
          type: 'parent-btn',
          label: 'NoStopProp',
          onClick: { action: 'setValue', args: { path: 'x', value: 1 } },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('child-btn'));

    expect(parentClickCount).toBe(1);
  });

  it('does not throw and warns when preventDefault declared on a non-event lifecycle action', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = makeRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://lifecycle/prevent"
        schema={
          {
            type: 'text',
            text: 'Lifecycle prevent',
            onMount: {
              action: 'setValue',
              args: { path: 'x', value: 1 },
              preventDefault: true,
            },
          } as any
        }
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Lifecycle prevent')).toBeTruthy();

    await waitFor(() => {
      const lifecycleWarnCalled = warnSpy.mock.calls.some((call) =>
        String(call[0] ?? '').toLowerCase().includes('preventdefault'),
      );
      expect(lifecycleWarnCalled).toBe(true);
    });

    warnSpy.mockRestore();
  });

  it('falls back to falsy (no prevent) and logs dev error when expression evaluation throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const SchemaRenderer = makeRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://btn/prevent-expr-throw"
        schema={{
          type: 'btn',
          label: 'Throw',
          onClick: {
            action: 'setValue',
            args: { path: 'x', value: 1 },
            preventDefault: '${nonExistentRef.foo}',
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('orthogonality with when: when:false + preventDefault:true still prevents native default', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/orthogonal"
        schema={{
          type: 'btn',
          label: 'Orth',
          onClick: {
            action: 'setValue',
            args: { path: 'x', value: 1 },
            when: false,
            preventDefault: true,
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('btn'));

    expect(capturedNativeEvent).toBeTruthy();
    expect(capturedNativeEvent!.defaultPrevented).toBe(true);
  });

  it('imperative ctx.event.preventDefault() path still works (backward compat)', async () => {
    const capturedEventPreventFns: Array<(() => void) | undefined> = [];

    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: (
            _method: string,
            _payload: Record<string, unknown> | undefined,
            ctx: { event?: { preventDefault?: () => void } },
          ) => {
            capturedEventPreventFns.push(ctx.event?.preventDefault);
            ctx.event?.preventDefault?.();
            return { ok: true };
          },
        }),
      }),
    };

    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://btn/imperative"
        schema={
          {
            type: 'btn',
            label: 'Imperative',
            'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
            onClick: { action: 'demo:prevent' },
          } as any
        }
        env={{ ...env, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    const btn = await screen.findByTestId('btn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(capturedEventPreventFns.length).toBeGreaterThanOrEqual(1);
    });

    expect(typeof capturedEventPreventFns[0]).toBe('function');
  });
});
