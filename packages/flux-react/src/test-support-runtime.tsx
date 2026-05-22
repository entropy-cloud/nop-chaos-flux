import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Button, Input } from '@nop-chaos/ui';
import type {
  ActionSchema,
  DataSourceSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererHelpers,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
} from './contexts.js';
import {
  useAggregateError,
  useChildFieldState,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentForm,
  useCurrentFormError,
  useCurrentFormErrors,
  useFieldError,
  useOwnedFieldState,
  useRenderScope,
  useRendererRuntime,
  useValidationNodeState,
} from './hooks.js';
import { RenderNodes } from './helpers.js';
import { fragmentScopedProbeFormSchema } from './test-support-core.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function CompositeErrorProbe() {
  const form = useCurrentForm();
  const ownedRootState = useOwnedFieldState('metadata');
  const childState = useChildFieldState('metadata.0.value');
  const nodeState = useValidationNodeState('metadata');
  const rootError = useCurrentFormError({
    path: 'metadata',
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration'],
  });
  const childError = useCurrentFormError({
    path: 'metadata.0.value',
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration'],
  });
  const ownedErrors = useCurrentFormErrors({
    ownerPath: 'metadata',
    sourceKinds: ['runtime-registration'],
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
        return [
          { path: 'metadata', rule: 'required', message: 'Metadata requires at least one entry' },
        ];
      },
      validateChild(path) {
        return [{ path, rule: 'required', message: 'Entry 1 value is required' }];
      },
    }).unregister;
  }, [form]);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => void form?.validateField('metadata')}>
        Validate root
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void form?.validateField('metadata.0.value')}
      >
        Validate child
      </Button>
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

export const compositeProbeRenderer: RendererDefinition = {
  type: 'composite-probe',
  component: CompositeErrorProbe,
};

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <Button variant="ghost" size="sm" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </Button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function PollingSource(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  React.useEffect(() => {
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      compiledSource: compileDataSource(props.id, props.schema, expressionCompiler),
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, props.schema, runtime, scope]);

  return null;
}

export const pollingSourceRenderer: RendererDefinition = {
  type: 'polling-source',
  component: PollingSource as RendererDefinition['component'],
};

export const cidProbeRenderer: RendererDefinition = {
  type: 'cid-probe',
  component: (props) => (
    <span data-testid="cid-root" data-cid={props.meta.cid || undefined}>
      {String(props.props.text ?? 'cid probe')}
    </span>
  ),
};

export const wrapProbeRenderer: RendererDefinition = {
  type: 'wrap-probe',
  wrap: true,
  frameRootTag: 'div',
  component: (props) => (
    <Input
      aria-label={String(props.props.label ?? 'Wrap probe')}
      data-testid="wrap-probe-input"
      defaultValue={String(props.props.value ?? '')}
    />
  ),
};

function FragmentRenderHost(props: RendererComponentProps) {
  const [tick, setTick] = React.useState(0);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setTick((current) => current + 1)}>
        Refresh fragment {tick}
      </Button>
      {asReactNode(
        props.helpers.render(fragmentScopedProbeFormSchema, {
          bindings: {
            currentUser: {
              role: 'architect',
            },
          },
          pathSuffix: 'fragment',
        }),
      )}
    </div>
  );
}

function FragmentScopeProbeHost(props: RendererComponentProps) {
  const [tick, setTick] = React.useState(0);
  const childValue = tick === 0 ? 'child-a' : 'child-b';

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setTick((current) => current + 1)}>
        Refresh fragment {tick}
      </Button>
      {asReactNode(
        props.helpers.render(props.regions.body?.templateNode, {
          bindings: {
            child: childValue,
          },
          pathSuffix: 'fragment',
        }),
      )}
    </div>
  );
}

export const fragmentRenderHostRenderer: RendererDefinition = {
  type: 'fragment-render-host',
  component: FragmentRenderHost,
};

