import React from 'react';
import type { RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv, createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from './index.js';

// Plan 594 (CX-15): hand-written env stub → shared createDefaultEnv.
export const env: RendererEnv = createDefaultEnv();

function ScopeProbeRenderer(props: RendererComponentProps) {
  return (
    <div data-testid={props.meta.testid ?? 'scope-probe'}>
      {JSON.stringify(props.node.instancePath ?? null)}|
      {String(props.helpers.evaluate((props.props as { value?: unknown }).value))}
    </div>
  );
}

export const scopeProbeRenderer: RendererDefinition = {
  type: 'scope-probe',
  component: ScopeProbeRenderer,
  fields: [{ key: 'value', kind: 'prop' }],
};

export function createBasicSchemaRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([...basicRendererDefinitions, ...extra]);
}

export const formulaCompiler = createFormulaCompiler();
