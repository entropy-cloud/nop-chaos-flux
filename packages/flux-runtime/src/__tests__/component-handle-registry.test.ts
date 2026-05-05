import { describe, expect, it, vi } from 'vitest';
import { createComponentHandleRegistry } from '../component-handle-registry';
import { createScopeRef } from '../scope';

function createHandle(overrides: Record<string, unknown> = {}) {
  return {
    id: undefined,
    name: undefined,
    type: 'form',
    capabilities: {
      invoke: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('createComponentHandleRegistry', () => {
  it('registers, replaces, unregisters, and resolves handles by id/name/cid', () => {
    const registry = createComponentHandleRegistry({ id: 'root-registry' });
    const first = createHandle({ id: 'form-1', name: 'profile', _cid: 1 });
    const second = createHandle({ id: 'form-1', name: 'profile-new', _cid: 2 });
    const named = createHandle({ name: 'search', _cid: 3 });

    const disposeFirst = registry.register(first);
    expect(registry.resolve({ componentId: 'form-1' })).toBe(first);
    expect(registry.resolve({ _targetCid: 1 })).toBe(first);

    registry.register(second);
    expect(registry.resolve({ _targetCid: 1 })).toBeUndefined();
    expect(registry.resolve({ componentId: 'form-1' })).toBe(second);

    registry.register(named);
    expect(registry.resolve({ componentName: 'search' })).toBe(named);
    disposeFirst();
    expect(registry.resolve({ _targetCid: 1 })).toBeUndefined();

    registry.unregister(second);
    expect(second._mounted).toBe(false);
    expect(registry.resolve({ componentId: 'form-1' })).toBeUndefined();

    registry.unregister(second);
  });

  it('traverses child and parent registries, handles ambiguity, and respects id/name mismatches', () => {
    const parent = createComponentHandleRegistry({ id: 'parent-registry' });
    const child = createComponentHandleRegistry({ id: 'child-registry', parent });
    const parentHandle = createHandle({ id: 'shared-form', name: 'shared', _cid: 10 });
    const childHandle = createHandle({ id: 'child-form', name: 'child', _cid: 11 });
    const duplicateA = createHandle({ name: 'duplicate', _cid: 12 });
    const duplicateB = createHandle({ name: 'duplicate', _cid: 13 });

    parent.register(parentHandle);
    child.register(childHandle);
    child.register(duplicateA);
    child.register(duplicateB);

    expect(child.resolve({ componentId: 'shared-form' })).toBe(parentHandle);
    expect(
      child.resolve({ componentId: 'child-form', componentName: 'wrong-name' }),
    ).toBeUndefined();
    expect(() => child.resolve({ componentName: 'duplicate' })).toThrow(
      'Ambiguous component target: duplicate',
    );
  });

  it('propagates debug mode, stores debug data, and inspects resolved and missing cids', () => {
    const parent = createComponentHandleRegistry({ id: 'parent-registry' });
    const child = createComponentHandleRegistry({ id: 'child-registry', parent });
    const scope = createScopeRef({
      id: 'scope-1',
      path: '$scope',
      initialData: { title: 'Draft' },
    });
    const handle = createHandle({ id: 'form-1', name: 'profile', _cid: 21 });

    child.register(handle, { cid: 21 });
    parent.setDebugEnabled!(true);
    expect(parent.debugEnabled).toBe(true);
    expect(child.debugEnabled).toBe(true);

    child.setHandleDebugData!(21, {
      scope,
      resolvedMeta: { disabled: false },
      resolvedProps: { title: 'Draft' },
      nodeInstance: { instancePath: ['body', 0], state: { expanded: true } },
    } as any);

    expect(child.getHandleByCid!(21)).toBe(handle);
    expect(child.getHandleDebugData!(21)).toMatchObject({ resolvedMeta: { disabled: false } });
    expect(child.inspectCid!(21)).toEqual({
      kind: 'resolved',
      payload: {
        cid: 21,
        instancePath: ['body', 0],
        scopeChain: [
          {
            id: 'scope-1',
            path: '$scope',
            label: '$scope',
            data: { title: 'Draft' },
          },
        ],
        resolvedMeta: { disabled: false },
        resolvedProps: { title: 'Draft' },
        state: { expanded: true },
      },
    });

    handle._mounted = false;
    expect(child.inspectCid!(21)).toEqual({
      kind: 'resolved',
      payload: {
        cid: 21,
        instancePath: ['body', 0],
        scopeChain: [
          {
            id: 'scope-1',
            path: '$scope',
            label: '$scope',
            data: { title: 'Draft' },
          },
        ],
        resolvedMeta: { disabled: false },
        resolvedProps: { title: 'Draft' },
        state: { expanded: true },
      },
    });

    child.setHandleDebugData!(21, undefined);
    expect(child.getHandleDebugData!(21)).toBeUndefined();
    expect(child.inspectCid!(999)).toEqual({ kind: 'notFound' });

    parent.setDebugEnabled!(false);
    expect(child.getHandleDebugData!(21)).toBeUndefined();
  });

  it('ignores new debug data while debug capture is disabled', () => {
    const registry = createComponentHandleRegistry({ id: 'root-registry' });

    registry.setHandleDebugData!(33, {
      resolvedMeta: { disabled: true },
    } as any);

    expect(registry.getHandleDebugData!(33)).toBeUndefined();

    registry.setDebugEnabled!(true);
    registry.setHandleDebugData!(33, {
      resolvedMeta: { disabled: false },
    } as any);
    expect(registry.getHandleDebugData!(33)).toMatchObject({
      resolvedMeta: { disabled: false },
    });

    registry.setDebugEnabled!(false);
    registry.setHandleDebugData!(33, {
      resolvedMeta: { disabled: true },
    } as any);
    expect(registry.getHandleDebugData!(33)).toBeUndefined();
  });

  it('dispose() clears parent, children, and all handles', () => {
    const parent = createComponentHandleRegistry({ id: 'parent-registry' });
    const child = createComponentHandleRegistry({ id: 'child-registry', parent });
    const parentHandle = createHandle({ id: 'pf', name: 'pname', _cid: 50 });
    const childHandle = createHandle({ id: 'cf', name: 'cname', _cid: 51 });

    parent.register(parentHandle);
    child.register(childHandle);

    // sanity: handles resolve before dispose
    expect(parent.resolve({ componentId: 'pf' })).toBe(parentHandle);
    expect(child.resolve({ componentId: 'cf' })).toBe(childHandle);
    // child can see parent handle
    expect(child.resolve({ componentId: 'pf' })).toBe(parentHandle);

    parent.dispose!();

    // parent handles gone
    expect(parent.resolve({ componentId: 'pf' })).toBeUndefined();
    // child handles gone (child was disposed recursively)
    expect(child.resolve({ componentId: 'cf' })).toBeUndefined();
    // child can no longer see parent handle
    expect(child.resolve({ componentId: 'pf' })).toBeUndefined();

    // dispose is safe to call again
    expect(() => parent.dispose!()).not.toThrow();
  });

  it('returns aggregated debug snapshots including child registries', () => {
    const parent = createComponentHandleRegistry({ id: 'parent-registry' });
    const child = createComponentHandleRegistry({ id: 'child-registry', parent });
    const parentHandle = createHandle({
      id: 'parent-form',
      name: 'parent',
      type: 'form',
      _cid: 31,
    });
    const childHandle = createHandle({ id: 'child-form', name: 'child', type: 'dialog', _cid: 32 });

    parent.register(parentHandle);
    child.register(childHandle);

    expect(parent.getDebugSnapshot!()).toEqual({
      handles: [
        {
          cid: 31,
          id: 'parent-form',
          name: 'parent',
          type: 'form',
          mounted: true,
          capabilities: parentHandle.capabilities,
        },
        {
          cid: 32,
          id: 'child-form',
          name: 'child',
          type: 'dialog',
          mounted: true,
          capabilities: childHandle.capabilities,
        },
      ],
    });
  });

  it('inherits parent debugEnabled when a child registry is created later', () => {
    const parent = createComponentHandleRegistry({ id: 'parent-registry' });

    parent.setDebugEnabled!(true);

    const child = createComponentHandleRegistry({ id: 'child-registry', parent });

    expect(parent.debugEnabled).toBe(true);
    expect(child.debugEnabled).toBe(true);
  });
});
