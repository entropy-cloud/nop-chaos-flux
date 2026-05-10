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
  RuntimeContext,
  ScopeContext,
  ValidationContext,
  PageContext,
  SurfaceContext,
} from '../contexts.js';
import {
  useActionDispatcher,
  useCurrentForm,
  useRenderFragment,
  useRendererRuntime,
  useScopeSelector,
  useOwnScopeSelector,
} from '../hooks.js';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  env,
  formRenderer,
  pageRenderer,
  sharedFormulaCompiler,
  textRenderer,
  buttonRenderer,
} from '../test-support.js';

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
    listeners,
    setData: (newData: Record<string, unknown>, change?: unknown) => {
      currentData = newData;
      for (const l of listeners) {
        if (change) l(change);
        else l({ paths: ['*'], kind: 'update' });
      }
    },
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

describe('Hook contract: useScopeSelector', () => {
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
      // eslint-disable-next-line react-hooks/globals, react-compiler/react-compiler
      renders += 1;
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

  it('H2b: does not re-render when selector returns referentially equal value', async () => {
    const { scope } = createTestScope({ items: [1, 2, 3], other: 'x' });
    let renders = 0;

    function Probe() {
      const len = useScopeSelector((data: { items?: number[] }) => data.items?.length ?? 0);
      // eslint-disable-next-line react-hooks/globals, react-compiler/react-compiler
      renders += 1;
      return <span data-testid="len">{String(len)}</span>;
    }

    render(<ScopeContext.Provider value={scope}>{<Probe />}</ScopeContext.Provider>);
    expect(screen.getByTestId('len').textContent).toBe('3');
    await waitFor(() => expect(renders).toBe(1));

    act(() => {
      scope.store.setSnapshot(
        { items: [4, 5, 6], other: 'y' },
        { paths: ['*'], kind: 'update' },
      );
    });
    await Promise.resolve();
    expect(renders).toBe(1);
    expect(screen.getByTestId('len').textContent).toBe('3');
  });
});

describe('Hook contract: useCurrentForm', () => {
  it('H3: returns nearest form in nested form context', () => {
    const outerForm = { scopeId: 'outer-form' } as any;
    const innerForm = { scopeId: 'inner-form' } as any;
    let captured: string | undefined;

    function Probe() {
      const form = useCurrentForm();
      // eslint-disable-next-line react-hooks/globals, react-compiler/react-compiler
      captured = (form as any)?.scopeId;
      return <span data-testid="form-id">{captured ?? 'none'}</span>;
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

describe('Hook contract: useActionDispatcher stability', () => {
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
});

describe('Hook contract: useRenderFragment stability', () => {
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
});

describe('Surface lifecycle contracts', () => {
  it('H6: closing a dialog removes it from surface store entries', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Test dialog',
                  body: [{ type: 'text', text: 'Dialog content here' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Test dialog')).toBeTruthy();
    expect(screen.getByText('Dialog content here')).toBeTruthy();

    const closeBtn = document.querySelector('[data-slot="dialog-close"]');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Test dialog')).toBeNull();
      expect(screen.queryByText('Dialog content here')).toBeNull();
    });
  });

  it('H6b: opening and closing a dialog does not leak entries in surface store', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Leak test',
                  body: [{ type: 'text', text: 'Leak content' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open dialog'));
    await screen.findByText('Leak content');

    const surfacesBefore = document.querySelectorAll('[data-slot="dialog-surface"]');
    expect(surfacesBefore.length).toBe(1);

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => {
      expect(screen.queryByText('Leak content')).toBeNull();
    });

    const surfacesAfter = document.querySelectorAll('[data-slot="dialog-surface"]');
    expect(surfacesAfter.length).toBe(0);
  });
});

describe('SchemaRenderer re-render contracts', () => {
  it('H7: re-compiles when schema identity changes', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'First schema' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    expect(screen.getByText('First schema')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Second schema' }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    expect(screen.getByText('Second schema')).toBeTruthy();
    expect(screen.queryByText('First schema')).toBeNull();
  });

  it('H10: preserves runtime instance across env identity changes', () => {
    const runtimeIds: string[] = [];

    function RuntimeIdProbe() {
      const rt = useRendererRuntime();
      runtimeIds.push(rt.runtimeId);
      return <span data-testid="runtime-id">{rt.runtimeId}</span>;
    }

    const runtimeProbeRenderer = {
      type: 'runtime-id-probe',
      component: RuntimeIdProbe,
    };

    const SchemaRenderer = createSchemaRenderer([pageRenderer, runtimeProbeRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'runtime-id-probe' }] }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    const firstId = screen.getByTestId('runtime-id').textContent;
    expect(firstId).toBeTruthy();

    const newEnv = { ...env, notify: vi.fn() };
    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'runtime-id-probe' }] }}
        env={newEnv}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    const secondId = screen.getByTestId('runtime-id').textContent;
    expect(secondId).toBe(firstId);
  });
});

