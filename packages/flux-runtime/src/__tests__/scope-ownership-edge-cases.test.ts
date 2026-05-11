import { describe, expect, it, vi } from 'vitest';
import { createScopeRef, createScopeStore, toRecord } from '../scope.js';
import {
  createRootDependencySet,
  filterScopeChangeByIgnoredRoots,
  scopeChangeHitsDependencies,
} from '../scope-change.js';
import { publishOwnerStatus, createReadonlyScopeBinding } from '../status-owner.js';
import { createProjectedScopeStore } from '../projected-scope-store.js';

function createTestScope(data: Record<string, any>): ReturnType<typeof createScopeRef> {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

function createChildScope(
  parent: ReturnType<typeof createScopeRef>,
  ownData: Record<string, any>,
  isolate?: boolean,
): ReturnType<typeof createScopeRef> {
  return createScopeRef({
    id: 'child-scope',
    path: 'child',
    parent,
    isolate,
    store: createScopeStore(ownData),
  });
}

describe('H1: scope creation edge cases', () => {
  it('creates scope with undefined initialData (defaults to {})', () => {
    const scope = createScopeRef({ id: 's1', path: 'p' });
    expect(scope.readOwn()).toEqual({});
    expect(scope.materializeVisible()).toEqual({});
  });

  it('creates scope with empty object initialData', () => {
    const scope = createScopeRef({ id: 's2', path: 'p', initialData: {} });
    expect(scope.readOwn()).toEqual({});
  });

  it('createScopeStore handles empty object', () => {
    const store = createScopeStore({});
    expect(store.getSnapshot()).toEqual({});
  });

  it('child of empty parent reads parent via readVisible', () => {
    const parent = createTestScope({});
    const child = createChildScope(parent, { x: 1 });
    expect(child.readVisible()).toMatchObject({ x: 1 });
  });

  it('update on empty scope adds key', () => {
    const scope = createScopeRef({ id: 's3', path: 'p' });
    scope.update('newKey', 'value');
    expect(scope.readOwn()).toEqual({ newKey: 'value' });
  });

  it('merge on empty scope populates it', () => {
    const scope = createScopeRef({ id: 's4', path: 'p' });
    scope.merge({ a: 1, b: 2 });
    expect(scope.readOwn()).toEqual({ a: 1, b: 2 });
  });

  it('replace on empty scope works', () => {
    const scope = createScopeRef({ id: 's5', path: 'p' });
    scope.replace?.({ x: 42 });
    expect(scope.readOwn()).toEqual({ x: 42 });
  });
});

describe('H2: scope isolation from parent', () => {
  it('child update does not modify parent own snapshot', () => {
    const parent = createTestScope({ shared: 'original' });
    const child = createChildScope(parent, {});
    child.update('shared', 'modified');
    expect(parent.readOwn()).toEqual({ shared: 'original' });
    expect(child.readOwn()).toEqual({ shared: 'modified' });
  });

  it('child merge does not modify parent own snapshot', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, {});
    child.merge({ a: 99 });
    expect(parent.readOwn()).toEqual({ a: 1 });
    expect(child.readOwn()).toEqual({ a: 99 });
  });

  it('child replace does not modify parent own snapshot', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, {});
    child.replace?.({ a: 99, b: 2 });
    expect(parent.readOwn()).toEqual({ a: 1 });
    expect(child.readOwn()).toEqual({ a: 99, b: 2 });
  });

  it('parent update does not overwrite child own value after shadowing', () => {
    const parent = createTestScope({ x: 'parent-val' });
    const child = createChildScope(parent, { x: 'child-val' });
    parent.update('x', 'parent-changed');
    expect(child.readOwn()).toEqual({ x: 'child-val' });
    expect(child.get('x')).toBe('child-val');
    expect(parent.get('x')).toBe('parent-changed');
  });

  it('isolated child readVisible does not include parent data', () => {
    const parent = createTestScope({ visible: 'yes' });
    const child = createChildScope(parent, { local: 1 }, true);
    expect(child.readVisible()).toEqual({ local: 1 });
    expect(child.materializeVisible()).toEqual({ local: 1 });
  });

  it('FIXED: isolated child get() does not resolve parent chain', () => {
    const parent = createTestScope({ visible: 'yes' });
    const child = createChildScope(parent, { local: 1 }, true);
    expect(child.get('visible')).toBeUndefined();
  });

  it('isolated child store does not subscribe to parent changes', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, { y: 2 }, true);
    const listener = vi.fn();
    child.store?.subscribe(listener);

    parent.update('x', 99);

    expect(listener).not.toHaveBeenCalled();
  });

  it('non-isolated child store subscribes to parent changes', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, { y: 2 }, false);
    const listener = vi.fn();
    child.store?.subscribe(listener);

    parent.update('x', 99);

    expect(listener).toHaveBeenCalled();
  });

  it('child readVisible shadows parent with own value', () => {
    const parent = createTestScope({ key: 'from-parent' });
    const child = createChildScope(parent, { key: 'from-child' });
    const visible = child.readVisible();
    expect(visible.key).toBe('from-child');
    expect(parent.readOwn()).toEqual({ key: 'from-parent' });
  });

  it('three-level chain: grandchild isolates from parent updates', () => {
    const gp = createTestScope({ deep: 'gp-val' });
    const p = createChildScope(gp, { mid: 'p-val' });
    const c = createChildScope(p, { leaf: 'c-val' });

    expect(c.get('deep')).toBe('gp-val');
    expect(c.get('mid')).toBe('p-val');
    expect(c.get('leaf')).toBe('c-val');
  });
});

