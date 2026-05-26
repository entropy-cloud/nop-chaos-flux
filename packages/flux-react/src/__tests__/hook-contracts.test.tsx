import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  FormContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  ValidationContext,
} from '../contexts.js';
import {
  useActionDispatcher,
  useCurrentForm,
  useOwnScopeSelector,
  useScopeSelector,
} from '../hooks.js';
import { useRenderFragment } from '../use-render-fragment.js';
import { env } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createTestScope(data: Record<string, unknown> = {}) {
  const listeners = new Set<(change: unknown) => void>();
  let currentData = data;
  return {
    scope: {
      id: 'test-scope',
      path: '$',
      get: (path: string) => (path in currentData ? currentData[path] : undefined),
      has: (path: string) => path in currentData,
      readOwn: () => currentData,
      readVisible: () => currentData,
      materializeVisible: () => currentData,
      value: currentData,
      update: vi.fn(),
      merge: vi.fn(),
      store: {
        subscribe: (listener: (change: unknown) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getSnapshot: () => currentData,
        getLastChange: () => undefined,
        setSnapshot: (snapshot: Record<string, unknown>, change: unknown) => {
          currentData = snapshot;
          for (const l of listeners) l(change);
        },
      },
    } as any,
  };
}

function createTestRuntime() {
  return createRendererRuntime({
    registry: createRendererRegistry([]),
    env,
    expressionCompiler: createFormulaCompiler() as any,
  });
}

function createFullProviderTree(
  runtime: ReturnType<typeof createTestRuntime>,
  scope: any,
  children: React.ReactNode,
  extras?: { form?: any; surfaceRuntime?: any },
) {
  const page = runtime.createPageRuntime({});
  const actionScope = runtime.createActionScope({ id: 'test-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'test-reg' });
  const surfaceRuntime = extras?.surfaceRuntime ?? runtime.createSurfaceRuntime();

  return (
    <RuntimeContext.Provider value={runtime}>
      <ActionScopeContext.Provider value={actionScope}>
        <ComponentRegistryContext.Provider value={componentRegistry}>
          <ScopeContext.Provider value={scope}>
            <PageContext.Provider value={page}>
              <ValidationContext.Provider value={page.validationOwner}>
                <SurfaceContext.Provider value={surfaceRuntime}>
                  {extras?.form ? (
                    <FormContext.Provider value={extras.form}>{children}</FormContext.Provider>
                  ) : (
                    children
                  )}
                </SurfaceContext.Provider>
              </ValidationContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

describe('Hook contracts', () => {
  describe('useScopeSelector', () => {
    it('H1: enabled=false returns fallback without subscribing', () => {
      const { scope } = createTestScope({ count: 42 });
      const subscribeSpy = vi.spyOn(scope.store, 'subscribe');

      function Probe() {
        const value = useScopeSelector(
          (data: { count?: number }) => data.count ?? 0,
          Object.is,
          { enabled: false, fallback: -1 },
        );
        return <span data-testid="value">{String(value)}</span>;
      }

      render(<ScopeContext.Provider value={scope}>{<Probe />}</ScopeContext.Provider>);

      expect(screen.getByTestId('value').textContent).toBe('-1');
      expect(subscribeSpy).not.toHaveBeenCalled();
    });

    it('H2: does not re-render when scope change does not affect selected slice', async () => {
      const { scope } = createTestScope({ a: 1, b: 2 });
      const store = scope.store;
      let renders = 0;

      function Probe() {
        const a = useScopeSelector(
          (data: { a?: number }) => data.a ?? 0,
          Object.is,
          { paths: ['a'] },
        );

        React.useEffect(() => {
          renders += 1;
        });

        return <span data-testid="a">{String(a)}</span>;
      }

      render(<ScopeContext.Provider value={scope}>{<Probe />}</ScopeContext.Provider>);
      expect(screen.getByTestId('a').textContent).toBe('1');
      await waitFor(() => expect(renders).toBe(1));

      act(() => {
        store.setSnapshot({ a: 1, b: 99 }, { paths: ['b'], kind: 'update' });
      });
      await Promise.resolve();
      expect(renders).toBe(1);
      expect(screen.getByTestId('a').textContent).toBe('1');

      act(() => {
        store.setSnapshot({ a: 42, b: 99 }, { paths: ['a'], kind: 'update' });
      });
      await waitFor(() => expect(screen.getByTestId('a').textContent).toBe('42'));
      expect(renders).toBe(2);
    });

    it('H2c: keeps path subscriptions stable when callers pass inline arrays', async () => {
      const { scope } = createTestScope({ watched: 'alpha', ignored: 0 });
      const subscribeSpy = vi.spyOn(scope.store!, 'subscribe');

      function Probe() {
        const [tick, setTick] = React.useState(0);
        const watched = useScopeSelector(
          (data: { watched?: string }) => data.watched ?? '',
          Object.is,
          { paths: ['watched', 'ignored'] },
        );
        return (
          <div>
            <button type="button" onClick={() => setTick((value) => value + 1)}>
              rerender
            </button>
            <span data-testid="inline-paths">{`${watched}:${tick}`}</span>
          </div>
        );
      }

      render(
        <ScopeContext.Provider value={scope}>
          <Probe />
        </ScopeContext.Provider>,
      );

      expect(subscribeSpy).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'rerender' }));

      await waitFor(() => expect(screen.getByTestId('inline-paths').textContent).toBe('alpha:1'));
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
    });

    it('H2d: does not wake deep-path selectors for sibling writes under the same root', async () => {
      const { scope } = createTestScope({ profile: { email: 'a@example.com', name: 'Alice' } });
      let selectorRuns = 0;

      function Probe() {
        const email = useScopeSelector(
          (data: { profile?: { email?: string } }) => {
            selectorRuns += 1;
            return data.profile?.email ?? '';
          },
          Object.is,
          { paths: ['profile.email'] },
        );

        return <span data-testid="deep-email">{email}</span>;
      }

      render(
        <ScopeContext.Provider value={scope}>
          <Probe />
        </ScopeContext.Provider>,
      );

      await waitFor(() => expect(screen.getByTestId('deep-email').textContent).toBe('a@example.com'));
      const initialRuns = selectorRuns;

      act(() => {
        scope.store!.setSnapshot(
          { profile: { email: 'a@example.com', name: 'Bob' } },
          { paths: ['profile.name'], kind: 'update' },
        );
      });

      await Promise.resolve();
      expect(selectorRuns).toBe(initialRuns);
      expect(screen.getByTestId('deep-email').textContent).toBe('a@example.com');
    });

    it('H2b: does not re-render when selector returns referentially equal value', async () => {
      const { scope } = createTestScope({ items: [1, 2, 3], other: 'x' });
      let renders = 0;

      function Probe() {
        const len = useScopeSelector((data: { items?: number[] }) => data.items?.length ?? 0);

        React.useEffect(() => {
          renders += 1;
        });

        return <span data-testid="len">{String(len)}</span>;
      }

      render(<ScopeContext.Provider value={scope}>{<Probe />}</ScopeContext.Provider>);
      expect(screen.getByTestId('len').textContent).toBe('3');
      await waitFor(() => expect(renders).toBe(1));

      act(() => {
        scope.store.setSnapshot({ items: [4, 5, 6], other: 'y' }, { paths: ['*'], kind: 'update' });
      });
      await Promise.resolve();
      expect(renders).toBe(1);
      expect(screen.getByTestId('len').textContent).toBe('3');
    });

    it('H9b: works correctly when selector identity changes each render', async () => {
      const { scope } = createTestScope({ x: 10 });

      function Probe({ multiplier }: { multiplier: number }) {
        const value = useScopeSelector((data: { x?: number }) => (data.x ?? 0) * multiplier);
        return <span data-testid="multiplied">{String(value)}</span>;
      }

      const { rerender } = render(
        <ScopeContext.Provider value={scope}>
          <Probe multiplier={2} />
        </ScopeContext.Provider>,
      );
      expect(screen.getByTestId('multiplied').textContent).toBe('20');

      rerender(
        <ScopeContext.Provider value={scope}>
          <Probe multiplier={3} />
        </ScopeContext.Provider>,
      );
      expect(screen.getByTestId('multiplied').textContent).toBe('30');
    });
  });

  describe('useCurrentForm', () => {
    it('H3: returns nearest form in nested form context', () => {
      const outerForm = { scopeId: 'outer-form' } as any;
      const innerForm = { scopeId: 'inner-form' } as any;

      function Probe() {
        const form = useCurrentForm();

        return <span data-testid="form-id">{((form as any)?.scopeId as string | undefined) ?? 'none'}</span>;
      }

      const { rerender } = render(
        <FormContext.Provider value={outerForm}>
          <Probe />
        </FormContext.Provider>,
      );
      expect(screen.getByTestId('form-id').textContent).toBe('outer-form');

      rerender(
        <FormContext.Provider value={outerForm}>
          <FormContext.Provider value={innerForm}>
            <Probe />
          </FormContext.Provider>
        </FormContext.Provider>,
      );
      expect(screen.getByTestId('form-id').textContent).toBe('inner-form');
    });

    it('H3b: returns outer form after inner form unmounts', () => {
      const outerForm = { scopeId: 'outer' } as any;
      const innerForm = { scopeId: 'inner' } as any;
      let showInner = true;

      function InnerWrapper({ children }: { children: React.ReactNode }) {
        return <FormContext.Provider value={innerForm}>{children}</FormContext.Provider>;
      }

      function Host() {
        return (
          <FormContext.Provider value={outerForm}>
            {showInner ? (
              <InnerWrapper>
                <FormProbe />
              </InnerWrapper>
            ) : (
              <FormProbe />
            )}
          </FormContext.Provider>
        );
      }

      function FormProbe() {
        const form = useCurrentForm();
        return <span data-testid="form-id">{(form as any)?.scopeId ?? 'none'}</span>;
      }

      const { rerender } = render(<Host />);
      expect(screen.getByTestId('form-id').textContent).toBe('inner');

      showInner = false;
      rerender(<Host />);
      expect(screen.getByTestId('form-id').textContent).toBe('outer');
    });

    it('H3c: returns undefined when no form context exists', () => {
      function Probe() {
        const form = useCurrentForm();
        return <span data-testid="form-id">{form === undefined ? 'undefined' : 'has-value'}</span>;
      }

      render(<Probe />);
      expect(screen.getByTestId('form-id').textContent).toBe('undefined');
    });
  });

  describe('provider stability', () => {
    it('H4: returns a stable dispatch reference across re-renders', () => {
      const runtime = createTestRuntime();
      const { scope } = createTestScope();
      const dispatchRefs: unknown[] = [];

      function Probe() {
        const dispatch = useActionDispatcher();
        dispatchRefs.push(dispatch);
        return <span data-testid="dispatch">ok</span>;
      }

      const { rerender } = render(createFullProviderTree(runtime, scope, <Probe />));
      expect(screen.getByTestId('dispatch').textContent).toBe('ok');

      rerender(createFullProviderTree(runtime, scope, <Probe />));

      expect(dispatchRefs.length).toBeGreaterThanOrEqual(2);
      expect(dispatchRefs[0]).toBe(dispatchRefs[dispatchRefs.length - 1]);
    });

    it('H5: returns a stable render function when provider values are stable', () => {
      const runtime = createTestRuntime();
      const page = runtime.createPageRuntime({});
      const { scope } = createTestScope();
      const actionScope = runtime.createActionScope({ id: 'test-action-scope' });
      const componentRegistry = runtime.createComponentHandleRegistry({ id: 'test-reg' });
      const surfaceRuntime = runtime.createSurfaceRuntime();
      const renderRefs: unknown[] = [];

      function Probe() {
        const renderFn = useRenderFragment();
        renderRefs.push(renderFn);
        return <span data-testid="fragment">ok</span>;
      }

      function Host() {
        const [tick, setTick] = React.useState(0);
        return (
          <RuntimeContext.Provider value={runtime}>
            <ActionScopeContext.Provider value={actionScope}>
              <ComponentRegistryContext.Provider value={componentRegistry}>
                <ScopeContext.Provider value={scope}>
                  <PageContext.Provider value={page}>
                    <SurfaceContext.Provider value={surfaceRuntime}>
                      <Probe />
                      <button
                        type="button"
                        data-testid="trigger"
                        onClick={() => setTick((t) => t + 1)}
                      >
                        tick {tick}
                      </button>
                    </SurfaceContext.Provider>
                  </PageContext.Provider>
                </ScopeContext.Provider>
              </ComponentRegistryContext.Provider>
            </ActionScopeContext.Provider>
          </RuntimeContext.Provider>
        );
      }

      render(<Host />);
      expect(screen.getByTestId('fragment').textContent).toBe('ok');
      const firstRef = renderRefs[renderRefs.length - 1];

      fireEvent.click(screen.getByTestId('trigger'));
      expect(renderRefs.length).toBeGreaterThanOrEqual(2);
      expect(renderRefs[renderRefs.length - 1]).toBe(firstRef);
    });

    it('keeps own scope reading independent from parent scope writes', async () => {
      const runtime = createTestRuntime();
      const page = runtime.createPageRuntime({});
      const parentScope = runtime.createChildScope(page.scope, { shared: 'p1' }, { scopeKey: 'parent' });
      const childScope = runtime.createChildScope(parentScope, { own: 'c1' }, { scopeKey: 'child' });

      let renders = 0;

      function Probe() {
        const own = useOwnScopeSelector((data: { own?: string }) => data.own ?? '');

        React.useEffect(() => {
          renders += 1;
        });

        return <span data-testid="own-val">{own}</span>;
      }

      render(<ScopeContext.Provider value={childScope}>{<Probe />}</ScopeContext.Provider>);
      expect(screen.getByTestId('own-val').textContent).toBe('c1');
      await waitFor(() => expect(renders).toBe(1));

      parentScope.store?.setSnapshot({ shared: 'p2' }, { paths: ['shared'], kind: 'update' });
      await Promise.resolve();
      expect(renders).toBe(1);

      childScope.store?.setSnapshot({ own: 'c2' }, { paths: ['own'], kind: 'update' });
      await waitFor(() => expect(screen.getByTestId('own-val').textContent).toBe('c2'));
      expect(renders).toBe(2);
    });
  });
});
