import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import type {
  ApiRequestContext,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  useAggregateError,
  useCurrentForm,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from './index.js';
import { Input } from '@nop-chaos/ui';
import { useFieldHandlers } from '@nop-chaos/flux-renderers-form';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(
      type: string,
      props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
    ) {
      super(type, props);
    }
  }

  globalThis.PointerEvent = PointerEvent as any;
}

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

export const baseEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export const formulaCompiler = createFormulaCompiler();
export const sharedFormulaCompiler = formulaCompiler;

export async function selectOption(labelText: string, optionText: string) {
  const trigger =
    screen.queryByRole('combobox', { name: labelText }) ??
    screen.queryByRole('button', { name: labelText }) ??
    screen.getByLabelText(labelText, { selector: 'button' });
  fireEvent.click(trigger);
  const optionTextEl = await screen.findByText(optionText);
  const optionEl = optionTextEl.closest('[role="option"]') ?? optionTextEl;
  fireEvent.mouseEnter(optionEl);
  fireEvent.mouseMove(optionEl);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(optionEl);
}

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

export function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(
    _api: unknown,
    ctx: ApiRequestContext,
  ): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

export const buttonRenderer = {
  type: 'button',
  component: (props: any) => (
    <Button variant="ghost" size="sm" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </Button>
  ),
  fields: [{ key: 'onClick', kind: 'event' as const }],
};

export const env: RendererEnv = {
  fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
    formTestHarness.submitCalls.push(ctx.scope.readOwn() as Record<string, any>);
    return { ok: true, status: 200, data: ctx.scope.readOwn() as T };
  },
  notify: (level, message) => {
    formTestHarness.notifyCalls.push({ level, message });
  },
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

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

export function createFormSchemaRenderer() {
  return createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
}

export function createFormSchemaRendererWithButton() {
  return createSchemaRenderer([...allFormDefs, buttonRenderer]);
}

export function createPageSchemaRenderer() {
  return createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
}