export const fragmentScopeProbeHostRenderer: RendererDefinition = {
  type: 'fragment-scope-probe-host',
  component: FragmentScopeProbeHost,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const scopedHostRenderer: RendererDefinition = {
  type: 'scoped-host',
  component: (props) => <section>{asReactNode(props.regions.body?.render())}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
  actionScopePolicy: 'new',
  componentRegistryPolicy: 'new',
};

function NamespaceProvider(props: RendererComponentProps) {
  const actionScope = useCurrentActionScope();
  const namespace = String(props.props.namespace ?? 'demo');
  const label = String(props.props.label ?? 'provider');

  React.useEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace(namespace, {
      kind: 'host',
      invoke(method, payload) {
        return {
          ok: true,
          data: `${label}:${method}:${String(payload?.value ?? '')}`,
        };
      },
    });
  }, [actionScope, namespace, label]);

  return <span data-testid={`namespace-scope-${label}`}>{actionScope?.id ?? ''}</span>;
}

export const namespaceProviderRenderer: RendererDefinition = {
  type: 'namespace-provider',
  component: NamespaceProvider,
};

function ComponentHandleProvider(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const componentName = String(props.props.componentName ?? 'shared');
  const label = String(props.props.label ?? 'handle');

  React.useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    return componentRegistry.register({
      name: componentName,
      type: 'probe',
      capabilities: {
        hasMethod(method) {
          return method === 'ping';
        },
        invoke(method, payload) {
          return {
            ok: true,
            data: `${label}:${method}:${String(payload?.value ?? '')}`,
          };
        },
      },
    });
  }, [componentRegistry, componentName, label]);

  return (
    <span data-testid={`component-registry-scope-${label}`}>{componentRegistry?.id ?? ''}</span>
  );
}

export const componentHandleProviderRenderer: RendererDefinition = {
  type: 'component-handle-provider',
  component: ComponentHandleProvider,
};

function DispatchProbe(props: RendererComponentProps) {
  const [resultText, setResultText] = React.useState('');

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          const result = await props.helpers.dispatch(
            props.props.runAction as ActionSchema | ActionSchema[],
          );
          setResultText(result.ok ? String(result.data ?? '') : String(result.error ?? ''));
        }}
      >
        {String(props.props.label ?? 'Run dispatch')}
      </Button>
      <span data-testid={String(props.props.resultKey ?? 'dispatch-result')}>{resultText}</span>
    </div>
  );
}

export const dispatchProbeRenderer: RendererDefinition = {
  type: 'dispatch-probe',
  component: DispatchProbe,
};

function ToggleHost(props: RendererComponentProps) {
  const [visible, setVisible] = React.useState(true);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setVisible((current) => !current)}>
        {visible ? 'Hide child boundary' : 'Show child boundary'}
      </Button>
      {visible ? asReactNode(props.regions.body?.render()) : null}
    </div>
  );
}

export const toggleHostRenderer: RendererDefinition = {
  type: 'toggle-host',
  component: ToggleHost,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export function createDispatchCaptureRenderer(
  onCapture: (dispatch: RendererHelpers['dispatch']) => void,
): RendererDefinition {
  function DispatchCapture(props: RendererComponentProps) {
    React.useEffect(() => {
      onCapture(props.helpers.dispatch);
    }, [props.helpers.dispatch]);

    return null;
  }

  return {
    type: 'dispatch-capture',
    component: DispatchCapture,
  };
}

export function createScope(data: Record<string, any>): ScopeRef {
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
    readVisible: () => data,
    materializeVisible: () => data,
    value: data,
    update: () => undefined,
    merge: () => {},
  };
}

export function renderWithRuntimeProviders(input: {
  runtime: ReturnType<typeof createRendererRuntime>;
  page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>;
  surfaceRuntime?: ReturnType<ReturnType<typeof createRendererRuntime>['createSurfaceRuntime']>;
  schema: Record<string, unknown>;
  strictValidation?: boolean;
}): RenderResult {
  const actionScope = input.runtime.createActionScope({ id: 'test-action-scope' });
  const componentRegistry = input.runtime.createComponentHandleRegistry({
    id: 'test-component-registry',
  });
  const surfaceRuntime = input.surfaceRuntime ?? input.runtime.createSurfaceRuntime();

  return render(
    <RuntimeContext.Provider value={input.runtime}>
      <ActionScopeContext.Provider value={actionScope}>
        <ComponentRegistryContext.Provider value={componentRegistry}>
          <ScopeContext.Provider value={input.page.scope}>
            <PageContext.Provider value={input.page}>
              <SurfaceContext.Provider value={surfaceRuntime}>
                <RenderNodes
                  input={input.schema as any}
                  options={{ actionScope, componentRegistry }}
                />
              </SurfaceContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>,
  );
}
