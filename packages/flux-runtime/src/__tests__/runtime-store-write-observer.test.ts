import { describe, expect, it, vi } from 'vitest';
import { createRendererRuntime } from '../runtime-factory';
import { registerStoreWriteObserver } from '../scope';
import type { RendererRegistry } from '@nop-chaos/flux-core';

function makeRuntime(plugins: never[] = []) {
  return createRendererRuntime({
    registry: { get: () => undefined, register: () => {} } as unknown as RendererRegistry,
    env: { fetcher: async () => ({ status: 0, data: null }), notify: () => {} } as never,
    plugins,
  });
}

describe('store write observer + live scope registry', () => {
  it('broadcasts writes with scopeId, revision, snapshot and change paths', () => {
    const events: unknown[] = [];
    const off = registerStoreWriteObserver({
      onWrite: (event) => {
        events.push(event);
      },
    });

    const runtime = makeRuntime();
    const child = runtime.createChildScope(runtime.getActionRootScope(), { count: 1 });
    child.update('count', 2);

    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1] as { scopeId?: string; revision: number; snapshot: Record<string, unknown>; change: { paths: string[] } };
    expect(last.scopeId).toBe(child.id);
    expect(last.snapshot.count).toBe(2);
    expect(last.revision).toBeGreaterThan(0);

    off();
    child.update('count', 3);
    expect(events.length).toBeGreaterThanOrEqual(1);
    // no growth after unsubscribe
    const before = events.length;
    child.update('count', 4);
    expect(events.length).toBe(before);
  });

  it('observer throw does not break setSnapshot', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const off = registerStoreWriteObserver({
      onWrite: () => {
        throw new Error('observer exploded');
      },
    });
    const runtime = makeRuntime();
    const child = runtime.createChildScope(runtime.getActionRootScope(), {});
    expect(() => child.update('a', 1)).not.toThrow();
    off();
    errorSpy.mockRestore();
  });

  it('getLiveScopeIds tracks child scope registration and disposal', () => {
    const runtime = makeRuntime();
    const before = runtime.getLiveScopeIds();
    const child = runtime.createChildScope(runtime.getActionRootScope(), {}, { scopeKey: 'tracked' });
    expect(runtime.getLiveScopeIds()).toContain(child.id);
    runtime.disposeScope(child.id);
    expect(runtime.getLiveScopeIds()).not.toContain(child.id);
    expect(runtime.getStabilityTracker().isStable()).toBe(true);
    expect(before).not.toContain(child.id);
  });
});
