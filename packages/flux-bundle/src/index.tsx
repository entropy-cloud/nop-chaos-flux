import React from 'react';
import { createRendererRegistry, type RendererRegistry, type SchemaInput } from '@nop-chaos/flux-core';
import type { ActionContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv, createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form/definitions';
import './style.css';

import type {
  FluxRendererEnv,
  FluxRendererRegistry,
  FluxSchemaRendererComponent,
  FluxSchemaRendererProps,
} from './types.js';

export type {
  FluxApiRequest,
  FluxApiRequestContext,
  FluxApiResponse,
  FluxRendererDefinition,
  FluxRendererEnv,
  FluxRendererRegistry,
  FluxSchema,
  FluxSchemaNode,
  FluxSchemaRendererComponent,
  FluxSchemaRendererProps,
  FluxSchemaValue,
} from './types.js';

export const FLUX_ROOT_CLASS = 'nop-flux-root';

function asRendererRegistry(registry: FluxRendererRegistry): RendererRegistry {
  return registry as RendererRegistry;
}

export function registerDefaultFluxRenderers(registry: FluxRendererRegistry): FluxRendererRegistry {
  const resolvedRegistry = asRendererRegistry(registry);
  registerBasicRenderers(resolvedRegistry);
  registerFormRenderers(resolvedRegistry);
  registerDataRenderers(resolvedRegistry);
  return registry;
}

export function createFluxRendererRegistry(): FluxRendererRegistry {
  return registerDefaultFluxRenderers(createRendererRegistry() as FluxRendererRegistry);
}

export function createDefaultFluxEnv(input?: Partial<FluxRendererEnv>): FluxRendererEnv {
  return createDefaultEnv(input as unknown as Partial<RendererEnv>) as unknown as FluxRendererEnv;
}

export function createFluxSchemaRendererWithRegistry(
  registry: FluxRendererRegistry,
): FluxSchemaRendererComponent {
  const SchemaRenderer = createSchemaRenderer();
  const formulaCompiler = createFormulaCompiler();
  const resolvedRegistry = asRendererRegistry(registry);

  return function FluxSchemaRenderer(props: FluxSchemaRendererProps) {
    return (
      <div className={FLUX_ROOT_CLASS}>
        <SchemaRenderer
          schema={props.schema as SchemaInput}
          schemaUrl={props.schemaUrl}
          env={props.env as unknown as RendererEnv}
          data={props.data}
          formulaCompiler={formulaCompiler}
          registry={resolvedRegistry}
          strictValidation={props.strictValidation}
          onActionError={props.onActionError as ((error: unknown, ctx: ActionContext) => void) | undefined}
        />
      </div>
    );
  };
}

export function createFluxSchemaRenderer(): FluxSchemaRendererComponent {
  return createFluxSchemaRendererWithRegistry(createFluxRendererRegistry());
}
