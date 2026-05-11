import { describe, expect, it } from 'vitest';
import { withRetry } from '../operation-control.js';
import { classifyActionResult, createBranchEvaluationBindings } from '../action-core.js';
import type { ActionResult } from '@nop-chaos/flux-core';

describe('contract: withRetry failureCount consistency', () => {
  it('failureCount counts all failed attempts in soft-fail path', async () => {
    const result = await withRetry(
      async () => ({ ok: false } as ActionResult),
      { times: 2, delay: 0 },
      (r) => Boolean(r.ok),
    );

    expect(result.attempts).toBe(3);
    expect(result.failureCount).toBe(3);
  });

  it('failureCount correctly counts all attempts when fn throws', async () => {
    try {
      await withRetry(
        async () => { throw new Error('boom'); },
        { times: 2, delay: 0 },
        () => true,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      const meta = error as Error & { attempts?: number; failureCount?: number };
      expect(meta.attempts).toBe(3);
      expect(meta.failureCount).toBe(3);
    }
  });

  it('failureCount is consistent between throw and shouldStop-false paths', async () => {
    const throwResult = await (async () => {
      try {
        await withRetry(
          async () => { throw new Error('boom'); },
          { times: 2, delay: 0 },
          () => true,
        );
      } catch (error) {
        return error as Error & { attempts: number; failureCount: number };
      }
      return null!;
    })();

    const softFailResult = await withRetry(
      async () => ({ ok: false } as ActionResult),
      { times: 2, delay: 0 },
      (r) => Boolean(r.ok),
    );

    expect(throwResult.attempts).toBe(3);
    expect(throwResult.failureCount).toBe(3);
    expect(softFailResult.attempts).toBe(3);
    expect(softFailResult.failureCount).toBe(3);
  });
});

describe('contract: createBranchEvaluationBindings edge cases', () => {
  it('error is undefined for timedOut result with ok:true', () => {
    const result: ActionResult = { ok: true, timedOut: true, cancelled: true };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.error).toBeUndefined();
  });

  it('error is populated for ok:false without explicit cancelled/timedOut', () => {
    const err = new Error('plain-fail');
    const result: ActionResult = { ok: false, error: err };
    const bindings = createBranchEvaluationBindings(result, undefined);
    expect(bindings.error).toBe(err);
  });

  it('prevResult can be a skipped result', () => {
    const prev: ActionResult = { ok: true, skipped: true };
    const curr: ActionResult = { ok: true, data: 42 };
    const bindings = createBranchEvaluationBindings(curr, prev);
    expect(bindings.prevResult).toBe(prev);
    expect(bindings.result).toBe(curr);
  });
});

describe('contract: classifyActionResult combined flags', () => {
  it('ok:false + cancelled:true + timedOut:true is failure', () => {
    expect(classifyActionResult({ ok: false, cancelled: true, timedOut: true })).toBe('failure');
  });

  it('ok:true + cancelled:true + timedOut:true is failure (cancelled dominates)', () => {
    expect(classifyActionResult({ ok: true, cancelled: true, timedOut: true })).toBe('failure');
  });

  it('ok:true + skipped:true is neutral even with other flags', () => {
    expect(classifyActionResult({ ok: true, skipped: true, cancelled: true })).toBe('neutral');
  });

  it('ok:false + skipped:true is neutral (skipped check comes first)', () => {
    expect(classifyActionResult({ ok: false, skipped: true })).toBe('neutral');
  });
});

describe('contract: withRetry negative times', () => {
  it('negative times treated as 0 (one attempt, no retry)', async () => {
    let callCount = 0;
    const result = await withRetry(
      async () => {
        callCount++;
        return 'ok';
      },
      { times: -5, delay: 0 },
      () => true,
    );
    expect(result.attempts).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(callCount).toBe(1);
  });
});
