import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { ScopeContext } from './contexts.js';
import {
  resolveOwnershipMode,
  useOwnedAxisValue,
  useOwnershipScopeValue,
  useWarnScopeDegraded,
} from './ownership.js';

function makeFakeScope(initial: Record<string, unknown> = {}): {
  scope: ScopeRef;
  setScopeData: (next: Record<string, unknown>) => void;
  updateSpy: ReturnType<typeof vi.fn>;
  subscribeCount: () => number;
} {
  let scopeData: Record<string, unknown> = { ...initial };
  const listeners = new Set<(change: unknown) => void>();
  // subscribeCount is the discrimination surface for the inactive gate: an
  // inactive primitive must never reach scope.store.subscribe (it swaps in an
  // empty unsubscribe), so mutating the primitive's `enabled` mapping to always
  // be true turns these counts non-zero and reds the pins below.
  let subscribeCalls = 0;
  const updateSpy = vi.fn((path: string, next: unknown) => {
    scopeData = { ...scopeData, [path]: next };
    for (const listener of [...listeners]) listener({ paths: [path] });
  });
  const scope = {
    store: {
      getSnapshot: () => scopeData,
      subscribe: (listener: (change: unknown) => void) => {
        subscribeCalls++;
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    readVisible: () => scopeData,
    update: updateSpy,
  } as unknown as ScopeRef;
  return {
    scope,
    setScopeData: (next) => (scopeData = next),
    updateSpy,
    subscribeCount: () => subscribeCalls,
  };
}

function withScope(scope: ScopeRef, children: React.ReactNode): React.ReactNode {
  return React.createElement(ScopeContext.Provider, { value: scope }, children);
}

describe('resolveOwnershipMode (RM-11 primitive)', () => {
  it('respects declared ownership and passes statePath through', () => {
    expect(resolveOwnershipMode({ ownership: 'controlled', statePath: undefined })).toEqual({
      ownership: 'controlled',
      statePath: undefined,
      scopeDegraded: false,
    });
    expect(resolveOwnershipMode({ ownership: 'scope', statePath: 'user.name' })).toEqual({
      ownership: 'scope',
      statePath: 'user.name',
      scopeDegraded: false,
    });
    expect(resolveOwnershipMode({ ownership: undefined })).toEqual({
      ownership: 'local',
      statePath: undefined,
      scopeDegraded: false,
    });
  });

  it('degrades scope without statePath to local (scopeDegraded flag)', () => {
    expect(resolveOwnershipMode({ ownership: 'scope', statePath: '' }).scopeDegraded).toBe(true);
    expect(resolveOwnershipMode({ ownership: 'scope' }).ownership).toBe('local');
  });
});

describe('useWarnScopeDegraded', () => {
  it('warns once per degradation episode (one-shot)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = renderHook(({ degraded }) => useWarnScopeDegraded(degraded, 'probe'), {
      initialProps: { degraded: true },
    });
    rerender({ degraded: true });
    rerender({ degraded: true });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('useOwnershipScopeValue', () => {
  it('returns undefined when inactive (local/controlled or missing statePath)', () => {
    const { scope } = makeFakeScope({ step: 3 });
    const local = renderHook(() => useOwnershipScopeValue<number>('local', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    expect(local.result.current).toBeUndefined();

    const controlled = renderHook(() => useOwnershipScopeValue<number>('controlled', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    expect(controlled.result.current).toBeUndefined();
  });

  it('inactive modes open ZERO scope subscriptions (enabled gate is real)', () => {
    const { scope, subscribeCount } = makeFakeScope({ step: 3 });

    renderHook(() => useOwnershipScopeValue<number>('local', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    renderHook(() => useOwnershipScopeValue<number>('controlled', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    renderHook(() => useOwnershipScopeValue<number>('scope', undefined), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    expect(subscribeCount()).toBe(0);
  });

  it('scope with a state path opens exactly one scope subscription', () => {
    const { scope, subscribeCount } = makeFakeScope({ step: 3 });
    renderHook(() => useOwnershipScopeValue<number>('scope', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    expect(subscribeCount()).toBe(1);
  });

  it('useOwnedAxisValue inactive modes also open zero scope subscriptions', () => {
    const { scope, subscribeCount } = makeFakeScope();
    renderHook(() => useOwnedAxisValue<string>({ ownership: 'local', fallbackValue: 'f' }), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    renderHook(
      () => useOwnedAxisValue<string>({ ownership: 'controlled', value: 'v', fallbackValue: 'f' }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(subscribeCount()).toBe(0);

    renderHook(
      () => useOwnedAxisValue<string>({ ownership: 'scope', statePath: 'step', fallbackValue: 'f' }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(subscribeCount()).toBe(1);
  });

  it('subscribes getIn(statePath) in scope mode and reacts to scope writes', () => {
    const { scope, updateSpy } = makeFakeScope({ step: 3 });
    const { result } = renderHook(() => useOwnershipScopeValue<number>('scope', 'step'), {
      wrapper: ({ children }) => withScope(scope, children) as React.ReactElement,
    });
    expect(result.current).toBe(3);
    act(() => {
      scope.update('step', 7);
    });
    expect(result.current).toBe(7);
    expect(updateSpy).toHaveBeenCalledWith('step', 7);
  });

  it('subscribes only to the configured scope path (unrelated updates do not re-render)', () => {
    const { scope } = makeFakeScope({ step: 3, other: 'x' });
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders++;
        return useOwnershipScopeValue<number>('scope', 'step');
      },
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toBe(3);
    const rendersAfterMount = renders;
    act(() => {
      scope.update('other', 'y');
    });
    expect(renders).toBe(rendersAfterMount);
    act(() => {
      scope.update('step', 5);
    });
    expect(result.current).toBe(5);
    expect(renders).toBeGreaterThan(rendersAfterMount);
  });

  it('paths override subscribes additional scope paths beyond statePath', () => {
    const { scope } = makeFakeScope({ pagination: { currentPage: 1 }, ps: { pageSize: 10 } });
    const { result } = renderHook(
      () =>
        useOwnershipScopeValue<unknown>('scope', 'pagination', {
          select: (data) => {
            const d = data as { pagination?: unknown; ps?: unknown };
            return { page: d.pagination, size: d.ps };
          },
          paths: ['pagination', 'ps'],
        }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toEqual({ page: { currentPage: 1 }, size: { pageSize: 10 } });
    act(() => {
      scope.update('ps', { pageSize: 20 });
    });
    expect(result.current).toEqual({ page: { currentPage: 1 }, size: { pageSize: 20 } });
  });

  it('supports custom select/equality (RM-11 M2 read parametrization)', () => {
    const { scope } = makeFakeScope({ sel: { items: [{ id: 'a' }, { id: 'b' }] } });
    const { result } = renderHook(
      () =>
        useOwnershipScopeValue<string[]>('scope', 'sel', {
          select: (data) => (data as { sel: { items: { id: string }[] } }).sel.items.map((i) => i.id),
          equality: (a, b) => a.join(',') === b.join(','),
        }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toEqual(['a', 'b']);
  });
});

describe('useOwnedAxisValue (merged composition: interaction-owner chains)', () => {
  it('local: useState semantics with defaultValue ?? value ?? fallback initial', () => {
    const { scope } = makeFakeScope();
    const { result } = renderHook(
      () =>
        useOwnedAxisValue<string>({
          ownership: 'local',
          value: 'v',
          defaultValue: 'd',
          fallbackValue: 'f',
        }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toMatchObject({ ownership: 'local', value: 'd' });
    act(() => result.current.setValue('next'));
    expect(result.current.value).toBe('next');
  });

  it('controlled: pure view of bound value; setValue does not write scope or mutate', () => {
    const { scope, updateSpy } = makeFakeScope({ step: 1 });
    const { result } = renderHook(
      () => useOwnedAxisValue<string>({ ownership: 'controlled', value: 'bound', fallbackValue: 'f' }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toMatchObject({ ownership: 'controlled', value: 'bound' });
    act(() => result.current.setValue('ignored'));
    expect(result.current.value).toBe('bound');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('scope: reads scope value with value/defaultValue fallback chain; writes scope via update (no mirror set, raw value)', () => {
    const { scope, updateSpy } = makeFakeScope({});
    const { result } = renderHook(
      () =>
        useOwnedAxisValue<string>({
          ownership: 'scope',
          statePath: 'step',
          value: undefined,
          defaultValue: 'dflt',
          fallbackValue: 'f',
        }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current).toMatchObject({ ownership: 'scope', value: 'dflt' });
    act(() => scope.update('step', 'from-scope'));
    expect(result.current.value).toBe('from-scope');
    act(() => result.current.setValue('written'));
    expect(updateSpy).toHaveBeenCalledWith('step', 'written');
  });

  it('scope without statePath: degrades to local + one-shot dev warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { scope } = makeFakeScope();
    const { result, rerender } = renderHook(
      () => useOwnedAxisValue<string>({ ownership: 'scope', fallbackValue: 'f', warnPrefix: 'probe' }),
      { wrapper: ({ children }) => withScope(scope, children) as React.ReactElement },
    );
    expect(result.current.ownership).toBe('local');
    rerender();
    rerender();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('probe');
    warn.mockRestore();
  });
});
