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
  return {
    createActionScope: () => createMockActionScope(),
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
    setLoaderModule: (m: ImportedLibraryModule) => {
      loaderModule = m;
    },
  };
}

describe('createImportStack', () => {
  describe('push', () => {
    it('returns undefined when no imports', async () => {
      const { stack, scope } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame).toBeUndefined();
    });

    it('returns undefined when imports is undefined', async () => {
      const { stack, scope } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame).toBeUndefined();
    });

    it('returns frame with entries for valid imports', async () => {
      const { stack, scope } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib-a', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame).toBeDefined();
      expect(frame!.entries['a']).toBeDefined();
      expect(frame!.entries['a'].alias).toBe('a');
      expect(frame!.entries['a'].actionProvider).toBeDefined();
    });

    it('trims whitespace in import spec', async () => {
      const { stack, scope } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: '  lib-a  ', as: '  a  ' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame!.entries['a']).toBeDefined();
      expect(frame!.entries['a'].spec.from).toBe('lib-a');
    });

    it('filters out specs with empty from or as', async () => {
      const { stack, scope } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [
          { from: '', as: 'a' },
          { from: 'lib', as: '' },
        ],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame).toBeUndefined();
    });

    it('throws on duplicate alias within same node', async () => {
      const { stack, scope } = createStackSetup();
      await expect(
        stack.push({
          ownerNodeId: 'node-1',
          imports: [
            { from: 'lib-a', as: 'dup' },
            { from: 'lib-b', as: 'dup' },
          ],
          scope,
          schemaUrl: '/schema.json',
        }),
      ).rejects.toThrow('Duplicate import alias in the same node boundary: dup');
    });

    it('registers namespace in actionScope when provided', async () => {
      const { stack, scope } = createStackSetup();
      const actionScope = createMockActionScope();
      await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'myNs' }],
        actionScope,
        scope,
        schemaUrl: '/schema.json',
      });
      expect(actionScope.listNamespaces()).toContain('myNs');
    });

    it('rolls back already-registered namespaces when a later import fails', async () => {
      const { moduleCache, scope } = createStackSetup();
      const actionScope = createMockActionScope();
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
        getRuntime: createMockRuntime,
        getEnv: createMockEnv,
      });

      await expect(
        stack.push({
          ownerNodeId: 'node-1',
          imports: [
            { from: 'lib-a', as: 'good' },
            { from: 'lib-b', as: 'bad' },
          ],
          actionScope,
          scope,
          schemaUrl: '/schema.json',
        }),
      ).rejects.toThrow('Imported namespace bad failed to load: loader boom');

      expect(actionScope.listNamespaces()).not.toContain('good');
      expect(stack.frames).toHaveLength(0);
      expect(stack.resolveAlias('good')).toBeUndefined();
    });

    it('resolves import URLs via env.resolveImportUrl', async () => {
      const { moduleCache, scope } = createStackSetup();
      const resolveImportUrl = vi.fn((_schemaUrl: string, from: string) => `resolved:${from}`);
      const env = { ...createMockEnv(), resolveImportUrl };
      const stack2 = createImportStack({
        moduleCache,
        getLoader: () => ({
          load: async () => createMockModule(),
        }),
        getRuntime: createMockRuntime,
        getEnv: () => env,
      });
      await stack2.push({
        ownerNodeId: 'node-1',
        imports: [{ from: './relative', as: 'rel' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(resolveImportUrl).toHaveBeenCalledWith('/schema.json', './relative', undefined);
    });

    it('propagates module load errors', async () => {
      const { moduleCache, scope } = createStackSetup();
      const stack = createImportStack({
        moduleCache,
        getLoader: () => ({
          load: async () => {
            throw new Error('loader boom');
          },
        }),
        getRuntime: createMockRuntime,
        getEnv: createMockEnv,
      });
      await expect(
        stack.push({
          ownerNodeId: 'node-1',
          imports: [{ from: 'lib', as: 'a' }],
          scope,
          schemaUrl: '/schema.json',
        }),
      ).rejects.toThrow('Imported namespace a failed to load: loader boom');
    });

    it('handles expression helpers from module', async () => {
      const { moduleCache, scope } = createStackSetup();
      const helpers = { compute: vi.fn(() => 42) };
      const mod = createMockModule({
        createExpressionHelpers: vi.fn(async () => helpers),
      });
      const stack = createImportStack({
        moduleCache,
        getLoader: () => ({ load: async () => mod }),
        getRuntime: createMockRuntime,
        getEnv: createMockEnv,
      });
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame!.entries['a'].expressionHelpers).toEqual(helpers);
    });

    it('sets kind to import when provider lacks kind', async () => {
      const { moduleCache, scope } = createStackSetup();
      const mod: ImportedLibraryModule = {
        createNamespace: vi.fn(async () => ({
          invoke: async () => ({ ok: true }),
        })),
      };
      const stack = createImportStack({
        moduleCache,
        getLoader: () => ({ load: async () => mod }),
        getRuntime: createMockRuntime,
        getEnv: createMockEnv,
      });
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(frame!.entries['a'].actionProvider?.kind).toBe('import');
    });
  });

  describe('installPrepared', () => {
    it('returns undefined for empty imports', () => {
      const { stack, scope } = createStackSetup();
      const result = stack.installPrepared({
        ownerNodeId: 'node-1',
        imports: [],
        scope,
      });
      expect(result).toBeUndefined();
    });

    it('throws when module not cached', () => {
      const { stack, scope } = createStackSetup();
      expect(() =>
        stack.installPrepared({
          ownerNodeId: 'node-1',
          imports: [
            {
              schemaUrl: '/schema.json',
              spec: { from: 'lib', as: 'a' },
              resolvedSpec: { from: 'lib', as: 'a' },
              staticMeta: undefined,
            } satisfies PreparedImportSpec,
          ],
          scope,
        }),
      ).toThrow('Prepared import missing cached module for a');
    });

    it('installs synchronously from cached module', () => {
      const { stack, moduleCache, scope } = createStackSetup();
      const provider = { kind: 'import' as const, invoke: async () => ({ ok: true }) };
      const mod: ImportedLibraryModule = {
        createNamespace: vi.fn(() => provider),
      };
      moduleCache.set('{"from":"lib","options":null}', mod);
      const frame = stack.installPrepared({
        ownerNodeId: 'node-1',
        imports: [
          {
            schemaUrl: '/schema.json',
            spec: { from: 'lib', as: 'a' },
            resolvedSpec: { from: 'lib', as: 'a' },
            staticMeta: { namespaceMethods: ['invoke'] },
          } satisfies PreparedImportSpec,
        ],
        scope,
      });
      expect(frame).toBeDefined();
      expect(frame!.entries['a'].actionProvider).toStrictEqual({
        ...provider,
        kind: 'import',
      });
      expect(frame!.entries['a'].staticMeta).toEqual({ namespaceMethods: ['invoke'] });
    });

    it('throws when createNamespace returns a promise', () => {
      const { stack, moduleCache, scope } = createStackSetup();
      const mod: ImportedLibraryModule = {
        createNamespace: vi.fn(async () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        })),
      };
      moduleCache.set('{"from":"lib","options":null}', mod);
      expect(() =>
        stack.installPrepared({
          ownerNodeId: 'node-1',
          imports: [
            {
              schemaUrl: '/schema.json',
              spec: { from: 'lib', as: 'a' },
              resolvedSpec: { from: 'lib', as: 'a' },
            } satisfies PreparedImportSpec,
          ],
          scope,
        }),
      ).toThrow('Prepared import a must install synchronously at render time');
    });

    it('throws when createExpressionHelpers returns a promise', () => {
      const { stack, moduleCache, scope } = createStackSetup();
      const mod: ImportedLibraryModule = {
        createNamespace: vi.fn(() => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        })),
        createExpressionHelpers: vi.fn(async () => ({})),
      };
      moduleCache.set('{"from":"lib","options":null}', mod);
      expect(() =>
        stack.installPrepared({
          ownerNodeId: 'node-1',
          imports: [
            {
              schemaUrl: '/schema.json',
              spec: { from: 'lib', as: 'a' },
              resolvedSpec: { from: 'lib', as: 'a' },
            } satisfies PreparedImportSpec,
          ],
          scope,
        }),
      ).toThrow('Prepared import a must install synchronously at render time');
    });

    it('throws on duplicate alias', () => {
      const { stack, moduleCache, scope } = createStackSetup();
      const mod: ImportedLibraryModule = {
        createNamespace: vi.fn(() => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        })),
      };
      moduleCache.set('{"from":"lib-a","options":null}', mod);
      moduleCache.set('{"from":"lib-b","options":null}', mod);
      expect(() =>
        stack.installPrepared({
          ownerNodeId: 'node-1',
          imports: [
            {
              schemaUrl: '/schema.json',
              spec: { from: 'lib-a', as: 'dup' },
              resolvedSpec: { from: 'lib-a', as: 'dup' },
            } satisfies PreparedImportSpec,
            {
              schemaUrl: '/schema.json',
              spec: { from: 'lib-b', as: 'dup' },
              resolvedSpec: { from: 'lib-b', as: 'dup' },
            } satisfies PreparedImportSpec,
          ],
          scope,
        }),
      ).toThrow('Duplicate import alias in the same node boundary: dup');
    });

    it('rolls back prepared namespaces when a later prepared import fails', () => {
      const { stack, moduleCache, scope } = createStackSetup();
      const actionScope = createMockActionScope();

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
          actionScope,
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

      expect(actionScope.listNamespaces()).not.toContain('good');
      expect(stack.frames).toHaveLength(0);
      expect(stack.resolveAlias('good')).toBeUndefined();
    });
  });

  describe('pop', () => {
    it('does nothing for unknown frameId', () => {
      const { stack } = createStackSetup();
      expect(() => stack.pop('nonexistent')).not.toThrow();
    });

    it('removes frame and releases namespaces', async () => {
      const { stack, scope } = createStackSetup();
      const actionScope = createMockActionScope();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        actionScope,
        scope,
        schemaUrl: '/schema.json',
      });
      expect(actionScope.listNamespaces()).toContain('a');
      stack.pop(frame!.id);
      expect(actionScope.listNamespaces()).not.toContain('a');
      expect(stack.resolveAlias('a')).toBeUndefined();
    });
  });

  describe('resolveAlias', () => {
    it('returns undefined when no frames exist', () => {
      const { stack } = createStackSetup();
      expect(stack.resolveAlias('anything')).toBeUndefined();
    });

    it('resolves alias from most recent frame', async () => {
      const { stack, scope } = createStackSetup();
      await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      const resolved = stack.resolveAlias('a');
      expect(resolved).toBeDefined();
      expect(resolved!.alias).toBe('a');
    });

    it('resolves via parent frame chain', async () => {
      const { stack, scope } = createStackSetup();
      const parent = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'parentNs' }],
        scope,
        schemaUrl: '/schema.json',
      });
      await stack.push({
        ownerNodeId: 'node-2',
        parentFrameId: parent!.id,
        imports: [{ from: 'lib2', as: 'childNs' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(stack.resolveAlias('childNs', parent!.id)).toBeUndefined();
    });

    it('returns undefined for unknown alias', async () => {
      const { stack, scope } = createStackSetup();
      await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(stack.resolveAlias('nonexistent')).toBeUndefined();
    });
  });

  describe('currentBindings', () => {
    it('returns empty object when no frames', () => {
      const { stack } = createStackSetup();
      expect(stack.currentBindings()).toEqual({});
    });

    it('returns bindings with $ prefix for entries', async () => {
      const { stack, scope } = createStackSetup();
      await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'demo' }],
        scope,
        schemaUrl: '/schema.json',
      });
      const bindings = stack.currentBindings();
      expect(bindings.$demo).toBeDefined();
    });
  });

  describe('preload', () => {
    it('loads modules without creating frames', async () => {
      const { stack, moduleCache } = createStackSetup();
      await stack.preload({
        imports: [{ from: 'lib', as: 'a' }],
        schemaUrl: '/schema.json',
      });
      expect(moduleCache.get('{"from":"lib","options":null}')).toBeDefined();
      expect(stack.frames.length).toBe(0);
    });

    it('handles empty imports', async () => {
      const { stack } = createStackSetup();
      await expect(
        stack.preload({ imports: [], schemaUrl: '/schema.json' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('dispose', () => {
    it('pops all frames', async () => {
      const { stack, scope } = createStackSetup();
      await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });
      await stack.push({
        ownerNodeId: 'node-2',
        imports: [{ from: 'lib2', as: 'b' }],
        scope,
        schemaUrl: '/schema.json',
      });
      expect(stack.frames.length).toBe(2);
      stack.dispose();
      expect(stack.frames.length).toBe(0);
    });
  });

  describe('frames', () => {
    it('tracks frames in order', async () => {
      const { stack, scope } = createStackSetup();
      const f1 = await stack.push({
        ownerNodeId: 'n1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/s.json',
      });
      const f2 = await stack.push({
        ownerNodeId: 'n2',
        imports: [{ from: 'lib2', as: 'b' }],
        scope,
        schemaUrl: '/s.json',
      });
      expect(stack.frames[0]).toBe(f1);
      expect(stack.frames[1]).toBe(f2);
    });
  });
});
