import type {
  ActionContext,
  ActionScope,
  ActionResult,
  ActionSchema,
  ComponentHandleRegistry,
  ExpressionCompiler,
  PageRuntime,
  PageStoreApi,
  RendererEnv,
  RendererPlugin,
  RendererRegistry,
  RendererRuntime,
  SchemaCompiler,
  ScopeRef,
  SurfaceRuntime,
  SourceSchema,
  ModuleCache,
  ImportedLibraryModule,
  PreparedImportSpec,
  ValidationScopeRuntime,
  FormRuntime,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createCompiledCidState } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { FormulaRegistry } from '@nop-chaos/flux-formula';
import { createActionDispatcher } from '@nop-chaos/flux-action-core';
import { createActionRuntimeAdapter } from './action-adapter.js';
import { createActionScope } from './action-scope.js';
import { createApiCacheStore } from './async-data/api-cache.js';
import { createAsyncGovernanceStore } from './async-data/async-governance.js';
import { createComponentHandleRegistry } from './component-handle-registry.js';
import {
  createDataSourceController,
  createSourceExecutor,
  createSourceObserver,
} from './async-data/data-source-runtime.js';
import { createImportManager } from './imports.js';
import { createImportStack } from './import-stack.js';
import { createHostProjectionScope } from './runtime-host-projection-scope.js';
import { createNodeRuntime } from './node-runtime.js';
import { createRuntimeNodeResolver } from './node-resolver.js';
import { createRuntimeReactionRegistry } from './async-data/reaction-runtime.js';
import { createApiRequestExecutor } from './async-data/request-runtime.js';
import { createRuntimeEvalHelpers } from './runtime-eval-helpers.js';
import { createRuntimeOwnedFactories } from './runtime-owned-factories.js';
import { sortRendererPlugins } from './runtime-plugins.js';
import { createScopeRef, createScopeStore, toRecord } from './scope.js';
import { createRuntimeSourceRegistry } from './async-data/source-registry.js';
import { createBuiltInValidationRegistry } from './validation/index.js';

export function createModuleCache(): ModuleCache {
  const resolved = new Map<string, ImportedLibraryModule>();
  const pending = new Map<string, Promise<ImportedLibraryModule>>();

  return {
    get(absUrl) {
      return resolved.get(absUrl);
    },
    set(absUrl, module) {
      resolved.set(absUrl, module);
    },
    has(absUrl) {
      return resolved.has(absUrl);
    },
    getPending(absUrl) {
      return pending.get(absUrl);
    },
    setPending(absUrl, promise) {
      pending.set(absUrl, promise);
    },
    removePending(absUrl) {
      pending.delete(absUrl);
    },
  };
}

