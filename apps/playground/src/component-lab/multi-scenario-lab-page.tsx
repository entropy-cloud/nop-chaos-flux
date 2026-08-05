import React, { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import type { SchemaRendererComponent } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import type { BaseSchema, RendererEnv, ActionScope } from '@nop-chaos/flux-core';
import { attachScopeDebugToSchema } from './scope-debug';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerMobileRenderers(registry);
registerAiRenderers(registry);

const SchemaRenderer: SchemaRendererComponent = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();
const defaultEnv = createDefaultEnv();

export interface ScenarioBlockProps {
  title: string;
  description?: string;
  schema: BaseSchema;
  data?: Record<string, unknown>;
  env?: Partial<RendererEnv>;
  /** Host action-scope registration (probe namespaces etc.), forwarded to SchemaRenderer. */
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
}

function ScenarioBlock({
  title,
  description,
  schema,
  data,
  env: envOverride,
  onActionScopeChange,
}: ScenarioBlockProps) {
  const env = useMemo(
    () => (envOverride ? createDefaultEnv({ ...defaultEnv, ...envOverride }) : defaultEnv),
    [envOverride],
  );
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const schemaWithDebug = useMemo(
    () => attachScopeDebugToSchema(schema, `${title} Scope`),
    [schema, title],
  );

  return (
    <div className="flex flex-col gap-2" data-testid={`scenario-${slug}`}>
      <div>
        <p
          className="text-sm font-semibold text-[var(--nop-text-strong)]"
          data-testid={`scenario-title-${slug}`}
        >
          {title}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-[var(--nop-body-copy)] opacity-75 mt-0.5">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className="p-5 rounded-[16px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]"
        data-testid={`scenario-stage-${slug}`}
      >
        <SchemaRenderer
          schemaUrl={`playground://component-lab/${slug}`}
          schema={schemaWithDebug}
          data={data ?? {}}
          env={env}
          registry={registry}
          formulaCompiler={formulaCompiler}
          onActionScopeChange={onActionScopeChange}
        />
      </div>
    </div>
  );
}

export interface MultiScenarioLabPageProps {
  introDescription: string;
  scenarios: ScenarioBlockProps[];
}

export function MultiScenarioLabPage({ introDescription, scenarios }: MultiScenarioLabPageProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="multi-scenario-lab">
      <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">{introDescription}</p>
      {scenarios.map((scenario, index) => (
        <ScenarioBlock key={scenario.title || `scenario-${index}`} {...scenario} />
      ))}
    </div>
  );
}
