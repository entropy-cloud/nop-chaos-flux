import { describe, expect, it } from 'vitest';
import type { ActionResult, ScopeRef } from '@nop-chaos/flux-core';
import {
  classifyActionResult,
  createBranchEvaluationBindings,
  createCancelledResult,
  createInteractionId,
  createTimedOutResult,
  getNumericControl,
  getRetryControl,
  isAbortError,
  isFailureClass,
  mergeEvaluationBindings,
  normalizeActionResult,
  withEvaluationBindings,
} from '../action-core.js';

function createMockScope(data: Record<string, unknown>): ScopeRef {
  const store = {
    getState: () => ({ data }),
    subscribe: () => () => {},
    getSnapshot: () => data,
    getLastChange: () => undefined,
    setSnapshot: () => {},
  };
  return {
    id: 'scope-1',
    path: 'scope',
    parent: undefined,
    store,
    value: data,
    get: (path: string) => {
      const segments = path.split('.');
      let current: unknown = data;
      for (const seg of segments) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[seg];
      }
      return current;
    },
    has: (path: string) => {
      const segments = path.split('.');
      let current: unknown = data;
      for (const seg of segments) {
        if (current == null || typeof current !== 'object') return false;
        if (!(seg in (current as Record<string, unknown>))) return false;
        current = (current as Record<string, unknown>)[seg];
      }
      return true;
    },
    readOwn: () => ({ ...data }),
    readVisible: () => ({ ...data }),
    materializeVisible: () => ({ ...data }),
    update: () => {},
    merge: () => {},
  };
}

