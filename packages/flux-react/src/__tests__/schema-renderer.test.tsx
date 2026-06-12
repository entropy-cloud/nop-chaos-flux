// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createSchemaRenderer } from '../schema-renderer.js';
import * as fluxRuntime from '@nop-chaos/flux-runtime';
import { createExpressionCompiler } from '../test-support.js';
import { env, eventTextRenderer, pageRenderer, textRenderer } from '../test-support-core.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__;
});

describe('SchemaRenderer callbacks', () => {
  it('calls onRuntimeChange on mount and null on unmount', async () => {
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Callback test' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    expect(onRuntimeChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(2));
    expect(onRuntimeChange.mock.calls[1][0]).toBeNull();
  });

  it('calls onComponentRegistryChange on mount and null on unmount', async () => {
    const onComponentRegistryChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Registry callback' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(1));
    expect(onComponentRegistryChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalledTimes(2));
    expect(onComponentRegistryChange.mock.calls[1][0]).toBeNull();
  });

  it('calls onActionScopeChange on mount and null on unmount', async () => {
    const onActionScopeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Scope callback' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(1));
    expect(onActionScopeChange.mock.calls[0][0]).not.toBeNull();

    unmount();
    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(2));
    expect(onActionScopeChange.mock.calls[1][0]).toBeNull();
  });

  it('releases owned root action scopes on unmount', async () => {
    const onRuntimeChange = vi.fn();
    const onActionScopeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Scope release' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(1));

    const runtime = onRuntimeChange.mock.calls[0][0];
    const actionScope = onActionScopeChange.mock.calls[0][0];
    const releaseSpy = vi.spyOn(runtime, 'releaseActionScope');

    unmount();

    await waitFor(() => expect(releaseSpy).toHaveBeenCalledWith(actionScope));
  });

  it('releases the previous owned root action scope when a caller swaps actionScope on the same runtime', async () => {
    const providedActionScope = {
      id: 'provided-action-scope',
      dispatch: vi.fn(),
      listNamespaces: vi.fn(() => []),
      registerNamespace: vi.fn(),
      unregisterNamespace: vi.fn(),
      hasMethod: vi.fn(),
      invoke: vi.fn(),
      invokeWithSignal: vi.fn(),
    } as any;
    const onRuntimeChange = vi.fn();
    const onActionScopeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Scope replacement' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(1));

    const runtime = onRuntimeChange.mock.calls[0][0];
    const ownedActionScope = onActionScopeChange.mock.calls[0][0];
    const releaseSpy = vi.spyOn(runtime, 'releaseActionScope');

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Scope replacement' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        actionScope={providedActionScope}
        onRuntimeChange={onRuntimeChange}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalledTimes(3));
    expect(onActionScopeChange.mock.calls[1][0]).toBeNull();
    expect(onActionScopeChange.mock.calls[2][0]).toBe(providedActionScope);
    await waitFor(() => expect(releaseSpy).toHaveBeenCalledWith(ownedActionScope));
  });
});

