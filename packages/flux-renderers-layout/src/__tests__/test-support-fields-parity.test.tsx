import { describe, expect, it } from 'vitest';
import { layoutRendererDefinitions } from '../layout-renderer-definitions.js';
import { wizardRendererDefinition } from '../wizard-renderer-definition.js';
import {
  stepsRendererDefinition,
  timelineRendererDefinition,
} from '../process-display-definitions.js';
import { inlineLayoutTestDefinitions } from '../test-support.js';

// Plan 863 T6: the test-support harness re-declares the 8 layout renderer
// field contracts (avoiding an import cycle with the package entry). This
// parity test pins the re-declaration to the real definitions: when a real
// fields key is added/renamed/removed, this test goes red so the harness copy
// cannot silently drift. `resizable` is intentionally out of parity scope —
// the harness never re-declared it (see plan 863 执行中裁决).
const PARITY_TYPES = [
  'wizard',
  'grid',
  'collapse',
  'responsive',
  'button-group',
  'dropdown-button',
  'steps',
  'timeline',
] as const;

const realDefinitions = [
  ...layoutRendererDefinitions,
  wizardRendererDefinition,
  stepsRendererDefinition,
  timelineRendererDefinition,
].filter((definition) => (PARITY_TYPES as readonly string[]).includes(definition.type));

describe('test-support inline layout definitions fields parity (plan 863 T6)', () => {
  const realByType = new Map(realDefinitions.map((definition) => [definition.type, definition]));
  const testByType = new Map(
    inlineLayoutTestDefinitions.map((definition) => [definition.type, definition]),
  );

  it('covers exactly the real layout definition types', () => {
    expect([...testByType.keys()].sort()).toEqual([...realByType.keys()].sort());
  });

  for (const type of realByType.keys()) {
    it(`fields keys of ${type} match the real definition`, () => {
      const real = realByType.get(type);
      const test = testByType.get(type);
      expect(test, `test-support is missing the ${type} definition`).toBeDefined();

      // unique sets: the real dropdown-button declares `label` twice
      // (value-or-region + prop overloads) — see plan 863 执行中裁决
      const realKeys = [...new Set((real?.fields ?? []).map((field) => field.key))].sort();
      const testKeys = [...new Set((test?.fields ?? []).map((field) => field.key))].sort();

      expect(testKeys, `${type} fields keys drifted from the real definition`).toEqual(realKeys);
    });
  }
});
