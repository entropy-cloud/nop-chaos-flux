import { describe, expect, it, vi } from 'vitest';
import { createScopeRef, createScopeStore } from '../scope.js';

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

describe('H10: lexical path resolution across scope chain', () => {
  it('get resolves from parent when child does not own the key', () => {
    const parent = createTestScope({ parentKey: 'val' });
    const child = createChildScope(parent, {});
    expect(child.get('parentKey')).toBe('val');
  });

  it('get resolves from grandparent through parent', () => {
    const gp = createTestScope({ gpKey: 'gp-val' });
    const p = createChildScope(gp, { pKey: 'p-val' });
    const c = createChildScope(p, { cKey: 'c-val' });
    expect(c.get('gpKey')).toBe('gp-val');
    expect(c.get('pKey')).toBe('p-val');
    expect(c.get('cKey')).toBe('c-val');
  });

  it('has returns true for parent-owned key', () => {
    const parent = createTestScope({ shared: true });
    const child = createChildScope(parent, {});
    expect(child.has('shared')).toBe(true);
  });

  it('has returns false for non-existent key', () => {
    const parent = createTestScope({});
    const child = createChildScope(parent, {});
    expect(child.has('missing')).toBe(false);
  });

  it('get resolves nested path from parent', () => {
    const parent = createTestScope({ config: { theme: 'dark' } });
    const child = createChildScope(parent, {});
    expect(child.get('config.theme')).toBe('dark');
  });

  it('get resolves deeply nested path across scope boundary', () => {
    const gp = createTestScope({ deep: { nested: { key: 'found' } } });
    const p = createChildScope(gp, {});
    const c = createChildScope(p, {});
    expect(c.get('deep.nested.key')).toBe('found');
  });

  it('FIXED: isolated child get() does not resolve parent', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, {}, true);
    expect(child.get('x')).toBeUndefined();
  });

  it('isolated child readVisible returns own only', () => {
    const parent = createTestScope({ x: 1 });
    const child = createChildScope(parent, { y: 2 }, true);
    expect(child.readVisible()).toEqual({ y: 2 });
  });

  it('get returns undefined for empty path', () => {
    const scope = createTestScope({ x: 1 });
    expect(scope.get('')).toBeUndefined();
  });

  it('get returns undefined for path into non-object own value', () => {
    const scope = createTestScope({ x: 'string-value' });
    expect(scope.get('x.sub')).toBeUndefined();
  });

  it('get resolves child key first, then falls back to parent', () => {
    const parent = createTestScope({ key: 'from-parent' });
    const child = createChildScope(parent, { key: 'from-child' });
    expect(child.get('key')).toBe('from-child');
  });
});

describe('H11: scope.update with nested paths', () => {
  it('creates intermediate objects for deeply nested path', () => {
    const scope = createTestScope({});
    scope.update('a.b.c', 'deep');
    expect(scope.get('a.b.c')).toBe('deep');
  });

  it('overwrites existing nested value', () => {
    const scope = createTestScope({ user: { name: 'Alice' } });
    scope.update('user.name', 'Bob');
    expect(scope.get('user.name')).toBe('Bob');
    expect(scope.readOwn()).toEqual({ user: { name: 'Bob' } });
  });

  it('reports correct change path for nested update', () => {
    const scope = createTestScope({ user: { name: 'Alice' } });
    const listener = vi.fn<(change: any) => void>();
    scope.store?.subscribe(listener);
    scope.update('user.name', 'Bob');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ paths: ['user.name'], kind: 'update' }),
    );
  });

  it('update with empty path replaces entire snapshot (non-object values)', () => {
    const scope = createTestScope({ a: 1 });
    scope.update('', { b: 2 });
    expect(scope.readOwn()).toEqual({ b: 2 });
  });
});

