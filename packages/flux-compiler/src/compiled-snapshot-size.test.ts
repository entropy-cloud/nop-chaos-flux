import { describe, expect, it } from 'vitest';
import type { FluxSchemaDefinitionShape, RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './schema-compiler.js';

/**
 * §5.3 / Cross-Cutting 2 machine gate (RM-14, plan 619): the per-node compiled
 * snapshot must not grow. A representative multi-node fixture is compiled and
 * the deterministic JSON serialization size of the resulting template node
 * (function values dropped by `JSON.stringify`) is asserted against a recorded
 * byte budget.
 *
 * Ratchet protocol: the baseline may only be raised DELIBERATELY when a change
 * legitimately needs more compiled payload — raise the constant and state the
 * reason in the commit message. Never lower it silently; never "fix" a red by
 * deleting fixture coverage.
 */

const panelFixtureDefinition: RegisteredRendererDefinition = {
  type: 'panel-fixture',
  displayName: 'Panel Fixture',
  component: () => null,
  fields: [
    { key: 'title', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Title' } },
    {
      key: 'onClick',
      kind: 'event',
      contract: { displayName: 'Click', description: 'Panel clicked.' },
    },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
} as unknown as RegisteredRendererDefinition & FluxSchemaDefinitionShape;

const textFieldFixtureDefinition: RegisteredRendererDefinition = {
  type: 'text-fixture',
  displayName: 'Text Fixture',
  component: () => null,
  fields: [
    {
      key: 'value',
      kind: 'prop',
      contract: {
        shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
        displayName: 'Value',
      },
    },
  ],
} as unknown as RegisteredRendererDefinition & FluxSchemaDefinitionShape;

const SNAPSHOT_FIXTURE_REGISTRY = createRendererRegistry([
  panelFixtureDefinition,
  textFieldFixtureDefinition,
]);

const SNAPSHOT_FIXTURE_SCHEMA = {
  type: 'panel-fixture',
  title: 'Snapshot budget fixture',
  onClick: { action: 'showToast', args: { message: 'clicked' } },
  body: [
    { type: 'text-fixture', value: 'one' },
    { type: 'text-fixture', value: '${1 + 1}' },
    {
      type: 'panel-fixture',
      title: 'nested',
      body: [{ type: 'text-fixture', value: 'deep' }],
    },
  ],
};

function compileSnapshotFixtureNode() {
  const compiler = createSchemaCompiler({ registry: SNAPSHOT_FIXTURE_REGISTRY });
  const panelRenderer = SNAPSHOT_FIXTURE_REGISTRY.get('panel-fixture')!;
  return compiler.compileNode(SNAPSHOT_FIXTURE_SCHEMA as never, {
    path: '$',
    renderer: panelRenderer,
  });
}

const dropFunctions = (_key: string, value: unknown): unknown =>
  typeof value === 'function' ? undefined : value;

function snapshotByteSize(): number {
  return JSON.stringify(compileSnapshotFixtureNode(), dropFunctions).length;
}

// Recorded on the current tree at RM-14 (plan 619). Ratchet: raise only with a
// deliberate, justified change to the compiled snapshot payload.
const COMPILED_SNAPSHOT_BYTE_BUDGET = 5_000; // measured 4,928 on the RM-14 tree (plan 619); ratchet — raise only deliberately

describe('§5.3 compiled snapshot size budget (Cross-Cutting 2 ratchet)', () => {
  it('representative fixture compiles deterministically', () => {
    const a = JSON.stringify(compileSnapshotFixtureNode(), dropFunctions);
    const b = JSON.stringify(compileSnapshotFixtureNode(), dropFunctions);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('compiled snapshot payload stays within the recorded byte budget', () => {
    const size = snapshotByteSize();
    expect(
      size,
      `compiled snapshot grew to ${size} bytes (budget ${COMPILED_SNAPSHOT_BYTE_BUDGET}). ` +
        'If the growth is deliberate, raise COMPILED_SNAPSHOT_BYTE_BUDGET and justify it in the commit message.',
    ).toBeLessThanOrEqual(COMPILED_SNAPSHOT_BYTE_BUDGET);
  });
});
