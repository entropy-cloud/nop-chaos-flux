import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RendererDefinition, RendererEnv, RendererPlugin, ScopeRef } from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/amis-runtime';
import {
  createSchemaRenderer,
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useAggregateError,
  useChildFieldState,
  useCurrentForm,
  useCurrentFormError,
  useCurrentFormErrors,
  useFieldError,
  useOwnedFieldState,
  useRenderScope,
  useScopeSelector,
  useValidationNodeState
} from './index';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

const sharedFormulaCompiler = createFormulaCompiler();

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

function ProbeInput() {
  const scope = useRenderScope();
  const form = useCurrentForm();
  useOwnedFieldState('email');
  const value = String(scope.get('email') ?? '');

  return (
    <label>
      <span>Email</span>
      <input
        aria-label="Email"
        value={value}
        onChange={(event) => form?.setValue('email', event.target.value)}
      />
    </label>
  );
}

const probeInputRenderer: RendererDefinition = {
  type: 'probe-input',
  component: ProbeInput
};

function PageValueProbe() {
  const scope = useRenderScope();
  return <span data-testid="page-value">{String(scope.get('currentUser.name') ?? '')}</span>;
}

const pageValueProbeRenderer: RendererDefinition = {
  type: 'page-value-probe',
  component: PageValueProbe
};

const probeFormSchema = {
  type: 'form',
  data: {
    email: ''
  },
  body: [
    {
      type: 'probe-input'
    }
  ]
} as const;

const pageWithProbeFormSchema = {
  type: 'page',
  body: [
    {
      type: 'page-value-probe'
    },
    probeFormSchema
  ]
} as const;

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
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }]
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
            schema={probeFormSchema}
            data={{
              currentUser: { name: 'Architect' }
            }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    cleanup();
    const view = render(<Host />);
    const canvas = within(view.container);

    const input = canvas.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a' } });
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');

    fireEvent.click(canvas.getByText('Rerender host 0'));

    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('updates page scope data without recreating the form runtime', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeInputRenderer, pageValueProbeRenderer]);

    function Host() {
      const [name, setName] = React.useState('Architect');

      return (
        <div>
          <button type="button" onClick={() => setName('Operator')}>
            Rename user
          </button>
          <SchemaRenderer
            schema={pageWithProbeFormSchema}
            data={{
              currentUser: { name }
            }}
            env={env}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    cleanup();
    const view = render(<Host />);
    const canvas = within(view.container);

    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
    expect(canvas.getByTestId('page-value').textContent).toBe('Architect');

    fireEvent.click(canvas.getByText('Rename user'));

    expect(canvas.getByTestId('page-value').textContent).toBe('Operator');
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
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

  it('renders schema-based dialog titles through the unified render path', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open compiled dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: { type: 'text', text: 'Compiled dialog title' },
                  body: [{ type: 'text', text: 'Dialog body' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Open compiled dialog'));

    expect(await screen.findByText('Compiled dialog title')).toBeTruthy();
    expect(await screen.findByText('Dialog body')).toBeTruthy();
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

describe('renderer slot helpers', () => {
  it('prefers region content over prop, meta, and fallback values', () => {
    const regionContent = <span>Region title</span>;
    const slotContent = resolveRendererSlotContent(
      {
        props: { title: 'Prop title' },
        meta: { label: 'Meta title' } as any,
        regions: {
          title: {
            key: 'title',
            path: '$.title',
            node: [] as any,
            render: () => regionContent
          }
        }
      },
      'title',
      { metaKey: 'label', fallback: 'Fallback title' }
    );

    expect(slotContent).toBe(regionContent);
  });

  it('falls back from prop to meta and then fallback when slot content is absent', () => {
    const propContent = resolveRendererSlotContent(
      {
        props: { label: 'Prop label' },
        meta: { label: 'Meta label' } as any,
        regions: {}
      },
      'label',
      { metaKey: 'label', fallback: 'Fallback label' }
    );
    const metaContent = resolveRendererSlotContent(
      {
        props: {},
        meta: { label: 'Meta label' } as any,
        regions: {}
      },
      'label',
      { metaKey: 'label', fallback: 'Fallback label' }
    );
    const fallbackContent = resolveRendererSlotContent(
      {
        props: {},
        meta: {} as any,
        regions: {}
      },
      'label',
      { metaKey: 'label', fallback: 'Fallback label' }
    );

    expect(propContent).toBe('Prop label');
    expect(metaContent).toBe('Meta label');
    expect(fallbackContent).toBe('Fallback label');
  });

  it('treats nullish and false slot content as absent but keeps renderable arrays and zero', () => {
    expect(hasRendererSlotContent(undefined)).toBe(false);
    expect(hasRendererSlotContent(null)).toBe(false);
    expect(hasRendererSlotContent(false)).toBe(false);
    expect(hasRendererSlotContent([])).toBe(false);
    expect(hasRendererSlotContent([null, false, undefined])).toBe(false);
    expect(hasRendererSlotContent([null, <span key="value">Value</span>])).toBe(true);
    expect(hasRendererSlotContent(0)).toBe(true);
    expect(hasRendererSlotContent('')).toBe(true);
  });
});
