import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, textRenderer } from '../test-support-core.js';

// Characterization pins for the StrictMode-deferred-dispose skeleton in
// SchemaRenderer (CX-8 plan 586, draft review m2/m4): StrictMode double-invoke
// timing, zero extra dispose on unrelated prop churn, one-sided ownership gate
// (isEnabled=false -> zero calls), and the registry-side value-swap release
// that previously only had indirect coverage.

async function flushDeferredDispose() {
  for (let i = 0; i < 4; i += 1) {
    await Promise.resolve();
  }
}

function lastNonNull(calls: unknown[]): any {
  const nonNull = calls.filter((call) => (call as unknown[])?.[0] != null);
  expect(nonNull.length).toBeGreaterThan(0);
  return (nonNull.at(-1) as unknown[])[0];
}

describe('SchemaRenderer deferred dispose (characterization)', () => {
  it('keeps the StrictMode remount simulation from disposing the runtime, and disposes exactly once on real unmount', async () => {
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { unmount } = render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema-renderer-strictmode-deferred-dispose"
          schema={{ type: 'text', text: 'StrictMode dispose timing' }}
          env={env}
          formulaCompiler={createFormulaCompiler()}
          onRuntimeChange={onRuntimeChange}
        />
      </React.StrictMode>,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalled());
    const runtime = lastNonNull(onRuntimeChange.mock.calls);
    const disposeSpy = vi.spyOn(runtime, 'dispose');

    await flushDeferredDispose();

    expect(disposeSpy).not.toHaveBeenCalled();

    unmount();
    await flushDeferredDispose();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the runtime and its scopes when only unrelated props change (no extra dispose)', async () => {
    const onRuntimeChange = vi.fn();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-deferred-dispose-stable"
        schema={{ type: 'text', text: 'Before ${name}' }}
        data={{ name: 'before' }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    const runtime = lastNonNull(onRuntimeChange.mock.calls);
    const disposeSpy = vi.spyOn(runtime, 'dispose');

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-deferred-dispose-stable"
        schema={{ type: 'text', text: 'After ${name}' }}
        data={{ name: 'after' }}
        env={{ ...env, notify: () => undefined }}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await flushDeferredDispose();

    expect(onRuntimeChange).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it('releases the previous owned root component registry when a caller swaps componentRegistry, and never disposes the provided one', async () => {
    const providedRegistry = { id: 'provided-component-registry', dispose: vi.fn() };
    const onComponentRegistryChange = vi.fn();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender, unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-registry-swap"
        schema={{ type: 'text', text: 'Registry swap' }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(onComponentRegistryChange).toHaveBeenCalled());
    const ownedRegistry = lastNonNull(onComponentRegistryChange.mock.calls);
    const ownedDisposeSpy = vi.spyOn(ownedRegistry, 'dispose');
    expect(ownedDisposeSpy).not.toHaveBeenCalled();

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-registry-swap"
        schema={{ type: 'text', text: 'Registry swap' }}
        env={env}
        formulaCompiler={formulaCompiler}
        componentRegistry={providedRegistry as never}
        onComponentRegistryChange={onComponentRegistryChange}
      />,
    );

    await waitFor(() => expect(ownedDisposeSpy).toHaveBeenCalledTimes(1));
    expect(onComponentRegistryChange).toHaveBeenCalledWith(providedRegistry);
    expect(providedRegistry.dispose).not.toHaveBeenCalled();

    unmount();
    await flushDeferredDispose();

    expect(ownedDisposeSpy).toHaveBeenCalledTimes(1);
    expect(providedRegistry.dispose).not.toHaveBeenCalled();
  });

  it('releases the owned root action scope when a caller swaps actionScope, and never releases the provided one', async () => {
    const providedActionScope = {
      id: 'provided-action-scope',
      dispatch: vi.fn(),
      listNamespaces: vi.fn(() => []),
      registerNamespace: vi.fn(),
      unregisterNamespace: vi.fn(),
      hasMethod: vi.fn(),
      invoke: vi.fn(),
      invokeWithSignal: vi.fn(),
    } as never;
    const onRuntimeChange = vi.fn();
    const onActionScopeChange = vi.fn();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const { rerender, unmount } = render(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-scope-swap-gate"
        schema={{ type: 'text', text: 'Scope swap gate' }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={onRuntimeChange}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(onActionScopeChange).toHaveBeenCalled());
    const runtime = lastNonNull(onRuntimeChange.mock.calls);
    const ownedActionScope = lastNonNull(onActionScopeChange.mock.calls);
    const releaseSpy = vi.spyOn(runtime, 'releaseActionScope');

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema-renderer-scope-swap-gate"
        schema={{ type: 'text', text: 'Scope swap gate' }}
        env={env}
        formulaCompiler={formulaCompiler}
        actionScope={providedActionScope}
        onRuntimeChange={onRuntimeChange}
        onActionScopeChange={onActionScopeChange}
      />,
    );

    await waitFor(() => expect(releaseSpy).toHaveBeenCalledWith(ownedActionScope));
    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(releaseSpy).not.toHaveBeenCalledWith(providedActionScope);

    unmount();
    await flushDeferredDispose();

    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(releaseSpy).not.toHaveBeenCalledWith(providedActionScope);
  });
});
