import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type ApiSchema,
  type ApiRequestContext,
  type RendererEnv,
} from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createModuleCache, createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

async function prepareImports(
  runtime: ReturnType<typeof createRendererRuntime>,
  imports: readonly { from: string; as: string }[],
  schemaUrl: string,
) {
  const prepared = await runtime.prepareSchema?.(
    { type: 'text', text: 'prepare', 'xui:imports': imports } as any,
    { schemaUrl },
  );
  return Array.from(prepared?.preparedImports.values() ?? []);
}

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
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`,
          }),
        }),
      })),
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'import-scope' });
    const imports = await prepareImports(
      runtime,
      [{ from: 'demo-lib', as: 'demo' }],
      '/schema/root.json',
    );

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });
    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });

    expect(importLoader.load).toHaveBeenCalledTimes(1);

    const firstResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'live' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope,
      },
    );

    expect(firstResult).toMatchObject({ ok: true, data: 'demo-lib:ping:live' });

    runtime.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema/root.json' });
    await Promise.resolve();

    expect(dispose).not.toHaveBeenCalled();

    const secondResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'still-live' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope,
      },
    );

    expect(secondResult).toMatchObject({ ok: true, data: 'demo-lib:ping:still-live' });

    runtime.releaseImportedNamespaces({ imports, actionScope, schemaUrl: '/schema/root.json' });
    await Promise.resolve();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);

    const releasedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'released' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope,
      },
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
        data: { ok: true } as T,
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
              invoke: async () => ({ ok: true }),
            }),
          })),
        },
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'import-scope' });
    const imports = await prepareImports(
      runtime,
      [{ from: 'demo-lib', as: 'demo' }],
      '/schema/root.json',
    );

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });

    void runtime.registerDataSource({
      id: 'slow-source',
      scope: page.scope,
      compiledSource: compileDataSource(
        'slow-source',
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/slow' },
          name: 'payload',
        },
        expressionCompiler,
      ),
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
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`,
          }),
        }),
      })),
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const parentActionScope = runtime.createActionScope({ id: 'parent-import-scope' });
    const childActionScope = runtime.createActionScope({
      id: 'child-import-scope',
      parent: parentActionScope,
    });
    const parentImports = await prepareImports(
      runtime,
      [{ from: 'parent-lib', as: 'demo' }],
      '/schema/root.json',
    );
    const childImports = await prepareImports(
      runtime,
      [{ from: 'child-lib', as: 'demo' }],
      '/schema/root.json',
    );

    await runtime.ensureImportedNamespaces({
      imports: parentImports,
      actionScope: parentActionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });
    await runtime.ensureImportedNamespaces({
      imports: childImports,
      actionScope: childActionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });

    const shadowedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'child' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope,
      },
    );

    expect(shadowedResult).toMatchObject({ ok: true, data: 'child-lib:ping:child' });

    runtime.releaseImportedNamespaces({
      imports: childImports,
      actionScope: childActionScope,
      schemaUrl: '/schema/root.json',
    });
    await Promise.resolve();

    const restoredResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'parent' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope,
      },
    );

    expect(restoredResult).toMatchObject({ ok: true, data: 'parent-lib:ping:parent' });
  });

  it('rejects colliding import aliases within the same action scope', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      })),
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'collision-scope' });
    const firstImports = await prepareImports(
      runtime,
      [{ from: 'first-lib', as: 'demo' }],
      '/schema/root.json',
    );
    const secondImports = await prepareImports(
      runtime,
      [{ from: 'second-lib', as: 'demo' }],
      '/schema/root.json',
    );

    await runtime.ensureImportedNamespaces({
      imports: firstImports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
    });

    await expect(
      runtime.ensureImportedNamespaces({
        imports: secondImports,
        actionScope,
        scope: page.scope,
        schemaUrl: '/schema/root.json',
      }),
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
              data: `${spec.from}:${method}:${String(payload?.value ?? '')}`,
            }),
          }),
        };
      }),
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'retry-import-scope' });
    await expect(
      runtime.prepareSchema?.(
        { type: 'text', text: 'retry', 'xui:imports': [{ from: 'retry-lib', as: 'retry' }] } as any,
        {
          schemaUrl: '/schema/root.json',
        },
      ),
    ).rejects.toThrow('loader exploded');

    shouldFail = false;

    const imports = await prepareImports(
      runtime,
      [{ from: 'retry-lib', as: 'retry' }],
      '/schema/root.json',
    );

    await expect(
      runtime.ensureImportedNamespaces({
        imports,
        actionScope,
        scope: page.scope,
        schemaUrl: '/schema/root.json',
      }),
    ).resolves.toBeUndefined();

    const result = await runtime.dispatch(
      {
        action: 'retry:ping',
        args: { value: 'ok' },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope,
      },
    );

    expect(importLoader.load).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, data: 'retry-lib:ping:ok' });
  });

  it('passes nodeInstance through imported namespace setup context', async () => {
    const createNamespace = vi.fn(() => ({
      kind: 'import' as const,
      invoke: async () => ({ ok: true }),
    }));
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace,
      })),
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader,
      },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'node-instance-import-scope' });
    const compiled = runtime.compile({ type: 'text', text: 'imports' });
    const templateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const imports = await prepareImports(
      runtime,
      [{ from: 'demo-lib', as: 'demo' }],
      '/schema/root.json',
    );
    const nodeInstance = {
      cid: templateNode.templateNodeId,
      templateNode,
      scope: page.scope,
      state: { metaState: {}, mounted: true },
    } as any;

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: '/schema/root.json',
      nodeInstance,
    });

    expect(createNamespace).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeInstance,
        actionScope,
        scope: page.scope,
      }),
    );
  });

  it('shares cached modules across runtimes when they use the same module cache', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`,
          }),
        }),
      })),
    };
    const moduleCache = createModuleCache();
    const runtimeA = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader },
      moduleCache,
      expressionCompiler,
    });
    const runtimeB = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader },
      moduleCache,
      expressionCompiler,
    });
    const pageA = runtimeA.createPageRuntime({});
    const pageB = runtimeB.createPageRuntime({});
    const actionScopeA = runtimeA.createActionScope({ id: 'scope-a' });
    const actionScopeB = runtimeB.createActionScope({ id: 'scope-b' });
    const importsA = await prepareImports(
      runtimeA,
      [{ from: 'demo-lib', as: 'demo' }],
      '/schema/a.json',
    );
    const importsB = await prepareImports(
      runtimeB,
      [{ from: 'demo-lib', as: 'demo' }],
      '/schema/b.json',
    );

    await runtimeA.ensureImportedNamespaces({
      imports: importsA,
      actionScope: actionScopeA,
      scope: pageA.scope,
      schemaUrl: '/schema/a.json',
    });
    await runtimeB.ensureImportedNamespaces({
      imports: importsB,
      actionScope: actionScopeB,
      scope: pageB.scope,
      schemaUrl: '/schema/b.json',
    });

    expect(importLoader.load).toHaveBeenCalledTimes(1);
  });

  it('resolves import URLs before cache lookup and load', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      })),
    };
    const resolveImportUrl = vi.fn(
      (schemaUrl: string, from: string) => `resolved:${schemaUrl}:${from}`,
    );
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, importLoader, resolveImportUrl },
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'resolved-scope' });
    const imports = await prepareImports(
      runtime,
      [{ from: './demo-lib', as: 'demo' }],
      'https://app.local/schema/page.json',
    );

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope,
      schemaUrl: 'https://app.local/schema/page.json',
    });

    expect(resolveImportUrl).toHaveBeenCalledWith(
      'https://app.local/schema/page.json',
      './demo-lib',
      undefined,
    );
    expect(importLoader.load).toHaveBeenCalledWith({
      from: 'resolved:https://app.local/schema/page.json:./demo-lib',
      as: 'demo',
    });
  });
});
