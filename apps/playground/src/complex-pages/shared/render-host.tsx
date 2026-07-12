import type { ReactNode } from 'react';
import { Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler, createFormulaRegistry } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ConfirmHost } from './confirm-bridge';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Showcase-only formula namespace extending the Excel-like formula language
 * with array aggregation helpers. The built-in `SUM` flattens arrays of
 * numbers but cannot pluck a field from an array of objects (the formula
 * language has no `.map()`), so business-document column totals need these.
 * Registering custom namespaces on the formula registry is a supported,
 * documented extension point — real apps register domain helpers the same way.
 */
const showcaseFormulaRegistry = createFormulaRegistry();
showcaseFormulaRegistry.registerNamespace('$Arr', {
  sum(values: unknown): number {
    return Array.isArray(values) ? values.reduce((s: number, v) => s + toNumber(v), 0) : 0;
  },
  sumField(records: unknown, field: string): number {
    if (!Array.isArray(records) || typeof field !== 'string') return 0;
    return records.reduce((s: number, r) => s + toNumber((r as Record<string, unknown>)?.[field]), 0);
  },
  sumProducts(records: unknown, fieldA: string, fieldB: string): number {
    if (!Array.isArray(records)) return 0;
    return records.reduce((s: number, r) => {
      const rec = r as Record<string, unknown>;
      return s + toNumber(rec?.[fieldA]) * toNumber(rec?.[fieldB]);
    }, 0);
  },
  count(records: unknown): number {
    return Array.isArray(records) ? records.length : 0;
  },
});

export const showcaseRegistry = registry;
export const showcaseFormulaCompiler = createFormulaCompiler(showcaseFormulaRegistry);
export const ShowcaseSchemaRenderer = createSchemaRenderer();

interface ShowcaseSchemaHostProps {
  schemaUrl: string;
  schema: React.ComponentProps<typeof ShowcaseSchemaRenderer>['schema'];
  env: RendererEnv;
  data?: Record<string, unknown>;
  /** Optional className for the host wrapper. */
  className?: string;
  /** Render children (e.g. extra toast/hosts) inside the host. */
  children?: ReactNode;
}

/**
 * Convenience wrapper that mounts a single SchemaRenderer using the shared
 * showcase registry/formula compiler plus the toast + confirm hosts every
 * complex page needs. Keeps individual page files focused on their schema.
 */
export function ShowcaseSchemaHost({
  schemaUrl,
  schema,
  env,
  data,
  className,
  children,
}: ShowcaseSchemaHostProps) {
  return (
    <>
      <div className={className}>
        <ShowcaseSchemaRenderer
          schemaUrl={schemaUrl}
          schema={schema}
          registry={showcaseRegistry as React.ComponentProps<typeof ShowcaseSchemaRenderer>['registry']}
          env={env}
          formulaCompiler={showcaseFormulaCompiler}
          data={data}
          onActionError={(error) => {
            console.error('[showcase] action error:', error);
          }}
        />
      </div>
      {children}
      <ConfirmHost />
      <Toaster />
    </>
  );
}
