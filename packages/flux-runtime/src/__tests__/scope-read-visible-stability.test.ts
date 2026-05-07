import { describe, expect, it } from 'vitest';
import { createScopeRef, createScopeStore } from '../scope.js';

describe('readVisible() scope stability', () => {
  it('child readVisible includes parent scope values via prototype chain', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      initialData: { shared: 'from-parent', parentOnly: 42 },
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      initialData: { local: 'from-child' },
    });

    const visible = child.readVisible();
    expect(visible.shared).toBe('from-parent');
    expect(visible.parentOnly).toBe(42);
    expect(visible.local).toBe('from-child');
  });

  it('child own values shadow parent values', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      initialData: { key: 'parent-value', parentOnly: true },
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      initialData: { key: 'child-value' },
    });

    const visible = child.readVisible();
    expect(visible.key).toBe('child-value');
    expect(visible.parentOnly).toBe(true);
  });

  it('rapid child updates never return stale or empty data', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      initialData: { shared: 'stable' },
    });
    const childStore = createScopeStore({ counter: 0 });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      store: childStore,
    });

    for (let i = 1; i <= 500; i++) {
      childStore.setSnapshot(
        { counter: i },
        { paths: ['counter'], kind: 'update', sourceScopeId: 'child' },
      );
      const visible = child.readVisible();
      expect(visible.counter).toBe(i);
      expect(visible.shared).toBe('stable');
    }
  });

  it('rapid parent updates propagate to child readVisible', () => {
    const parentStore = createScopeStore({ version: 0 });
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      store: parentStore,
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      initialData: { local: 'fixed' },
    });

    for (let i = 1; i <= 500; i++) {
      parentStore.setSnapshot(
        { version: i },
        { paths: ['version'], kind: 'update', sourceScopeId: 'parent' },
      );
      const visible = child.readVisible();
      expect(visible.version).toBe(i);
      expect(visible.local).toBe('fixed');
    }
  });

  it('interleaved parent and child updates maintain consistency', () => {
    const parentStore = createScopeStore({ p: 0 });
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      store: parentStore,
    });
    const childStore = createScopeStore({ c: 0 });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      store: childStore,
    });

    for (let i = 1; i <= 200; i++) {
      if (i % 2 === 0) {
        parentStore.setSnapshot(
          { p: i },
          { paths: ['p'], kind: 'update', sourceScopeId: 'parent' },
        );
      } else {
        childStore.setSnapshot(
          { c: i },
          { paths: ['c'], kind: 'update', sourceScopeId: 'child' },
        );
      }
      const visible = child.readVisible();
      // Parent value: last even <= i
      const expectedP = i % 2 === 0 ? i : i - 1;
      // Child value: last odd <= i
      const expectedC = i % 2 === 1 ? i : i - 1;
      expect(visible.p).toBe(expectedP);
      expect(visible.c).toBe(expectedC);
    }
  });

  it('three-level scope chain readVisible includes all ancestors', () => {
    const grandparent = createScopeRef({
      id: 'gp',
      path: 'gp',
      initialData: { level: 'grandparent', gpOnly: true },
    });
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      parent: grandparent,
      initialData: { level: 'parent', parentOnly: true },
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      initialData: { level: 'child' },
    });

    const visible = child.readVisible();
    expect(visible.level).toBe('child');
    expect(visible.parentOnly).toBe(true);
    expect(visible.gpOnly).toBe(true);
  });

  it('cached readVisible returns same reference when no changes', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      initialData: { a: 1 },
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      initialData: { b: 2 },
    });

    const first = child.readVisible();
    const second = child.readVisible();
    expect(first).toBe(second);
  });

  it('isolate scope does not inherit parent data', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: 'parent',
      initialData: { shared: 'visible' },
    });
    const child = createScopeRef({
      id: 'child',
      path: 'child',
      parent,
      isolate: true,
      initialData: { local: 'only' },
    });

    const visible = child.readVisible();
    expect(visible.local).toBe('only');
    expect(visible.shared).toBeUndefined();
  });
});
