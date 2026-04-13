import React, { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, createDefaultEnv } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import type { BaseSchema } from '@nop-chaos/flux-core';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();
const defaultEnv = createDefaultEnv();

export interface ScenarioBlockProps {
  title: string;
  description?: string;
  schema: BaseSchema;
  data?: Record<string, unknown>;
}

function ScenarioBlock({ title, description, schema, data }: ScenarioBlockProps) {
  const env = useMemo(() => defaultEnv, []);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="flex flex-col gap-2" data-testid={`scenario-${slug}`}>
      <div>
        <p className="text-sm font-semibold text-[var(--nop-text-strong)]" data-testid={`scenario-title-${slug}`}>{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-[var(--nop-body-copy)] opacity-75 mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="p-5 rounded-[16px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]" data-testid={`scenario-stage-${slug}`}>
        <SchemaRenderer
          schema={schema}
          data={data ?? {}}
          env={env}
          registry={registry}
          formulaCompiler={formulaCompiler}
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
      {scenarios.map((scenario, i) => (
        <ScenarioBlock key={i} {...scenario} />
      ))}
    </div>
  );
}
