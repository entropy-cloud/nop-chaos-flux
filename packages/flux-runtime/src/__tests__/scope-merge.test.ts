import { describe, expect, it, vi } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createScopeRef, createScopeStore } from '../scope';

function createTestScope(data: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data)
  });
}

function createChildScope(parent: ScopeRef, ownData: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'child-scope',
    path: 'child',
    parent,
    store: createScopeStore(ownData)
  });
}

describe('ScopeRef.merge', () => {
  it('merges new keys into scope', () => {
    const scope = createTestScope({ a: 1 });
    scope.merge({ b: 2, c: 3 });

    expect(scope.readOwn()).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('overwrites existing keys with new values', () => {
    const scope = createTestScope({ a: 1, b: 2 });
    scope.merge({ b: 99 });

    expect(scope.readOwn()).toEqual({ a: 1, b: 99 });
  });

  it('does not trigger store update when values are unchanged', () => {
    const scope = createTestScope({ a: 1, b: 2 });
    const listener = vi.fn();
    scope.store?.subscribe(listener);

    scope.merge({ a: 1, b: 2 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('triggers store update when at least one value changes', () => {
    const scope = createTestScope({ a: 1, b: 2 });
    const listener = vi.fn();
    scope.store?.subscribe(listener);

    scope.merge({ a: 1, b: 99 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(scope.readOwn()).toEqual({ a: 1, b: 99 });
  });

  it('triggers store update when a new key is added', () => {
    const scope = createTestScope({ a: 1 });
    const listener = vi.fn();
    scope.store?.subscribe(listener);

    scope.merge({ b: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(scope.readOwn()).toEqual({ a: 1, b: 2 });
  });

  it('preserves snapshot reference when no change', () => {
    const scope = createTestScope({ a: 1, b: 2 });
    const before = scope.readOwn();

    scope.merge({ a: 1, b: 2 });

    expect(scope.readOwn()).toBe(before);
  });

  it('creates new snapshot reference when changed', () => {
    const scope = createTestScope({ a: 1 });
    const before = scope.readOwn();

    scope.merge({ a: 2 });

    expect(scope.readOwn()).not.toBe(before);
  });

  it('works on child scope without affecting parent', () => {
    const parent = createTestScope({ a: 1 });
    const child = createChildScope(parent, { b: 2 });

    child.merge({ c: 3 });

    expect(child.readOwn()).toEqual({ b: 2, c: 3 });
    expect(parent.readOwn()).toEqual({ a: 1 });
    expect(child.read()).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('handles empty merge data as no-op', () => {
    const scope = createTestScope({ a: 1 });
    const listener = vi.fn();
    scope.store?.subscribe(listener);

    scope.merge({});

    expect(listener).not.toHaveBeenCalled();
    expect(scope.readOwn()).toEqual({ a: 1 });
  });

  it('handles same reference values as unchanged', () => {
    const obj = { x: 1 };
    const scope = createTestScope({ a: obj });
    const listener = vi.fn();
    scope.store?.subscribe(listener);

    scope.merge({ a: obj });

    expect(listener).not.toHaveBeenCalled();
  });
});
