import { describe, expect, it, vi } from 'vitest';
import { createImportStack } from '../import-stack.js';
import type { ImportedLibraryModule, XuiImportSpec } from '@nop-chaos/flux-core';
import {
  createMockActionScope,
  createMockEnv,
  createMockModule,
  createMockRuntime,
  createStackSetup,
} from './import-stack-test-support.js';

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

    it('rejects reserved import aliases for runtime bindings', async () => {
      const { stack, scope } = createStackSetup();

      await expect(
        stack.push({
          ownerNodeId: 'node-1',
          imports: [{ from: 'lib', as: 'form' }],
          scope,
          schemaUrl: '/schema.json',
        }),
      ).rejects.toThrow('Import alias is reserved and cannot shadow runtime binding: $form');
    });

    it('rejects the reserved __xui_actions__ namespace alias', async () => {
      const { stack, scope } = createStackSetup();

      await expect(
        stack.push({
          ownerNodeId: 'node-1',
          imports: [{ from: 'lib', as: '__xui_actions__' }],
          scope,
          schemaUrl: '/schema.json',
        }),
      ).rejects.toThrow(
        'Import alias is reserved and cannot shadow runtime namespace: __xui_actions__',
      );
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

    it('releases runtime-owned action scopes when popping auto-owned frames', async () => {
      const { stack, scope, runtime } = createStackSetup();
      const frame = await stack.push({
        ownerNodeId: 'node-1',
        imports: [{ from: 'lib', as: 'a' }],
        scope,
        schemaUrl: '/schema.json',
      });

      expect(frame?.actionScope).toBeDefined();

      stack.pop(frame!.id);

      expect(runtime.releaseActionScope).toHaveBeenCalledWith(frame!.actionScope);
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
