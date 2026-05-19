import { describe, expect, it, vi } from 'vitest';
import { createNodeSourcePropController } from '../node-source-prop-controller.js';

function createObserverMock() {
  let snapshot = { value: {} as Record<string, unknown> };
  const listeners = new Set<() => void>();
  return {
    observer: {
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn((listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      run: vi.fn((input: { baseValue?: Record<string, unknown>; entries: Array<{ key: string; stateKey?: string }> }) => {
        snapshot = {
          value:
            input.entries.length === 0
              ? (input.baseValue ?? {})
              : {
                  ...(input.baseValue ?? {}),
                  ...Object.fromEntries(input.entries.map((entry) => [entry.key, 'resolved'])),
                  ...Object.fromEntries(
                    input.entries.flatMap((entry) =>
                      entry.stateKey
                        ? [[entry.stateKey, { loading: false, error: undefined, status: 'ready' }]]
                        : [],
                    ),
                  ),
                },
        };
        for (const listener of listeners) {
          listener();
        }
      }),
      dispose: vi.fn(),
    },
  };
}

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

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createNodeSourcePropController', () => {
  it('publishes plain props when no source inputs are present', () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['value'],
        sourceStatePropKeys: { value: 'valueState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );
    const listener = vi.fn();

    controller.subscribe(listener);
    controller.run({ value: 'ready' }, createScope());

    expect(controller.getSnapshot()).toEqual({
      sourceInputs: [],
      value: { value: 'ready' },
    });
    expect(listener).toHaveBeenCalledTimes(0);
    expect(observer.run).toHaveBeenCalledWith({
      scope: expect.any(Object),
      entries: [],
      baseValue: { value: 'ready' },
    });

    controller.run({ value: 'ready' }, createScope());
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('delegates source props to the runtime-owned observer', async () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items', 'plain'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );
    const listener = vi.fn();
    const scope = createScope();

    controller.subscribe(listener);
    controller.run({ items: { type: 'source', action: 'loadItems' }, plain: 'keep' }, scope);

    expect(observer.run).toHaveBeenCalledWith({
      scope,
      entries: [
        {
          key: 'items',
          source: { type: 'source', action: 'loadItems' },
          stateKey: 'itemsState',
          targetPath: 'items',
        },
      ],
      baseValue: { items: undefined, plain: 'keep' },
    });
    await flushAsync();

    expect(controller.getSnapshot()).toEqual({
      sourceInputs: [{ type: 'source', action: 'loadItems' }],
      value: {
        items: 'resolved',
        plain: 'keep',
        itemsState: { loading: false, error: undefined, status: 'ready' },
      },
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resolves nested source schemas back into their original prop paths', async () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: [],
        sourceStatePropKeys: {},
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    controller.run(
      {
        expressionConfig: {
          variables: { type: 'source', formula: [] },
        },
      },
      createScope(),
    );

    expect(observer.run).toHaveBeenCalledWith({
      scope: expect.any(Object),
      entries: [
        {
          key: '__source:expressionConfig.variables',
          source: { type: 'source', formula: [] },
          targetPath: 'expressionConfig.variables',
        },
      ],
      baseValue: {
        expressionConfig: {
          variables: undefined,
        },
      },
    });

    await flushAsync();

    expect(controller.getSnapshot()).toEqual({
      sourceInputs: [{ type: 'source', formula: [] }],
      value: {
        expressionConfig: {
          variables: 'resolved',
        },
      },
    });
  });

  it('refreshes resolved snapshots when only plain sibling props change', async () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    const scope = createScope();
    controller.run({ items: { type: 'source', action: 'loadItems' }, plain: 'first' }, scope);
    await flushAsync();

    expect(controller.getSnapshot().value).toMatchObject({
      items: 'resolved',
      plain: 'first',
    });

    controller.run({ items: { type: 'source', action: 'loadItems' }, plain: 'second' }, scope);
    await flushAsync();

    expect(controller.getSnapshot().value).toMatchObject({
      items: 'resolved',
      plain: 'second',
    });
  });

  it('reruns nested source entries when nested source config changes', async () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: [],
        sourceStatePropKeys: {},
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    const scope = createScope();
    controller.run(
      {
        expressionConfig: {
          variables: { type: 'source', action: 'loadItems', path: '/first' },
        },
        plain: 'keep',
      },
      scope,
    );
    await flushAsync();

    controller.run(
      {
        expressionConfig: {
          variables: { type: 'source', action: 'loadItems', path: '/second' },
        },
        plain: 'keep',
      },
      scope,
    );
    await flushAsync();

    expect(observer.run).toHaveBeenCalledTimes(2);
    expect(observer.run).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        scope,
        entries: [
          expect.objectContaining({
            key: '__source:expressionConfig.variables',
            targetPath: 'expressionConfig.variables',
            source: { type: 'source', action: 'loadItems', path: '/first' },
          }),
        ],
      }),
    );
    expect(observer.run).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        scope,
        entries: [
          expect.objectContaining({
            key: '__source:expressionConfig.variables',
            targetPath: 'expressionConfig.variables',
            source: { type: 'source', action: 'loadItems', path: '/second' },
          }),
        ],
      }),
    );
  });

  it('rebinds the source observer when the lexical scope changes', () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    const firstScope = createScope();
    const secondScope = { ...createScope(), id: 'scope-2' };

    controller.run({ items: { type: 'source', action: 'loadItems' } }, firstScope);
    controller.run({ items: { type: 'source', action: 'loadItems' } }, secondScope as any);

    expect(observer.run).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ scope: firstScope }),
    );
    expect(observer.run).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ scope: secondScope }),
    );
  });

  it('rebinds nested source entries when the lexical scope changes', () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: [],
        sourceStatePropKeys: {},
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    const firstScope = createScope();
    const secondScope = { ...createScope(), id: 'scope-2' };
    const propsValue = {
      expressionConfig: {
        variables: { type: 'source', action: 'loadItems', path: '/nested' },
      },
      plain: 'keep',
    };

    controller.run(propsValue, firstScope);
    controller.run(propsValue, secondScope as any);

    expect(observer.run).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        scope: firstScope,
        entries: [
          expect.objectContaining({
            key: '__source:expressionConfig.variables',
            targetPath: 'expressionConfig.variables',
          }),
        ],
      }),
    );
    expect(observer.run).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        scope: secondScope,
        entries: [
          expect.objectContaining({
            key: '__source:expressionConfig.variables',
            targetPath: 'expressionConfig.variables',
          }),
        ],
      }),
    );
  });

  it('skips redundant observer runs when the scope wrapper changes but the execution plan does not', () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    const baseScope = createScope();
    const wrappedScope = {
      ...baseScope,
      get: baseScope.get,
      has: baseScope.has,
      readOwn: baseScope.readOwn,
      readVisible: baseScope.readVisible,
      materializeVisible: baseScope.materializeVisible,
      update: baseScope.update,
      merge: baseScope.merge,
    };

    controller.run({ items: { type: 'source', action: 'loadItems' }, plain: 'keep' }, baseScope);
    controller.run({ items: { type: 'source', action: 'loadItems' }, plain: 'keep' }, wrappedScope as any);

    expect(observer.run).toHaveBeenCalledTimes(1);
  });

  it('disposes the runtime-owned observer', async () => {
    const { observer } = createObserverMock();
    const controller = createNodeSourcePropController(
      {
        sourcePropKeys: ['items'],
        sourceStatePropKeys: { items: 'itemsState' },
      } as any,
      { createSourceObserver: () => observer } as any,
    );

    controller.dispose();
    expect(observer.dispose).toHaveBeenCalledTimes(1);
  });
});
