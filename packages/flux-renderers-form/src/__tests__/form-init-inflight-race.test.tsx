import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCurrentActionScope: vi.fn(),
  useCurrentComponentRegistry: vi.fn(),
  useCurrentPage: vi.fn(),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeScope(options: { id: string; visible?: Record<string, unknown> }) {
  const visible = options.visible ?? {};

  return {
    id: options.id,
    path: `$${options.id}`,
    parent: undefined,
    store: {
      subscribe: () => () => undefined,
      getSnapshot: () => visible,
    },
    get(path: string) {
      return visible[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(visible, path);
    },
    readOwn() {
      return visible;
    },
    readVisible() {
      return visible;
    },
    materializeVisible() {
      return { ...visible };
    },
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
  } as any;
}

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rendered-form',
    path: '$.body[0]',
    props: { name: 'profile' },
    schema: { type: 'form' },
    meta: { className: 'form-extra', testid: 'form-test', cid: 'cid-1' },
    events: {},
    helpers: {},
    regions: {},
    templateNode: {
      schemaUrl: 'schema://profile',
      validationPlan: undefined,
      importsPlan: { preparedImports: [] },
    },
    // Empty instancePath ⇒ activationKey = `${id}:${path}`, stable across rerenders.
    node: { instancePath: [] },
    ...overrides,
  } as any;
}

function makeAbortablePendingInit(): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_value: unknown, options?: { signal?: AbortSignal }) =>
      new Promise<void>((_resolve, reject) => {
        const signal = options?.signal;
        if (!signal) {
          return;
        }
        if (signal.aborted) {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          return;
        }
        signal.addEventListener(
          'abort',
          () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          { once: true },
        );
      }),
  );
}

describe('FormRenderer init dep-change-during-in-flight (F5): in-flight guard cleanup', () => {
  it('form-dep-change-during-init: re-invokes initAction for the same activationKey when a non-activation dep changes mid-init', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-init', visible: { localValue: 'plain-owned' } });
    // initAction #1: stays in-flight (never resolves) until its signal aborts.
    const initActionOne = makeAbortablePendingInit();
    // initAction #2: resolves cleanly.
    const initActionTwo = vi.fn(async () => undefined);
    const ownedForm = {
      scope: ownedScope,
      store: {
        getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }),
        subscribe: () => () => undefined,
        subscribeToSubmitting: () => () => undefined,
      },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
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

    const { rerender } = render(<FormRenderer {...buildProps({ events: { initAction: initActionOne } })} />);

    // initAction #1 is in flight for the stable activationKey.
    await waitFor(() => {
      expect(initActionOne).toHaveBeenCalledTimes(1);
    });

    // While init is still in-flight, change ONLY a non-activation dep (initAction identity).
    // The effect tears down (cleanup aborts the in-flight controller) and re-runs.
    // The in-flight guard ref must not strand the new effect body into bailing for the
    // same activationKey, otherwise initAction #2 is never invoked.
    rerender(<FormRenderer {...buildProps({ events: { initAction: initActionTwo } })} />);

    await waitFor(() => {
      expect(initActionTwo).toHaveBeenCalledTimes(1);
    });

    // The aborted initAction #1 must have observed its signal aborting.
    const firstCall = initActionOne.mock.calls[0];
    expect((firstCall?.[1] as { signal?: AbortSignal } | undefined)?.signal?.aborted).toBe(true);
  });

  it('form-dep-change-during-init-twice: two back-to-back mid-init dep changes each re-invoke init without stranding', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-init-2', visible: { localValue: 'plain-owned' } });
    const initActionOne = makeAbortablePendingInit();
    const initActionTwo = makeAbortablePendingInit();
    const initActionThree = vi.fn(async () => undefined);
    const ownedForm = {
      scope: ownedScope,
      store: {
        getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }),
        subscribe: () => () => undefined,
        subscribeToSubmitting: () => () => undefined,
      },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
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

    const { rerender } = render(<FormRenderer {...buildProps({ events: { initAction: initActionOne } })} />);
    await waitFor(() => expect(initActionOne).toHaveBeenCalledTimes(1));

    rerender(<FormRenderer {...buildProps({ events: { initAction: initActionTwo } })} />);
    await waitFor(() => expect(initActionTwo).toHaveBeenCalledTimes(1));

    rerender(<FormRenderer {...buildProps({ events: { initAction: initActionThree } })} />);
    await waitFor(() => expect(initActionThree).toHaveBeenCalledTimes(1));
  });
});
