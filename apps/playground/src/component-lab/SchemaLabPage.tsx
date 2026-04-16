import React, { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, createDefaultEnv } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { attachScopeDebugToSchema } from './scope-debug';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
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
  const schemaWithDebug = useMemo(() => attachScopeDebugToSchema(schema, 'Current Scope'), [schema]);

  return (
    <div className="flex flex-col gap-4" data-testid="schema-lab">
      {description ? (
        <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">{description}</p>
      ) : null}
      {notes ? (
        <p className="text-xs leading-relaxed text-[var(--nop-body-copy)] opacity-70 italic">{notes}</p>
      ) : null}
      <div className="p-5 rounded-[16px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]" data-testid="schema-lab-stage">
        <SchemaRenderer
          schema={schemaWithDebug}
          data={data ?? {}}
          env={env}
          registry={registry}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
