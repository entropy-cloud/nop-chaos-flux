import { vi } from 'vitest';
import type {
  ActionScope,
  ImportedLibraryModule,
  ModuleCache,
  RendererEnv,
  RendererRuntime,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createImportStack } from '../import-stack.js';
import { createScopeRef } from '../scope.js';

export function createMockModule(mod?: Partial<ImportedLibraryModule>): ImportedLibraryModule {
  return {
    createNamespace: vi.fn(async () => ({
      kind: 'import' as const,
      invoke: async () => ({ ok: true }),
    })),
    createExpressionHelpers: mod?.createExpressionHelpers,
    ...mod,
  };
}

export function createModuleCache(): ModuleCache {
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

export function createMockActionScope(namespaces: string[] = []): ActionScope {
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

export function createMockRuntime(): RendererRuntime {
  const releaseActionScope = vi.fn();
  return {
    createActionScope: () => createMockActionScope(),
    releaseActionScope,
  } as unknown as RendererRuntime;
}

export function createMockEnv(): RendererEnv {
  return {
    fetcher: async <T>() => ({ ok: true as const, status: 200, data: null as T }),
    notify: () => {},
  };
}

export function createStackSetup() {
  const moduleCache = createModuleCache();
  const env = createMockEnv();
  const runtime = createMockRuntime();
  let loaderModule: ImportedLibraryModule = createMockModule();

  const stack = createImportStack({
    moduleCache,
    getLoader: () => ({
      load: async (_spec: XuiImportSpec) => loaderModule,
    }),
    getRuntime: () => runtime,
    getEnv: () => env,
  });

  const scope = createScopeRef({ id: 'test-scope', path: '$test', initialData: {} });

  return {
    stack,
    moduleCache,
    env,
    runtime,
    scope,
    setLoaderModule: (mod: ImportedLibraryModule) => {
      loaderModule = mod;
    },
  };
}
