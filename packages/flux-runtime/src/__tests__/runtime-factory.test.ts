import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createModuleCache, createRendererRuntime } from '../index.js';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
};

const env = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

describe('createModuleCache', () => {
  it('stores and retrieves resolved modules', () => {
    const cache = createModuleCache();
    const module = { createNamespace: vi.fn() } as any;

    expect(cache.has('test')).toBe(false);
    cache.set('test', module);
    expect(cache.has('test')).toBe(true);
    expect(cache.get('test')).toBe(module);
  });

  it('stores and retrieves pending promises', () => {
    const cache = createModuleCache();
    const promise = Promise.resolve({ createNamespace: vi.fn() } as any);

    cache.setPending('pending-mod', promise);
    expect(cache.getPending('pending-mod')).toBe(promise);
    cache.removePending('pending-mod');
    expect(cache.getPending('pending-mod')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = createModuleCache();
    cache.set('a', {} as any);
    cache.set('b', {} as any);

    cache.clear();
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
  });
});

describe('createRendererRuntime', () => {
  it('returns a runtime with expected structure and default values', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    expect(runtime).toBeDefined();
    expect(runtime.runtimeId).toBeDefined();
    expect(runtime.runtimeId).toMatch(/^runtime-/);
    expect(runtime.registry).toBe(registry);
    expect(runtime.env).toBe(env);
    expect(runtime.expressionCompiler).toBeDefined();
    expect(runtime.schemaCompiler).toBeDefined();
    expect(runtime.strictMode).toBe(false);
    expect(runtime.plugins).toEqual([]);
    expect(runtime.moduleCache).toBeDefined();
  });

  it('accepts custom options and merges them correctly', () => {
    const registry = createRendererRegistry([textRenderer]);
    const moduleCache = createModuleCache();
    const onActionError = vi.fn();

    const runtime = createRendererRuntime({
      registry,
      env,
      strictMode: true,
      moduleCache,
      onActionError,
    });

    expect(runtime.strictMode).toBe(true);
    expect(runtime.moduleCache).toBe(moduleCache);
  });

  it('provides evaluate, compile, and dispatch functions', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    expect(typeof runtime.evaluate).toBe('function');
    expect(typeof runtime.compile).toBe('function');
    expect(typeof runtime.dispatch).toBe('function');
  });

  it('supports child scope creation', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });
    const page = runtime.createPageRuntime({ pageValue: 'root' });

    const child = runtime.createChildScope(
      page.scope,
      { value: 42 },
      { pathSuffix: 'child', scopeKey: 'test-key' },
    );

    expect(child.id).toMatch(/^test-key:/);
    expect(child.path).toBe('$page.child');
    expect(child.readVisible()).toEqual({ value: 42 });
  });

  it('handles schema compilation', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    const compiled = runtime.compile({ type: 'text', text: 'hello' });
    expect(compiled).toBeDefined();
    expect(compiled.root).toBeDefined();
  });

  it('is idempotent on dispose', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    expect(() => runtime.dispose()).not.toThrow();
    expect(() => runtime.dispose()).not.toThrow();
  });

  it('returns empty debug snapshots before any sources/reactions are registered', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    expect(runtime.getSourceDebugSnapshot?.()).toEqual({ sources: [] });
    expect(runtime.getReactionDebugSnapshot?.()).toEqual({ reactions: [] });
  });

  it('allocates sequential mounted CIDs', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    const first = runtime.allocateMountedCid();
    const second = runtime.allocateMountedCid();
    expect(second).toBeGreaterThan(first);
  });

  it('returns undefined from resolveTarget when node resolver is not initialized', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    const result = runtime.resolveTarget?.({ type: 'test' } as any, {} as any);
    expect(result).toBeUndefined();
  });

  it('handles setEnv to update the environment reference', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env });

    const newEnv = { ...env, notify: vi.fn() };
    runtime.setEnv(newEnv);
    expect(runtime.env.notify).toBe(newEnv.notify);
  });
});