describe('H12: composite store subscriptions', () => {
  it('child composite store getSnapshot returns readVisible (prototype-based)', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 });
    const snap = child.store?.getSnapshot();
    expect(snap!.a).toBe(1);
    expect(snap!.b).toBe(2);
  });

  it('child readVisible returns merged parent+own view (prototype-based)', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 });
    const visible = child.readVisible();
    expect(visible.a).toBe(1);
    expect(visible.b).toBe(2);
  });

  it('child materializeVisible returns flat merged object', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 });
    expect(child.materializeVisible()).toEqual({ a: 1, b: 2 });
  });

  it('isolated child uses own store directly (not composite)', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 }, true);
    expect(child.store?.getSnapshot()).toEqual({ b: 2 });
  });

  it('root scope uses own store directly', () => {
    const scope = createTestScope({ a: 1 });
    expect(scope.store?.getSnapshot()).toEqual({ a: 1 });
  });

  it('composite store does not dedupe when child shadows parent change', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2, a: 10 });
    const listener = vi.fn();
    child.store?.subscribe(listener);

    parent.update('a', 99);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies all child composite subscribers for one parent update', () => {
    const parent = createTestScope({ summary: { name: 'Original', status: 'draft' } });
    const child = createChildScope(parent, { detailViewLib: {} });
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();

    child.store?.subscribe(first);
    child.store?.subscribe(second);
    child.store?.subscribe(third);

    parent.update('summary.name', 'Changed Name');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(third).toHaveBeenCalledTimes(1);
  });
});

describe('H13: replace edge cases', () => {
  it('replace with undefined data converts to {}', () => {
    const scope = createTestScope({ a: 1 });
    scope.replace?.(undefined as any);
    expect(scope.readOwn()).toEqual({});
  });

  it('replace with null data converts to {}', () => {
    const scope = createTestScope({ a: 1 });
    scope.replace?.(null as any);
    expect(scope.readOwn()).toEqual({});
  });

  it('replace with string converts to {}', () => {
    const scope = createTestScope({ a: 1 });
    scope.replace?.('hello' as any);
    expect(scope.readOwn()).toEqual({});
  });

  it('replace triggers subscription with sorted changed paths', () => {
    const scope = createTestScope({ a: 1, c: 3 });
    const listener = vi.fn<(change: any) => void>();
    scope.store?.subscribe(listener);
    scope.replace?.({ b: 2, c: 3 });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        paths: ['a', 'b'],
        kind: 'replace',
      }),
    );
  });

  it('replace removes all old keys when replaced with empty', () => {
    const scope = createTestScope({ a: 1, b: 2, c: 3 });
    scope.replace?.({});
    expect(scope.readOwn()).toEqual({});
  });
});

describe('H14: scope.value property', () => {
  it('returns readVisible() via property (prototype-based)', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 });
    const val = child.value;
    expect(val.a).toBe(1);
    expect(val.b).toBe(2);
  });

  it('returns own snapshot for root scope', () => {
    const scope = createTestScope({ x: 42 });
    expect(scope.value).toEqual({ x: 42 });
  });

  it('returns isolated snapshot for isolated scope', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 }, true);
    expect(child.value).toEqual({ b: 2 });
  });
});

describe('H15: deeply nested data', () => {
  it('get resolves deeply nested path', () => {
    const scope = createTestScope({ a: { b: { c: { d: 'found' } } } });
    expect(scope.get('a.b.c.d')).toBe('found');
  });

  it('update deeply nested path preserves siblings', () => {
    const scope = createTestScope({ a: { b: { x: 1, y: 2 } } });
    scope.update('a.b.x', 99);
    expect(scope.readOwn()).toEqual({ a: { b: { x: 99, y: 2 } } });
  });

  it('has returns true for deeply nested existing path', () => {
    const scope = createTestScope({ a: { b: { c: 'val' } } });
    expect(scope.has('a.b.c')).toBe(true);
  });

  it('has returns false for deeply nested missing path', () => {
    const scope = createTestScope({ a: { b: { c: 'val' } } });
    expect(scope.has('a.b.missing')).toBe(false);
  });

  it('get returns undefined for path through null value', () => {
    const scope = createTestScope({ a: null });
    expect(scope.get('a.b')).toBeUndefined();
  });

  it('get returns undefined for path through non-object', () => {
    const scope = createTestScope({ a: 42 });
    expect(scope.get('a.b')).toBeUndefined();
  });
});
