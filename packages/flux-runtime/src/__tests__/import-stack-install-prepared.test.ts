import { describe, expect, it, vi } from 'vitest';
import type { ImportedLibraryModule, PreparedImportSpec } from '@nop-chaos/flux-core';
import { createMockActionScope, createMockModule, createStackSetup } from './import-stack-test-support.js';

describe('createImportStack installPrepared', () => {
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

  it('rejects reserved aliases during prepared installation', () => {
    const { stack, moduleCache, scope } = createStackSetup();
    moduleCache.set(
      '{"from":"lib","options":null}',
      createMockModule({
        createNamespace: vi.fn(() => ({
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
            spec: { from: 'lib', as: 'page' },
            resolvedSpec: { from: 'lib', as: 'page' },
          } satisfies PreparedImportSpec,
        ],
        scope,
      }),
    ).toThrow('Import alias is reserved and cannot shadow runtime binding: $page');
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
