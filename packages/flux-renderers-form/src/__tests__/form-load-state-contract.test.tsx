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
  Spinner: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'spinner', ...props }),
}));

import { FormRenderer } from '../renderers/form.js';

/**
 * 表单加载态 DOM 契约测试（plan 593 C1）
 *
 * 目的：冻结 `section.nop-form` 根上的 `data-load-state` 属性语义，作为下游
 * （nop-chaos-next e2e-shared 确定性等待）依赖的稳定接口真相。
 * E2E 等待模式：`waitFor(() => expect(root).toHaveAttribute('data-load-state', 'loaded'))`
 * 取代 networkidle 盲等与 input 值轮询。
 *
 * 契约（生产常驻）：
 *  - data-load-state="idle"    → 无 loadAction，或 autoLoad=false，或 load 被取消
 *  - data-load-state="loading" → load 请求在途（autoLoad 首帧即真值，无缺席窗口）
 *  - data-load-state="loaded"  → load 成功 settle（与回填 commit 同边界）
 *  - data-load-state="error"   → load 非 abort 失败
 *
 * 配套文档：`docs/architecture/renderer-markers-and-selectors.md`（Phase 5 登记）。
 */

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

function makeOwnedForm() {
  const setValues = vi.fn();
  const ownedScope = makeScope({ id: 'owned', visible: {} });
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

function formRoot(): Element | null {
  return document.querySelector('.nop-form');
}

function renderAutoLoadForm(dispatch: ReturnType<typeof vi.fn>) {
  const parentScope = makeScope({ id: 'parent', visible: {} });
  const ownedForm = makeOwnedForm();
  const runtime = makeRuntime(ownedForm);
  setupMocks(runtime, parentScope);

  render(
    <FormRenderer
      {...buildProps({
        props: { name: 'profile', autoLoad: true },
        events: { loadAction: dispatch },
      })}
    />,
  );
  return { ownedForm, runtime };
}

describe('form data-load-state DOM contract (plan 593 C1)', () => {
  it('autoLoad in-flight: .nop-form exposes data-load-state=loading (first-frame-honest)', async () => {
    const pending = deferred<any>();
    const dispatch = vi.fn(() => pending.promise);
    renderAutoLoadForm(dispatch);

    // First committed frame reports loading — pins the observable contract that
    // no idle frame precedes the load. Caveat (plan 593 closure audit F3): RTL's
    // render() flushes passive effects inside act, so this assertion alone does
    // NOT discriminate lazy-init from a synchronous effect-time setState; the
    // first-frame-honest property (lazy initializer in form-load-action.ts) is
    // verified by source reading. It still catches async/deferred setState.
    expect(formRoot()?.getAttribute('data-load-state')).toBe('loading');

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    // While the request is still in flight the root MUST still report loading —
    // this is the first-frame-honest contract that kills the old busy-absent window.
    expect(formRoot()?.getAttribute('data-load-state')).toBe('loading');
  });

  it('autoLoad success: transitions to loaded and hydrates values on the same boundary', async () => {
    const pending = deferred<any>();
    const dispatch = vi.fn(() => pending.promise);
    const { ownedForm } = renderAutoLoadForm(dispatch);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
    expect(formRoot()?.getAttribute('data-load-state')).toBe('loading');

    pending.resolve({ ok: true, cancelled: false, data: { name: 'Alice' } });

    await waitFor(() => {
      expect(formRoot()?.getAttribute('data-load-state')).toBe('loaded');
    });
    expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('autoLoad non-abort failure: transitions to error', async () => {
    const pending = deferred<any>();
    const dispatch = vi.fn(() => pending.promise);
    const { runtime } = renderAutoLoadForm(dispatch);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    pending.reject(new Error('network down'));

    await waitFor(() => {
      expect(formRoot()?.getAttribute('data-load-state')).toBe('error');
    });
    expect(runtime.env.notify).toHaveBeenCalledWith('error', 'Form loadAction failed');
  });

  it('no loadAction: exposes data-load-state=idle', async () => {
    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    render(<FormRenderer {...buildProps({ props: { name: 'profile' } })} />);

    await waitFor(() => {
      expect(formRoot()?.getAttribute('data-load-state')).toBe('idle');
    });
  });

  it('autoLoad=false with loadAction: stays idle and never dispatches', async () => {
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
      expect(formRoot()?.getAttribute('data-load-state')).toBe('idle');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('activationKey change re-enters loading then loaded on the same state machine', async () => {
    const first = deferred<any>();
    const second = deferred<any>();
    const dispatch = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const parentScope = makeScope({ id: 'parent', visible: {} });
    const ownedForm = makeOwnedForm();
    const runtime = makeRuntime(ownedForm);
    setupMocks(runtime, parentScope);

    const props = buildProps({
      props: { name: 'profile', autoLoad: true },
      events: { loadAction: dispatch },
    });

    const { rerender } = render(<FormRenderer {...props} />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
    expect(formRoot()?.getAttribute('data-load-state')).toBe('loading');

    first.resolve({ ok: true, cancelled: false, data: { name: 'First' } });
    await waitFor(() => {
      expect(formRoot()?.getAttribute('data-load-state')).toBe('loaded');
    });

    // activationKey derives from `props.id:props.path` when instancePath is empty —
    // bumping the id simulates an activation change (e.g. dialog re-open).
    rerender(<FormRenderer {...props} id="rendered-form-2" />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });
    expect(formRoot()?.getAttribute('data-load-state')).toBe('loading');

    second.resolve({ ok: true, cancelled: false, data: { name: 'Second' } });
    await waitFor(() => {
      expect(formRoot()?.getAttribute('data-load-state')).toBe('loaded');
    });
    expect(ownedForm.setValues).toHaveBeenCalledWith({ name: 'Second' });
  });
});
