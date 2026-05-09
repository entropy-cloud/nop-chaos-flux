import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '../schema-renderer.js';
import { FormContext, ScopeContext, ValidationContext } from '../contexts.js';
import { useCurrentFormModelGeneration, useOwnScopeSelector, useRenderScope, useScopeSelector } from '../hooks.js';
import { createRendererRuntime } from '../test-support.js';
import {
  createExpressionCompiler,
  createFormulaCompiler,
  env,
  formRenderer,
  nodeIdentityProbeRenderer,
  pageRenderer,
  probeFormSchema,
  probeInputRenderer,
  selectorRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';

describe('createSchemaRenderer scope and reactivity', () => {
  it('exposes template nodes through renderer props and current-node meta hooks', () => {
    const SchemaRenderer = createSchemaRenderer([nodeIdentityProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'node-identity-probe', id: 'identity-node' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(screen.getByTestId('props-template-path').textContent).toBe('$');
  });

  it('supports useScopeSelector with parent scopes that do not expose a store', () => {
    const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={{
          id: 'root',
          path: '$',
          get: (path: string) => (path === 'message' ? 'Scoped hello' : undefined),
          has: (path: string) => path === 'message',
          readOwn: () => ({ message: 'Scoped hello' }),
          readVisible: () => ({ message: 'Scoped hello' }),
          materializeVisible: () => ({ message: 'Scoped hello' }),
          value: { message: 'Scoped hello' },
          update: () => undefined,
          merge: () => {},
        }}
      />,
    );
    expect(screen.getByText('Scoped hello')).toBeTruthy();
    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={{
          id: 'root',
          path: '$',
          get: (path: string) => (path === 'message' ? 'Scoped update' : undefined),
          has: (path: string) => path === 'message',
          readOwn: () => ({ message: 'Scoped update' }),
          readVisible: () => ({ message: 'Scoped update' }),
          materializeVisible: () => ({ message: 'Scoped update' }),
          value: { message: 'Scoped update' },
          update: () => undefined,
          merge: () => {},
        }}
      />,
    );
    expect(screen.getByText('Scoped update')).toBeTruthy();
  });

  it('preserves field state across unrelated host rerenders', () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);
    function Host() {
      const [tick, setTick] = React.useState(0);
      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Rerender host {tick}
          </button>
          <SchemaRenderer
            schemaUrl="test://schema.json"
            schema={probeFormSchema}
            data={{ currentUser: { name: 'Architect' } }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }
    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('rerenders sibling consumers after async scope updates', async () => {
    const asyncPublisherRenderer = {
      type: 'async-scope-publisher',
      component: function AsyncScopePublisher() {
        const scope = useRenderScope();

        React.useEffect(() => {
          void Promise.resolve().then(() => {
            scope.update('user', { name: 'Alice' });
          });
        }, [scope]);

        return null;
      },
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      asyncPublisherRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [{ type: 'async-scope-publisher' }, { type: 'text', text: 'Hello, ${user?.name}' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice')).toBeTruthy();
    });
  });

  it('preserves async scope updates across page refresh ticks', async () => {
    const asyncPublisherRenderer = {
      type: 'async-scope-publisher-with-refresh',
      component: function AsyncScopePublisherWithRefresh(props: any) {
        const scope = useRenderScope();

        React.useEffect(() => {
          props.helpers.dispatch({ action: 'refreshTable' });
          void Promise.resolve().then(() => {
            scope.update('user', { name: 'Alice' });
          });
        }, [props.helpers, scope]);

        return null;
      },
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      asyncPublisherRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'async-scope-publisher-with-refresh' },
            { type: 'text', text: 'Hello, ${user?.name}' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice')).toBeTruthy();
    });
  });

  it('narrows useScopeSelector subscriptions to declared paths', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const scope = runtime.createChildScope(page.scope, { watched: 'alpha', ignored: 0 }, { scopeKey: 'probe' });
    const store = scope.store!;
    let renders = 0;

    function Probe() {
      const watched = useScopeSelector(
        (data: { watched?: string }) => data.watched ?? '',
        Object.is,
        { paths: ['watched'] },
      );
      React.useEffect(() => {
        renders += 1;
      });
      return <span data-testid="watched-value">{watched}</span>;
    }

    render(
      <ScopeContext.Provider value={scope}>
        <Probe />
      </ScopeContext.Provider>,
    );

    expect(screen.getByTestId('watched-value').textContent).toBe('alpha');
    await waitFor(() => expect(renders).toBe(1));

    store.setSnapshot({ watched: 'alpha', ignored: 1 }, { paths: ['ignored'], kind: 'update' });
    await Promise.resolve();
    expect(renders).toBe(1);

    store.setSnapshot({ watched: 'beta', ignored: 1 }, { paths: ['watched'], kind: 'update' });
    await waitFor(() => expect(screen.getByTestId('watched-value').textContent).toBe('beta'));
    expect(renders).toBe(2);
  });

  it('keeps useOwnScopeSelector isolated from parent-scope churn', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const parentScope = runtime.createChildScope(page.scope, { shared: 'parent-a' }, { scopeKey: 'parent' });
    const childScope = runtime.createChildScope(parentScope, { child: 'child-a' }, { scopeKey: 'child' });
    const parentStore = parentScope.store!;
    const childStore = childScope.store!;
    let renders = 0;

    function Probe() {
      const child = useOwnScopeSelector((data: { child?: string }) => data.child ?? '');
      React.useEffect(() => {
        renders += 1;
      });
      return <span data-testid="own-scope-value">{child}</span>;
    }

    render(
      <ScopeContext.Provider value={childScope}>
        <Probe />
      </ScopeContext.Provider>,
    );

    expect(screen.getByTestId('own-scope-value').textContent).toBe('child-a');
    await waitFor(() => expect(renders).toBe(1));

    parentStore.setSnapshot({ shared: 'parent-b' }, { paths: ['shared'], kind: 'update' });
    await Promise.resolve();
    expect(renders).toBe(1);

    childStore.setSnapshot({ child: 'child-b' }, { paths: ['child'], kind: 'update' });
    await waitFor(() => expect(screen.getByTestId('own-scope-value').textContent).toBe('child-b'));
    expect(renders).toBe(2);
  });

  it('subscribes useCurrentFormModelGeneration to the dedicated generation channel', async () => {
    let notifyGeneration: (() => void) | undefined;
    const subscribeToModelGeneration = (listener: () => void) => {
      notifyGeneration = listener;
      return () => {
        notifyGeneration = undefined;
      };
    };
    const form = {
      modelGeneration: 1,
      store: {
        subscribe: () => () => undefined,
      },
      subscribeToModelGeneration,
    } as any;
    let renders = 0;

    function Probe() {
      const generation = useCurrentFormModelGeneration();
      React.useEffect(() => {
        renders += 1;
      });
      return <span data-testid="generation">{String(generation)}</span>;
    }

    render(
      <FormContext.Provider value={form}>
        <Probe />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('generation').textContent).toBe('1');
    await waitFor(() => expect(renders).toBe(1));

    form.modelGeneration = 2;
    notifyGeneration?.();

    await waitFor(() => expect(screen.getByTestId('generation').textContent).toBe('2'));
    expect(renders).toBe(2);
  });

  it('subscribes useCurrentFormModelGeneration to validation owners outside forms', async () => {
    let notifyGeneration: (() => void) | undefined;
    const owner = {
      modelGeneration: 4,
      store: {
        subscribe: () => () => undefined,
      },
      subscribeToModelGeneration(listener: () => void) {
        notifyGeneration = listener;
        return () => {
          notifyGeneration = undefined;
        };
      },
    } as any;

    function Probe() {
      const generation = useCurrentFormModelGeneration();
      return <span data-testid="generation-owner">{String(generation)}</span>;
    }

    render(
      <ValidationContext.Provider value={owner}>
        <Probe />
      </ValidationContext.Provider>,
    );

    expect(screen.getByTestId('generation-owner').textContent).toBe('4');

    owner.modelGeneration = 5;
    notifyGeneration?.();

    await waitFor(() => expect(screen.getByTestId('generation-owner').textContent).toBe('5'));
  });
});
