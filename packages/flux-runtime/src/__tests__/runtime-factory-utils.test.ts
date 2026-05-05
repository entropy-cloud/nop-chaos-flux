import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type ImportedLibraryModule,
  type ScopeRef,
  type SchemaCompiler,
  type XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createScopeRef } from '../scope';
import { createProjectedScopeStore } from '../projected-scope-store';
import { createModuleCache, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createProjectedScopeStore', () => {
  it('caches projected snapshots and returns no store when the scope has no store', () => {
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: { value: 1 } });
    const projectSnapshot = vi.fn(() => ({ projected: scope.get('value') }));

    const projected = createProjectedScopeStore(
      {
        ...scope,
        store: undefined,
      } as ScopeRef,
      projectSnapshot,
    );

    expect(projected.store).toBeUndefined();
    expect(projected.readSnapshot()).toEqual({ projected: 1 });
    expect(projected.readSnapshot()).toEqual({ projected: 1 });
    expect(projectSnapshot).toHaveBeenCalledTimes(1);
  });

  it('exposes a derived store, caches by base snapshot, and rejects setSnapshot', () => {
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: { count: 1 } });
    const projectSnapshot = vi.fn(() => ({ doubled: Number(scope.get('count') ?? 0) * 2 }));
    const projected = createProjectedScopeStore(scope, projectSnapshot);
    const listener = vi.fn();

    const first = projected.readSnapshot();
    const second = projected.store?.getSnapshot();
    expect(first).toBe(second);
    expect(projectSnapshot).toHaveBeenCalledTimes(1);
    expect(projected.store?.getLastChange()).toEqual(scope.store?.getLastChange());

    const unsubscribe = projected.store?.subscribe(listener);
    scope.update('count', 2);
    expect(projected.store?.getSnapshot()).toEqual({ doubled: 4 });
    expect(listener).toHaveBeenCalled();
    unsubscribe?.();

    expect(() => projected.store?.setSnapshot({ doubled: 6 })).toThrow(
      'Cannot set snapshot on projected scope store',
    );
  });
});

