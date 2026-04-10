import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type {
  DataSourceSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
  RendererHelpers,
  RendererPlugin,
  ScopeRef
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  FormContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  useAggregateError,
  useChildFieldState,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentForm,
  useCurrentFormError,
  useCurrentFormErrors,
  useCurrentNodeMeta,
  useFieldError,
  useOwnedFieldState,
  useOwnScopeSelector,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
  useValidationNodeState
} from './index';
import { RenderNodes } from './helpers';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

export const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

export const sharedFormulaCompiler = createFormulaCompiler();

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
  fields: [{ key: 'text', kind: 'prop', allowSource: true }]
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.instantiate()}</section>,
  regions: ['body']
};

function FormStub(props: RendererComponentProps) {
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const formId = typeof (props.props as Record<string, unknown>).id === 'string'
    ? (props.props as Record<string, unknown>).id as string
    : props.id;
  const initialValues = (props.props as Record<string, unknown>).data &&
    typeof (props.props as Record<string, unknown>).data === 'object'
    ? (props.props as Record<string, unknown>).data as Record<string, unknown>
    : undefined;
  const ownedForm = React.useMemo(
    () => runtime.createFormRuntime({
      id: formId,
      initialValues,
      parentScope,
      validation: props.templateNode.validationPlan
    }),
    [runtime, formId, initialValues, parentScope, props.templateNode.validationPlan]
  );

  return (
    <FormContext.Provider value={ownedForm}>
      <ScopeContext.Provider value={ownedForm.scope}>
        <section>{props.regions.body?.instantiate()}</section>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

export const formRenderer: RendererDefinition = {
  type: 'form',
  component: FormStub,
  regions: ['body'],
  scopePolicy: 'form',
  componentRegistryPolicy: 'new',
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

export const probeInputRenderer: RendererDefinition = {
  type: 'probe-input',
  component: ProbeInput
};

function ProbeButton() {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const value = String(scope.get('query') ?? '');

  return (
    <div>
      <input
        aria-label="Query"
        value={value}
        onChange={(event) => {
          if (form) {
            form.touchField('query');
            form.setValue('query', event.target.value);
          }
        }}
      />
    </div>
  );
}

export const probeButtonRenderer: RendererDefinition = {
  type: 'probe-button',
  component: (props) => (
    <button disabled={props.meta.disabled} aria-label="Search">
      Search
    </button>
  )
};

export const probeQueryInputRenderer: RendererDefinition = {
  type: 'probe-query-input',
  component: ProbeButton
};

function PageValueProbe() {
  const name = useScopeSelector((data: { currentUser?: { name?: string } }) => data.currentUser?.name ?? '');
  return <span data-testid="page-value">{name}</span>;
}

export const pageValueProbeRenderer: RendererDefinition = {
  type: 'page-value-probe',
  component: PageValueProbe
};

export const probeFormSchema = {
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

export const pageWithProbeFormSchema = {
  type: 'page',
  body: [
    {
      type: 'page-value-probe'
    },
    probeFormSchema
  ]
} as const;

export const fragmentScopedProbeFormSchema = {
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

function SelectorText() {
  const value = useScopeSelector((scope) => scope.message ?? '');
  return <span>{String(value)}</span>;
}

function ScopeLayerProbe() {
  const lexicalValue = useScopeSelector((scope: { shared?: string }) => scope.shared ?? '');
  const ownValue = useOwnScopeSelector((scope: { shared?: string }) => scope.shared ?? '');

  return (
    <div>
      <span data-testid="lexical-value">{lexicalValue}</span>
      <span data-testid="own-value">{ownValue}</span>
    </div>
  );
}

function OwnScopeValueProbe() {
  const childValue = useOwnScopeSelector((scope: { child?: string }) => scope.child ?? '');
  return <span data-testid="own-child-value">{childValue}</span>;
}

function ActionScopeProbe() {
  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();

  return (
    <div>
      <span data-testid="action-scope-id">{actionScope?.id ?? ''}</span>
      <span data-testid="component-registry-id">{componentRegistry?.id ?? ''}</span>
    </div>
  );
}

export const selectorRenderer: RendererDefinition = {
  type: 'selector-text',
  component: SelectorText
};

function NodeIdentityProbe(props: RendererComponentProps) {
  const nodeMeta = useCurrentNodeMeta();

  return (
    <div>
      <span data-testid="props-template-path">{props.templateNode.templatePath}</span>
      <span data-testid="meta-template-path">{nodeMeta.templateNode.templatePath}</span>
    </div>
  );
}

export const nodeIdentityProbeRenderer: RendererDefinition = {
  type: 'node-identity-probe',
  component: NodeIdentityProbe
};

export const scopeLayerProbeRenderer: RendererDefinition = {
  type: 'scope-layer-probe',
  component: ScopeLayerProbe
};

export const ownScopeValueProbeRenderer: RendererDefinition = {
  type: 'own-scope-value-probe',
  component: OwnScopeValueProbe
};

export const actionScopeProbeRenderer: RendererDefinition = {
  type: 'action-scope-probe',
  component: ActionScopeProbe
};

export const countingTextRenderer: RendererDefinition = {
  type: 'counting-text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>
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

export const compositeProbeRenderer: RendererDefinition = {
  type: 'composite-probe',
  component: CompositeErrorProbe
};

export const buttonRenderer: RendererDefinition = {
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

function PollingSource(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  React.useEffect(() => {
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      schema: props.schema
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, props.schema, runtime, scope]);

  return null;
}

export const pollingSourceRenderer: RendererDefinition = {
  type: 'polling-source',
  component: PollingSource
};

export const cidProbeRenderer: RendererDefinition = {
  type: 'cid-probe',
  component: (props) => (
    <span data-testid="cid-root" data-cid={props.meta.cid || undefined}>
      {String(props.props.text ?? 'cid probe')}
    </span>
  )
};

export const wrapProbeRenderer: RendererDefinition = {
  type: 'wrap-probe',
  wrap: true,
  component: (props) => (
    <input
      aria-label={String(props.meta.label ?? props.props.label ?? 'Wrap probe')}
      data-testid="wrap-probe-input"
      defaultValue={String(props.props.value ?? '')}
    />
  )
};

function FragmentRenderHost(props: RendererComponentProps) {
  const [tick, setTick] = React.useState(0);

  return (
    <div>
      <button type="button" onClick={() => setTick((current) => current + 1)}>
        Refresh fragment {tick}
      </button>
      {props.helpers.render(fragmentScopedProbeFormSchema, {
        data: {
          currentUser: {
            role: 'architect'
          }
        },
        pathSuffix: 'fragment'
      })}
    </div>
  );
}

function FragmentScopeProbeHost(props: RendererComponentProps) {
  const [tick, setTick] = React.useState(0);
  const childValue = tick === 0 ? 'child-a' : 'child-b';

  return (
    <div>
      <button type="button" onClick={() => setTick((current) => current + 1)}>
        Refresh fragment {tick}
      </button>
      {props.helpers.render(props.regions.body?.templateNode as any, {
        data: {
          child: childValue
        },
        pathSuffix: 'fragment'
      })}
    </div>
  );
}

export const fragmentRenderHostRenderer: RendererDefinition = {
  type: 'fragment-render-host',
  component: FragmentRenderHost
};

export const fragmentScopeProbeHostRenderer: RendererDefinition = {
  type: 'fragment-scope-probe-host',
  component: FragmentScopeProbeHost,
  regions: ['body']
};

export const scopedHostRenderer: RendererDefinition = {
  type: 'scoped-host',
  component: (props) => <section>{props.regions.body?.instantiate()}</section>,
  regions: ['body'],
  actionScopePolicy: 'new',
  componentRegistryPolicy: 'new'
};

function NamespaceProvider(props: RendererComponentProps) {
  const actionScope = useCurrentActionScope();
  const namespace = String(props.props.namespace ?? 'demo');
  const label = String(props.props.label ?? props.meta.label ?? 'provider');

  React.useEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace(namespace, {
      kind: 'host',
      invoke(method, payload) {
        return {
          ok: true,
          data: `${label}:${method}:${String(payload?.value ?? '')}`
        };
      }
    });
  }, [actionScope, namespace, label]);

  return <span data-testid={`namespace-scope-${label}`}>{actionScope?.id ?? ''}</span>;
}

export const namespaceProviderRenderer: RendererDefinition = {
  type: 'namespace-provider',
  component: NamespaceProvider
};

function ComponentHandleProvider(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const componentName = String(props.props.componentName ?? 'shared');
  const label = String(props.props.label ?? props.meta.label ?? 'handle');

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
            data: `${label}:${method}:${String(payload?.value ?? '')}`
          };
        }
      }
    });
  }, [componentRegistry, componentName, label]);

  return <span data-testid={`component-registry-scope-${label}`}>{componentRegistry?.id ?? ''}</span>;
}

