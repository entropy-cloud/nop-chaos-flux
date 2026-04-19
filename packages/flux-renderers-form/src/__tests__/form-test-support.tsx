import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { ApiSchema, ApiRequestContext, RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { getIn } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { useAggregateError, useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { useFieldHandlers } from '../field-utils';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: MouseEventInit & { pointerId?: number; pressure?: number } = {}) {
      super(type, props);
    }
  }
  globalThis.PointerEvent = PointerEvent as any;
}

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

export const submitCalls: Array<Record<string, any>> = [];
export const notifyCalls: Array<{ level: string; message: string }> = [];
export const sharedFormulaCompiler = createFormulaCompiler();

export const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiSchema, ctx: ApiRequestContext) {
    submitCalls.push(ctx.scope.readOwn());
    return {
      ok: true,
      status: 200,
      data: ctx.scope.readOwn() as T
    };
  },
  notify: (level, message) => {
    notifyCalls.push({ level, message });
  }
};

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button
      type="button"
      onClick={(event) => void props.events.onClick?.(event)}
    >
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }]
};

function ContactGroupRenderer(props: RendererComponentProps) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = (scope.get(name) as Record<string, string> | undefined) ?? {};
  const error = useAggregateError(name)?.message;

  return (
    <label className="nop-field">
      <span data-slot="field-label">{String(props.props.label ?? 'Contact')}</span>
      <input
        aria-label="Contact Email"
        className="nop-input"
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
      <input
        aria-label="Contact Phone"
        className="nop-input"
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
    }
  },
  component: ContactGroupRenderer
};

function FormStateProbeRenderer(props: RendererComponentProps) {
  const path = String(props.props.name ?? props.schema.name ?? '');
  const value = useCurrentFormState((state) => (path ? getIn(state.values, path) : state.values));

  return <pre data-testid={`form-state:${path}`}>{JSON.stringify(value ?? null)}</pre>;
}

export const formStateProbeRenderer: RendererDefinition = {
  type: 'form-state-probe',
  component: FormStateProbeRenderer
};

function ScopeStateProbeRenderer(props: RendererComponentProps) {
  const path = String(props.props.name ?? props.schema.name ?? '');
  const value = useScopeSelector((scopeData) => (path ? getIn(scopeData, path) : scopeData));

  return <pre data-testid={`scope-state:${path}`}>{JSON.stringify(value ?? null)}</pre>;
}

export const scopeStateProbeRenderer: RendererDefinition = {
  type: 'scope-state-probe',
  component: ScopeStateProbeRenderer
};

export const handlerIdentitySnapshots: Array<ReturnType<typeof useFieldHandlers>> = [];

function HandlerIdentityProbeRenderer(props: RendererComponentProps) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const handlers = useFieldHandlers({ name, currentForm: form, scope });

  React.useEffect(() => {
    handlerIdentitySnapshots.push(handlers);
  }, [handlers]);

  return <span data-testid="handler-identity-probe">{name}</span>;
}

export const handlerIdentityProbeRenderer: RendererDefinition = {
  type: 'handler-identity-probe',
  component: HandlerIdentityProbeRenderer
};
