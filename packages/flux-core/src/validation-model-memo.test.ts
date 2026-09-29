import { describe, expect, it } from 'vitest';
import { getCompiledValidationField, resolveHiddenFieldPolicy } from './validation-model.js';
import type { CompiledFormValidationModel } from './types.js';

function makeModel(): CompiledFormValidationModel {
  return {
    defaultHiddenFieldPolicy: undefined,
    nodes: {
      username: {
        kind: 'input',
        path: 'username',
        controlType: 'input-text',
        label: 'Username',
        rules: [{ type: 'required' } as never],
        behavior: { validateWhen: 'change' } as never,
      },
      group: {
        kind: 'form',
        path: 'group',
      },
    },
  } as unknown as CompiledFormValidationModel;
}

describe('getCompiledValidationField per-model memo (plan 2026-09-29-3 Phase 2)', () => {
  it('same model + path returns the identical projected object reference', () => {
    const model = makeModel();
    const first = getCompiledValidationField(model, 'username');
    const second = getCompiledValidationField(model, 'username');
    expect(second).toBe(first);
    expect(first?.path).toBe('username');
  });

  it('negative lookups are also memoized (stable undefined)', () => {
    const model = makeModel();
    expect(getCompiledValidationField(model, 'missing')).toBeUndefined();
    expect(getCompiledValidationField(model, 'missing')).toBeUndefined();
    // the form-kind node is not a field node — projected as undefined, memoized
    expect(getCompiledValidationField(model, 'group')).toBeUndefined();
  });

  it('a new model generation yields a fresh projection (no cross-model staleness)', () => {
    const modelA = makeModel();
    const modelB = makeModel();
    const fromA = getCompiledValidationField(modelA, 'username');
    const fromB = getCompiledValidationField(modelB, 'username');
    expect(fromB).not.toBe(fromA);
    expect(fromB).toEqual(fromA);
  });

  it('contract pin: in-place model mutation does NOT refresh the memo — replace the model object', () => {
    // The memo is keyed by model object identity and assumes compiled models
    // are immutable per generation. Mutating `model.nodes` in place is
    // UNSUPPORTED and deliberately serves the stale projection (pinned here so
    // the contract is explicit); the supported update path is a new model
    // object (covered by the generation test above).
    const model = makeModel();
    const before = getCompiledValidationField(model, 'username');
    const mutatedNodes: Record<string, unknown> = { ...(model.nodes as Record<string, unknown>) };
    mutatedNodes.username = { ...(mutatedNodes.username as Record<string, unknown>), controlType: 'input-number' };
    model.nodes = mutatedNodes as typeof model.nodes;
    const after = getCompiledValidationField(model, 'username');
    expect(after).toBe(before);
  });

  it('policy resolution stays untouched (baseline sanity)', () => {
    expect(resolveHiddenFieldPolicy(undefined, undefined)).toEqual({
      validateWhenHidden: false,
      clearValueWhenHidden: false,
    });
  });
});
