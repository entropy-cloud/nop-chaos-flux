import { describe, expect, it } from 'vitest';
import type { ActionResult } from '@nop-chaos/flux-core';
import {
  classifyActionResult,
  createCancelledResult,
  createTimedOutResult,
  isFailureClass,
  normalizeActionResult,
  createBranchEvaluationBindings,
  createInteractionId,
} from '../action-core.js';

describe('ActionResult classification', () => {
  it('classifies simple success', () => {
    const result: ActionResult = { ok: true };
    expect(classifyActionResult(result)).toBe('success');
  });

  it('classifies success with data', () => {
    const result: ActionResult = { ok: true, data: { items: [1, 2, 3] } };
    expect(classifyActionResult(result)).toBe('success');
  });

  it('classifies simple failure', () => {
    const result: ActionResult = { ok: false };
    expect(classifyActionResult(result)).toBe('failure');
  });

  it('classifies failure with error', () => {
    const result: ActionResult = { ok: false, error: new Error('network') };
    expect(classifyActionResult(result)).toBe('failure');
  });

  it('classifies cancelled success as cancelled', () => {
    const result: ActionResult = { ok: true, cancelled: true };
    expect(classifyActionResult(result)).toBe('cancelled');
  });

  it('classifies timed-out success as cancelled', () => {
    const result: ActionResult = { ok: true, timedOut: true };
    expect(classifyActionResult(result)).toBe('cancelled');
  });

  it('classifies cancelled failure as cancelled', () => {
    const result: ActionResult = { ok: false, cancelled: true };
    expect(classifyActionResult(result)).toBe('cancelled');
  });

  it('classifies timed-out failure as cancelled', () => {
    const result: ActionResult = { ok: false, timedOut: true };
    expect(classifyActionResult(result)).toBe('cancelled');
  });

  it('classifies skipped as neutral', () => {
    const result: ActionResult = { ok: true, skipped: true };
    expect(classifyActionResult(result)).toBe('neutral');
  });

  it('classifies skipped false ok as success', () => {
    const result: ActionResult = { ok: true, skipped: false };
    expect(classifyActionResult(result)).toBe('success');
  });
});

describe('isFailureClass', () => {
  it('returns true for ok:false', () => {
    expect(isFailureClass({ ok: false })).toBe(true);
  });

  it('returns false for cancelled', () => {
    expect(isFailureClass({ ok: false, cancelled: true })).toBe(false);
  });

  it('returns false for timedOut', () => {
    expect(isFailureClass({ ok: false, timedOut: true })).toBe(false);
  });

  it('returns false for success', () => {
    expect(isFailureClass({ ok: true })).toBe(false);
  });

  it('returns false for skipped', () => {
    expect(isFailureClass({ ok: true, skipped: true })).toBe(false);
  });

  it('returns false for success with data', () => {
    expect(isFailureClass({ ok: true, data: 42 })).toBe(false);
  });
});

describe('createCancelledResult', () => {
  it('creates result with cancelled flag', () => {
    const result = createCancelledResult();
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('preserves error object', () => {
    const error = new Error('user abort');
    const result = createCancelledResult(error);
    expect(result.error).toBe(error);
  });

  it('preserves non-Error error', () => {
    const result = createCancelledResult('string-error');
    expect(result.error).toBe('string-error');
  });
});

describe('createTimedOutResult', () => {
  it('creates result with timedOut and cancelled flags', () => {
    const result = createTimedOutResult();
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('preserves error', () => {
    const error = new Error('timeout');
    const result = createTimedOutResult(error);
    expect(result.error).toBe(error);
  });
});

describe('normalizeActionResult', () => {
  it('passes through valid ActionResult with ok:true', () => {
    const result: ActionResult = { ok: true, data: 'hello' };
    expect(normalizeActionResult(result)).toBe(result);
  });

  it('passes through valid ActionResult with ok:false', () => {
    const result: ActionResult = { ok: false, error: new Error('x') };
    expect(normalizeActionResult(result)).toBe(result);
  });

  it('wraps string value', () => {
    expect(normalizeActionResult('hello')).toEqual({ ok: true, data: 'hello' });
  });

  it('wraps number value', () => {
    expect(normalizeActionResult(42)).toEqual({ ok: true, data: 42 });
  });

  it('wraps object value', () => {
    expect(normalizeActionResult({ x: 1 })).toEqual({ ok: true, data: { x: 1 } });
  });

  it('wraps null', () => {
    expect(normalizeActionResult(null)).toEqual({ ok: true, data: null });
  });

  it('wraps undefined', () => {
    expect(normalizeActionResult(undefined)).toEqual({ ok: true, data: undefined });
  });

  it('wraps boolean', () => {
    expect(normalizeActionResult(true)).toEqual({ ok: true, data: true });
  });
});

describe('createBranchEvaluationBindings result classification integration', () => {
  it('exposes error for failure result', () => {
    const result: ActionResult = { ok: false, error: new Error('fail') };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.result).toBe(result);
    expect(bindings.error).toBeInstanceOf(Error);
  });

  it('hides error for success result', () => {
    const result: ActionResult = { ok: true, data: 'ok' };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.error).toBeUndefined();
  });

  it('does not expose error for cancelled result', () => {
    const error = new Error('cancelled');
    const result: ActionResult = { ok: false, cancelled: true, error };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.error).toBeUndefined();
  });

  it('chains prevResult through multiple branches', () => {
    const first: ActionResult = { ok: true, data: 1 };
    const second: ActionResult = { ok: true, data: 2 };
    const bindings = createBranchEvaluationBindings(second, first);
    expect(bindings.prevResult).toBe(first);
    expect(bindings.result).toBe(second);
  });
});

describe('createInteractionId uniqueness', () => {
  it('produces unique ids across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createInteractionId());
    }
    expect(ids.size).toBe(100);
  });

  it('uses interaction- prefix', () => {
    const id = createInteractionId();
    expect(id).toMatch(/^interaction-\d+$/);
  });
});
