/**
 * Phase 1 regression: prove that when a flex renderer has a complete
 * `propContracts.direction` union, the schema compiler rejects the
 * `direction: "col"` typo at compile time with a helpful
 * `invalid-property-value` diagnostic.
 *
 * This is the contract-level fix for the plan 461 demo issue
 * (`apps/playground/src/ai/ai-citations-example.json:6` and the
 * `ai-p4-example.json` / `ai-conversations-example.json` `direction: "col"`
 * typos that caused layout collapse). Once the live `flex` definition in
 * `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` has
 * its propContracts registered (Phase 2), these transient-renderer
 * tests should be replaced by tests that pull the real registry.
 */
import { describe, it, expect } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createFormulaCompiler, createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { FlexRenderer, ContainerRenderer } from '@nop-chaos/flux-renderers-basic';

const FLEX_DIRECTION_LITERALS = ['row', 'column', 'row-reverse', 'column-reverse'] as const;
const FLEX_ALIGN_LITERALS = ['start', 'center', 'end', 'stretch', 'baseline'] as const;
const FLEX_JUSTIFY_LITERALS = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const;

const flexRenderer: RendererDefinition = {
  type: 'flex',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  component: FlexRenderer,
  propContracts: {
    direction: {
      displayName: 'Direction',
      editorType: 'select',
      shape: { kind: 'union', anyOf: FLEX_DIRECTION_LITERALS.map((v) => ({ kind: 'literal', value: v })) },
    },
    align: {
      displayName: 'Align',
      shape: { kind: 'union', anyOf: FLEX_ALIGN_LITERALS.map((v) => ({ kind: 'literal', value: v })) },
    },
    justify: {
      displayName: 'Justify',
      shape: { kind: 'union', anyOf: FLEX_JUSTIFY_LITERALS.map((v) => ({ kind: 'literal', value: v })) },
    },
    wrap: { displayName: 'Wrap', shape: { kind: 'boolean' } },
  },
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'direction', kind: 'prop' },
    { key: 'wrap', kind: 'prop', valueType: 'boolean' },
    { key: 'align', kind: 'prop' },
    { key: 'justify', kind: 'prop' },
  ],
};

const containerRenderer: RendererDefinition = {
  type: 'container',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  component: ContainerRenderer,
  propContracts: {
    direction: {
      displayName: 'Direction',
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'row' }, { kind: 'literal', value: 'column' }] },
    },
    align: {
      displayName: 'Align',
      shape: { kind: 'union', anyOf: ['start', 'center', 'end', 'stretch'].map((v) => ({ kind: 'literal', value: v })) },
    },
    wrap: { displayName: 'Wrap', shape: { kind: 'boolean' } },
  },
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'direction', kind: 'prop' },
    { key: 'align', kind: 'prop' },
    { key: 'wrap', kind: 'prop', valueType: 'boolean' },
  ],
};

function makeCompiler() {
  const registry = createRendererRegistry([flexRenderer, containerRenderer]);
  return createSchemaCompiler({
    registry,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

describe('plan 462 — flex direction / align union enforcement (Phase 1 baseline)', () => {
  const compiler = makeCompiler();

  function validate(schema: Record<string, unknown>) {
    return compiler.validate?.(schema as never, { schemaUrl: 't://x' } as never) ?? [];
  }

  it('rejects flex.direction="col" (typo) with invalid-property-value listing all 4 valid options', () => {
    const diagnostics = validate({ type: 'flex', direction: 'col', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(1);
    const msg = valueErrors[0].message;
    for (const v of FLEX_DIRECTION_LITERALS) {
      expect(msg).toContain(`"${v}"`);
    }
    expect(msg).toContain('"col"');
  });

  it('accepts flex.direction="column" with no diagnostics', () => {
    const diagnostics = validate({ type: 'flex', direction: 'column', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(0);
  });

  it('accepts all 4 valid flex.direction values without diagnostic', () => {
    for (const v of FLEX_DIRECTION_LITERALS) {
      const diagnostics = validate({ type: 'flex', direction: v, body: [] });
      const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
      expect(valueErrors, `direction=${v} should be accepted`).toHaveLength(0);
    }
  });

  it('rejects flex.align="bogus" with invalid-property-value', () => {
    const diagnostics = validate({ type: 'flex', align: 'bogus', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(1);
    expect(valueErrors[0].message).toContain('align');
  });

  it('rejects flex.justify="middle" (close-but-wrong) listing all 6 valid options', () => {
    const diagnostics = validate({ type: 'flex', justify: 'middle', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(1);
    for (const v of FLEX_JUSTIFY_LITERALS) {
      expect(valueErrors[0].message).toContain(`"${v}"`);
    }
  });

  it('rejects flex.wrap="yes" (boolean-typed prop received non-boolean)', () => {
    const diagnostics = validate({ type: 'flex', wrap: 'yes', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    // Two independent validations fire: the boolean propContract + the
    // field rule with valueType: 'boolean'. Both are valid; we only
    // assert that *some* error mentions `wrap` and that at least one fires.
    expect(valueErrors.length).toBeGreaterThanOrEqual(1);
    expect(valueErrors.some((d) => d.message.includes('wrap'))).toBe(true);
  });

  it('accepts flex.wrap=false (boolean) with no diagnostics', () => {
    const diagnostics = validate({ type: 'flex', wrap: false, body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(0);
  });

  it('rejects container.direction="col" (typo) with invalid-property-value', () => {
    const diagnostics = validate({ type: 'container', direction: 'col', body: [] });
    const valueErrors = diagnostics.filter((d) => d.code === 'invalid-property-value');
    expect(valueErrors).toHaveLength(1);
    expect(valueErrors[0].message).toContain('"row"');
    expect(valueErrors[0].message).toContain('"column"');
  });
});
