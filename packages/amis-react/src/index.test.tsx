import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition, RendererEnv, RendererPlugin, ScopeRef } from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/amis-runtime';
import { createSchemaRenderer, useAggregateError, useChildFieldState, useCurrentForm, useCurrentFormError, useCurrentFormErrors, useFieldError, useOwnedFieldState, useScopeSelector, useValidationNodeState } from './index';

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

const formRenderer: RendererDefinition = {
  type: 'form',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body'],
  scopePolicy: 'form',
  validation: {
    kind: 'container'
  }
};

function SelectorText() {
  const value = useScopeSelector((scope) => scope.message ?? '');
  return <span>{String(value)}</span>;
}

const selectorRenderer: RendererDefinition = {
  type: 'selector-text',
  component: SelectorText
};

function CompositeErrorProbe() {
  const form = useCurrentForm();
  const ownedRootState = useOwnedFieldState('metadata');
  const childState = useChildFieldState('metadata.0.value');
  const nodeState = useValidationNodeState('metadata');
  const rootError = useCurrentFormError({
    path: 'metadata',
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration']
  });
  const childError = useCurrentFormError({
    path: 'metadata.0.value',
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration']
  });
  const ownedErrors = useCurrentFormErrors({
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration']
  });
  const aggregateError = useAggregateError('metadata');
  const fieldError = useFieldError('metadata.0.value');

  React.useEffect(() => {
    if (!form) {
      return;
    }

    return form.registerField({
      path: 'metadata',
      childPaths: ['metadata.0.value'],
      getValue() {
        return [];
      },
      validate() {
        return [{ path: 'metadata', rule: 'required', message: 'Metadata requires at least one entry' }];
      },
      validateChild(path) {
        return [{ path, rule: 'required', message: 'Entry 1 value is required' }];
      }
    });
  }, [form]);

  return (
    <div>
      <button type="button" onClick={() => void form?.validateField('metadata')}>
        Validate root
      </button>
      <button type="button" onClick={() => void form?.validateField('metadata.0.value')}>
        Validate child
      </button>
      <span data-testid="root-error">{rootError?.message ?? ''}</span>
      <span data-testid="child-error">{childError?.message ?? ''}</span>
      <span data-testid="owned-count">{String(ownedErrors.length)}</span>
      <span data-testid="owned-root-error">{ownedRootState.error?.message ?? ''}</span>
      <span data-testid="child-state-error">{childState.error?.message ?? ''}</span>
      <span data-testid="node-state-error">{nodeState.error?.message ?? ''}</span>
      <span data-testid="aggregate-error">{aggregateError?.message ?? ''}</span>
      <span data-testid="field-error">{fieldError?.message ?? ''}</span>
    </div>
  );
}

const compositeProbeRenderer: RendererDefinition = {
  type: 'composite-probe',
  component: CompositeErrorProbe
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
    get(path: string) {
      return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') {
          return undefined;
        }

        return (current as Record<string, unknown>)[segment];
      }, data);
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn: () => data,
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

  it('projects form errors by owner path and source kind', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, compositeProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          body: [{ type: 'composite-probe' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Validate root'));
    fireEvent.click(screen.getByText('Validate child'));

    await waitFor(() => {
      expect(screen.getByTestId('root-error').textContent).toBe('Metadata requires at least one entry');
      expect(screen.getByTestId('child-error').textContent).toBe('Entry 1 value is required');
      expect(screen.getByTestId('owned-count').textContent).toBe('2');
      expect(screen.getByTestId('owned-root-error').textContent).toBe('Metadata requires at least one entry');
      expect(screen.getByTestId('child-state-error').textContent).toBe('Entry 1 value is required');
      expect(screen.getByTestId('node-state-error').textContent).toBe('Metadata requires at least one entry');
      expect(screen.getByTestId('aggregate-error').textContent).toBe('Metadata requires at least one entry');
      expect(screen.getByTestId('field-error').textContent).toBe('Entry 1 value is required');
    });
  });
});
