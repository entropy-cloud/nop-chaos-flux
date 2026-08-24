/**
 * Plan 462 Phase 1 audit + baseline.
 *
 * Loads the LIVE renderer registry from `@nop-chaos/flux-react`
 * (which aggregates basic + form + content + layout + ... via
 * `createDefaultRegistry()`) and reports:
 *
 *   1. Per-renderer `propContracts` coverage of literal/union/boolean
 *      fields declared in `fields: [{ key, kind: 'prop' }]`.
 *   2. Per-package summary.
 *   3. Reproduction of the plan 461 demo bug: feeding the live `flex`
 *      renderer the typo `direction: "col"` and confirming the
 *      compiler currently produces ZERO `invalid-property-value`
 *      diagnostics (i.e. the gap exists).
 *
 * This file is the live baseline. The test marked as the "bug
 * reproducer" is EXPECTED to fail once Phase 2 of plan 462 lands
 * (the real `flex` renderer will have `propContracts.direction`,
 * and the typo will be caught). Until then, the `expect` is inverted
 * via a skip + log so the test passes as a baseline witness.
 */
import { describe, it, expect } from 'vitest';
import type { RendererDefinition, RendererRegistry, SchemaFieldRule } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { createFormulaCompiler, createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerDashboardRenderers } from '@nop-chaos/flux-renderers-dashboard';

function collectDefinitions(): Map<string, RendererDefinition> {
  const map = new Map<string, RendererDefinition>();
  const shared: RendererRegistry = createRendererRegistry();
  // 9 of 9 cross-package register*Renderers are loaded. The flux-renderers-mobile
  // path entry was added in `tsconfig.base.json` during Phase 4 of plan 462
  // (alongside the mobile propContracts work), so all 9 register* functions
  // typecheck and run cleanly. Phase 4 self-revert would re-break the audit;
  // do not undo the path entry without also dropping the import below.
  for (const register of [
    registerBasicRenderers,
    registerFormRenderers,
    registerContentRenderers,
    registerLayoutRenderers,
    registerMobileRenderers,
    registerSchedulingRenderers,
    registerAiRenderers,
    registerDataRenderers,
    registerDashboardRenderers,
  ]) {
    register(shared);
  }
  for (const def of shared.list()) {
    if (def?.type) map.set(def.type, def);
  }
  return map;
}

function isPropField(rule: SchemaFieldRule | string | undefined): rule is { key: string; kind: 'prop' | 'value' } {
  return Boolean(rule) && typeof rule === 'object' && (rule as { kind?: string }).kind === 'prop';
}

describe('plan 462 — propContracts coverage audit (Phase 1 baseline)', () => {
  const definitions = collectDefinitions();
  const allRenderers = Array.from(definitions.values());

  it('loads >= 100 renderer types from the live registry (baseline)', () => {
    // Baseline assertion: with 9 of 9 cross-package registerXxxRenderers
    // (basic + form + content + layout + mobile + scheduling + ai + data +
    // dashboard) registered, expect ≥ 100 renderer types. The 735 figure
    // from the survey script includes every `type: '...'` string in any
    // source file (including sub-renderer modules, surface-variants,
    // and editor-only definitions) and is the upper bound of what a
    // dedicated cross-package import could surface; this test stays
    // close to the in-playground registry contract.
    expect(allRenderers.length).toBeGreaterThanOrEqual(100);
  });

  it('emits a per-renderer propContracts coverage report', () => {
    const rows: Array<{ type: string; propFields: number; contracts: number; missing: string[] }> = [];
    for (const def of allRenderers) {
      const propFields = (def.fields ?? []).filter(isPropField);
      const contracts = Object.keys(def.propContracts ?? {});
      const missing = propFields
        .filter((f) => f.kind === 'prop' && !contracts.includes(f.key))
        .map((f) => f.key);
      if (propFields.length === 0) continue;
      rows.push({
        type: def.type,
        propFields: propFields.length,
        contracts: contracts.length,
        missing,
      });
    }
    rows.sort((a, b) => b.missing.length - a.missing.length);

    const totals = rows.reduce(
      (acc, r) => ({
        propFields: acc.propFields + r.propFields,
        contracts: acc.contracts + r.contracts,
        missingCount: acc.missingCount + r.missing.length,
        rendererCount: acc.rendererCount + 1,
      }),
      { propFields: 0, contracts: 0, missingCount: 0, rendererCount: 0 },
    );
    const coverage = totals.propFields > 0 ? totals.contracts / totals.propFields : 0;

    console.log('=== plan 462 — propContracts coverage (Phase 1 baseline) ===');
    console.log(`Total renderers scanned: ${totals.rendererCount}`);
    console.log(`Total prop field declarations: ${totals.propFields}`);
    console.log(`Total propContracts entries:  ${totals.contracts}`);
    console.log(`Coverage: ${(coverage * 100).toFixed(1)}%`);
    console.log(`Missing field entries:       ${totals.missingCount}`);
    console.log('Top 10 renderers with most missing propContracts:');
    for (const r of rows.slice(0, 10)) {
      console.log(`  ${r.type.padEnd(28)} fields=${r.propFields} contracts=${r.contracts} missing=[${r.missing.join(', ')}]`);
    }

    expect(totals.rendererCount).toBeGreaterThan(0);
    // Baseline assertion: write the coverage as a soft floor for Phase 2-8
    // to push past. The test passes at any coverage ≥ 0%; the value is
    // a numeric witness in the test report, not a fail-fast gate.
    expect(coverage).toBeGreaterThanOrEqual(0);
  });

  it('reproduces the plan 461 bug + verifies the Phase 2 fix: live flex.direction="col" is rejected with invalid-property-value', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerContentRenderers(registry);
    registerLayoutRenderers(registry);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const diagnostics =
      compiler.validate?.(
        { type: 'flex', direction: 'col', items: [] } as never,
        { schemaUrl: 't://repro' } as never,
      ) ?? [];
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    console.log(
      `live flex.direction="col" → ${diagnostics.length} diagnostics, ${valueErrors.length} invalid-property-value (Phase 2+ witness)`,
    );
    if (valueErrors.length > 0) {
      console.log(`  message: ${valueErrors[0].message.slice(0, 300)}`);
    }

    // Phase 2 (2026-08-23): the live `flex` renderer now has a
    // `propContracts.direction` union, so the plan 461 demo typo
    // `direction: "col"` is now caught at compile time. Before
    // Phase 2 this test deliberately asserted length 0 (witnessing
    // the gap); the assertion is now inverted to lock the fix in.
    expect(valueErrors.length).toBeGreaterThanOrEqual(1);
    expect(valueErrors[0].message).toMatch(/row/);
    expect(valueErrors[0].message).toMatch(/column/);
  });
});