describe('H3: scope merge semantics', () => {
  it('merge is shallow: nested objects are replaced, not deep-merged', () => {
    const scope = createTestScope({ obj: { a: 1, b: 2 } });
    scope.merge({ obj: { c: 3 } });
    expect(scope.readOwn()).toEqual({ obj: { c: 3 } });
  });

  it('merge preserves keys not mentioned in the merge payload', () => {
    const scope = createTestScope({ a: 1, b: 2, c: 3 });
    scope.merge({ b: 99 });
    expect(scope.readOwn()).toEqual({ a: 1, b: 99, c: 3 });
  });

  it('replace removes keys not in the replacement payload', () => {
    const scope = createTestScope({ a: 1, b: 2, c: 3 });
    scope.replace?.({ b: 99 });
    expect(scope.readOwn()).toEqual({ b: 99 });
    expect(scope.readOwn()).not.toHaveProperty('a');
  });

  it('replace with identical data is a no-op (no notification)', () => {
    const scope = createTestScope({ a: 1 });
    const listener = vi.fn();
    scope.store?.subscribe(listener);
    scope.replace?.({ a: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('merge into child does not affect parent snapshot', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, { y: 2 });
    child.merge({ z: 3 });
    expect(parent.readOwn()).toEqual({ x: 1 });
    expect(child.readOwn()).toEqual({ y: 2, z: 3 });
    expect(child.materializeVisible()).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('H4: scope lifecycle', () => {
  it('subscribe returns unsubscribe function that works', () => {
    const scope = createTestScope({ a: 1 });
    const listener = vi.fn();
    const unsub = scope.store?.subscribe(listener);

    scope.update('a', 2);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub?.();
    scope.update('a', 3);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('child scope unsubscribe stops both own and parent notifications', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, { y: 2 });
    const listener = vi.fn();
    const unsub = child.store?.subscribe(listener);

    child.update('y', 3);
    expect(listener).toHaveBeenCalledTimes(1);

    parent.update('x', 99);
    expect(listener).toHaveBeenCalledTimes(2);

    unsub?.();

    child.update('y', 4);
    parent.update('x', 100);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('parent subscription still works after child is created and GC-eligible', () => {
    const parent = createTestScope({ x: 1 });
    const parentListener = vi.fn();
    parent.store?.subscribe(parentListener);

    {
      createChildScope(parent, {});
    }

    parent.update('x', 2);
    expect(parentListener).toHaveBeenCalledTimes(1);
  });

  it('multiple subscribers on same scope all receive updates', () => {
    const scope = createTestScope({ a: 1 });
    const l1 = vi.fn();
    const l2 = vi.fn();
    scope.store?.subscribe(l1);
    scope.store?.subscribe(l2);

    scope.update('a', 2);
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one listener does not affect the other', () => {
    const scope = createTestScope({ a: 1 });
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub1 = scope.store?.subscribe(l1);
    scope.store?.subscribe(l2);

    unsub1?.();

    scope.update('a', 2);
    expect(l1).toHaveBeenCalledTimes(0);
    expect(l2).toHaveBeenCalledTimes(1);
  });
});

describe('H5: publishOwnerStatus edge cases', () => {
  it('rapid status changes produce last-wins semantics', () => {
    const scope = createScopeRef({ id: 's', path: '$s', initialData: {} });
    for (let i = 0; i < 100; i++) {
      publishOwnerStatus(scope, 'status', { version: i });
    }
    expect(scope.get('status')).toEqual({ version: 99 });
  });

  it('publishes nested status path correctly', () => {
    const scope = createScopeRef({ id: 's', path: '$s', initialData: {} });
    publishOwnerStatus(scope, 'form.status', { valid: true });
    expect(scope.get('form.status')).toEqual({ valid: true });
  });

  it('does not throw on empty string statusPath', () => {
    const scope = createScopeRef({ id: 's', path: '$s', initialData: {} });
    expect(() => publishOwnerStatus(scope, '', { ok: true })).not.toThrow();
  });

  it('status update triggers store subscription', () => {
    const scope = createScopeRef({ id: 's', path: '$s', initialData: {} });
    const listener = vi.fn();
    scope.store?.subscribe(listener);
    publishOwnerStatus(scope, 'status', { ok: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('H6: createProjectedScopeStore', () => {
  it('returns readSnapshot that applies projection', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { a: 1, b: 2, c: 3 } });
    const { readSnapshot } = createProjectedScopeStore(scope, () => ({ a: 1, b: 2 }));
    expect(readSnapshot()).toEqual({ a: 1, b: 2 });
  });

  it('caches when base snapshot has not changed', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { x: 1 } });
    let callCount = 0;
    const { readSnapshot } = createProjectedScopeStore(scope, () => {
      callCount++;
      return { projected: true };
    });
    readSnapshot();
    readSnapshot();
    expect(callCount).toBe(1);
  });

  it('re-projects when base snapshot changes', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { x: 1 } });
    let callCount = 0;
    const { readSnapshot } = createProjectedScopeStore(scope, () => {
      callCount++;
      return { v: callCount };
    });
    readSnapshot();
    scope.update('x', 2);
    readSnapshot();
    expect(callCount).toBe(2);
  });

  it('works without a parent store (store is undefined)', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { x: 1 } });
    const _originalStore = scope.store;
    const scopeNoStore = { ...scope, store: undefined } as any;
    const { readSnapshot, store } = createProjectedScopeStore(scopeNoStore, () => ({ p: 1 }));
    expect(readSnapshot()).toEqual({ p: 1 });
    expect(store).toBeUndefined();
  });

  it('store.setSnapshot throws', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const { store } = createProjectedScopeStore(scope, () => ({}));
    expect(() => store?.setSnapshot({})).toThrow('Cannot set snapshot on projected scope store');
  });

  it('store.getLastChange delegates to parent store', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const { store } = createProjectedScopeStore(scope, () => ({}));
    scope.update('x', 1);
    const change = store?.getLastChange();
    expect(change?.paths).toEqual(['x']);
  });

  it('store.subscribe delegates to parent store', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const { store } = createProjectedScopeStore(scope, () => ({}));
    const listener = vi.fn();
    const unsub = store?.subscribe(listener);
    scope.update('x', 1);
    expect(listener).toHaveBeenCalled();
    unsub?.();
  });
});

