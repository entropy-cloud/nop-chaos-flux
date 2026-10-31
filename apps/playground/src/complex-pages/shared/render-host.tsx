import type { ReactNode } from 'react';
import { cn } from '@nop-chaos/ui';
import { createFormulaCompiler, createFormulaRegistry } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerPivotRenderers } from '@nop-chaos/flux-renderers-pivot';
import { registerDashboardRenderers } from '@nop-chaos/flux-renderers-dashboard';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial/runtime';
import { registerMapRenderers } from '@nop-chaos/flux-renderers-map';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import type { ActionScope, RendererEnv } from '@nop-chaos/flux-core';
import { ConfirmHost } from './confirm-bridge';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerSchedulingRenderers(registry);
registerAiRenderers(registry);
// Mobile family (plan 798 W1): the business-replication mobile pages (W1/M3/S1)
// render mobile-native renderers on the shared showcase registry.
registerMobileRenderers(registry);
// Pivot family (plan 800 W3): the pivot-table drill-through page renders on
// the shared showcase registry (the pivot demo page registers its own copy).
registerPivotRenderers(registry);
// Dashboard family (plan 803 C3): the sales-dashboard page is the first
// complex-pages consumer of the `dashboard` grid renderer — its panels embed
// stat-tile/echarts/chart/table, which the data-family registration above
// already covers; only the dashboard wrapper type was missing here (same
// registration gap the pivot family had, W3 勘误 4 同型).
registerDashboardRenderers(registry);
// Industrial family (plan 809 M1 / 评审 MAJ-1, W3 勘误 4 + C3 Major-1 同型):
// mes-shopfloor-board is the first complex-pages consumer of the `scada-canvas`
// renderer — the registration gap is the same shape the pivot/dashboard
// families had (the scada demo page registers its own copy).
registerScadaRenderers(registry);
// Map family (plan 818 V3): the geofence page is the first complex-pages
// consumer of the `map` renderer (registerMapRenderers was only wired in
// App.tsx / map-demo before — same registration-gap shape as
// pivot/dashboard/scada).
registerMapRenderers(registry);
registerFlowDesignerRenderers(registry);

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
  /**
   * Optional host ActionScope (plan 806 K1): host namespace actions
   * (`replAi:setActive`) are registered by the page host and dispatched by
   * schema events. Undefined keeps the previous behavior (runtime-built scope).
   */
  actionScope?: ActionScope;
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
  actionScope,
  className,
  children,
}: ShowcaseSchemaHostProps) {
  return (
    <>
      <div className={cn('contents', className)}>
        <ShowcaseSchemaRenderer
          schemaUrl={schemaUrl}
          schema={schema}
          registry={showcaseRegistry as React.ComponentProps<typeof ShowcaseSchemaRenderer>['registry']}
          env={env}
          formulaCompiler={showcaseFormulaCompiler}
          data={data}
          actionScope={actionScope}
          onActionError={(error) => {
            // Form-validation rejections ({ok:false, error: ValidationError[]})
            // are surfaced inline by the form (toast + aria-invalid) — they are
            // not host-level action errors (plan 551: the grouped-form merge
            // made empty submits fail validation and this log flagged every
            // gated submit as a console error).
            if (
              error &&
              typeof error === 'object' &&
              'ok' in error &&
              (error as { ok: boolean }).ok === false &&
              Array.isArray((error as { error?: unknown }).error)
            ) {
              return;
            }
            console.error('[showcase] action error:', error);
          }}
        />
      </div>
      {children}
      <ConfirmHost />
    </>
  );
}
