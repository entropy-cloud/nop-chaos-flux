import { describe, expect, it, vi } from 'vitest';
import { createManagedPageRuntime } from '../page-runtime';
import { createPageStore } from '../form-store';
import type { ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { createScopeRef } from '../scope';

describe('createManagedPageRuntime', () => {
  it('creates runtime with default empty data', () => {
    const rt = createManagedPageRuntime();
    expect(rt.store.getState().data).toEqual({});
    expect(rt.scope.id).toBe('page');
    expect(rt.scope.path).toBe('$page');
  });

  it('creates runtime with provided data', () => {
    const rt = createManagedPageRuntime({ data: { x: 1, y: 'hello' } });
    expect(rt.store.getState().data).toEqual({ x: 1, y: 'hello' });
  });

  it('uses provided pageStore', () => {
    const store = createPageStore({ a: 1 });
    const rt = createManagedPageRuntime({ data: { a: 1 }, pageStore: store });
    expect(rt.store).toBe(store);
    expect(rt.store.getState().data).toEqual({ a: 1 });
  });

  it('passes through modalContainer', () => {
    const rt = createManagedPageRuntime({ modalContainer: 'modal-1' });
    expect(rt.modalContainer).toBe('modal-1');
  });

  it('passes through validationOwner', () => {
    const owner = { id: 'vo' } as unknown as ValidationScopeRuntime;
    const rt = createManagedPageRuntime({ validationOwner: owner });
    expect(rt.validationOwner).toBe(owner);
  });

  it('uses provided scope', () => {
    const customScope = createScopeRef({
      id: 'custom-page',
      path: '$custom',
      initialData: { z: 99 }
    });
    const rt = createManagedPageRuntime({ scope: customScope });
    expect(rt.scope.id).toBe('custom-page');
    expect(rt.scope.path).toBe('$custom');
  });

  describe('scope subscription', () => {
    it('notifies listeners when data changes via store', () => {
      const rt = createManagedPageRuntime({ data: { count: 0 } });
      const listener = vi.fn();
      rt.scope.store?.subscribe(listener);
      rt.store.setData({ count: 1 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify when same data reference is set', () => {
      const rt = createManagedPageRuntime({ data: { count: 0 } });
      const listener = vi.fn();
      rt.scope.store?.subscribe(listener);
      const sameData = rt.store.getState().data;
      rt.store.setData(sameData);
      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribes correctly', () => {
      const rt = createManagedPageRuntime({ data: { count: 0 } });
      const listener = vi.fn();
      const unsub = rt.scope.store?.subscribe(listener);
      unsub?.();
      rt.store.setData({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('change tracking', () => {
    it('initial lastChange is a replace with revision', () => {
      const rt = createManagedPageRuntime();
      const change = rt.scope.store?.getLastChange();
      expect(change).toEqual({
        paths: ['*'],
        sourceScopeId: 'page',
        kind: 'replace',
        revision: expect.any(Number)
      });
    });

    it('scope.update records change with path', () => {
      const rt = createManagedPageRuntime({ data: { name: 'old' } });
      rt.scope.update('name', 'new');
      const change = rt.scope.store?.getLastChange();
      expect(change?.paths).toEqual(['name']);
      expect(change?.sourceScopeId).toBe('page');
      expect(change?.kind).toBe('update');
    });

    it('scope.update with empty path records wildcard', () => {
      const rt = createManagedPageRuntime({ data: {} });
      rt.scope.update('', 'val');
      const change = rt.scope.store?.getLastChange();
      expect(change?.paths).toEqual(['*']);
      expect(change?.kind).toBe('update');
    });

    it('revisions increment on successive updates', () => {
      const rt = createManagedPageRuntime({ data: { x: 0 } });
      rt.scope.update('x', 1);
      const rev1 = rt.scope.store?.getLastChange()?.revision;
      rt.scope.update('x', 2);
      const rev2 = rt.scope.store?.getLastChange()?.revision;
      expect(rev2).toBeGreaterThan(rev1!);
    });

    it('setSnapshot records provided change', () => {
      const rt = createManagedPageRuntime({ data: { x: 0 } });
      rt.scope.store?.setSnapshot({ x: 10 }, {
        paths: ['x'],
        sourceScopeId: 'external',
        kind: 'merge'
      });
      const change = rt.scope.store?.getLastChange();
      expect(change?.paths).toEqual(['x']);
      expect(change?.sourceScopeId).toBe('external');
      expect(change?.kind).toBe('merge');
    });

    it('setSnapshot without explicit change uses default', () => {
      const rt = createManagedPageRuntime({ data: {} });
      rt.scope.store?.setSnapshot({ a: 1 });
      const change = rt.scope.store?.getLastChange();
      expect(change?.paths).toEqual(['*']);
      expect(change?.sourceScopeId).toBe('page');
      expect(change?.kind).toBe('replace');
    });
  });

  describe('refresh', () => {
    it('increments refreshTick', () => {
      const rt = createManagedPageRuntime();
      const tick0 = rt.store.getState().refreshTick;
      rt.refresh();
      expect(rt.store.getState().refreshTick).toBe(tick0 + 1);
    });
  });

  describe('scope read operations', () => {
    it('readOwn returns current data', () => {
      const rt = createManagedPageRuntime({ data: { a: 1 } });
      expect(rt.scope.readOwn()).toEqual({ a: 1 });
    });

    it('get reads a value by path', () => {
      const rt = createManagedPageRuntime({ data: { nested: { val: 42 } } });
      expect(rt.scope.get('nested.val')).toBe(42);
    });

    it('update changes a value readable via get', () => {
      const rt = createManagedPageRuntime({ data: { x: 0 } });
      rt.scope.update('x', 10);
      expect(rt.scope.get('x')).toBe(10);
      expect(rt.store.getState().data.x).toBe(10);
    });
  });
});