describe('Error boundary integration contracts', () => {
  it('H8: NodeErrorBoundary catches renderer errors and recovers when error condition clears', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { NodeErrorBoundary } = await import('../node-error-boundary.js');

    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Transient node error');
      }
      return <span data-testid="recovered-node">Node recovered</span>;
    }

    render(
      <NodeErrorBoundary nodeId="test-node">
        <ConditionalThrower />
      </NodeErrorBoundary>,
    );

    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Transient node error');

    shouldThrow = false;
    const retryBtn = alert?.querySelector('button');
    expect(retryBtn).toBeTruthy();
    fireEvent.click(retryBtn!);

    await waitFor(() => {
      expect(screen.getByTestId('recovered-node')).toBeTruthy();
    });

    consoleSpy.mockRestore();
  });
});

describe('Form owner boundary cleanup', () => {
  it('H9: useCurrentForm returns undefined after owning form unmounts', async () => {
    let capturedFormIds: (string | undefined)[] = [];

    function FormAwareProbe() {
      const form = useCurrentForm();
      capturedFormIds.push((form as any)?.scopeId);
      return <span data-testid="form-aware">{form ? 'in-form' : 'no-form'}</span>;
    }

    const formAwareProbeRenderer = {
      type: 'form-aware-probe',
      component: FormAwareProbe,
    };

    const toggleFormRenderer: import('@nop-chaos/flux-core').RendererDefinition = {
      type: 'toggle-form-host',
      component: function ToggleFormHost(props: any) {
        const [showForm, setShowForm] = React.useState(true);
        return (
          <div>
            <button
              type="button"
              data-testid="toggle-form"
              onClick={() => setShowForm((v: boolean) => !v)}
            >
              {showForm ? 'Hide form' : 'Show form'}
            </button>
            {showForm
              ? (props.regions as any).withForm?.render()
              : (props.regions as any).withoutForm?.render()}
          </div>
        );
      },
      fields: [
        { key: 'withForm', kind: 'region', regionKey: 'withForm' },
        { key: 'withoutForm', kind: 'region', regionKey: 'withoutForm' },
      ],
    };

    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      formAwareProbeRenderer,
      toggleFormRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'toggle-form-host',
              withForm: [
                {
                  type: 'form',
                  body: [{ type: 'form-aware-probe' }],
                },
              ],
              withoutForm: [{ type: 'form-aware-probe' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    expect(screen.getByTestId('form-aware').textContent).toBe('in-form');
    const inFormId = capturedFormIds[capturedFormIds.length - 1];
    expect(inFormId).toBeTruthy();

    capturedFormIds = [];
    fireEvent.click(screen.getByTestId('toggle-form'));
    await waitFor(() => {
      expect(screen.getByTestId('form-aware').textContent).toBe('no-form');
    });
    const afterUnmount = capturedFormIds[capturedFormIds.length - 1];
    expect(afterUnmount).toBeUndefined();
  });
});

describe('useScopeSelector selector identity contract', () => {
  it('H9b: works correctly when selector identity changes each render', async () => {
    const { scope } = createTestScope({ x: 10 });
    let _renderCount = 0;

    function Probe({ multiplier }: { multiplier: number }) {
      const value = useScopeSelector(
        (data: { x?: number }) => (data.x ?? 0) * multiplier,
      );
      // eslint-disable-next-line react-hooks/globals, react-compiler/react-compiler
      _renderCount += 1;
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

describe('useOwnScopeSelector isolation from parent scope', () => {
  it('keeps own scope reading independent from parent scope writes', async () => {
    const runtime = createTestRuntime();
    const page = runtime.createPageRuntime({});
    const parentScope = runtime.createChildScope(page.scope, { shared: 'p1' }, { scopeKey: 'parent' });
    const childScope = runtime.createChildScope(parentScope, { own: 'c1' }, { scopeKey: 'child' });

    let renders = 0;

    function Probe() {
      const own = useOwnScopeSelector((data: { own?: string }) => data.own ?? '');
      // eslint-disable-next-line react-hooks/globals, react-compiler/react-compiler
      renders += 1;
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
