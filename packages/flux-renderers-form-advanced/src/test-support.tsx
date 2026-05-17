import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach } from 'vitest';
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

type PointerEventCtor = typeof globalThis.PointerEvent;

export function installTestDomPolyfills(): () => void {
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const hadOwnScrollIntoView = Object.prototype.hasOwnProperty.call(Element.prototype, 'scrollIntoView');
  const originalPointerEvent = globalThis.PointerEvent;
  const hadPointerEvent = typeof originalPointerEvent !== 'undefined';

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }

  if (typeof globalThis.PointerEvent === 'undefined') {
    class TestPointerEvent extends MouseEvent {
      constructor(
        type: string,
        props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
      ) {
        super(type, props);
      }
    }

    globalThis.PointerEvent = TestPointerEvent as PointerEventCtor;
  }

  return () => {
    if (hadOwnScrollIntoView) {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      delete (Element.prototype as { scrollIntoView?: typeof Element.prototype.scrollIntoView })
        .scrollIntoView;
    }

    if (hadPointerEvent) {
      globalThis.PointerEvent = originalPointerEvent;
    } else {
      delete (globalThis as { PointerEvent?: PointerEventCtor }).PointerEvent;
    }
  };
}

let restoreDomPolyfills: (() => void) | undefined;

beforeAll(() => {
  restoreDomPolyfills = installTestDomPolyfills();
});

afterAll(() => {
  restoreDomPolyfills?.();
  restoreDomPolyfills = undefined;
});

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
  const nativeSelect = screen.queryByLabelText(labelText, { selector: 'select' });

  if (nativeSelect instanceof HTMLSelectElement) {
    const matchingOption = Array.from(nativeSelect.options).find((option) => option.text === optionText);
    if (!matchingOption) {
      throw new Error(`Expected option ${optionText}`);
    }
    fireEvent.change(nativeSelect, { target: { value: matchingOption.value } });
    return;
  }

  const trigger =
    screen.queryByRole('combobox', { name: labelText }) ??
    screen.queryByRole('button', { name: labelText }) ??
    screen.getByLabelText(labelText, { selector: 'button' });
  fireEvent.click(trigger);
  const optionEl = await screen.findByRole('option', { name: optionText });
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

function createForwardingArrayProxy<T>(getCurrent: () => T[]): T[] {
  return new Proxy([], {
    get(_target, property, receiver) {
      const value = Reflect.get(getCurrent(), property, receiver);
      return typeof value === 'function' ? value.bind(getCurrent()) : value;
    },
    set(_target, property, value, receiver) {
      return Reflect.set(getCurrent(), property, value, receiver);
    },
    deleteProperty(_target, property) {
      return Reflect.deleteProperty(getCurrent(), property);
    },
    has(_target, property) {
      return Reflect.has(getCurrent(), property);
    },
    ownKeys() {
      return Reflect.ownKeys(getCurrent());
    },
    getOwnPropertyDescriptor(_target, property) {
      return Object.getOwnPropertyDescriptor(getCurrent(), property);
    },
  }) as T[];
}

function createForwardingObjectProxy<T extends object>(getCurrent: () => T): T {
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      const value = Reflect.get(getCurrent(), property, receiver);
      return typeof value === 'function' ? value.bind(getCurrent()) : value;
    },
    set(_target, property, value, receiver) {
      return Reflect.set(getCurrent(), property, value, receiver);
    },
    deleteProperty(_target, property) {
      return Reflect.deleteProperty(getCurrent(), property);
    },
    has(_target, property) {
      return Reflect.has(getCurrent(), property);
    },
    ownKeys() {
      return Reflect.ownKeys(getCurrent());
    },
    getOwnPropertyDescriptor(_target, property) {
      return Object.getOwnPropertyDescriptor(getCurrent(), property);
    },
  });
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

let currentFormTestHarness = createFormTestHarness();

export const submitCalls = createForwardingArrayProxy(() => currentFormTestHarness.submitCalls);
export const notifyCalls = createForwardingArrayProxy(() => currentFormTestHarness.notifyCalls);
export const formStateProbeRenderCounts = createForwardingObjectProxy(
  () => currentFormTestHarness.formStateProbeRenderCounts,
);
export const handlerIdentitySnapshots = createForwardingArrayProxy(
  () => currentFormTestHarness.handlerIdentitySnapshots,
);

export const formTestHarness: FormTestHarness = {
  get submitCalls() {
    return submitCalls;
  },
  get notifyCalls() {
    return notifyCalls;
  },
  get formStateProbeRenderCounts() {
    return formStateProbeRenderCounts;
  },
  get handlerIdentitySnapshots() {
    return handlerIdentitySnapshots;
  },
  reset() {
    currentFormTestHarness = createFormTestHarness();
  },
};

beforeEach(() => {
  formTestHarness.reset();
});

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
    currentFormTestHarness.submitCalls.push(ctx.scope.readOwn() as Record<string, any>);
    return { ok: true, status: 200, data: ctx.scope.readOwn() as T };
  },
  notify: (level, message) => {
    currentFormTestHarness.notifyCalls.push({ level, message });
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
    currentFormTestHarness.formStateProbeRenderCounts[path] =
      (currentFormTestHarness.formStateProbeRenderCounts[path] ?? 0) + 1;
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
    currentFormTestHarness.handlerIdentitySnapshots.push(handlers);
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

export function createPageSchemaRenderer(extraDefinitions: RendererDefinition[] = []) {
  return createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs, ...extraDefinitions]);
}
