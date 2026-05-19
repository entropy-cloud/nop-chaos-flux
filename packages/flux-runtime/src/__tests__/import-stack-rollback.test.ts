import { describe, expect, it, vi } from 'vitest';
import { createImportStack } from '../import-stack.js';
import type { PreparedImportSpec, XuiImportSpec } from '@nop-chaos/flux-core';
import {
  createMockEnv,
  createMockModule,
  createStackSetup,
} from './import-stack-test-support.js';

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