describe('createInteractionId', () => {
  it('generates unique sequential ids', () => {
    const id1 = createInteractionId();
    const id2 = createInteractionId();
    expect(id1).toMatch(/^interaction-\d+$/);
    expect(id2).toMatch(/^interaction-\d+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('createCancelledResult', () => {
  it('returns a cancelled result', () => {
    const result = createCancelledResult();
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('preserves error', () => {
    const result = createCancelledResult(new Error('abort'));
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('createTimedOutResult', () => {
  it('returns a timed-out cancelled result', () => {
    const result = createTimedOutResult();
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBe(true);
  });
});

describe('classifyActionResult', () => {
  it('classifies skipped as neutral', () => {
    expect(classifyActionResult({ ok: true, skipped: true })).toBe('neutral');
  });

  it('classifies ok result as success', () => {
    expect(classifyActionResult({ ok: true })).toBe('success');
  });

  it('classifies failure as failure', () => {
    expect(classifyActionResult({ ok: false })).toBe('failure');
  });

  it('classifies cancelled as failure', () => {
    expect(classifyActionResult({ ok: true, cancelled: true })).toBe('failure');
  });

  it('classifies timed out as failure', () => {
    expect(classifyActionResult({ ok: true, timedOut: true })).toBe('failure');
  });
});

describe('isFailureClass', () => {
  it('returns true for failure results', () => {
    expect(isFailureClass({ ok: false })).toBe(true);
  });

  it('returns false for success results', () => {
    expect(isFailureClass({ ok: true })).toBe(false);
  });

  it('returns false for skipped results', () => {
    expect(isFailureClass({ ok: true, skipped: true })).toBe(false);
  });
});

describe('normalizeActionResult', () => {
  it('passes through valid ActionResult', () => {
    const result: ActionResult = { ok: true, data: 'hello' };
    expect(normalizeActionResult(result)).toBe(result);
  });

  it('wraps non-ActionResult value', () => {
    const result = normalizeActionResult('raw-value');
    expect(result).toEqual({ ok: true, data: 'raw-value' });
  });

  it('wraps null', () => {
    const result = normalizeActionResult(null);
    expect(result).toEqual({ ok: true, data: null });
  });

  it('wraps undefined', () => {
    const result = normalizeActionResult(undefined);
    expect(result).toEqual({ ok: true, data: undefined });
  });
});

describe('createBranchEvaluationBindings', () => {
  it('creates bindings with result and error for failure', () => {
    const result: ActionResult = { ok: false, error: new Error('fail') };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.result).toBe(result);
    expect(bindings.error).toBeInstanceOf(Error);
    expect(bindings.prevResult).toBeUndefined();
  });

  it('omits error for success result', () => {
    const result: ActionResult = { ok: true, data: 42 };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.result).toBe(result);
    expect(bindings.error).toBeUndefined();
  });

  it('includes prevResult', () => {
    const prev: ActionResult = { ok: true, data: 1 };
    const curr: ActionResult = { ok: true, data: 2 };
    const bindings = createBranchEvaluationBindings(curr, prev);
    expect(bindings.prevResult).toBe(prev);
  });
});

describe('mergeEvaluationBindings', () => {
  it('returns next when base is undefined', () => {
    const next = { x: 1 };
    expect(mergeEvaluationBindings(undefined, next)).toBe(next);
  });

  it('merges base and next', () => {
    const base = { x: 1, y: 2 };
    const next = { y: 3, z: 4 };
    expect(mergeEvaluationBindings(base, next)).toEqual({ x: 1, y: 3, z: 4 });
  });
});

describe('getNumericControl', () => {
  it('returns number for finite numbers', () => {
    expect(getNumericControl(42)).toBe(42);
    expect(getNumericControl(0)).toBe(0);
    expect(getNumericControl(-1)).toBe(-1);
  });

  it('returns undefined for non-numbers', () => {
    expect(getNumericControl('42')).toBeUndefined();
    expect(getNumericControl(true)).toBeUndefined();
    expect(getNumericControl(null)).toBeUndefined();
    expect(getNumericControl(undefined)).toBeUndefined();
  });

  it('returns undefined for NaN and Infinity', () => {
    expect(getNumericControl(NaN)).toBeUndefined();
    expect(getNumericControl(Infinity)).toBeUndefined();
    expect(getNumericControl(-Infinity)).toBeUndefined();
  });
});

describe('getRetryControl', () => {
  it('returns undefined for non-object input', () => {
    expect(getRetryControl(null)).toBeUndefined();
    expect(getRetryControl('retry')).toBeUndefined();
    expect(getRetryControl([])).toBeUndefined();
  });

  it('returns undefined when times is missing', () => {
    expect(getRetryControl({ delay: 100 })).toBeUndefined();
  });

  it('parses valid retry config', () => {
    expect(getRetryControl({ times: 3, delay: 100, strategy: 'fixed' })).toEqual({
      times: 3,
      delay: 100,
      strategy: 'fixed',
      maxDelay: undefined,
    });
  });

  it('parses exponential strategy', () => {
    expect(getRetryControl({ times: 3, strategy: 'exponential' })).toEqual({
      times: 3,
      delay: undefined,
      strategy: 'exponential',
      maxDelay: undefined,
    });
  });

  it('ignores invalid strategy', () => {
    expect(getRetryControl({ times: 3, strategy: 'linear' })).toEqual({
      times: 3,
      delay: undefined,
      strategy: undefined,
      maxDelay: undefined,
    });
  });
});

describe('isAbortError', () => {
  it('returns true for DOMException with AbortError name', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('returns true for abort-like objects used by runtime tests and adapters', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ code: 'ABORT_ERR' })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isAbortError(new Error(' AbortError'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(new DOMException('timeout', 'TimeoutError'))).toBe(false);
  });
});

describe('withEvaluationBindings', () => {
  it('returns original scope when bindings are empty', () => {
    const scope = createMockScope({ x: 1 });
    const result = withEvaluationBindings(scope, undefined);
    expect(result).toBe(scope);
  });

  it('returns original scope when bindings are empty object', () => {
    const scope = createMockScope({ x: 1 });
    const result = withEvaluationBindings(scope, {});
    expect(result).toBe(scope);
  });

  it('overlays bindings on scope.get', () => {
    const scope = createMockScope({ x: 1, y: 2 });
    const wrapped = withEvaluationBindings(scope, { y: 99, z: 100 });
    expect(wrapped.get('x')).toBe(1);
    expect(wrapped.get('y')).toBe(99);
    expect(wrapped.get('z')).toBe(100);
  });

  it('overlays bindings on scope.has', () => {
    const scope = createMockScope({ x: 1 });
    const wrapped = withEvaluationBindings(scope, { y: 2 });
    expect(wrapped.has('x')).toBe(true);
    expect(wrapped.has('y')).toBe(true);
  });

  it('merges bindings into readVisible', () => {
    const scope = createMockScope({ x: 1 });
    const wrapped = withEvaluationBindings(scope, { y: 2 });
    const visible = wrapped.readVisible();
    expect(visible.x).toBe(1);
    expect(visible.y).toBe(2);
  });

  it('supports nested path access via bindings', () => {
    const scope = createMockScope({});
    const wrapped = withEvaluationBindings(scope, { nested: { a: 10 } });
    expect(wrapped.get('nested.a')).toBe(10);
  });

  it('delegates update and merge to original scope', () => {
    const scope = createMockScope({ x: 1 });
    const wrapped = withEvaluationBindings(scope, { y: 2 });
    expect(() => wrapped.update('x', 99)).not.toThrow();
    expect(() => wrapped.merge({ x: 99 })).not.toThrow();
  });
});
