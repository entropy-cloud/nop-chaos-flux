import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Button, Input, Label } from '@nop-chaos/ui';
import type {
  RendererComponentProps,
  RendererDefinition,
  RendererEnv
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  FormContext,
  ScopeContext,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentForm,
  useCurrentNodeMeta,
  useOwnScopeSelector,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector
} from './index';

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
  component: (props) => <section>{props.regions.body?.render()}</section>,
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
        <section>{props.regions.body?.render()}</section>
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
  const form = useCurrentForm();
  const value = useScopeSelector((scopeData: { email?: unknown }) => String(scopeData.email ?? ''));

  return (
    <Label>
      <span>Email</span>
      <Input
        aria-label="Email"
        value={value}
        onChange={(event) => form?.setValue('email', event.target.value)}
      />
    </Label>
  );
}

export const probeInputRenderer: RendererDefinition = {
  type: 'probe-input',
  component: ProbeInput
};

function ProbeButton() {
  const form = useCurrentForm();
  const value = useScopeSelector((scopeData: { query?: unknown }) => String(scopeData.query ?? ''));

  return (
    <div>
      <Input
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
    <Button variant="ghost" size="sm" disabled={props.meta.disabled} aria-label="Search">
      Search
    </Button>
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