export function createRendererRuntime(input: {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler?: ExpressionCompiler;
  schemaCompiler?: SchemaCompiler;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  moduleCache?: ModuleCache;
  formulaRegistry?: FormulaRegistry;
  strictMode?: boolean;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}): RendererRuntime {
  const runtimeId = `runtime-${Math.random().toString(36).slice(2, 10)}`;
  const plugins = sortRendererPlugins(input.plugins);
  const expressionCompiler =
    input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler(input.formulaRegistry));
  const defaultCidState = createCompiledCidState();
  const schemaCompiler =
    input.schemaCompiler ??
    createSchemaCompiler({
      registry: input.registry,
      expressionCompiler,
      plugins,
      defaultCidState,
    });
  const envRef: { current: RendererEnv } = {
    current: input.env,
  };
  const getEnv = () => envRef.current;
  const apiCache = createApiCacheStore();
  const asyncGovernance = createAsyncGovernanceStore();
  const executeApiRequest = createApiRequestExecutor(getEnv);
  const sourceRegistryRef: { current?: ReturnType<typeof createRuntimeSourceRegistry> } = {};
  const reactionRegistryRef: { current?: ReturnType<typeof createRuntimeReactionRegistry> } = {};
  const validationRegistry = createBuiltInValidationRegistry();
  let actionScopeCounter = 0;
  let componentRegistryCounter = 0;
  let nextMountedCid = defaultCidState.nextCid;
  const ownedActionScopes = new Set<ActionScope>();
  const runtimeRef: { current?: RendererRuntime } = {};
  const nodeRuntime = createNodeRuntime({
    expressionCompiler,
    getEnv,
  });
  const runtimeNodeResolverRef: { current?: ReturnType<typeof createRuntimeNodeResolver> } = {};
  const ownedPages = new Set<PageRuntime>();
  const ownedSurfaceRuntimes = new Set<SurfaceRuntime>();
  const ownedValidationScopes = new Set<ValidationScopeRuntime>();
  const ownedFormRuntimes = new Set<FormRuntime>();
  let disposed = false;
  const moduleCache = input.moduleCache ?? createModuleCache();
  const importStack = createImportStack({
    moduleCache,
    getLoader: () => getEnv().importLoader,
    getRuntime: () => {
      if (!runtimeRef.current) {
        throw new Error('Renderer runtime is not initialized yet');
      }

      return runtimeRef.current;
    },
    getEnv,
  });

  function createModuleKey(spec: XuiImportSpec): string {
    return JSON.stringify({
      from: spec.from,
      options: spec.options ?? null,
    });
  }

  function createOwnedActionScope(scopeInput: { id?: string; parent?: ActionScope } = {}) {
    actionScopeCounter += 1;
    const actionScope = createActionScope({
      id: scopeInput.id ?? `action-scope-${actionScopeCounter}`,
      parent: scopeInput.parent,
    });

    ownedActionScopes.add(actionScope);
    return actionScope;
  }

  function createOwnedComponentRegistry(
    registryInput: { id?: string; parent?: ComponentHandleRegistry } = {},
  ) {
    componentRegistryCounter += 1;
    return createComponentHandleRegistry({
      id: registryInput.id ?? `component-registry-${componentRegistryCounter}`,
      parent: registryInput.parent,
    });
  }

  const importManager = createImportManager({
    getLoader: () => getEnv().importLoader,
    getRuntime: () => {
      if (!runtimeRef.current) {
        throw new Error('Renderer runtime is not initialized yet');
      }

      return runtimeRef.current;
    },
    getEnv,
    moduleCache,
    importStack,
  });

  const { evaluate, compileValue, evaluateCompiled } = createRuntimeEvalHelpers(
    expressionCompiler,
    getEnv,
  );
  const actionRootScope = createScopeRef({
    id: `${runtimeId}:action-root`,
    path: '$',
    initialData: {},
  });

  const actionDispatcherRef: {
    current?: (action: ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult>;
  } = {};
  const runtimeOwnedFactories = createRuntimeOwnedFactories({
    pageStore: input.pageStore,
    ownedPages,
    ownedSurfaceRuntimes,
    ownedValidationScopes,
    ownedFormRuntimes,
    createValidationScopeRuntime: (inputValue) =>
      runtimeOwnedFactories.createValidationScopeRuntime(inputValue),
    dispatchAction: (action, ctx) => {
      if (!actionDispatcherRef.current) {
        throw new Error('Action dispatcher not initialized');
      }

      return actionDispatcherRef.current(action, ctx);
    },
    validationRegistry,
    disposeScopeTree: (scopeId) => {
      sourceRegistryRef.current?.disposeScopeTree(scopeId);
      reactionRegistryRef.current?.disposeScopeTree(scopeId);
    },
  });

  const executeSourceRef: {
    current?: (
      source: SourceSchema,
      scope: ScopeRef,
      ctx?: Partial<ActionContext>,
    ) => Promise<ActionResult>;
  } = {};

  const runtime: RendererRuntime = {
    runtimeId,
    registry: input.registry,
    get env() {
      return getEnv();
    },
    expressionCompiler,
    schemaCompiler,
    plugins,
    importStack,
    strictMode: input.strictMode ?? false,
    moduleCache,
    compile(schema) {
      return schemaCompiler.compile(schema);
    },
    async prepareSchema(schema, options) {
      const prepare = schemaCompiler.prepare;
      if (!prepare) {
        return { preparedImports: new Map() };
      }

      const result = await prepare(schema, {
        schemaUrl: options?.schemaUrl,
        signal: options?.signal,
        importLoader: getEnv().importLoader,
        resolveImportUrl: getEnv().resolveImportUrl,
      });

      const importLoader = getEnv().importLoader;

      if (result.preparedImports.size > 0 && !importLoader) {
        throw new Error(
          'Schema preparation requires env.importLoader when xui:imports are present.',
        );
      }

      const preparedEntries = await Promise.all(
        Array.from(result.preparedImports.entries()).map(async ([key, prepared]) => {
          const moduleKey = createModuleKey(prepared.resolvedSpec);

          try {
            let loadedModule = moduleCache.get(moduleKey);

            if (!loadedModule) {
              const pending = moduleCache.getPending(moduleKey);

              if (pending) {
                loadedModule = await pending;
              } else if (importLoader) {
                options?.signal?.throwIfAborted?.();
                const promise = importLoader.load(prepared.resolvedSpec);
                moduleCache.setPending(moduleKey, promise);
                try {
                  loadedModule = await promise;
                  options?.signal?.throwIfAborted?.();
                  moduleCache.set(moduleKey, loadedModule);
                } finally {
                  moduleCache.removePending(moduleKey);
                }
              }
            }

            if (!loadedModule) {
              throw new Error(`Prepared import missing cached module for ${prepared.spec.as}`);
            }

            return [
              key,
              {
                ...prepared,
                staticMeta: await loadedModule.getStaticMeta?.(),
              } satisfies PreparedImportSpec,
            ] as const;
          } catch (error) {
            const wrappedError = new Error(
              `Imported namespace ${prepared.spec.as} failed to load: ${error instanceof Error ? error.message : String(error)}`,
              error instanceof Error ? { cause: error } : undefined,
            );
            if (error instanceof Error && error.stack) {
              wrappedError.stack = error.stack;
            }
            throw wrappedError;
          }
        }),
      );

      return { preparedImports: new Map(preparedEntries) };
    },
    evaluate,
    evaluateCompiled,
    allocateMountedCid() {
      nextMountedCid += 1;
      return nextMountedCid;
    },
    resolveTarget(target, ctx) {
      if (!runtimeNodeResolverRef.current) {
        throw new Error('Runtime node resolver is not initialized yet');
      }

      return runtimeNodeResolverRef.current.resolveTarget(target, ctx);
    },
    resolveNodeMeta: nodeRuntime.resolveNodeMeta,
    resolveNodeProps: nodeRuntime.resolveNodeProps,
    createChildScope(parent, patch, options) {
      const data = toRecord(patch);
      const store = createScopeStore(data);

      return createScopeRef({
        id: options?.scopeKey ?? `${parent.id}:${options?.pathSuffix ?? 'child'}`,
        path: options?.pathSuffix ? `${parent.path}.${options.pathSuffix}` : `${parent.path}.child`,
        parent,
        store,
        isolate: options?.isolate,
      });
    },
    createHostProjectionScope({
      parentScope,
      projection,
      path,
      scopeLabel,
    }: {
      parentScope: ScopeRef;
      projection: Record<string, unknown>;
      path: string;
      scopeLabel: string;
    }) {
      return createHostProjectionScope({
        parentScope,
        projection,
        path,
        scopeLabel,
        createChildScope: runtime.createChildScope,
      });
    },
    createActionScope: createOwnedActionScope,
    createComponentHandleRegistry: createOwnedComponentRegistry,
    resolvePreparedImports(inputValue) {
      const schemaUrl = inputValue.schemaUrl;
      return (inputValue.imports ?? []).map(
        (spec): PreparedImportSpec => ({
          schemaUrl,
          spec,
          resolvedSpec: {
            ...spec,
            from: getEnv().resolveImportUrl?.(schemaUrl, spec.from, spec.options) ?? spec.from,
          },
        }),
      );
    },
    ensureImportedNamespaces(args) {
      return importManager.ensureImportedNamespaces(args);
    },
    getImportedExpressionBindings(args) {
      return importManager.getImportedExpressionBindings(args);
    },
    releaseImportedNamespaces(args) {
      importManager.releaseImportedNamespaces(args);
    },
    dispatch(action, ctx) {
      return actionDispatcher.dispatch(action, ctx);
    },
    executeSource(inputValue) {
      if (!executeSourceRef.current) {
        throw new Error('Source executor is not initialized yet');
      }

      return executeSourceRef.current(inputValue.source, inputValue.scope, inputValue.ctx);
    },
    createSourceObserver() {
      return createSourceObserver(runtime);
    },
    createPageRuntime: runtimeOwnedFactories.createPageRuntime,
    createValidationScopeRuntime: runtimeOwnedFactories.createValidationScopeRuntime,
    createSurfaceRuntime: runtimeOwnedFactories.createSurfaceRuntime,
    createDataSourceController(inputValue) {
      return createDataSourceController({
        runtime,
        apiCache,
        asyncGovernance,
        ...inputValue,
        dispatch: (action, ctx) => runtime.dispatch(action, ctx),
      });
    },
    registerDataSource(inputValue: {
      id: string;
      compiledSource: import('@nop-chaos/flux-core').CompiledDataSource;
      scope: ScopeRef;
    }) {
      if (!sourceRegistryRef.current) {
        throw new Error('Runtime source registry is not initialized yet');
      }

      return sourceRegistryRef.current.registerDataSource({
        id: inputValue.id,
        scope: inputValue.scope,
        compiledSource: inputValue.compiledSource,
      });
    },
    refreshDataSource(inputValue: { id: string; scope?: ScopeRef }) {
      if (!sourceRegistryRef.current) {
        throw new Error('Runtime source registry is not initialized yet');
      }

      return sourceRegistryRef.current.refreshDataSource(inputValue);
    },
    registerReaction(inputValue: {
      id: string;
      compiledReaction: import('@nop-chaos/flux-core').CompiledReaction;
      scope: ScopeRef;
      dispatch: (
        action:
          | import('@nop-chaos/flux-core').ActionSchema
          | import('@nop-chaos/flux-core').ActionSchema[]
          | import('@nop-chaos/flux-core').CompiledActionProgram,
        ctx?: Partial<import('@nop-chaos/flux-core').ActionContext>,
      ) => Promise<import('@nop-chaos/flux-core').ActionResult>;
    }) {
      if (!reactionRegistryRef.current) {
        throw new Error('Runtime reaction registry is not initialized yet');
      }

      return reactionRegistryRef.current.registerReaction({
        id: inputValue.id,
        runtime,
        scope: inputValue.scope,
        asyncGovernance,
        compiledReaction: inputValue.compiledReaction,
        helpers: {
          dispatch: inputValue.dispatch,
        },
      });
    },
    getSourceDebugSnapshot() {
      return sourceRegistryRef.current?.getDebugSnapshot() ?? { sources: [] };
    },
    getReactionDebugSnapshot() {
      return reactionRegistryRef.current?.getDebugSnapshot() ?? { reactions: [] };
    },
    getAsyncOwnerDebugSnapshot() {
      return asyncGovernance.getSnapshot();
    },
    setEnv(env: RendererEnv) {
      envRef.current = env;
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;

      for (const page of ownedPages) {
        sourceRegistryRef.current?.disposeScopeTree(page.scope.id);
        reactionRegistryRef.current?.disposeScopeTree(page.scope.id);
        runtimeOwnedFactories.disposeOwnedPage(page);
      }

      for (const surfaceRuntime of ownedSurfaceRuntimes) {
        surfaceRuntime.dispose();
      }

      for (const validationScope of ownedValidationScopes) {
        if (
          !Array.from(ownedFormRuntimes).some(
            (formRuntime) => formRuntime.scopeId === validationScope.scopeId,
          )
        ) {
          validationScope.dispose();
        }
      }

      for (const formRuntime of ownedFormRuntimes) {
        formRuntime.dispose();
      }

      ownedPages.clear();
      ownedSurfaceRuntimes.clear();
      ownedValidationScopes.clear();
      ownedFormRuntimes.clear();
      importManager.dispose({ actionScopes: Array.from(ownedActionScopes) });
      importStack.dispose();
      ownedActionScopes.clear();
      executeApiRequest.dispose?.();
    },
    createFormRuntime: runtimeOwnedFactories.createFormRuntime,
  };

  const adapter = createActionRuntimeAdapter({
    getEnv,
    expressionCompiler,
    evaluate,
    executeApiRequest,
    runtime,
    createSurfaceScope: (kind, ctx, patch) => {
      const ownerId = ctx.nodeInstance?.templateNode.id ?? ctx.scope.id;
      const pendingId = `${ownerId}-pending`;

      return createScopeRef({
        id: `${ownerId}:${kind}-scope`,
        path: `${ctx.scope.path}.${kind}`,
        parent: ctx.scope,
        initialData: {
          dialogId: pendingId,
          ...(patch ?? {}),
          ...(kind === 'drawer' ? { drawerId: pendingId } : {}),
        },
      });
    },
  });

  const actionDispatcher = createActionDispatcher({
    getEnv,
    plugins,
    onActionError: input.onActionError,
    evaluator: { evaluate, compileValue, evaluateCompiled },
    adapter,
    runtime,
  });

  actionDispatcherRef.current = (action, ctx) => {
    if (!ctx) {
      return actionDispatcher.dispatch(action, {
        runtime,
        scope: actionRootScope,
      });
    }

    return actionDispatcher.dispatch(action, {
      runtime,
      scope: ctx.scope ?? actionRootScope,
      instancePath: ctx.instancePath,
      nodeInstance: ctx.nodeInstance,
      getInstanceKey: ctx.getInstanceKey,
      interactionId: ctx.interactionId,
      signal: ctx.signal,
      actionScope: ctx.actionScope,
      componentRegistry: ctx.componentRegistry,
      event: ctx.event,
      form: ctx.form,
      page: ctx.page,
      surfaceRuntime: ctx.surfaceRuntime,
      dialogId: ctx.dialogId,
      prevResult: ctx.prevResult,
      evaluationBindings: ctx.evaluationBindings,
    } satisfies ActionContext);
  };

  sourceRegistryRef.current = createRuntimeSourceRegistry({
    runtime,
    apiCache,
    asyncGovernance,
  });
  reactionRegistryRef.current = createRuntimeReactionRegistry();

  executeSourceRef.current = createSourceExecutor({
    runtime,
    executeAction: (action, ctx) => actionDispatcher.dispatch(action, ctx),
  });

  runtimeRef.current = runtime;
  runtimeNodeResolverRef.current = createRuntimeNodeResolver(runtime);

  return runtime;
}
