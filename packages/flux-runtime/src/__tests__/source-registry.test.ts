import { describe, expect, it, vi, afterEach } from 'vitest';
import type { CompiledDataSource, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { createRuntimeSourceRegistry } from '../async-data/source-registry';
import {
  __getSourceCascadeDepthForTests,
  __setSourceCascadeDepthForTests,
} from '../async-data/source-registry';

afterEach(() => {
  vi.restoreAllMocks();
  __setSourceCascadeDepthForTests(0);
});

describe('createRuntimeSourceRegistry', () => {
  it('does not hit a TDZ when scope subscribe synchronously emits during registration', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn();

    const scope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          listener({ paths: ['query'] });
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const registry = createRuntimeSourceRegistry({
      runtime: {
        env: {} as never,
        expressionCompiler: {
          evaluateValue: (value: { value?: unknown }) => value.value,
          compileValue: (value: unknown) => ({ isStatic: true, value }),
        },
      } as unknown as RendererRuntime,
      apiCache: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
      },
      asyncGovernance: undefined,
      executeApiRequest: vi.fn(),
    });

    const registration = registry.registerDataSource({
      id: 'source-1',
      scope,
      compiledSource: {
        kind: 'formula',
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'query' },
      } as unknown as CompiledDataSource,
    });

    expect(registration.id).toBe('source-1');
    registration.dispose();
    expect(stop).not.toHaveBeenCalled();
    void refresh;
  });

  it('logs refresh rejections instead of swallowing them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));
    let emitChange: ((change: { paths: string[] }) => void) | undefined;

    const scope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          emitChange = listener;
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const registry = createRuntimeSourceRegistry({
      runtime: {
        env: {} as never,
        expressionCompiler: {
          evaluateValue: (value: { value?: unknown }) => value.value,
          compileValue: (value: unknown) => ({ isStatic: true, value }),
        },
      } as unknown as RendererRuntime,
      apiCache: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
      },
      asyncGovernance: undefined,
      executeApiRequest: vi.fn(),
    });

    const registration = registry.registerDataSource({
      id: 'source-1',
      scope,
      compiledSource: {
        kind: 'formula',
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as unknown as CompiledDataSource,
    });

    registration.controller.refresh = refresh as () => Promise<void>;
    emitChange?.({ paths: ['query'] });
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith('[source-registry] refresh failed', expect.any(Error));
    registration.dispose();
  });

  it('keeps async source cascade depth until refresh settles and blocks re-entry past the limit', async () => {
    let emitChange: ((change: { paths: string[] }) => void) | undefined;
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const scope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          emitChange = listener;
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const registry = createRuntimeSourceRegistry({
      runtime: {
        env: {} as never,
        expressionCompiler: {
          evaluateValue: (value: { value?: unknown }) => value.value,
          compileValue: (value: unknown) => ({ isStatic: true, value }),
        },
      } as unknown as RendererRuntime,
      apiCache: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
      },
      asyncGovernance: undefined,
      executeApiRequest: vi.fn(),
    });

    const registration = registry.registerDataSource({
      id: 'source-1',
      scope,
      compiledSource: {
        kind: 'formula',
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as unknown as CompiledDataSource,
    });

    registration.controller.refresh = refresh as () => Promise<void>;
    __setSourceCascadeDepthForTests(99);

    emitChange?.({ paths: ['query'] });
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(__getSourceCascadeDepthForTests()).toBe(100);

    emitChange?.({ paths: ['query'] });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[flux-runtime] Source cascade depth limit exceeded');
    expect(__getSourceCascadeDepthForTests()).toBe(100);

    resolveRefresh?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(__getSourceCascadeDepthForTests()).toBe(99);

    registration.dispose();
    error.mockRestore();
  });
});
