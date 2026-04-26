import { describe, expect, it, vi } from 'vitest';
import { publishOwnerStatus, createReadonlyScopeBinding } from '../status-owner';
import { createScopeRef } from '../scope';

describe('publishOwnerStatus', () => {
  it('does nothing when scope is undefined', () => {
    expect(() => publishOwnerStatus(undefined, 'status', { ok: true })).not.toThrow();
  });

  it('does nothing when statusPath is undefined', () => {
    const scope = createScopeRef({ id: 'test', path: '$test', initialData: {} });
    expect(() => publishOwnerStatus(scope, undefined, { ok: true })).not.toThrow();
    expect(scope.readOwn()).toEqual({});
  });

  it('does nothing when both are undefined', () => {
    expect(() => publishOwnerStatus(undefined, undefined, {})).not.toThrow();
  });

  it('updates scope at statusPath', () => {
    const scope = createScopeRef({ id: 'test', path: '$test', initialData: { x: 1 } });
    publishOwnerStatus(scope, 'status', { valid: true, errors: 0 });
    expect(scope.get('status')).toEqual({ valid: true, errors: 0 });
  });
});

describe('createReadonlyScopeBinding', () => {
  function createBinding(bindingKey: string, initialData: Record<string, any>, getSummary: () => any) {
    const scope = createScopeRef({ id: 'parent', path: '$parent', initialData });
    return { scope, binding: createReadonlyScopeBinding(scope, bindingKey, getSummary) };
  }

  describe('get', () => {
    it('returns summary for top-level bindingKey', () => {
      const { binding } = createBinding('status', { x: 1 }, () => ({ valid: true }));
      expect(binding.get('status')).toEqual({ valid: true });
    });

    it('returns nested value from summary', () => {
      const { binding } = createBinding('status', {}, () => ({ counts: { errors: 3 } }));
      expect(binding.get('status.counts.errors')).toBe(3);
    });

    it('delegates to parent scope for non-binding paths', () => {
      const { binding } = createBinding('status', { x: 42 }, () => ({}));
      expect(binding.get('x')).toBe(42);
    });
  });

  describe('has', () => {
    it('returns true for top-level bindingKey', () => {
      const { binding } = createBinding('status', {}, () => ({ a: 1 }));
      expect(binding.has('status')).toBe(true);
    });

    it('returns true for nested path that exists in summary', () => {
      const { binding } = createBinding('status', {}, () => ({ a: 1 }));
      expect(binding.has('status.a')).toBe(true);
    });

    it('returns false for nested path that does not exist in summary', () => {
      const { binding } = createBinding('status', {}, () => ({ a: 1 }));
      expect(binding.has('status.b')).toBe(false);
    });

    it('delegates to parent scope for non-binding paths', () => {
      const { binding } = createBinding('status', { x: 1 }, () => ({}));
      expect(binding.has('x')).toBe(true);
      expect(binding.has('missing')).toBe(false);
    });

    it('handles path that is just the bindingKey via segments path', () => {
      const { binding } = createBinding('myBind', {}, () => 'hello');
      expect(binding.has('myBind')).toBe(true);
    });
  });

  describe('readOwn', () => {
    it('returns parent snapshot merged with summary', () => {
      const { binding } = createBinding('status', { x: 1 }, () => ({ valid: true }));
      const own = binding.readOwn();
      expect(own.x).toBe(1);
      expect(own.status).toEqual({ valid: true });
    });
  });

  describe('readVisible', () => {
    it('returns overlay with binding key', () => {
      const { binding } = createBinding('summary', {}, () => ({ count: 5 }));
      const vis = binding.readVisible();
      expect(vis.summary).toEqual({ count: 5 });
    });

    it('caches when parent and summary are same reference', () => {
      let callCount = 0;
      const summary = { v: 1 };
      const getSummary = () => { callCount++; return summary; };
      const { binding } = createBinding('s', {}, getSummary);
      const vis1 = binding.readVisible();
      const vis2 = binding.readVisible();
      expect(vis1).toBe(vis2);
      expect(callCount).toBe(2);
    });
  });

  describe('materializeVisible', () => {
    it('returns plain object with parent and summary merged', () => {
      const { binding } = createBinding('summary', { x: 1 }, () => ({ count: 5 }));
      const mat = binding.materializeVisible();
      expect(mat).toEqual({ x: 1, summary: { count: 5 } });
    });

    it('caches when parent and summary are same reference', () => {
      let callCount = 0;
      const summary = { v: 1 };
      const getSummary = () => { callCount++; return summary; };
      const { binding } = createBinding('s', {}, getSummary);
      const mat1 = binding.materializeVisible();
      const mat2 = binding.materializeVisible();
      expect(mat1).toBe(mat2);
      expect(callCount).toBe(2);
    });

    it('produces new cache when summary changes', () => {
      let val = 1;
      const { binding } = createBinding('s', {}, () => val);
      const mat1 = binding.materializeVisible();
      val = 2;
      const mat2 = binding.materializeVisible();
      expect(mat2).not.toBe(mat1);
      expect(mat2.s).toBe(2);
    });
  });

  describe('store', () => {
    it('provides a store that throws on setSnapshot', () => {
      const { binding } = createBinding('status', {}, () => ({}));
      expect(() => binding.store?.setSnapshot({})).toThrow('Cannot set snapshot on projected scope store');
    });

    it('store subscribe delegates to parent store', () => {
      const { binding, scope } = createBinding('status', { x: 1 }, () => ({}));
      const listener = vi.fn();
      const unsub = binding.store?.subscribe(listener);
      scope.update('x', 2);
      expect(listener).toHaveBeenCalled();
      unsub?.();
    });
  });
});