export const componentHandleProviderRenderer: RendererDefinition = {
  type: 'component-handle-provider',
  component: ComponentHandleProvider
};

function DispatchProbe(props: RendererComponentProps) {
  const [resultText, setResultText] = React.useState('');

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await props.helpers.dispatch(props.props.runAction as any);
          setResultText(result.ok ? String(result.data ?? '') : String(result.error ?? ''));
        }}
      >
        {String(props.props.label ?? props.meta.label ?? 'Run dispatch')}
      </button>
      <span data-testid={String(props.props.resultKey ?? 'dispatch-result')}>{resultText}</span>
    </div>
  );
}

export const dispatchProbeRenderer: RendererDefinition = {
  type: 'dispatch-probe',
  component: DispatchProbe
};

function ToggleHost(props: RendererComponentProps) {
  const [visible, setVisible] = React.useState(true);

  return (
    <div>
      <button type="button" onClick={() => setVisible((current) => !current)}>
        {visible ? 'Hide child boundary' : 'Show child boundary'}
      </button>
      {visible ? props.regions.body?.instantiate() : null}
    </div>
  );
}

export const toggleHostRenderer: RendererDefinition = {
  type: 'toggle-host',
  component: ToggleHost,
  regions: ['body']
};

export function createDispatchCaptureRenderer(onCapture: (dispatch: RendererHelpers['dispatch']) => void): RendererDefinition {
  function DispatchCapture(props: RendererComponentProps) {
    React.useEffect(() => {
      onCapture(props.helpers.dispatch);
    }, [props.helpers.dispatch]);

    return null;
  }

  return {
    type: 'dispatch-capture',
    component: DispatchCapture
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
    value: data,
    read: () => data,
    update: () => undefined,
    merge: () => {}
  };
}

export function renderWithRuntimeProviders(input: {
  runtime: ReturnType<typeof createRendererRuntime>;
  page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>;
  schema: Record<string, unknown>;
}): RenderResult {
  const actionScope = input.runtime.createActionScope({ id: 'test-action-scope' });
  const componentRegistry = input.runtime.createComponentHandleRegistry({ id: 'test-component-registry' });

  return render(
    <RuntimeContext.Provider value={input.runtime}>
      <ActionScopeContext.Provider value={actionScope}>
        <ComponentRegistryContext.Provider value={componentRegistry}>
          <ScopeContext.Provider value={input.page.scope}>
            <PageContext.Provider value={input.page}>
              <RenderNodes input={input.schema as any} options={{ actionScope, componentRegistry }} />
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

export { FormContext, createExpressionCompiler, createFormulaCompiler, createRendererRegistry, createRendererRuntime };
export type { RendererPlugin };