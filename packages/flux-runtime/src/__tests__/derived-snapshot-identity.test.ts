import { describe, expect, it } from 'vitest';
import { createScopeRef } from '../scope.js';

describe('derived snapshot identity contract', () => {
  it('readVisible returns the same reference across multiple calls with no data change', () => {
    const scope = createScopeRef({
      id: 'test-scope',
      path: '$',
      initialData: { a: 1, b: { c: 2 } },
    });

    const snap1 = scope.value;
    const snap2 = scope.value;
    expect(snap1).toBe(snap2);
  });

  it('readVisible returns new reference after own data changes', () => {
    const scope = createScopeRef({
      id: 'test-scope',
      path: '$',
      initialData: { a: 1 },
    });

    const snap1 = scope.value;
    scope.update('a', 2);
    const snap2 = scope.value;

    expect(snap1).not.toBe(snap2);
    expect(snap2.a).toBe(2);
  });

  it('maintains identity across parent scope chain when own data unchanged', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: '$',
      initialData: { x: 10 },
    });
    const child = createScopeRef({
      id: 'child',
      path: '$child',
      parent,
      initialData: { y: 20 },
    });

    const snap1 = child.value;
    const snap2 = child.value;
    expect(snap1).toBe(snap2);
    expect(snap1.x).toBe(10);
    expect(snap1.y).toBe(20);

    parent.update('x', 99);
    const snap3 = child.value;
    expect(snap3).not.toBe(snap1);
    expect(snap3.x).toBe(99);
    expect(snap3.y).toBe(20);
  });

  it('child readVisible identity preserved when parent data changes but child data has also changed', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: '$',
      initialData: { x: 10 },
    });
    const child = createScopeRef({
      id: 'child',
      path: '$child',
      parent,
      initialData: { y: 20 },
    });

    void child.value;
    parent.update('x', 11);
    child.update('y', 21);

    const snap1 = child.value;
    const snap2 = child.value;
    expect(snap1).toBe(snap2);
    expect(snap1.x).toBe(11);
    expect(snap1.y).toBe(21);
  });

  it('store.getSnapshot returns same reference with no changes', () => {
    const scope = createScopeRef({
      id: 'isolated',
      path: '$',
      initialData: { value: 'stable' },
    });

    const gs1 = scope.store!.getSnapshot();
    const gs2 = scope.store!.getSnapshot();
    expect(gs1).toBe(gs2);
  });

  it('isolated scope does not merge parent data', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: '$',
      initialData: { parentVal: 'should-not-leak' },
    });
    const child = createScopeRef({
      id: 'child',
      path: '$child',
      parent,
      initialData: { childVal: 'visible' },
      isolate: true,
    });

    expect(child.value).not.toHaveProperty('parentVal');
    expect(child.value.childVal).toBe('visible');
  });
});
