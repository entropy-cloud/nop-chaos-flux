import { describe, expect, it } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
} from './action-dispatcher-test-support.js';
import { actionNode, parallelNode } from './control-flow-test-fixtures.js';

describe('contract: parallel edge cases', () => {
  it('parallel with all successes includes neutral (skipped) children in success aggregate', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') return { ok: true, skipped: true };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('showToast', { message: 'hi' }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results![0].ok).toBe(true);
    expect(result.results![1].skipped).toBe(true);
  });

  it('parallel does not cancel sibling when one fails (all siblings complete)', async () => {
    const completed: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        completed.push(inv.action);
        if (inv.action === 'showToast') return { ok: false, error: new Error('fail') };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('showToast', { message: 'fail' }),
          actionNode('setValue', { path: 'b', value: 2 }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(completed).toContain('showToast');
    expect(completed.filter((a) => a === 'setValue')).toHaveLength(2);
  });

  it('parallel failure error keeps the failed child result as cause when the child had no error object', async () => {
    const failedChild = { ok: false, data: { providerKind: 'host', attempts: 2 } };
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') return failedChild as any;
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('showToast', { message: 'fail' }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error & { cause?: unknown }).cause).toMatchObject({
      ok: false,
      data: failedChild.data,
      error: failedChild,
    });
  });

  it('parallel with single child succeeds', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => ({ ok: true, data: inv.action }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([parallelNode([actionNode('setValue', { path: 'a', value: 1 })])]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
  });
});

describe('contract: synchronous throw from adapter', () => {
  it('catches synchronous throw and returns failure result', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => {
        throw new Error('sync-throw');
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([actionNode('setValue', { path: 'x', value: 1 })]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('sync-throw');
  });
});

describe('contract: parallel aggregate when a child throws', () => {
  it('normalizes a throwing child into a failure-class entry and keeps sibling results (formal spec §parallel rules 2/4/5)', async () => {
    const completed: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') {
          await Promise.resolve();
          throw new Error('child-threw');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed.push(inv.action);
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('showToast', { message: 'boom' }),
          actionNode('setValue', { path: 'b', value: 2 }),
        ]),
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.results).toHaveLength(3);
    expect(result.results![0]).toMatchObject({ ok: true, data: 'setValue' });
    expect(result.results![1].ok).toBe(false);
    expect((result.results![1].error as Error).message).toBe('child-threw');
    expect(result.results![2]).toMatchObject({ ok: true, data: 'setValue' });
    expect(completed).toEqual(['setValue', 'setValue']);
  });
});

describe('contract: parallel aggregate when the batch is aborted mid-flight', () => {
  it('keeps one result per child when a timed request-backed child rejects on parent abort (FM-012)', async () => {
    const controller = new AbortController();
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'ajax') {
          return new Promise(() => {});
        }
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const pending = dispatcher.dispatch(
      makeCompiledProgram([
        parallelNode([
          actionNode('setValue', { path: 'a', value: 1 }),
          actionNode('ajax', { url: '/api/slow' }, { control: { timeout: 5000 } }),
        ]),
      ]),
      createActionCtx({ runtime, signal: controller.signal }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort(new Error('dispatcher disposed'));
    const result = await pending;

    expect(result.results).toHaveLength(2);
    expect(result.results![0]).toMatchObject({ ok: true, data: 'setValue' });
    expect(result.results![1].cancelled).toBe(true);
    expect(result.cancelled).toBe(true);
  });
});
