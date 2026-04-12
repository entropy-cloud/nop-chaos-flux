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

interface SchemaLabPageProps {
  schema: BaseSchema;
  data?: Record<string, unknown>;
  description?: string;
  notes?: string;
}

export function SchemaLabPage({ schema, data, description, notes }: SchemaLabPageProps) {
  const env = useMemo(() => defaultEnv, []);

  return (
    <div className="flex flex-col gap-4">
      {description ? (
        <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">{description}</p>
      ) : null}
      {notes ? (
        <p className="text-xs leading-relaxed text-[var(--nop-body-copy)] opacity-70 italic">{notes}</p>
      ) : null}
      <div className="p-5 rounded-[16px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]">
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
