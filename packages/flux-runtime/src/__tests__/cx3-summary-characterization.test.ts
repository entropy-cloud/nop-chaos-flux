import { describe, expect, it } from 'vitest';
import type {
  FieldState,
  FormStoreState,
  ValidationError,
} from '@nop-chaos/flux-core';
import { createFormStore } from '../form-store.js';
import { createOwnedFormStore } from '../form-store-owned.js';
import { buildFormStatusSummary } from '../form-runtime-status.js';

type FormStoreSummaryState = {
  errorCount: number;
  dirtyCount: number;
  touchedCount: number;
  visitedCount: number;
  validatingCount: number;
};


function err(path: string, message: string): ValidationError {
  return { path, message, rule: 'required' };
}

function asSummary(state: unknown): FormStoreSummaryState {
  return (state as { summary?: FormStoreSummaryState }).summary as never;
}


describe('CX-3 characterization: summary counters (WA-runtime-002)', () => {
  it('form-store counts strictly ===true: non-boolean truthy flags contribute zero', () => {
    const store = createFormStore({});
    store.batchUpdate({
      fieldStates: {
        a: { dirty: 'yes', touched: 1, visited: 'x', validating: [] } as unknown as FieldState,
      },
    });
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
  });

  it('form-store counts boolean flags and error payloads exactly', () => {
    const store = createFormStore({});
    store.batchUpdate({
      fieldStates: {
        a: { dirty: true, touched: true, visited: true, validating: true },
        b: { errors: [err('b', 'e1'), err('b', 'e2')] },
        c: {},
      },
    });
    expect(asSummary(store.getState())).toEqual({
      errorCount: 2,
      dirtyCount: 1,
      touchedCount: 1,
      visitedCount: 1,
      validatingCount: 1,
    });
  });

  it('form-store maintains counters incrementally per write, including reclaim back to zero', () => {
    const store = createFormStore({});

    store.setTouched('a', true);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 1,
      visitedCount: 0,
      validatingCount: 0,
    });

    store.setPathErrors('a', [err('a', 'e1')]);
    expect(asSummary(store.getState()).errorCount).toBe(1);

    store.setDirty('a', true);
    expect(asSummary(store.getState()).dirtyCount).toBe(1);

    store.setVisited('a', true);
    store.setValidating('a', true);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 1,
      dirtyCount: 1,
      touchedCount: 1,
      visitedCount: 1,
      validatingCount: 1,
    });

    store.setTouched('a', false);
    store.setVisited('a', false);
    store.setValidating('a', false);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 1,
      dirtyCount: 1,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });

    store.setPathErrors('a', []);
    store.setDirty('a', false);
    expect(asSummary(store.getState())).toEqual({
      errorCount: 0,
      dirtyCount: 0,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
    expect(store.getState().fieldStates['a']).toBeUndefined();
  });

  it('status fallback branch counts truthy (non-strict) flags when state.summary is absent', () => {
    const summary = buildFormStatusSummary(
      {
        values: {},
        submitting: false,
        submitAttempted: false,
        fieldStates: {
          a: { dirty: 'yes', touched: 1, validating: 'x', visited: 0 } as unknown as FieldState,
        },
      },
      'f1',
      undefined,
    );
    expect(summary.dirty).toBe(true);
    expect(summary.touched).toBe(true);
    expect(summary.validating).toBe(true);
    expect(summary.visited).toBe(false);
  });

  it('prefer-summary branch: a present summary wins even when all-zero and fieldStates disagree', () => {
    const state = {
      values: {},
      submitting: false,
      submitAttempted: false,
      fieldStates: { a: { dirty: true, touched: true } },
      summary: {
        errorCount: 0,
        dirtyCount: 0,
        touchedCount: 0,
        visitedCount: 0,
        validatingCount: 0,
      },
    } as FormStoreState;

    const summary = buildFormStatusSummary(state, 'f1', undefined);
    expect(summary.dirty).toBe(false);
    expect(summary.touched).toBe(false);
    expect(summary.errorCount).toBe(0);
  });

  it('owned store read path recomputes summary over owned-prefix field states only', () => {
    const base = createFormStore({});
    const owned = createOwnedFormStore(base, 'owner1');

    base.setPathErrors('owner1::a', [err('a', 'e1'), err('a', 'e2')]);
    base.setDirty('owner1::a', true);
    base.setTouched('unrelated', true);

    expect(owned.getState().fieldStates['a']).toEqual({
      dirty: true,
      errors: [err('a', 'e1'), err('a', 'e2')],
    });
    expect(asSummary(owned.getState())).toEqual({
      errorCount: 2,
      dirtyCount: 1,
      touchedCount: 0,
      visitedCount: 0,
      validatingCount: 0,
    });
  });
});

