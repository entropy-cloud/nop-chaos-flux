import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '../test-dom-polyfills';
import type {
  ApiSchema,
  ApiRequestContext,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { getIn } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  useAggregateError,
  useCurrentForm,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { Input } from '@nop-chaos/ui';
import { useFieldHandlers } from '../field-utils.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

export async function selectOption(labelText: string, optionText: string) {
  const trigger = screen.getByLabelText(labelText);
  fireEvent.click(trigger);
  const optionTextEl = await screen.findByText(optionText);
  const optionEl = optionTextEl.closest('[role="option"]') ?? optionTextEl;
  fireEvent.mouseEnter(optionEl);
  fireEvent.mouseMove(optionEl);
  await new Promise((r) => setTimeout(r, 0));
  fireEvent.click(optionEl);
}

export const sharedFormulaCompiler = createFormulaCompiler();

export interface FormTestHarness {
  readonly submitCalls: Array<Record<string, any>>;
  readonly notifyCalls: Array<{ level: string; message: string }>;
  readonly formStateProbeRenderCounts: Record<string, number>;
  readonly handlerIdentitySnapshots: Array<ReturnType<typeof useFieldHandlers>>;
  reset(): void;
}

function createFormTestHarness(): FormTestHarness {
  const submitCalls: Array<Record<string, any>> = [];
  const notifyCalls: Array<{ level: string; message: string }> = [];
  const formStateProbeRenderCounts: Record<string, number> = {};
  const handlerIdentitySnapshots: Array<ReturnType<typeof useFieldHandlers>> = [];

  return {
    submitCalls,
    notifyCalls,
    formStateProbeRenderCounts,
    handlerIdentitySnapshots,
    reset() {
      submitCalls.length = 0;
      notifyCalls.length = 0;
      handlerIdentitySnapshots.length = 0;
      for (const key of Object.keys(formStateProbeRenderCounts)) {
        delete formStateProbeRenderCounts[key];
      }
    },
  };
}

export const formTestHarness = createFormTestHarness();

export const submitCalls = formTestHarness.submitCalls;
export const notifyCalls = formTestHarness.notifyCalls;
export const formStateProbeRenderCounts = formTestHarness.formStateProbeRenderCounts;
export const handlerIdentitySnapshots = formTestHarness.handlerIdentitySnapshots;

export const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiSchema, ctx: ApiRequestContext) {
    formTestHarness.submitCalls.push(ctx.scope.readOwn());
    return {
      ok: true,
      status: 200,
      data: ctx.scope.readOwn() as T,
    };
  },
  notify: (level, message) => {
    formTestHarness.notifyCalls.push({ level, message });
  },
};

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={(event) => void props.events.onClick?.(event)}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function ContactGroupRenderer(props: RendererComponentProps) {
  const form = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = useCurrentFormState(
    (state) =>
      ((name ? getIn(state.values, name) : undefined) as Record<string, string> | undefined) ?? {},
    Object.is,
    { path: name || undefined },
  );
  const error = useAggregateError(name)?.message;

  return (
    <label className="nop-field">
      <span data-slot="field-label">{String(props.props.label ?? 'Contact')}</span>
      <Input
        aria-label="Contact Email"
        value={value.email ?? ''}
        onFocus={() => {
          form?.visitField(name);
        }}
        onChange={(event) => {
          form?.setValue(name, { ...value, email: event.target.value });
        }}
        onBlur={() => {
          form?.touchField(name);
        }}
      />
      <Input
        aria-label="Contact Phone"
        value={value.phone ?? ''}
        onFocus={() => {
          form?.visitField(name);
        }}
        onChange={(event) => {
          form?.setValue(name, { ...value, phone: event.target.value });
        }}
        onBlur={() => {
          form?.touchField(name);
        }}
      />
      {error ? <span data-slot="field-error">{error}</span> : null}
    </label>
  );
}

export const contactGroupRenderer: RendererDefinition = {
  type: 'contact-group',
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
  component: ContactGroupRenderer,
};

function FormStateProbeRenderer(props: RendererComponentProps) {
  const path = String(props.props.name ?? props.schema.name ?? '');
  const value = useCurrentFormState(
    (state) => (path ? getIn(state.values, path) : state.values),
    Object.is,
    { path: path || undefined },
  );

  React.useEffect(() => {
    formTestHarness.formStateProbeRenderCounts[path] =
      (formTestHarness.formStateProbeRenderCounts[path] ?? 0) + 1;
  });

  return <pre data-testid={`form-state:${path}`}>{JSON.stringify(value ?? null)}</pre>;
}

export const formStateProbeRenderer: RendererDefinition = {
  type: 'form-state-probe',
  component: FormStateProbeRenderer,
};

function ScopeStateProbeRenderer(props: RendererComponentProps) {
  const path = String(props.props.name ?? props.schema.name ?? '');
  const value = useScopeSelector((scopeData) => (path ? getIn(scopeData, path) : scopeData));

  return <pre data-testid={`scope-state:${path}`}>{JSON.stringify(value ?? null)}</pre>;
}

export const scopeStateProbeRenderer: RendererDefinition = {
  type: 'scope-state-probe',
  component: ScopeStateProbeRenderer,
};

function HandlerIdentityProbeRenderer(props: RendererComponentProps) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const handlers = useFieldHandlers({ name, currentForm: form, scope });

  React.useEffect(() => {
    formTestHarness.handlerIdentitySnapshots.push(handlers);
  }, [handlers]);

  return <span data-testid="handler-identity-probe">{name}</span>;
}

export const handlerIdentityProbeRenderer: RendererDefinition = {
  type: 'handler-identity-probe',
  component: HandlerIdentityProbeRenderer,
};
