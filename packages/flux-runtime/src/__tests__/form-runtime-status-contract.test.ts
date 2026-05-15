import { describe, expect, it } from 'vitest';
import {
  buildFormStatusSummary,
  hasPendingValidationWork,
} from '../form-runtime-status.js';
import type { FormStoreState, FieldState } from '@nop-chaos/flux-core';

function makeState(overrides: Partial<FormStoreState> = {}): FormStoreState {
  return {
    values: {},
    submitting: false,
    submitAttempted: false,
    fieldStates: {},
    ...overrides,
  };
}

function field(overrides: Record<string, unknown> = {}): FieldState {
  return overrides as FieldState;
}

describe('buildFormStatusSummary edge cases', () => {
  it('empty form: no fields → valid, not dirty, not touched, not visited', () => {
    const summary = buildFormStatusSummary(makeState(), 'f1', 'empty');
    expect(summary).toEqual({
      id: 'f1',
      name: 'empty',
      submitting: false,
      validating: false,
      dirty: false,
      touched: false,
      visited: false,
      hasErrors: false,
      errorCount: 0,
      valid: true,
      invalid: false,
    });
  });

  it('fields with empty errors array contribute 0 errors', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({ errors: [] }),
          b: field({ errors: [] }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.errorCount).toBe(0);
    expect(summary.hasErrors).toBe(false);
    expect(summary.valid).toBe(true);
    expect(summary.invalid).toBe(false);
  });

  it('fields with undefined errors contribute 0 errors', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: { a: field() },
      }),
      'f1',
      undefined,
    );
    expect(summary.errorCount).toBe(0);
    expect(summary.valid).toBe(true);
  });

  it('single field with one error', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          name: field({
            errors: [{ path: 'name', rule: 'required', message: 'required' }],
          }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.errorCount).toBe(1);
    expect(summary.hasErrors).toBe(true);
    expect(summary.valid).toBe(false);
    expect(summary.invalid).toBe(true);
  });

  it('multiple fields with errors sum errorCount', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({ errors: [{ path: 'a', rule: 'required', message: 'e1' }] }),
          b: field({ errors: [{ path: 'b1', rule: 'required', message: 'e2' }, { path: 'b2', rule: 'required', message: 'e3' }] }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.errorCount).toBe(3);
  });

  it('dirty is true if ANY field is dirty', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field(),
          b: field({ dirty: true }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.dirty).toBe(true);
  });

  it('touched is true if ANY field is touched', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({ touched: true }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.touched).toBe(true);
  });

  it('visited is true if ANY field is visited', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({ visited: true }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary.visited).toBe(true);
  });

  it('submitting reflects state.submitting directly', () => {
    const summary = buildFormStatusSummary(
      makeState({ submitting: true }),
      'f1',
      undefined,
    );
    expect(summary.submitting).toBe(true);
  });

  it('validating is true if any field has validating=true', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({ validating: true }),
        },
      }),
      'f1',
      undefined,
      0,
    );
    expect(summary.validating).toBe(true);
  });

  it('validating is false if no field validates and debounce count is 0', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: { a: field() },
      }),
      'f1',
      undefined,
      0,
    );
    expect(summary.validating).toBe(false);
  });

  it('validating is true when pendingValidationDebounceCount > 0 even with no validating fields', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: { a: field() },
      }),
      'f1',
      undefined,
      2,
    );
    expect(summary.validating).toBe(true);
  });

  it('id and name pass through as-is including undefined', () => {
    const s1 = buildFormStatusSummary(makeState(), undefined, undefined);
    expect(s1.id).toBeUndefined();
    expect(s1.name).toBeUndefined();

    const s2 = buildFormStatusSummary(makeState(), 'id-1', 'name-1');
    expect(s2.id).toBe('id-1');
    expect(s2.name).toBe('name-1');
  });

  it('form with errors AND dirty AND touched AND visited all true', () => {
    const summary = buildFormStatusSummary(
      makeState({
        fieldStates: {
          a: field({
            errors: [{ path: 'a', rule: 'required', message: 'e' }],
            validating: true,
            dirty: true,
            touched: true,
            visited: true,
          }),
        },
      }),
      'f1',
      undefined,
    );
    expect(summary).toEqual(
      expect.objectContaining({
        dirty: true,
        touched: true,
        visited: true,
        hasErrors: true,
        errorCount: 1,
        valid: false,
        invalid: true,
      }),
    );
  });

  it('prefers incremental summary counters over broad field-state scanning when available', () => {
    const fieldStates = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('should not enumerate fieldStates');
        },
      },
    ) as FormStoreState['fieldStates'];

    const summaryWithCounters = buildFormStatusSummary(
      {
        ...makeState({ fieldStates } as Partial<FormStoreState>),
        summary: {
          errorCount: 2,
          dirtyCount: 1,
          touchedCount: 0,
          visitedCount: 1,
          validatingCount: 1,
        },
      } as FormStoreState,
      'f1',
      'profile',
    );

    expect(summaryWithCounters).toEqual(
      expect.objectContaining({
        errorCount: 2,
        hasErrors: true,
        dirty: true,
        touched: false,
        visited: true,
        validating: true,
      }),
    );
  });

  it('submitAttempted from state is NOT propagated to summary', () => {
    const summary = buildFormStatusSummary(
      makeState({ submitAttempted: true }),
      'f1',
      undefined,
    );
    expect((summary as unknown as Record<string, unknown>)['submitAttempted']).toBeUndefined();
  });
});

describe('hasPendingValidationWork', () => {
  it('returns false when no field is validating and debounce count is 0', () => {
    expect(
      hasPendingValidationWork(
        makeState({ fieldStates: { a: field() } }),
        0,
      ),
    ).toBe(false);
  });

  it('returns true when a field is validating', () => {
    expect(
      hasPendingValidationWork(
        makeState({ fieldStates: { a: field({ validating: true }) } }),
        0,
      ),
    ).toBe(true);
  });

  it('returns true when pendingValidationDebounceCount > 0', () => {
    expect(hasPendingValidationWork(makeState(), 1)).toBe(true);
    expect(hasPendingValidationWork(makeState(), 5)).toBe(true);
  });

  it('returns false when pendingValidationDebounceCount is 0 and no fields', () => {
    expect(hasPendingValidationWork(makeState(), 0)).toBe(false);
  });

  it('returns true when both field validating and debounce > 0', () => {
    expect(
      hasPendingValidationWork(
        makeState({ fieldStates: { a: field({ validating: true }) } }),
        1,
      ),
    ).toBe(true);
  });
});
