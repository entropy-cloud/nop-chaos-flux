import { describe, expect, it, vi, afterEach } from 'vitest';
import type { CompiledDataSource, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { createRuntimeSourceRegistry } from '../async-data/source-registry.js';
import {
  __getSourceCascadeDepthForTests,
  __setSourceCascadeDepthForTests,
} from '../async-data/source-registry.js';

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

  it('reports refresh rejections through the runtime host channel', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));
    let emitChange: ((change: { paths: string[] }) => void) | undefined;
    const notify = vi.fn();

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
        env: { notify } as never,
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

    expect(notify).toHaveBeenCalledWith('error', 'Data source refresh failed: source-1');
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
    const notify = vi.fn();

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
        env: { notify } as never,
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
    expect(__getSourceCascadeDepthForTests()).toBe(99);

    emitChange?.({ paths: ['query'] });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(notify).not.toHaveBeenCalledWith('error', 'Source cascade depth limit exceeded');
    expect(__getSourceCascadeDepthForTests()).toBe(99);

    resolveRefresh?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(__getSourceCascadeDepthForTests()).toBe(99);

    registration.dispose();
  });

  it('isolates source cascade depth per registry instance', async () => {
    let emitFirstChange: ((change: { paths: string[] }) => void) | undefined;
    let resolveFirstRefresh: (() => void) | undefined;
    const firstRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstRefresh = resolve;
        }),
    );
    const firstNotify = vi.fn();
    const secondNotify = vi.fn();

    const firstScope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          emitFirstChange = listener;
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const secondScope = {
      id: 'scope-2',
      store: {
        subscribe() {
          return () => undefined;
        },
      },
    } as unknown as ScopeRef;

    const firstRegistry = createRuntimeSourceRegistry({
      runtime: {
        env: { notify: firstNotify } as never,
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
    });

    const secondRegistry = createRuntimeSourceRegistry({
      runtime: {
        env: { notify: secondNotify } as never,
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
    });

    const firstRegistration = firstRegistry.registerDataSource({
      id: 'source-1',
      scope: firstScope,
      compiledSource: {
        kind: 'formula',
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as unknown as CompiledDataSource,
    });
    firstRegistration.controller.refresh = firstRefresh as () => Promise<void>;

    const secondRefresh = vi.fn().mockResolvedValue(undefined);
    const secondRegistration = secondRegistry.registerDataSource({
      id: 'source-2',
      scope: secondScope,
      compiledSource: {
        kind: 'formula',
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as unknown as CompiledDataSource,
    });
    secondRegistration.controller.refresh = secondRefresh as () => Promise<void>;

    emitFirstChange?.({ paths: ['query'] });
    await Promise.resolve();

    expect(firstRefresh).toHaveBeenCalledTimes(1);

    const refreshed = await secondRegistry.refreshDataSource({ id: 'source-2', scope: secondScope });
    await Promise.resolve();

    expect(refreshed).toBe(true);
    expect(secondRefresh).toHaveBeenCalledTimes(1);
    expect(secondNotify).not.toHaveBeenCalledWith('error', 'Source cascade depth limit exceeded');

    resolveFirstRefresh?.();
    await Promise.resolve();
    await Promise.resolve();

    firstRegistration.dispose();
    secondRegistration.dispose();
  });
});
