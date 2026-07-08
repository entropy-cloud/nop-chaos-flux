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
});
