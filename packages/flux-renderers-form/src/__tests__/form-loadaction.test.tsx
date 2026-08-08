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

const FORM_AUTOLOAD_PROPS = { name: 'profile', autoLoad: true };

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
    node: { instancePath: [] },
    ...overrides,
  } as any;
}

function makeRuntime(ownedForm: any) {
  return {
    env: { notify: vi.fn(), monitor: undefined },
    getImportedExpressionBindings: vi.fn(() => ({})),
    createFormRuntime: vi.fn(() => ownedForm),
  } as any;
}

function makeOwnedForm(scopeOverride?: any) {
  const setValues = vi.fn();
  const ownedScope = scopeOverride ?? makeScope({ id: 'owned', visible: {} });
  return {
    scope: ownedScope,
    store: {
      getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }),
      subscribe: () => () => undefined,
      subscribeToSubmitting: () => () => undefined,
    },
    dispose: vi.fn(),
    setLifecycleHandlers: vi.fn(),
    setRefreshHandler: vi.fn(),
    setValues,
    submit: vi.fn(async () => ({ ok: true })),
  } as any;
}

function setupMocks(runtime: any, parentScope: any) {
  mocks.useRendererRuntime.mockReturnValue(runtime);
  mocks.useCurrentActionScope.mockReturnValue(undefined);
  mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
  mocks.useCurrentPage.mockReturnValue(undefined);
  mocks.useRenderScope.mockReturnValue(parentScope);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('FormRenderer loadAction', () => {
  it('dispatches loadAction on mount and populates form via setValues with flat result', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn().mockResolvedValue({
      ok: true,
      cancelled: false,
      data: { name: 'Bob', role: 'admin' },
    });

    render(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: dispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Bob', role: 'admin' });
    });
  });

  it('does not dispatch loadAction when autoLoad is false', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn();

    render(
      <FormRenderer
        {...buildProps({
          props: { name: 'profile', autoLoad: false },
          events: { loadAction: dispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  it('does not dispatch loadAction when loadAction is not set', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn();

    render(
      <FormRenderer
        {...buildProps({
          props: { name: 'profile' },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  it('does not call setValues when loadAction result is not ok', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn().mockResolvedValue({
      ok: false,
      cancelled: false,
      error: new Error('network'),
    });

    render(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: dispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(ownedForm.setValues).not.toHaveBeenCalled();
    });
  });

  it('does not call setValues when loadAction is cancelled', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn().mockResolvedValue({
      ok: true,
      cancelled: true,
    });

    render(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: dispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(ownedForm.setValues).not.toHaveBeenCalled();
    });
  });

  it('restarts autoLoad when React StrictMode replays the effect (setup -> cleanup -> setup)', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const dispatch = vi.fn().mockResolvedValue({
      ok: true,
      cancelled: false,
      data: { name: 'Bob', role: 'admin' },
    });

    render(
      <React.StrictMode>
        <FormRenderer
          {...buildProps({
            props: { ...FORM_AUTOLOAD_PROPS },
            events: { loadAction: dispatch },
          })}
        />
      </React.StrictMode>,
    );

    // The first (aborted) effect run must not strand the activation key: the
    // replayed setup must restart autoLoad instead of silently dropping it.
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Bob', role: 'admin' });
    });
  });

  it('re-initiates autoLoad for the same activation after a non-abort failure', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const failingDispatch = vi.fn().mockRejectedValue(new Error('network'));
    const { rerender } = render(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: failingDispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(failingDispatch).toHaveBeenCalledTimes(1);
    });

    // P3-1: loadAction failures surface their own message instead of reusing
    // the initAction wording ("Form initAction failed").
    expect(runtime.env.notify).toHaveBeenCalledWith('error', 'Form loadAction failed');

    // A dependency flip (new loadAction identity, same activation key) re-runs
    // the effect; a failed autoLoad must be retryable, not permanently disabled.
    const retryDispatch = vi.fn().mockResolvedValue({
      ok: true,
      cancelled: false,
      data: { name: 'Retry', role: 'user' },
    });

    rerender(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: retryDispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(retryDispatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Retry', role: 'user' });
    });
  });

  it('does not let a stale autoLoad response overwrite refresh data', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const staleRequest = deferred<any>();
    const refreshRequest = deferred<any>();
    const dispatch = vi
      .fn()
      .mockImplementationOnce(() => staleRequest.promise)
      .mockImplementationOnce(() => refreshRequest.promise);

    render(
      <FormRenderer
        {...buildProps({
          props: { ...FORM_AUTOLOAD_PROPS },
          events: { loadAction: dispatch },
        })}
      />,
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    const refreshHandler = ownedForm.setRefreshHandler.mock.calls[0][0];
    const refreshPromise = refreshHandler();
    refreshRequest.resolve({ ok: true, cancelled: false, data: { name: 'Fresh' } });
    await refreshPromise;
    expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Fresh' });

    // The slow autoLoad response must be dropped once refresh superseded it.
    // Flush the microtask queue so the stale `.then` has definitely run before
    // asserting (waitFor's first check runs synchronously and would pass
    // before the stale resolution is processed).
    staleRequest.resolve({ ok: true, cancelled: false, data: { name: 'Stale' } });
    await Promise.resolve();
    await Promise.resolve();
    expect(ownedForm.setValues).toHaveBeenCalledTimes(1);
    expect(ownedForm.setValues).not.toHaveBeenCalledWith({ name: 'Stale' });
  });
});