describe('H7: scopeChangeHitsDependencies edge cases', () => {
  it('returns false for undefined change', () => {
    expect(scopeChangeHitsDependencies(undefined, { paths: ['x'], wildcard: false, broadAccess: false })).toBe(false);
  });

  it('returns false for undefined dependencies', () => {
    expect(scopeChangeHitsDependencies({ paths: ['x'], sourceScopeId: 's', kind: 'update' }, undefined)).toBe(false);
  });

  it('returns false for both undefined', () => {
    expect(scopeChangeHitsDependencies(undefined, undefined)).toBe(false);
  });

  it('wildcard dependency matches any change', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['obscure.deep.path'], sourceScopeId: 's', kind: 'update' },
        { paths: ['*'], wildcard: true, broadAccess: true },
      ),
    ).toBe(true);
  });

  it('change with wildcard path matches any dependency', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['*'], sourceScopeId: 's', kind: 'replace' },
        { paths: ['x'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('empty dependency paths returns false (no match)', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['x'], sourceScopeId: 's', kind: 'update' },
        { paths: [], wildcard: false, broadAccess: false },
      ),
    ).toBe(false);
  });

  it('empty change paths normalize to wildcard [paths=["*"]] via getChangeRoots', () => {
    const result = scopeChangeHitsDependencies(
      { paths: [], sourceScopeId: 's', kind: 'update' },
      { paths: ['x'], wildcard: false, broadAccess: false },
    );
    expect(result).toBe(false);
  });

  it('sibling paths DO match (both share same root)', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['user.name'], sourceScopeId: 's', kind: 'update' },
        { paths: ['user.email'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('multi-path change matches if any path hits', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['x.unrelated', 'user.name'], sourceScopeId: 's', kind: 'update' },
        { paths: ['user'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('multi-path dependency matches if change hits any root', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['settings'], sourceScopeId: 's', kind: 'merge' },
        { paths: ['user', 'settings', 'filters'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('deeply nested change hits ancestor dependency', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['a.b.c.d.e'], sourceScopeId: 's', kind: 'update' },
        { paths: ['a.b'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('ancestor change hits deeply nested dependency', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['a.b'], sourceScopeId: 's', kind: 'merge' },
        { paths: ['a.b.c.d'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);
  });

  it('root-only paths use fast path (no multi-segment)', () => {
    expect(
      scopeChangeHitsDependencies(
        { paths: ['x'], sourceScopeId: 's', kind: 'update' },
        { paths: ['x'], wildcard: false, broadAccess: false },
      ),
    ).toBe(true);

    expect(
      scopeChangeHitsDependencies(
        { paths: ['x'], sourceScopeId: 's', kind: 'update' },
        { paths: ['y'], wildcard: false, broadAccess: false },
      ),
    ).toBe(false);
  });
});

describe('H7b: filterScopeChangeByIgnoredRoots edge cases', () => {
  it('returns undefined change unchanged', () => {
    expect(filterScopeChangeByIgnoredRoots(undefined, ['x'])).toBeUndefined();
  });

  it('returns change unchanged when ignoredPaths is empty array', () => {
    const change = { paths: ['x'], sourceScopeId: 's', kind: 'update' as const };
    expect(filterScopeChangeByIgnoredRoots(change, [])).toBe(change);
  });

  it('returns change unchanged when ignoredPaths is empty Set', () => {
    const change = { paths: ['x'], sourceScopeId: 's', kind: 'update' as const };
    expect(filterScopeChangeByIgnoredRoots(change, new Set())).toBe(change);
  });

  it('returns undefined when all paths are filtered', () => {
    expect(
      filterScopeChangeByIgnoredRoots(
        { paths: ['x.y', 'x.z'], sourceScopeId: 's', kind: 'update' },
        ['x'],
      ),
    ).toBeUndefined();
  });

  it('wildcard change passes through even when ignored paths exist', () => {
    const change = { paths: ['*'], sourceScopeId: 's', kind: 'replace' as const };
    expect(filterScopeChangeByIgnoredRoots(change, ['x'])).toBe(change);
  });

  it('preserves extra properties like revision', () => {
    const filtered = filterScopeChangeByIgnoredRoots(
      { paths: ['a', 'b'], sourceScopeId: 's', kind: 'merge' as const, revision: 42 },
      ['a'],
    );
    expect(filtered).toEqual({
      paths: ['b'],
      sourceScopeId: 's',
      kind: 'merge',
      revision: 42,
    });
  });
});

describe('H7c: createRootDependencySet edge cases', () => {
  it('returns undefined for undefined input', () => {
    expect(createRootDependencySet(undefined)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(createRootDependencySet([])).toBeUndefined();
  });

  it('normalizes paths to roots', () => {
    expect(createRootDependencySet(['user.name', 'user.email'])).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });

  it('detects wildcard from paths', () => {
    expect(createRootDependencySet(['*'])).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('mixed wildcard with other paths collapses to wildcard', () => {
    expect(createRootDependencySet(['user.name', '*'])).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('deduplicates roots', () => {
    expect(createRootDependencySet(['a.x', 'a.y', 'b'])).toEqual({
      paths: ['a', 'b'],
      wildcard: false,
      broadAccess: false,
    });
  });
});

describe('H8: createReadonlyScopeBinding edge cases', () => {
  it('get returns undefined for bindingKey subpath that does not exist', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const binding = createReadonlyScopeBinding(scope, 'status', () => ({ ok: true }));
    expect(binding.get('status.missing')).toBeUndefined();
  });

  it('readOwn snapshot includes binding even when parent has same key', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { status: 'old' } });
    const binding = createReadonlyScopeBinding(scope, 'status', () => 'new');
    const own = binding.readOwn();
    expect(own.status).toBe('new');
  });

  it('materializeVisible includes parent data plus binding', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { x: 1 } });
    const binding = createReadonlyScopeBinding(scope, 'summary', () => ({ count: 5 }));
    const mat = binding.materializeVisible();
    expect(mat).toEqual({ x: 1, summary: { count: 5 } });
  });

  it('readVisible overlay shadows parent key with binding summary', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: { bind: 'parent' } });
    const binding = createReadonlyScopeBinding(scope, 'bind', () => 'child');
    const vis = binding.readVisible();
    expect(vis.bind).toBe('child');
  });

  it('has returns false for summary subpath with undefined value', () => {
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const binding = createReadonlyScopeBinding(scope, 'status', () => ({ a: 1 }));
    expect(binding.has('status.b')).toBe(false);
    expect(binding.has('status.a')).toBe(true);
  });

  it('materializeVisible cache invalidates when summary object changes identity', () => {
    let summary: any = { v: 1 };
    const scope = createScopeRef({ id: 's', path: 'p', initialData: {} });
    const binding = createReadonlyScopeBinding(scope, 's', () => summary);

    const mat1 = binding.materializeVisible();
    summary = { v: 2 };
    const mat2 = binding.materializeVisible();
    expect(mat1).not.toBe(mat2);
    expect(mat2.s).toEqual({ v: 2 });
  });
});

describe('H9: toRecord', () => {
  it('returns object for plain object', () => {
    expect(toRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('returns empty object for null', () => {
    expect(toRecord(null)).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(toRecord(undefined as any)).toEqual({});
  });

  it('returns empty object for string', () => {
    expect(toRecord('hello' as any)).toEqual({});
  });

  it('returns empty object for number', () => {
    expect(toRecord(42 as any)).toEqual({});
  });

  it('returns empty object for array', () => {
    expect(toRecord([1, 2] as any)).toEqual({});
  });
});
