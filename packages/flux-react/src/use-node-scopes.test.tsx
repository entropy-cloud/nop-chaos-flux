import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useNodeScopes } from './use-node-scopes.js';

// Characterization pins for the StrictMode-deferred-dispose skeleton living in
// useNodeScopes (CX-8 plan 586, draft review m2/m4): these must stay green
// across the useDeferredDispose extraction — drift form included.

async function flushDeferredDispose() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) {
      await Promise.resolve();
    }
  });
}

function createFakeRuntime() {
  let scopeCounter = 0;
  let registryCounter = 0;
  return {
    createActionScope: vi.fn(({ id }: { id: string }) => ({
      id: id ?? `scope-${(scopeCounter += 1)}`,
      dispose: vi.fn(),
    })),
    createComponentHandleRegistry: vi.fn(({ id }: { id: string }) => ({
      id: id ?? `registry-${(registryCounter += 1)}`,
      dispose: vi.fn(),
    })),
    releaseActionScope: vi.fn(),
  };
}

type FakeRuntime = ReturnType<typeof createFakeRuntime>;

function Harness(props: {
  runtime: FakeRuntime;
  nodeId: string;
  policy: 'inherit' | 'new';
}) {
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(
    props.runtime as never,
    {
      nodeId: props.nodeId,
      actionScopePolicy: props.policy,
      componentRegistryPolicy: props.policy,
    },
    undefined,
    undefined,
  );
  return (
    <span
      data-testid="probe"
      data-scope-id={activeActionScope?.id ?? ''}
      data-registry-id={activeComponentRegistry?.id ?? ''}
    />
  );
}

describe('useNodeScopes deferred dispose (characterization)', () => {
  it('keeps StrictMode double-invoke from releasing node-owned scopes and registries', async () => {
    const runtime = createFakeRuntime();

    const { unmount, getByTestId } = render(
      <React.StrictMode>
        <Harness runtime={runtime} nodeId="node-1" policy="new" />
      </React.StrictMode>,
    );

    expect(getByTestId('probe').getAttribute('data-scope-id')).toBe('node-1:action-scope');
    expect(getByTestId('probe').getAttribute('data-registry-id')).toBe(
      'node-1:component-registry',
    );

    await flushDeferredDispose();

    // StrictMode double-render may create candidate scopes/registries twice,
    // but the remount simulation must release/dispose none of them.
    expect(runtime.releaseActionScope).not.toHaveBeenCalled();
    const registryDisposeCallsDuringStrictModeMount = runtime.createComponentHandleRegistry.mock.results.reduce(
      (sum, result) => sum + result.value.dispose.mock.calls.length,
      0,
    );
    expect(registryDisposeCallsDuringStrictModeMount).toBe(0);

    unmount();
    await flushDeferredDispose();

    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(1);
    expect(runtime.releaseActionScope.mock.calls[0]?.[0]).toMatchObject({
      id: 'node-1:action-scope',
    });
    const registryDisposeCallsAfterUnmount = runtime.createComponentHandleRegistry.mock.results.reduce(
      (sum, result) => sum + result.value.dispose.mock.calls.length,
      0,
    );
    expect(registryDisposeCallsAfterUnmount).toBe(1);
  });

  it('releases the previous pair exactly once when the owning node id swaps, and the new pair only on unmount', async () => {
    const runtime = createFakeRuntime();

    const { rerender, unmount } = render(
      <Harness runtime={runtime} nodeId="node-1" policy="new" />,
    );
    await flushDeferredDispose();

    const firstScope = runtime.createActionScope.mock.results[0]?.value;
    const firstRegistry = runtime.createComponentHandleRegistry.mock.results[0]?.value;

    rerender(<Harness runtime={runtime} nodeId="node-2" policy="new" />);
    await flushDeferredDispose();

    expect(runtime.createActionScope).toHaveBeenCalledTimes(2);
    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(1);
    expect(runtime.releaseActionScope).toHaveBeenCalledWith(firstScope);
    expect(firstRegistry.dispose).toHaveBeenCalledTimes(1);

    unmount();
    await flushDeferredDispose();

    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(2);
    expect(runtime.releaseActionScope).toHaveBeenLastCalledWith(
      runtime.createActionScope.mock.results[1]?.value,
    );
    expect(runtime.createComponentHandleRegistry.mock.results[1]?.value.dispose).toHaveBeenCalledTimes(
      1,
    );
  });

  it('re-runs zero dispose work across identical rerenders (deps discipline)', async () => {
    const runtime = createFakeRuntime();

    const { rerender, unmount } = render(
      <Harness runtime={runtime} nodeId="node-1" policy="new" />,
    );
    await flushDeferredDispose();

    rerender(<Harness runtime={runtime} nodeId="node-1" policy="new" />);
    rerender(<Harness runtime={runtime} nodeId="node-1" policy="new" />);
    await flushDeferredDispose();

    expect(runtime.createActionScope).toHaveBeenCalledTimes(1);
    expect(runtime.createComponentHandleRegistry).toHaveBeenCalledTimes(1);
    expect(runtime.releaseActionScope).not.toHaveBeenCalled();

    unmount();
    await flushDeferredDispose();

    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(1);
  });

  it('never disposes when the policy yields undefined values (inherit)', async () => {
    const runtime = createFakeRuntime();
    const parentScope = { id: 'parent-scope' };
    const parentRegistry = { id: 'parent-registry' };

    function PassthroughHarness({ runtime: runtimeInput }: { runtime: FakeRuntime }) {
      const { activeActionScope, activeComponentRegistry } = useNodeScopes(
        runtimeInput as never,
        { nodeId: 'node-1', actionScopePolicy: 'inherit', componentRegistryPolicy: 'inherit' },
        parentScope as never,
        parentRegistry as never,
      );
      return (
        <span
          data-testid="probe"
          data-scope-id={activeActionScope?.id ?? ''}
          data-registry-id={activeComponentRegistry?.id ?? ''}
        />
      );
    }

    const { rerender, unmount, getByTestId } = render(<PassthroughHarness runtime={runtime} />);
    expect(getByTestId('probe').getAttribute('data-scope-id')).toBe('parent-scope');
    expect(getByTestId('probe').getAttribute('data-registry-id')).toBe('parent-registry');

    rerender(<PassthroughHarness runtime={runtime} />);
    await flushDeferredDispose();

    unmount();
    await flushDeferredDispose();

    expect(runtime.createActionScope).not.toHaveBeenCalled();
    expect(runtime.createComponentHandleRegistry).not.toHaveBeenCalled();
    expect(runtime.releaseActionScope).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  cleanup();
});
