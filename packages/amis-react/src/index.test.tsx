import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition, RendererEnv, RendererPlugin, ScopeRef } from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/amis-runtime';
import { createSchemaRenderer, useScopeSelector } from './index';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body']
};

function SelectorText() {
  const value = useScopeSelector((scope) => scope.message ?? '');
  return <span>{String(value)}</span>;
}

const selectorRenderer: RendererDefinition = {
  type: 'selector-text',
  component: SelectorText
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button
      type="button"
      onClick={() => {
        const onClick = props.props.onClick;
        if (onClick && typeof onClick === 'object' && 'action' in (onClick as Record<string, unknown>)) {
          void props.helpers.dispatch(onClick as any);
        }
      }}
    >
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  )
};

function createScope(data: Record<string, any>): ScopeRef {
  return {
    id: 'root',
    path: '$',
    value: data,
    read: () => data,
    update: () => undefined
  };
}

describe('createSchemaRenderer', () => {
  it('renders compiled schema in React', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Hello renderer' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Hello renderer')).toBeTruthy();
  });

  it('renders precompiled nodes passed through helpers.render', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const compiledNode = runtime.compile({
      type: 'text',
      text: 'Compiled hello'
    });
    const hostRenderer: RendererDefinition = {
      type: 'host',
      component: (props) => <section>{props.helpers.render(compiledNode as any)}</section>
    };
    const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Compiled hello')).toBeTruthy();
  });

  it('supports useScopeSelector with parent scopes that do not expose a store', () => {
    const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={createScope({ message: 'Scoped hello' })}
      />
    );

    expect(screen.getByText('Scoped hello')).toBeTruthy();

    rerender(
      <SchemaRenderer
        schema={{ type: 'selector-text' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={createScope({ message: 'Scoped update' })}
      />
    );

    expect(screen.getByText('Scoped update')).toBeTruthy();
  });

  it('renders dialog content after dispatching a dialog action', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Inspect record',
                  body: [{ type: 'text', text: 'Dialog hello' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Open dialog'));

    expect(await screen.findByText('Inspect record')).toBeTruthy();
    expect(await screen.findByText('Dialog hello')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Dialog hello')).toBeNull();
    });
  });

  it('supports wrapComponent plugins in the renderer pipeline', () => {
    const wrapped = vi.fn();
    const plugin: RendererPlugin = {
      name: 'wrap-text',
      wrapComponent(definition) {
        if (definition.type !== 'text') {
          return definition;
        }

        return {
          ...definition,
          component: (props) => {
            wrapped(props.meta.label ?? props.props.text);
            return (
              <div>
                <span data-testid="wrapped-prefix">Wrapped</span>
                <definition.component {...props} />
              </div>
            );
          }
        };
      }
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Wrapped hello' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        plugins={[plugin]}
      />
    );

    expect(screen.getByTestId('wrapped-prefix')).toBeTruthy();
    expect(screen.getByText('Wrapped hello')).toBeTruthy();
    expect(wrapped).toHaveBeenCalledWith('Wrapped hello');
  });

  it('emits render monitor callbacks for rendered nodes', async () => {
    const onRenderStart = vi.fn();
    const onRenderEnd = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'text',
          text: 'Monitored render'
        }}
        env={{
          ...env,
          monitor: {
            onRenderStart,
            onRenderEnd
          }
        }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Monitored render')).toBeTruthy();

    await waitFor(() => {
      expect(onRenderStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text'
        })
      );
      expect(onRenderEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          durationMs: expect.any(Number)
        })
      );
    });
  });
});
