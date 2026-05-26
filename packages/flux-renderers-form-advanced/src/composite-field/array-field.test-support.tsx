import React from 'react';
import type { ApiRequestContext, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { useRenderScope } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

export const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

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

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const arrayItemInstanceProbeRenderer: RendererDefinition = {
  type: 'array-item-instance-probe',
  component: (props) => (
    <ArrayItemInstanceProbeWithInstancePath instancePath={props.node.instancePath} />
  ),
};

function ArrayItemInstanceProbeWithInstancePath(props: { instancePath: unknown }) {
  const scope = useRenderScope();
  const itemName = String(
    (scope.get('value') as { name?: unknown } | undefined)?.name ?? scope.get('name') ?? 'unknown',
  );
  const [mountId] = React.useState(() => `mount:${itemName}`);

  return (
    <span data-testid={`array-item-probe-${itemName}`}>
      {`${mountId}|${scope.id}|${JSON.stringify(props.instancePath ?? null)}`}
    </span>
  );
}