describe('runtime factory utilities', () => {
  it('stores resolved and pending modules in the module cache', async () => {
    const cache = createModuleCache();
    const module = { createNamespace: vi.fn() } as unknown as ImportedLibraryModule;
    const pending = Promise.resolve(module);

    expect(cache.has('demo')).toBe(false);
    cache.setPending('demo', pending);
    expect(cache.getPending('demo')).toBe(pending);
    cache.set('demo', module);
    expect(cache.get('demo')).toBe(module);
    expect(cache.has('demo')).toBe(true);
    cache.removePending('demo');
    expect(cache.getPending('demo')).toBeUndefined();
  });

  it('returns empty prepared imports when the schema compiler has no prepare hook', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      schemaCompiler: {
        compile: vi.fn(),
        compileNode: vi.fn(),
      } as unknown as SchemaCompiler,
    });

    await expect(
      runtime.prepareSchema?.(
        { type: 'text', text: 'hello' },
        {
          schemaUrl: '/schema.json',
        },
      ),
    ).resolves.toEqual({
      preparedImports: new Map(),
    });
  });

  it('throws when prepared imports exist but env.importLoader is missing', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      schemaCompiler: {
        compile: vi.fn(),
        compileNode: vi.fn(),
        prepare: vi.fn().mockResolvedValue({
          preparedImports: new Map([
            [
              'demo',
              {
                spec: { from: 'demo-lib', as: 'demo' },
                resolvedSpec: { from: 'demo-lib', as: 'demo' },
              },
            ],
          ]),
        }),
      } as unknown as SchemaCompiler,
    });

    await expect(
      runtime.prepareSchema?.(
        { type: 'text', text: 'hello' },
        {
          schemaUrl: '/schema.json',
        },
      ),
    ).rejects.toThrow('Schema preparation requires env.importLoader when xui:imports are present.');
  });

  it('preserves preload import error cause and stack', async () => {
    const sourceError = new Error('loader exploded');
    sourceError.stack = 'loader-stack';
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader: {
          load: vi.fn(async () => {
            throw sourceError;
          }),
        },
      },
      schemaCompiler: {
        compile: vi.fn(),
        compileNode: vi.fn(),
        prepare: vi.fn().mockResolvedValue({
          preparedImports: new Map([
            [
              'demo',
              {
                schemaUrl: '/schema.json',
                spec: { from: 'demo-lib', as: 'demo' },
                resolvedSpec: { from: 'demo-lib', as: 'demo' },
              },
            ],
          ]),
        }),
      } as unknown as SchemaCompiler,
    });

    await expect(
      runtime.prepareSchema?.(
        { type: 'text', text: 'hello' },
        {
          schemaUrl: '/schema.json',
        },
      ),
    ).rejects.toMatchObject({
      cause: sourceError,
      stack: 'loader-stack',
    });
  });

  it('resolves prepared import urls, updates env references, and disposes idempotently', async () => {
    const executeDispose = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        resolveImportUrl: vi.fn((schemaUrl: string, from: string) => `${schemaUrl}:${from}`),
      },
    });

    expect(
      runtime.resolvePreparedImports({
        schemaUrl: '/schema.json',
        imports: [{ from: './demo-lib', as: 'demo' } satisfies XuiImportSpec],
      }),
    ).toEqual([
      {
        schemaUrl: '/schema.json',
        spec: { from: './demo-lib', as: 'demo' },
        resolvedSpec: { from: '/schema.json:./demo-lib', as: 'demo' },
      },
    ]);

    runtime.setEnv({
      ...env,
      notify: executeDispose,
    });
    expect(runtime.env.notify).toBe(executeDispose);

    expect(() => runtime.dispose()).not.toThrow();
    expect(() => runtime.dispose()).not.toThrow();
  });

  it('disposes page validation owners and tracked form runtimes with runtime disposal', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'tracked-form',
      parentScope: page.scope,
      initialValues: { email: '' },
    });
    const pageValidationDispose = vi.spyOn(page.validationOwner!, 'dispose');
    const formDispose = vi.spyOn(form, 'dispose');

    runtime.dispose();

    expect(pageValidationDispose).toHaveBeenCalledTimes(1);
    expect(formDispose).toHaveBeenCalledTimes(1);
  });

  it('allocates mounted cids, creates child scopes/action scopes/component registries, and exposes default debug snapshots', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });

    const firstCid = runtime.allocateMountedCid?.();
    const secondCid = runtime.allocateMountedCid?.();
    expect(secondCid).toBeGreaterThan(firstCid!);

    const childScope = runtime.createChildScope(
      page.scope,
      { local: true },
      { pathSuffix: 'child', scopeKey: 'child-scope', isolate: true },
    );
    expect(childScope.id).toBe('child-scope');
    expect(childScope.path).toBe('$page.child');
    expect(childScope.readVisible()).toEqual({ local: true });

    const parentActionScope = runtime.createActionScope();
    const childActionScope = runtime.createActionScope({ parent: parentActionScope });
    expect(childActionScope.parent).toBe(parentActionScope);
    expect(childActionScope.id).toContain('action-scope-');

    const parentRegistry = runtime.createComponentHandleRegistry();
    const childRegistry = runtime.createComponentHandleRegistry({ parent: parentRegistry });
    expect(childRegistry.parent).toBe(parentRegistry);
    expect(childRegistry.id).toContain('component-registry-');

    expect(runtime.getSourceDebugSnapshot?.()).toEqual({ sources: [] });
    expect(runtime.getReactionDebugSnapshot?.()).toEqual({ reactions: [] });
    expect(runtime.getAsyncOwnerDebugSnapshot?.()).toEqual(expect.any(Object));
  });

  it('keeps executeSource callable after dispose', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
    });
    const page = runtime.createPageRuntime({});

    runtime.dispose();

    await expect(
      runtime.executeSource?.({
        source: { type: 'data-source', action: 'noop' } as never,
        scope: page.scope,
        ctx: {},
      }),
    ).resolves.toEqual(expect.objectContaining({ ok: false, error: expect.any(Error) }));
  });
});
