import React from 'react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv, createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form/definitions';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
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

export function registerDefaultFluxRenderers(registry: FluxRendererRegistry): FluxRendererRegistry {
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerFormAdvancedRenderers(registry);
  registerDataRenderers(registry);
  registerContentRenderers(registry);
  registerLayoutRenderers(registry);
  return registry;
}

export function createFluxRendererRegistry(): FluxRendererRegistry {
  return registerDefaultFluxRenderers(createRendererRegistry());
}

export function createDefaultFluxEnv(input?: Partial<FluxRendererEnv>): FluxRendererEnv {
  return createDefaultEnv(input);
}

export function createFluxSchemaRendererWithRegistry(
  registry: FluxRendererRegistry,
): FluxSchemaRendererComponent {
  const SchemaRenderer = createSchemaRenderer();
  const formulaCompiler = createFormulaCompiler();

  return function FluxSchemaRenderer(props: FluxSchemaRendererProps) {
    return (
      <div className={FLUX_ROOT_CLASS}>
        <SchemaRenderer
          schema={props.schema}
          schemaUrl={props.schemaUrl}
          env={props.env}
          data={props.data}
          formulaCompiler={formulaCompiler}
          registry={registry}
          strictValidation={props.strictValidation}
          onActionError={props.onActionError}
        />
      </div>
    );
  };
}

export function createFluxSchemaRenderer(): FluxSchemaRendererComponent {
  return createFluxSchemaRendererWithRegistry(createFluxRendererRegistry());
}
