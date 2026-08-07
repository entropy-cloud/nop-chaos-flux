import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCurrentActionScope: vi.fn(),
  useCurrentComponentRegistry: vi.fn(),
  useCurrentPage: vi.fn(),
  useCurrentSurfaceRuntime: vi.fn(() => undefined),
  useRenderScope: vi.fn(),
  useRendererRuntime: vi.fn(),
  createFormComponentHandle: vi.fn((form: unknown) => ({ form })),
  resolveGap: vi.fn(() => ({ className: 'gap-class', style: { '--gap': '1rem' } })),
}));

vi.mock('@nop-chaos/flux-react', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  return {
    FormContext: ReactModule.createContext(undefined),
    FormLayoutContext: ReactModule.createContext(undefined),
    ScopeContext: ReactModule.createContext(null),
    hasRendererSlotContent: (content: unknown) =>
      content !== null && content !== undefined && content !== false,
    resolveRendererSlotContent: (props: { regions?: Record<string, unknown> }, slot: string) =>
      props.regions?.[slot],
    useCurrentActionScope: mocks.useCurrentActionScope,
    useCurrentComponentRegistry: mocks.useCurrentComponentRegistry,
    useCurrentPage: mocks.useCurrentPage,
    useCurrentSurfaceRuntime: mocks.useCurrentSurfaceRuntime,
    useRenderScope: mocks.useRenderScope,
    useRendererRuntime: mocks.useRendererRuntime,
    createFormComponentHandle: mocks.createFormComponentHandle,
    resolveGap: mocks.resolveGap,
  };
});

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

import { FormRenderer } from '../renderers/form.js';
import { buildProps, makeScope } from './form-renderer-lifecycle-test-support.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FormRenderer lifecycle wiring — init actions and disposal', () => {
  it('disposes the replaced owned form when publication paths change', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const firstOwnedForm = {
      scope: makeScope({ id: 'owned-first', visible: {} }),
      store: { getState: () => ({ values: { username: 'Alice' }, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const secondOwnedForm = {
      scope: makeScope({ id: 'owned-second', visible: {} }),
      store: { getState: () => ({ values: { username: 'Alice' }, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn()
        .mockReturnValueOnce(firstOwnedForm)
        .mockReturnValueOnce(secondOwnedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    const { rerender } = render(
      <FormRenderer
        {...buildProps({
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    rerender(
      <FormRenderer
        {...buildProps({
          props: {
            ...buildProps().props,
            statusPath: 'ui.nextStatus',
            valuesPath: 'ui.nextValues',
          },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await waitFor(() => {
      expect(firstOwnedForm.dispose).toHaveBeenCalledTimes(1);
    });
    expect(secondOwnedForm.dispose).not.toHaveBeenCalled();
  });

  it('cancels and catches fire-and-forget initAction work on cleanup', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-init', visible: { localValue: 'plain-owned' } });
    const initAction = vi.fn(
      async (_value: unknown, options?: { signal?: AbortSignal }) =>
        new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            { once: true },
          );
        }),
    );
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    const { unmount } = render(
      <FormRenderer
        {...buildProps({
          events: { initAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await waitFor(() => {
      expect(initAction).toHaveBeenCalledTimes(1);
    });

    const initCall = initAction.mock.calls[0];
    expect(initCall?.[1]?.signal).toBeInstanceOf(AbortSignal);

    unmount();

    expect((initCall?.[1] as { signal?: AbortSignal } | undefined)?.signal?.aborted).toBe(true);
  });

  it('skips initAction when autoInit is false', async () => {
    const initAction = vi.fn(async () => undefined);
    const ownedScope = makeScope({ id: 'owned-autoinit', visible: { localValue: 'test' } });
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({ importedFlag: 'yes' })),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;
    mocks.useRendererRuntime.mockReturnValue(runtime);

    const props = buildProps({
      props: { autoInit: false },
      schema: { type: 'form', autoInit: false },
      events: { initAction },
    });

    render(<FormRenderer {...props} />);

    await waitFor(() => {
      expect(initAction).not.toHaveBeenCalled();
    });
  });

  it('retries a rejected initAction on rerender within the same activation and reports the failure', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-init', visible: { localValue: 'plain-owned' } });
    const rejectedInitAction = vi.fn(async () => {
      throw new Error('first init failed');
    });
    const successfulInitAction = vi.fn(async () => ({ ok: true }));
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      env: { notify: vi.fn(), monitor: undefined },
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    const { rerender } = render(
      <FormRenderer
        {...buildProps({
          events: { initAction: rejectedInitAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await waitFor(() => {
      expect(rejectedInitAction).toHaveBeenCalledTimes(1);
    });
    expect(runtime.env.notify).toHaveBeenCalledWith('error', 'Form initAction failed');

    rerender(
      <FormRenderer
        {...buildProps({
          events: { initAction: successfulInitAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await waitFor(() => {
      expect(successfulInitAction).toHaveBeenCalledTimes(1);
    });
  });

  it('R2.27: initAction rejection triggers reportRuntimeHostIssue with error level', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-init-error', visible: { localValue: 'test' } });
    const initAction = vi.fn(async () => {
      throw new Error('init-exploded');
    });
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      env: { notify: vi.fn(), monitor: undefined },
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    render(
      <FormRenderer
        {...buildProps({
          events: { initAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await vi.waitFor(() => {
      expect(runtime.env.notify).toHaveBeenCalledWith('error', 'Form initAction failed');
    });
  });

  it('R2.27: activationKey guards re-invocation for the same activation instance after successful init', async () => {
    const ownedScope = makeScope({ id: 'owned-key', visible: { localValue: 'test' } });
    const initAction = vi.fn(async () => undefined);
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);

    const { rerender } = render(
      <FormRenderer
        {...buildProps({
          events: { initAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    await waitFor(() => expect(initAction).toHaveBeenCalledTimes(1));

    // rerender with same activationKey (same id/path + empty instancePath) and same initAction ref
    rerender(
      <FormRenderer
        {...buildProps({
          events: { initAction },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    // Give the effect body time to run if it were going to; should stay at 1.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(initAction).toHaveBeenCalledTimes(1);
  });
});
