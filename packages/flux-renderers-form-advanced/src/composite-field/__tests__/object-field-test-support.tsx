import '../../test-support';
import React from 'react';
import type { ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { useCurrentForm, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../../index.js';

export const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

export const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(
    _api: unknown,
    ctx: ApiRequestContext,
  ): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

export const formulaCompiler = createFormulaCompiler();

function FieldValueProbeRenderer(props: { name: string; 'data-testid': string }) {
  const scope = useRenderScope();
  const form = useCurrentForm();
  const value = form ? (form.scope.get(props.name) ?? '') : (scope.get(props.name) ?? '');
  return <span data-testid={props['data-testid']}>{JSON.stringify(value)}</span>;
}

export const fieldValueProbeRenderer: RendererDefinition = {
  type: 'field-value-probe',
  component: (p) => (
    <FieldValueProbeRenderer
      name={String((p.props as Record<string, unknown>).name ?? '')}
      data-testid={String((p.props as Record<string, unknown>).testid ?? 'field-value')}
    />
  ),
};

function ScopeSelectorProbeRenderer() {
  const snapshot = useScopeSelector(
    (scope) => ({
      value: scope.value,
      readOnly: scope.readOnly,
    }),
    Object.is,
  ) as Record<string, unknown>;
  return <span data-testid="scope-selector-probe">{JSON.stringify(snapshot)}</span>;
}

export const scopeSelectorProbeRenderer: RendererDefinition = {
  type: 'scope-selector-probe',
  component: () => <ScopeSelectorProbeRenderer />,
};

function ObjectScopeMutationRenderer() {
  const scope = useRenderScope();

  return (
    <>
      <button type="button" onClick={() => scope.update('firstName', 'Bob')}>
        Set First Name
      </button>
      <button
        type="button"
        onClick={() => scope.merge({ lastName: 'Jones' } as Record<string, unknown>)}
      >
        Merge Object
      </button>
      <button
        type="button"
        onClick={() =>
          scope.merge({ value: { firstName: 'Merged', lastName: 'Value' } } as Record<
            string,
            unknown
          >)
        }
      >
        Merge Value Wrapper
      </button>
      <button
        type="button"
        onClick={() => {
          scope.replace?.({ firstName: 'Dana', lastName: 'Lane' } as Record<string, unknown>);
        }}
      >
        Replace Object
      </button>
      <button
        type="button"
        onClick={() => {
          scope.replace?.({ value: { firstName: 'Fay', lastName: 'Mills' } } as Record<
            string,
            unknown
          >);
        }}
      >
        Replace Value Wrapper
      </button>
    </>
  );
}

export const objectScopeMutationRenderer: RendererDefinition = {
  type: 'object-scope-mutation-probe',
  component: () => <ObjectScopeMutationRenderer />,
};

export const submitButtonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};
