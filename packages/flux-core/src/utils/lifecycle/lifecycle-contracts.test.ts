import { describe, expect, it } from 'vitest';
import {
  createLifecycleGuard,
  createWriteDrain,
  invokeIsolated,
  linkDisposal,
  runWithExitResets,
} from './index.js';

// Each `it` title starts with a Test ID from docs/audits/async-lifecycle/invariant-catalog.md;
// invariant-catalog.test.ts enforces the two sets are identical.

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function abortError() {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

describe('lifecycle-guard', () => {
  it('LG-1 a continuation holding a stale token does not execute', () => {
    const guard = createLifecycleGuard();
    const stale = guard.token();
    guard.invalidate();
    let ran = false;
    const result = guard.guard(stale, () => {
      ran = true;
      return 'value';
    });
    expect(ran).toBe(false);
    expect(result).toBeUndefined();
    expect(guard.guard(guard.token(), () => 'fresh')).toBe('fresh');
  });

  it('LG-2 invalidate() makes every earlier token stale and the next token current', () => {
    const guard = createLifecycleGuard();
    const first = guard.token();
    const second = guard.token();
    expect(guard.isCurrent(first)).toBe(true);
    expect(guard.isCurrent(second)).toBe(true);
    guard.invalidate();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(false);
    expect(guard.isCurrent(guard.token())).toBe(true);
  });
});

describe('write-drain', () => {
  it('WD-1 writes under the same key run one at a time in enqueue order', async () => {
    const drain = createWriteDrain();
    const events: string[] = [];
    const first = deferred();
    const p1 = drain.enqueue('k', async () => {
      events.push('start-1');
      await first.promise;
      events.push('end-1');
    });
    const p2 = drain.enqueue('k', async () => {
      events.push('start-2');
      events.push('end-2');
    });
    await Promise.resolve();
    expect(events).toEqual(['start-1']);
    first.resolve();
    await Promise.all([p1, p2]);
    expect(events).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('WD-2 barrier() resolves only after every in-flight write settled, including rejected ones', async () => {
    const drain = createWriteDrain();
    const slow = deferred();
    const failing = deferred();
    const p1 = drain.enqueue('a', () => slow.promise);
    const p2 = drain.enqueue('b', () => failing.promise);
    let barrierDone = false;
    const barrier = drain.barrier().then(() => {
      barrierDone = true;
    });
    await Promise.resolve();
    expect(barrierDone).toBe(false);
    failing.reject(new Error('boom'));
    await expect(p2).rejects.toThrow('boom');
    await Promise.resolve();
    expect(barrierDone).toBe(false);
    slow.resolve();
    await p1;
    await barrier;
    expect(barrierDone).toBe(true);
    expect(drain.pendingKeys()).toEqual([]);
  });

  it('WD-3 after evict(key) a new write under that key does not wait for the evicted chain', async () => {
    const drain = createWriteDrain();
    const stuck = deferred();
    void drain.enqueue('k', () => stuck.promise).catch(() => undefined);
    drain.evict('k');
    let ran = false;
    await drain.enqueue('k', () => {
      ran = true;
    });
    expect(ran).toBe(true);
    stuck.resolve();
  });
});

describe('exit-resets', () => {
  it('ER-1 when the body returns normally every reset runs once in reverse registration order', async () => {
    const order: string[] = [];
    const result = await runWithExitResets(
      async () => 'ok',
      [() => order.push('first'), () => order.push('second')],
    );
    expect(result).toBe('ok');
    expect(order).toEqual(['second', 'first']);
  });

  it('ER-2 when the body throws every reset still runs and the original error is rethrown unchanged', async () => {
    const order: string[] = [];
    const error = new Error('body failed');
    await expect(
      runWithExitResets(
        async () => {
          throw error;
        },
        [() => order.push('a'), () => order.push('b')],
      ),
    ).rejects.toBe(error);
    expect(order).toEqual(['b', 'a']);
  });

  it('ER-3 when the body rejects with an AbortError resets run and the AbortError is rethrown unchanged', async () => {
    const order: string[] = [];
    const error = abortError();
    await expect(
      runWithExitResets(
        () => Promise.reject(error),
        [() => order.push('reset')],
      ),
    ).rejects.toBe(error);
    expect(order).toEqual(['reset']);
  });
});

describe('link-disposal', () => {
  function harness() {
    const events: string[] = [];
    const generator = {
      return: () => {
        events.push('generator.return');
        return { done: true, value: undefined };
      },
    };
    const link = linkDisposal({
      detach: () => events.push('detach'),
      abort: () => events.push('abort'),
      generators: [generator],
    });
    return { events, link };
  }

  it('LD-1 dispose() runs detach, then generator return, then abort in that order', () => {
    const { events, link } = harness();
    link.dispose();
    expect(events).toEqual(['detach', 'generator.return', 'abort']);
    expect(link.disposed).toBe(true);
  });

  it('LD-2 a second dispose() is a no-op', () => {
    const { events, link } = harness();
    link.dispose();
    link.dispose();
    expect(events).toEqual(['detach', 'generator.return', 'abort']);
  });

  it('LD-3 aborting the linked external signal triggers the same ordered sequence exactly once', () => {
    const events: string[] = [];
    const controller = new AbortController();
    const link = linkDisposal({
      signal: controller.signal,
      detach: () => events.push('detach'),
      abort: () => events.push('abort'),
      generators: [{ return: () => (events.push('generator.return'), { done: true, value: undefined }) }],
    });
    controller.abort();
    expect(events).toEqual(['detach', 'generator.return', 'abort']);
    link.dispose();
    expect(events).toEqual(['detach', 'generator.return', 'abort']);
  });
});

describe('invoke-isolated', () => {
  it('II-1 invokeIsolated routes synchronous throws and asynchronous rejections to onError and never propagates', async () => {
    const seen: unknown[] = [];
    const syncResult = await invokeIsolated(
      () => {
        throw new Error('sync');
      },
      [],
      { onError: (error) => seen.push(error) },
    );
    const asyncResult = await invokeIsolated(async () => Promise.reject(new Error('async')), [], {
      onError: (error) => seen.push(error),
    });
    expect(syncResult).toBeUndefined();
    expect(asyncResult).toBeUndefined();
    expect(seen.map((error) => (error as Error).message)).toEqual(['sync', 'async']);
    expect(await invokeIsolated(() => 42, [], { onError: () => undefined })).toBe(42);
  });

  it('II-2 with cloneArgs mutations the callee performs on its arguments do not reach the caller', async () => {
    const ctx = { messages: [{ role: 'user', meta: { tags: ['a'] } }] };
    await invokeIsolated(
      (incoming: typeof ctx) => {
        incoming.messages[0].meta.tags.push('mutated');
        incoming.messages.push({ role: 'assistant', meta: { tags: [] } });
      },
      [ctx],
      { onError: () => undefined, cloneArgs: true },
    );
    expect(ctx.messages).toHaveLength(1);
    expect(ctx.messages[0].meta.tags).toEqual(['a']);
  });
});
