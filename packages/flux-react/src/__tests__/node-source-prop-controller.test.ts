import { describe, expect, it, vi } from 'vitest';
import { createNodeSourcePropController } from '../node-source-prop-controller.js';

function createScope() {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as any;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createNodeSourcePropController', () => {
  it('publishes plain props when no source inputs are present', () => {
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['value'],
        sourceStatePropKeys: { value: 'valueState' },
      } as any,
      { executeSource: vi.fn() } as any,
    );
    const listener = vi.fn();

    controller.subscribe(listener);
    controller.run({ value: 'ready' }, createScope());

    expect(controller.getSnapshot()).toEqual({
      sourceInputs: ['ready'],
      value: { value: 'ready' },
    });
    expect(listener).toHaveBeenCalledTimes(1);

    controller.run({ value: 'ready' }, createScope());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('marks source props as loading and resolves them into ready values', async () => {
    const request = deferred<{ ok: true; data: string }>();
    const executeSource = vi.fn().mockImplementation(() => request.promise);
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items', 'plain'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { executeSource } as any,
    );
    const listener = vi.fn();
    const scope = createScope();

    controller.subscribe(listener);
    controller.run({ items: { type: 'source', sourceType: 'api' }, plain: 'keep' }, scope);

    expect(controller.getSnapshot()).toEqual({
      sourceInputs: [{ type: 'source', sourceType: 'api' }, 'keep'],
      value: {
        items: { type: 'source', sourceType: 'api' },
        plain: 'keep',
        itemsState: { loading: true, error: undefined, status: 'loading' },
      },
    });

    request.resolve({ ok: true, data: 'resolved' });
    await flushAsync();

    expect(executeSource).toHaveBeenCalledWith({
      source: { type: 'source', sourceType: 'api' },
      scope,
      ctx: { signal: expect.any(AbortSignal) },
    });
    expect(controller.getSnapshot()).toEqual({
      sourceInputs: [{ type: 'source', sourceType: 'api' }, 'keep'],
      value: {
        items: 'resolved',
        plain: 'keep',
        itemsState: { loading: false, error: undefined, status: 'ready' },
      },
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('records action errors and rejected source execution failures', async () => {
    const actionResultController = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      {
        executeSource: vi.fn().mockResolvedValue({ ok: false, error: new Error('bad-request') }),
      } as any,
    );

    actionResultController.run({ items: { type: 'source', sourceType: 'api' } }, createScope());
    await flushAsync();

    const actionErrorState = actionResultController.getSnapshot().value as Record<string, any>;
    expect(actionErrorState.items).toBeUndefined();
    expect(actionErrorState.itemsState.loading).toBe(false);
    expect(actionErrorState.itemsState.status).toBe('error');
    expect(actionErrorState.itemsState.error).toBeInstanceOf(Error);
    expect(actionErrorState.itemsState.error.message).toBe('bad-request');

    const rejected = deferred<never>();
    const rejectionController = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { executeSource: vi.fn().mockImplementation(() => rejected.promise) } as any,
    );

    rejectionController.run({ items: { type: 'source', sourceType: 'api' } }, createScope());
    rejected.reject(new Error('network-down'));
    await rejected.promise.catch(() => undefined);
    await flushAsync();

    const rejectedState = rejectionController.getSnapshot().value as Record<string, any>;
    expect(rejectedState.itemsState.loading).toBe(false);
    expect(rejectedState.itemsState.status).toBe('error');
    expect(rejectedState.itemsState.error).toBeInstanceOf(Error);
    expect(rejectedState.itemsState.error.message).toBe('network-down');
  });

  it('aborts stale requests and stops notifying after unsubscribe or dispose', async () => {
    const first = deferred<{ ok: true; data: string }>();
    const second = deferred<{ ok: true; data: string }>();
    const executeSource = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { executeSource } as any,
    );
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    const scope = createScope();

    controller.run({ items: { type: 'source', sourceType: 'api', id: 'first' } }, scope);
    const firstSignal = executeSource.mock.calls[0][0].ctx.signal as AbortSignal;

    controller.run({ items: { type: 'source', sourceType: 'api', id: 'second' } }, scope);
    const secondSignal = executeSource.mock.calls[1][0].ctx.signal as AbortSignal;

    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);

    first.resolve({ ok: true, data: 'stale' });
    await flushAsync();
    expect((controller.getSnapshot().value as Record<string, any>).items).toEqual({
      type: 'source',
      sourceType: 'api',
      id: 'second',
    });

    unsubscribe();
    second.resolve({ ok: true, data: 'fresh' });
    await flushAsync();

    expect((controller.getSnapshot().value as Record<string, any>).items).toBe('fresh');
    expect(listener).toHaveBeenCalledTimes(2);

    controller.dispose();
    expect(secondSignal.aborted).toBe(true);
  });
});
