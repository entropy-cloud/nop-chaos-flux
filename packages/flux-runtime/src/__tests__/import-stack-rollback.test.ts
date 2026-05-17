import { describe, expect, it, vi } from 'vitest';
import { createImportStack } from '../import-stack.js';
import type {
  ActionScope,
  ImportedLibraryModule,
  ModuleCache,
  PreparedImportSpec,
  RendererEnv,
  RendererRuntime,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createScopeRef } from '../scope.js';

function createMockModule(mod?: Partial<ImportedLibraryModule>): ImportedLibraryModule {
  return {
    createNamespace: vi.fn(async () => ({
      kind: 'import' as const,
      invoke: async () => ({ ok: true }),
    })),
    createExpressionHelpers: mod?.createExpressionHelpers,
    ...mod,
  };
}

function createModuleCache(): ModuleCache {
  const cache = new Map<string, ImportedLibraryModule>();
  const pending = new Map<string, Promise<ImportedLibraryModule>>();
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, mod: ImportedLibraryModule) => {
      cache.set(key, mod);
    },
    has: (key: string) => cache.has(key),
    getPending: (key: string) => pending.get(key),
    setPending: (key: string, p: Promise<ImportedLibraryModule>) => {
      pending.set(key, p);
    },
    removePending: (key: string) => {
      pending.delete(key);
    },
    clear() {
      cache.clear();
      pending.clear();
    },
  };
}

function createMockActionScope(namespaces: string[] = []): ActionScope {
  const ns = new Set(namespaces);
  const releaseMap = new Map<string, () => void>();
  return {
    id: 'mock-action-scope',
    listNamespaces: () => Array.from(ns),
    registerNamespace: (alias: string) => {
      ns.add(alias);
      const key = `ns-${alias}`;
      const release = () => {
        ns.delete(alias);
        releaseMap.delete(key);
      };
      releaseMap.set(key, release);
      return release;
    },
    dispatch: async () => ({ ok: true }),
    getNamespace: () => undefined,
  } as unknown as ActionScope;
}

function createMockRuntime(): RendererRuntime {
  const releaseActionScope = vi.fn();
  return {
    createActionScope: () => createMockActionScope(),
    releaseActionScope,
  } as unknown as RendererRuntime;
}

function createMockEnv(): RendererEnv {
  return {
    fetcher: async <T>() => ({ ok: true as const, status: 200, data: null as T }),
    notify: () => {},
  };
}

function createStackSetup() {
  const moduleCache = createModuleCache();
  const runtime = createMockRuntime();
  const scope = createScopeRef({ id: 'test-scope', path: '$test', initialData: {} });

  return {
    moduleCache,
    runtime,
    scope,
  };
}

describe('createImportStack rollback', () => {
  it('releases auto-owned action scopes when push rollback fails after scope creation', async () => {
    const { moduleCache, runtime, scope } = createStackSetup();
    const stack = createImportStack({
      moduleCache,
      getLoader: () => ({
        load: async (spec: XuiImportSpec) => {
          if (spec.as === 'bad') {
            throw new Error('loader boom');
          }

          return createMockModule();
        },
      }),
      getRuntime: () => runtime,
      getEnv: createMockEnv,
    });

    await expect(
      stack.push({
        ownerNodeId: 'node-1',
        imports: [
          { from: 'lib-a', as: 'good' },
          { from: 'lib-b', as: 'bad' },
        ],
        scope,
        schemaUrl: '/schema.json',
      }),
    ).rejects.toThrow('Imported namespace bad failed to load: loader boom');

    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(1);
  });

  it('releases auto-owned action scopes when prepared install rolls back', () => {
    const { moduleCache, runtime, scope } = createStackSetup();
    const stack = createImportStack({
      moduleCache,
      getLoader: () => ({ load: async () => createMockModule() }),
      getRuntime: () => runtime,
      getEnv: createMockEnv,
    });

    moduleCache.set(
      '{"from":"lib-a","options":null}',
      createMockModule({
        createNamespace: vi.fn(() => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        })),
      }),
    );
    moduleCache.set(
      '{"from":"lib-b","options":null}',
      createMockModule({
        createNamespace: vi.fn(async () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        })),
      }),
    );

    expect(() =>
      stack.installPrepared({
        ownerNodeId: 'node-1',
        imports: [
          {
            schemaUrl: '/schema.json',
            spec: { from: 'lib-a', as: 'good' },
            resolvedSpec: { from: 'lib-a', as: 'good' },
          } satisfies PreparedImportSpec,
          {
            schemaUrl: '/schema.json',
            spec: { from: 'lib-b', as: 'bad' },
            resolvedSpec: { from: 'lib-b', as: 'bad' },
          } satisfies PreparedImportSpec,
        ],
        scope,
      }),
    ).toThrow('Prepared import bad must install synchronously at render time');

    expect(runtime.releaseActionScope).toHaveBeenCalledTimes(1);
  });
});