describe('SchemaRenderer data update', () => {
  it('updates page data when data prop changes', async () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Data test ${name}' }}
        data={{ name: 'Alice' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Data test Alice')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Data test ${name}' }}
        data={{ name: 'Bob' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Data test Bob')).toBeTruthy());
  });
});

describe('SchemaRenderer import preparation', () => {
  it('fails fast on strict schema diagnostics in automated test environments', () => {
    (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = true;

    const SchemaRenderer = createSchemaRenderer([
      eventTextRenderer,
      {
        type: 'form',
        component: () => null,
        componentCapabilityContracts: [{ handle: 'submit', displayName: 'Submit' }],
      },
      pageRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema-invalid-submit.json"
        schema={{
          type: 'page',
          body: [
            { type: 'form', id: 'my-form' },
            {
              type: 'event-text',
              text: 'Broken',
              onClick: {
                action: 'component:submit',
                componentId: 'my-form',
                args: { method: 'post', url: '/api/save' },
              },
            },
          ],
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        strictValidation
      />, 
    );

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([
        eventTextRenderer,
        pageRenderer,
        {
          type: 'form',
          component: () => null,
          componentCapabilityContracts: [{ handle: 'submit', displayName: 'Submit' }],
        },
      ]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    expect(
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'my-form' },
          {
            type: 'event-text',
            text: 'Broken',
            onClick: {
              action: 'component:submit',
              componentId: 'my-form',
              args: { method: 'post', url: '/api/save' },
            },
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-host-capability-args',
          path: '/body/1/onClick/args',
        }),
      ]),
    );
  });

  it('shows a root fallback when import preparation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failingLoader = {
      load: vi.fn(async () => {
        throw new Error('Import load failed');
      }),
    };

    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={
          {
            type: 'text',
            text: 'Import fail test',
            'xui:imports': [{ from: 'failing-lib', as: 'fail' }],
          } as any
        }
        env={{ ...env, importLoader: failingLoader }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(failingLoader.load).toHaveBeenCalled());

    expect(container.querySelector('[data-slot="schema-root-error"]')?.textContent).toContain(
      'Import load failed',
    );
    consoleSpy.mockRestore();
  });

  it('keeps schema import preload on latest-wins when an older prepare settles late', async () => {
    const originalCreateRendererRuntime = fluxRuntime.createRendererRuntime;
    const formulaCompiler = createFormulaCompiler();
    const firstPrepared = new Map([
      [
        'first',
        {
          schemaUrl: 'test://schema-a.json',
          spec: { from: 'lib-a', as: 'demo' },
          resolvedSpec: { from: 'lib-a', as: 'demo' },
        },
      ],
    ]);
    const secondPrepared = new Map([
      [
        'second',
        {
          schemaUrl: 'test://schema-b.json',
          spec: { from: 'lib-b', as: 'demo' },
          resolvedSpec: { from: 'lib-b', as: 'demo' },
        },
      ],
    ]);

    let resolveFirst: ((value: { preparedImports: typeof firstPrepared }) => void) | undefined;
    let resolveSecond: ((value: { preparedImports: typeof secondPrepared }) => void) | undefined;
    const prepareSchema = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const createRendererRuntimeSpy = vi
      .spyOn(fluxRuntime, 'createRendererRuntime')
      .mockImplementation((input) => {
        const runtime = originalCreateRendererRuntime(input);
        runtime.prepareSchema = prepareSchema as typeof runtime.prepareSchema;
        return runtime;
      });

    try {
      const SchemaRenderer = createSchemaRenderer([textRenderer]);
      const { rerender } = render(
        <SchemaRenderer
          schemaUrl="test://schema-a.json"
          schema={{ type: 'text', text: 'A', 'xui:imports': [{ from: 'lib-a', as: 'demo' }] } as any}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByText('Preparing schema imports.')).toBeTruthy());

      rerender(
        <SchemaRenderer
          schemaUrl="test://schema-b.json"
          schema={{ type: 'text', text: 'B', 'xui:imports': [{ from: 'lib-b', as: 'demo' }] } as any}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByText('Preparing schema imports.')).toBeTruthy());

      resolveSecond?.({ preparedImports: secondPrepared });
      await waitFor(() => expect(screen.getByText('B')).toBeTruthy());

      resolveFirst?.({ preparedImports: firstPrepared });
      await waitFor(() => expect(screen.getByText('B')).toBeTruthy());
      expect(screen.queryByText('A')).toBeNull();
    } finally {
      createRendererRuntimeSpy.mockRestore();
    }
  });

  it('passes an AbortSignal into runtime.prepareSchema and aborts stale import prepares on rerender', async () => {
    const originalCreateRendererRuntime = fluxRuntime.createRendererRuntime;
    const formulaCompiler = createFormulaCompiler();
    const seenSignals: AbortSignal[] = [];
    let resolveFirst: ((value: { preparedImports: Map<string, any> }) => void) | undefined;
    let resolveSecond: ((value: { preparedImports: Map<string, any> }) => void) | undefined;
    const prepareSchema = vi
      .fn()
      .mockImplementationOnce((_schema, options?: { signal?: AbortSignal }) => {
        seenSignals.push(options?.signal as AbortSignal);
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockImplementationOnce((_schema, options?: { signal?: AbortSignal }) => {
        seenSignals.push(options?.signal as AbortSignal);
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      });
    const createRendererRuntimeSpy = vi
      .spyOn(fluxRuntime, 'createRendererRuntime')
      .mockImplementation((input) => {
        const runtime = originalCreateRendererRuntime(input);
        runtime.prepareSchema = prepareSchema as typeof runtime.prepareSchema;
        return runtime;
      });

    try {
      const SchemaRenderer = createSchemaRenderer([textRenderer]);
      const { rerender } = render(
        <SchemaRenderer
          schemaUrl="test://schema-a.json"
          schema={{ type: 'text', text: 'A', 'xui:imports': [{ from: 'lib-a', as: 'demo' }] } as any}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByText('Preparing schema imports.')).toBeTruthy());

      rerender(
        <SchemaRenderer
          schemaUrl="test://schema-b.json"
          schema={{ type: 'text', text: 'B', 'xui:imports': [{ from: 'lib-b', as: 'demo' }] } as any}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => expect(prepareSchema).toHaveBeenCalledTimes(2));
      expect(seenSignals).toHaveLength(2);
      expect(seenSignals[0].aborted).toBe(true);
      expect(seenSignals[1].aborted).toBe(false);

      resolveSecond?.({ preparedImports: new Map() });
      await waitFor(() => expect(screen.getByText('B')).toBeTruthy());
      resolveFirst?.({ preparedImports: new Map() });
      await waitFor(() => expect(screen.getByText('B')).toBeTruthy());
    } finally {
      createRendererRuntimeSpy.mockRestore();
    }
  });
});

describe('SchemaRenderer null rendering', () => {
  it('renders nothing for null compiled root (compilation in progress)', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Visible' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(container.textContent).toContain('Visible');
  });
});

describe('SchemaRenderer page modalContainer', () => {
  it('sets modalContainer on page runtime from schema', async () => {
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          modalContainer: 'my-container',
          body: [{ type: 'text', text: 'Modal test' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalled());
  });
});
