import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useRenderScope } from '../hooks.js';
import {
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
});
