import { describe, expect, it, vi } from 'vitest';
import { executeFormSubmit } from '../form-runtime-submit-flow.js';

// FM-3 plan 644: hidden-field submit payload projection (C10 owner contract,
// docs/architecture/form-validation.md:891-900). Extracted from
// form-runtime-submit-flow.test.ts (oversized-file gate); harness mirrors the
// submit-flow tests' minimal store/sharedState doubles.

function createStoreState(overrides: Record<string, any> = {}) {
  return {
    fieldStates: {},
    values: { name: 'Alice' },
    ...overrides,
  };
}

function createSubmitInput(overrides: Record<string, any> = {}) {
  const state = createStoreState(overrides.storeState);
  const store = {
    getState: () => state,
    setSubmitAttempted: vi.fn(),
    setSubmitting: vi.fn(),
    batchUpdate: vi.fn((patch) => {
      if (patch.fieldStates) {
        state.fieldStates = patch.fieldStates;
      }
    }),
  } as any;

  let submitting = false;

  const sharedState = {
    store,
    lifecycleState: 'active',
    runtimeFieldRegistrations: new Map(),
    childContracts: new Map(),
    ...(overrides.sharedState ?? {}),
  } as any;

  return {
    store,
    submittingState: {
      get: () => submitting,
      set: (value: boolean) => {
        submitting = value;
      },
    },
    input: {
      sharedState,
      ownerRuntime: {
        supersedeLowerPriorityWork: vi.fn(),
      },
      defaultValidationTriggers: ['blur'],
      submittingDelay: 0,
      getIsSubmitting: () => submitting,
      setIsSubmitting: (value: boolean) => {
        submitting = value;
      },
      getLifecycleHandlers: () => undefined,
      getCurrentValidation: () => undefined,
      validateForm: vi.fn().mockResolvedValue({ ok: true, errors: [], fieldErrors: {} }),
      ...(overrides.input ?? {}),
    },
  };
}

describe('FM-3: hidden field submit payload projection (C10 owner contract)', () => {
  // Known residual boundary (disclosed, outside the owner doc's literal
  // scope): when a whole ARRAY ITEM path is excluded (e.g. `list.0`), the
  // item is projected as undefined wholesale, so a clearValueWhenHidden
  // descendant under it cannot keep its key — the doc describes per-key
  // object-tree projection only and does not define that combination.
  function createValidationModel(nodes: Record<string, any>) {
    return {
      order: Object.keys(nodes),
      behavior: { triggers: ['change'], showErrorOn: ['blur'] },
      dependents: {},
      nodes,
    } as any;
  }

  function createFieldNode(path: string, hiddenFieldPolicy?: Record<string, boolean>) {
    return {
      path,
      kind: 'field',
      controlType: 'input',
      rules: [],
      behavior: { triggers: ['change'], showErrorOn: ['blur'] },
      children: [],
      ...(hiddenFieldPolicy ? { hiddenFieldPolicy } : {}),
    };
  }

  it('FM-3: excludes hidden field paths (nested object, array item, unregistered) from the submit payload', async () => {
    const validation = createValidationModel({
      'profile.secret': createFieldNode('profile.secret'),
      'list.0.secret': createFieldNode('list.0.secret'),
      'list.1.secret': createFieldNode('list.1.secret'),
    });
    const setup = createSubmitInput({
      storeState: {
        values: {
          name: 'Alice',
          profile: { nickname: 'nick', secret: 's1' },
          list: [
            { secret: 's2', keep: 'k1' },
            { secret: 's3', keep: 'k2' },
          ],
          ghost: 'boo',
        },
      },
      sharedState: {
        hiddenFields: new Set(['profile.secret', 'list.0.secret', 'list.1.secret', 'ghost']),
      },
      input: { getCurrentValidation: () => validation },
    });

    const result = await executeFormSubmit(setup.input);

    expect(result.ok).toBe(true);
    expect(result.data).toStrictEqual({
      name: 'Alice',
      profile: { nickname: 'nick' },
      list: [{ keep: 'k1' }, { keep: 'k2' }],
    });
  });

  it('FM-3: a hidden parent path projects its whole subtree out of the submit payload', async () => {
    const validation = createValidationModel({
      profile: {
        path: 'profile',
        kind: 'object',
        rules: [],
        children: ['profile.nickname', 'profile.secret'],
      },
    });
    const setup = createSubmitInput({
      storeState: { values: { name: 'Alice', profile: { nickname: 'nick', secret: 's1' } } },
      sharedState: { hiddenFields: new Set(['profile']) },
      input: { getCurrentValidation: () => validation },
    });

    const result = await executeFormSubmit(setup.input);

    expect(result.ok).toBe(true);
    expect(result.data).toStrictEqual({ name: 'Alice' });
  });

  it('FM-3: keeps clearValueWhenHidden hidden field values in the submit payload', async () => {
    const validation = createValidationModel({
      kept: createFieldNode('kept', { clearValueWhenHidden: true }),
    });
    const setup = createSubmitInput({
      storeState: { values: { name: 'Alice', kept: 'still-here' } },
      sharedState: { hiddenFields: new Set(['kept']) },
      input: { getCurrentValidation: () => validation },
    });

    const result = await executeFormSubmit(setup.input);

    expect(result.ok).toBe(true);
    expect(result.data).toStrictEqual({ name: 'Alice', kept: 'still-here' });
  });

  it('FM-3: keeps the key of a value-cleared clearValueWhenHidden field in the submit payload (C10 point 2)', async () => {
    // Mirrors the live flow: notifyFieldHidden clears an opted-in field with
    // setValue(path, undefined), so the store holds { cleared: undefined }.
    // C10 point 2 (docs/architecture/form-validation.md): the key remains in
    // the submitted payload with an undefined value.
    const validation = createValidationModel({
      secret: createFieldNode('secret'),
      cleared: createFieldNode('cleared', { clearValueWhenHidden: true }),
    });
    const setup = createSubmitInput({
      storeState: { values: { name: 'Alice', secret: 'excluded-secret', cleared: undefined } },
      sharedState: { hiddenFields: new Set(['secret', 'cleared']) },
      input: { getCurrentValidation: () => validation },
    });

    const result = await executeFormSubmit(setup.input);

    expect(result.ok).toBe(true);
    expect('cleared' in (result.data as Record<string, unknown>)).toBe(true);
    expect(result.data).toStrictEqual({ name: 'Alice', cleared: undefined });
  });
});
