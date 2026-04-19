import { describe, expect, it, vi } from 'vitest';
import type { ApiSchema, ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createModuleCache, createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('releases imported namespaces after the final matching release call', async () => {
    const dispose = vi.fn();
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          dispose,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'import-scope' });
    const imports = [{ from: 'demo-lib', as: 'demo' }] as const;

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });
    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });

    expect(importLoader.load).toHaveBeenCalledTimes(1);

    const firstResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'live' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(firstResult).toMatchObject({ ok: true, data: 'demo-lib:ping:live' });

    runtime.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema/root.json' });
    await Promise.resolve();

    expect(dispose).not.toHaveBeenCalled();

    const secondResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'still-live' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(secondResult).toMatchObject({ ok: true, data: 'demo-lib:ping:still-live' });

    runtime.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema/root.json' });
    await Promise.resolve();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);

    const releasedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'released' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(releasedResult).toMatchObject({ ok: false, error: expect.any(Error) });
  });

  it('dispose aborts in-flight requests and releases owned imported namespaces', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const dispose = vi.fn();
    const fetcher = vi.fn(async <T>(_api: ApiSchema, ctx: ApiRequestContext) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });

      if (ctx.signal?.aborted) {
        const error = new Error('aborted');
        (error as Error & { name: string }).name = 'AbortError';
        throw error;
      }

      return {
        ok: true,
        status: 200,
        data: { ok: true } as T
      };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher'],
        importLoader: {
          load: vi.fn(async () => ({
            createNamespace: () => ({
              kind: 'import' as const,
              dispose,
              invoke: async () => ({ ok: true })
            })
          }))
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'import-scope' });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'demo-lib', as: 'demo' }],
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });

    void runtime.registerDataSource({
      id: 'slow-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/slow' },
        name: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    runtime.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('restores parent scope shadowing after child imports release', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const parentActionScope = runtime.createActionScope({ id: 'parent-import-scope' });
    const childActionScope = runtime.createActionScope({ id: 'child-import-scope', parent: parentActionScope });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'parent-lib', as: 'demo' }],
      actionScope: parentActionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });
    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'child-lib', as: 'demo' }],
      actionScope: childActionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });

    const shadowedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'child' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope
      }
    );

    expect(shadowedResult).toMatchObject({ ok: true, data: 'child-lib:ping:child' });

    runtime.releaseImportedNamespaces({
      imports: [{ from: 'child-lib', as: 'demo' }],
      actionScope: childActionScope,
      schemaUrl: '/schema/root.json'
    });
    await Promise.resolve();

    const restoredResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'parent' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope
      }
    );

    expect(restoredResult).toMatchObject({ ok: true, data: 'parent-lib:ping:parent' });
  });

  it('rejects colliding import aliases within the same action scope', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'collision-scope' });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'first-lib', as: 'demo' }],
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json'
    });

    await expect(
      runtime.ensureImportedNamespaces({
        imports: [{ from: 'second-lib', as: 'demo' }],
        actionScope,
        scope: page.scope,
        schemaUrl: '/schema/root.json'
      })
    ).rejects.toThrow('Namespace collision for import alias: demo');
  });

  it('retries a failed import within the same action scope when loader behavior changes', async () => {
    let shouldFail = true;
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => {
        if (shouldFail) {
          throw new Error('loader exploded');
        }

        return {
          createNamespace: () => ({
            kind: 'import' as const,
            invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
              ok: true,
              data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
            })
          })
        };
      })
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'retry-import-scope' });
    const imports = [{ from: 'retry-lib', as: 'retry' }] as const;

    await expect(
      runtime.ensureImportedNamespaces({
        imports,
        actionScope,
        scope: page.scope,
        schemaUrl: '/schema/root.json'
      })
    ).rejects.toThrow('Imported namespace retry failed to load: loader exploded');

    shouldFail = false;

    await expect(
      runtime.ensureImportedNamespaces({
        imports,
        actionScope,
        scope: page.scope,
        schemaUrl: '/schema/root.json'
      })
    ).resolves.toBeUndefined();

    const result = await runtime.dispatch(
      {
        action: 'retry:ping',
        args: { value: 'ok' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(importLoader.load).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, data: 'retry-lib:ping:ok' });
  });

  it('passes nodeInstance through imported namespace setup context', async () => {
    const createNamespace = vi.fn(() => ({
      kind: 'import' as const,
      invoke: async () => ({ ok: true })
    }));
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'node-instance-import-scope' });
    const compiled = runtime.compile({ type: 'text', text: 'imports' });
    const templateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const nodeInstance = {
      cid: templateNode.templateNodeId,
      templateNode,
      scope: page.scope,
      state: { metaState: {}, mounted: true }
    } as any;

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'demo-lib', as: 'demo' }],
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
      nodeInstance
    });

    expect(createNamespace).toHaveBeenCalledWith(expect.objectContaining({
      nodeInstance,
      actionScope,
      scope: page.scope
    }));
  });

  it('shares cached modules across runtimes when they use the same module cache', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const moduleCache = createModuleCache();
    const runtimeA = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader },
      moduleCache,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const runtimeB = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader },
      moduleCache,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const pageA = runtimeA.createPageRuntime({});
    const pageB = runtimeB.createPageRuntime({});
    const actionScopeA = runtimeA.createActionScope({ id: 'scope-a' });
    const actionScopeB = runtimeB.createActionScope({ id: 'scope-b' });

    await runtimeA.ensureImportedNamespaces({
      imports: [{ from: 'demo-lib', as: 'demo' }],
      actionScope: actionScopeA,
      scope: pageA.scope,
      schemaUrl: '/schema/a.json'
    });
    await runtimeB.ensureImportedNamespaces({
      imports: [{ from: 'demo-lib', as: 'demo' }],
      actionScope: actionScopeB,
      scope: pageB.scope,
      schemaUrl: '/schema/b.json'
    });

    expect(importLoader.load).toHaveBeenCalledTimes(1);
  });

  it('resolves import URLs before cache lookup and load', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        })
      }))
    };
    const resolveImportUrl = vi.fn((schemaUrl: string, from: string) => `resolved:${schemaUrl}:${from}`);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader, resolveImportUrl },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'resolved-scope' });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: './demo-lib', as: 'demo' }],
      actionScope,
      scope: page.scope,
      schemaUrl: 'https://app.local/schema/page.json'
    });

    expect(resolveImportUrl).toHaveBeenCalledWith('https://app.local/schema/page.json', './demo-lib', undefined);
    expect(importLoader.load).toHaveBeenCalledWith({ from: 'resolved:https://app.local/schema/page.json:./demo-lib', as: 'demo' }, undefined);
  });
});
