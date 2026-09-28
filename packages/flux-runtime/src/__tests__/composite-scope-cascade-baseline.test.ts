import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createScopeRef } from '../scope.js';

// plan 2026-09-28-6 Phase 1 — behavior baseline for composite scope cascade
// semantics (P12). These tests FIX the current observable behavior before the
// change-path filtering lands: visible values and listener notification counts
// must stay identical after the optimization for every scenario below.

function makeChain(parent: ScopeRef, id: string, initialData: Record<string, unknown>): ScopeRef {
  return createScopeRef({ id, path: id, initialData, parent });
}

describe('composite scope cascade baseline (plan 2026-09-28-6 P12)', () => {
  it('own key change notifies own listeners once and updates the visible view', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 1 } });
    const child = makeChain(parent, 'c', { own: 'a' });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    child.store?.setSnapshot({ own: 'b' });

    expect(calls).toBe(1);
    expect(child.get('own')).toBe('b');
    expect(child.get('shared')).toBe(1);
  });

  it('unshadowed parent key change notifies child listeners and updates the view', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 1 } });
    const child = makeChain(parent, 'c', { own: 'a' });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    parent.store?.setSnapshot({ shared: 2 });

    expect(calls).toBe(1);
    expect(child.get('shared')).toBe(2);
    expect(child.get('own')).toBe('a');
  });

  it('parent key change shadowed by an own key skips the child cascade (P12 filter)', () => {
    // The child owns `shared`; a parent change to the SAME key cannot alter
    // the composed visible view (prototype-chain lookup hits the own snapshot
    // first). plan 2026-09-28-6 Phase 2: the composite store skips the
    // readVisible() rebuild and the listener fan-out for fully-shadowed
    // parent changes.
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 'parent' } });
    const child = makeChain(parent, 'c', { shared: 'own' });

    const visibleBefore = child.store?.getSnapshot();
    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    // set() records explicit paths (['shared']) — the cascade filter's target
    parent.update('shared', 'parent-changed');

    expect(calls).toBe(0);
    expect(child.get('shared')).toBe('own');
    // no listener fired and the visible content is byte-identical (the view
    // object may be lazily rebuilt on read — the fan-out skip is the contract)
    expect(child.store?.getSnapshot()).toEqual(visibleBefore ?? {});
  });

  it('bare setSnapshot (wildcard paths) keeps the safe always-notify path', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 'parent' } });
    const child = makeChain(parent, 'c', { shared: 'own' });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    // normalizeScopeChange turns a path-less change into ['*'] — never treated
    // as shadowed (a bulk replace may alter any visible key)
    parent.store?.setSnapshot({ shared: 'parent-changed' });

    expect(calls).toBe(1);
    expect(child.get('shared')).toBe('own');
  });

  it('parent change without path information keeps the safe always-notify path', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 1 } });
    const child = makeChain(parent, 'c', { own: 'a' });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    parent.store?.setSnapshot({ shared: 2 }, { paths: [] });

    expect(calls).toBe(1);
    expect(child.get('shared')).toBe(2);
  });

  it('parent change touching a non-shadowed path still notifies (conservative fallback)', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 1, other: 'x' } });
    const child = makeChain(parent, 'c', { shared: 'own' });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    // 'other' is not shadowed by the child — must still notify
    parent.store?.setSnapshot({ shared: 'parent', other: 'y' }, { paths: ['other'] });

    expect(calls).toBe(1);
    expect(child.get('other')).toBe('y');
    expect(child.get('shared')).toBe('own');
  });

  it('multi-level chain propagates grandparent changes to the leaf', () => {
    const root = createScopeRef({ id: 'root', path: 'root', initialData: { deep: 'v0' } });
    const mid = makeChain(root, 'mid', { mid: 1 });
    const leaf = makeChain(mid, 'leaf', { leaf: 1 });

    let calls = 0;
    leaf.store?.subscribe(() => {
      calls += 1;
    });

    root.store?.setSnapshot({ deep: 'v1' });

    expect(calls).toBe(1);
    expect(leaf.get('deep')).toBe('v1');
    expect(leaf.get('mid')).toBe(1);
  });

  it('isolated child ignores parent changes entirely', () => {
    const parent = createScopeRef({ id: 'p', path: 'p', initialData: { shared: 1 } });
    const child = createScopeRef({
      id: 'iso',
      path: 'iso',
      initialData: { own: 1 },
      parent,
      isolate: true,
    });

    let calls = 0;
    child.store?.subscribe(() => {
      calls += 1;
    });

    parent.store?.setSnapshot({ shared: 2 });

    expect(calls).toBe(0);
    expect(child.get('shared')).toBeUndefined();
    expect(child.get('own')).toBe(1);
  });
});
