import type {
  ActionContext,
  ActionScope,
  ActionResult,
  ActionSchema,
  CompiledFormValidationModel,
  ComponentHandleRegistry,
  ExpressionCompiler,
  FormLifecycleHandlers,
  FormRuntime,
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
  XuiImportSpec
} from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createCompiledCidState } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionDispatcher } from '@nop-chaos/flux-action-core';
import { createActionRuntimeAdapter } from './action-adapter';
import { createActionScope } from './action-scope';
import { createApiCacheStore } from './async-data/api-cache';
import { createAsyncGovernanceStore } from './async-data/async-governance';
import { createComponentHandleRegistry } from './component-handle-registry';
import { createDataSourceController, createSourceExecutor } from './async-data/data-source-runtime';
import { createManagedFormRuntime } from './form-runtime';
import { createFormStore } from './form-store';
import { createImportManager } from './imports';
import { createImportStack } from './import-stack';
import { createNodeRuntime } from './node-runtime';
import { createRuntimeNodeResolver } from './node-resolver';
import { createManagedPageRuntime } from './page-runtime';
import { createRuntimeReactionRegistry } from './async-data/reaction-runtime';
import { createApiRequestExecutor } from './async-data/request-runtime';
import { executeRuntimeValidationRule } from './runtime-action-helpers';
import { createRuntimeEvalHelpers } from './runtime-eval-helpers';
import { sortRendererPlugins } from './runtime-plugins';
import { createScopeRef, createScopeStore, toRecord } from './scope';
import { createRuntimeSourceRegistry } from './async-data/source-registry';
import { createManagedSurfaceRuntime } from './surface-runtime';
import { createBuiltInValidationRegistry } from './validation';
import { validateRule } from './validation-runtime';

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
    }
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
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}): RendererRuntime {
  const runtimeId = `runtime-${Math.random().toString(36).slice(2, 10)}`;
  const plugins = sortRendererPlugins(input.plugins);
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const defaultCidState = createCompiledCidState();
  const schemaCompiler = input.schemaCompiler ?? createSchemaCompiler({
    registry: input.registry,
    expressionCompiler,
    plugins,
    defaultCidState
  });
  const envRef: { current: RendererEnv } = {
    current: input.env
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
    getEnv
  });
  const runtimeNodeResolverRef: { current?: ReturnType<typeof createRuntimeNodeResolver> } = {};
  const ownedPages = new Set<PageRuntime>();
  const ownedSurfaceRuntimes = new Set<SurfaceRuntime>();
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
    getEnv
  });

  function createModuleKey(spec: XuiImportSpec): string {
    return JSON.stringify({
      from: spec.from,
      options: spec.options ?? null
    });
  }

  function createOwnedActionScope(scopeInput: { id?: string; parent?: ActionScope } = {}) {
    actionScopeCounter += 1;
    const actionScope = createActionScope({
      id: scopeInput.id ?? `action-scope-${actionScopeCounter}`,
      parent: scopeInput.parent
    });

    ownedActionScopes.add(actionScope);
    return actionScope;
  }

  function createOwnedComponentRegistry(registryInput: { id?: string; parent?: ComponentHandleRegistry } = {}) {
    componentRegistryCounter += 1;
    return createComponentHandleRegistry({
      id: registryInput.id ?? `component-registry-${componentRegistryCounter}`,
      parent: registryInput.parent
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
    importStack
  });

  const { evaluate, compileValue, evaluateCompiled } = createRuntimeEvalHelpers(expressionCompiler, getEnv);

  const actionDispatcherRef: { current?: (action: ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult> } = {};

  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const externalPageStore = input.pageStore;
    const initialData = externalPageStore?.getState().data ?? data;
    const pageValidation = createValidationScopeRuntime({
      id: 'page-root-validation',
      scopePath: '$page',
      initialValues: initialData
    });
    const validationStore = pageValidation.store as import('@nop-chaos/flux-core').FormStoreApi;
    let refreshTick = 0;
    const refreshListeners = new Set<() => void>();
    const pageStore: PageStoreApi = {
      getState() {
        return {
          data: validationStore.getState().values,
          refreshTick
        };
      },
      subscribe(listener) {
        const unsubscribeValidation = validationStore.subscribe(listener);
        refreshListeners.add(listener);
        return () => {
          unsubscribeValidation();
          refreshListeners.delete(listener);
        };
      },
      setData(nextData) {
        validationStore.setValues(nextData);
      },
      updateData(path, value) {
        validationStore.setValue(path, value);
      },
      refresh() {
        refreshTick += 1;
        for (const listener of refreshListeners) {
          listener();
        }
      }
    };

    let syncingFromValidation = false;
    let syncingFromExternalPageStore = false;

    if (externalPageStore) {
      const externalData = externalPageStore.getState().data;
      if (externalData !== validationStore.getState().values) {
        validationStore.setValues(externalData);
      }

      const syncExternalPageStoreToValidation = () => {
        if (syncingFromValidation) {
          return;
        }

        const pageData = externalPageStore.getState().data;
        if (pageData === validationStore.getState().values) {
          return;
        }

        syncingFromExternalPageStore = true;
        try {
          validationStore.setValues(pageData);
        } finally {
          syncingFromExternalPageStore = false;
        }
      };

      const syncValidationToExternalPageStore = () => {
        if (syncingFromExternalPageStore) {
          return;
        }

        const validationData = validationStore.getState().values;
        if (validationData === externalPageStore.getState().data) {
          return;
        }

        syncingFromValidation = true;
        try {
          externalPageStore.setData(validationData);
        } finally {
          syncingFromValidation = false;
        }
      };

      externalPageStore.subscribe(syncExternalPageStoreToValidation);
      validationStore.subscribe(syncValidationToExternalPageStore);
    }

    const page = createManagedPageRuntime({
      data: initialData,
      pageStore: pageStore,
      validationOwner: pageValidation,
      scope: pageValidation.scope
    });

    ownedPages.add(page);
    return page;
  }

  function createValidationScopeRuntime(inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
  }): ValidationScopeRuntime {
    const store = createFormStore(inputValue.initialValues ?? {});

    return createManagedFormRuntime({
      id: inputValue.id,
      parentScope: inputValue.parentScope,
      validation: inputValue.validation,
      initialValues: inputValue.initialValues,
      existingStore: store,
      scopePath: inputValue.scopePath,
      scopeBinding: 'none',
      executeValidationRule: (compiledRule, rule, field, validationScope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, validationScope, signal, {
          dispatch: (action, ctx) => {
            if (!actionDispatcherRef.current) throw new Error('Action dispatcher not initialized');
            return actionDispatcherRef.current(action, ctx);
          }
        }),
      validateRule: (compiledRule, value, field, validationScope) =>
        validateRule(compiledRule, value, field, validationScope, validationRegistry)
    });
  }

  function createSurfaceRuntime(inputValue: { disposeScope?: (scopeId: string) => void } = {}): SurfaceRuntime {
    const surfaceRuntime = createManagedSurfaceRuntime({
      disposeScope: inputValue.disposeScope ?? ((scopeId) => {
        sourceRegistryRef.current?.disposeScopeTree(scopeId);
        reactionRegistryRef.current?.disposeScopeTree(scopeId);
      })
    });

    ownedSurfaceRuntimes.add(surfaceRuntime);
    return surfaceRuntime;
  }

  function createFormRuntime(inputValue: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
    lifecycle?: FormLifecycleHandlers;
  }): FormRuntime {
    return createManagedFormRuntime({
      ...inputValue,
      executeValidationRule: (compiledRule, rule, field, scope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, scope, signal, {
          dispatch: (action, ctx) => {
            if (!actionDispatcherRef.current) throw new Error('Action dispatcher not initialized');
            return actionDispatcherRef.current(action, ctx);
          }
        }),
      validateRule: (compiledRule, value, field, scope) => validateRule(compiledRule, value, field, scope, validationRegistry)
    });
  }

  const executeSourceRef: { current?: (source: SourceSchema, scope: ScopeRef, ctx?: Partial<ActionContext>) => Promise<ActionResult> } = {};

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
        importLoader: getEnv().importLoader,
        resolveImportUrl: getEnv().resolveImportUrl
      });

      const importLoader = getEnv().importLoader;

      if (result.preparedImports.size > 0 && !importLoader) {
        throw new Error('Schema preparation requires env.importLoader when xui:imports are present.');
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
                const promise = importLoader.load(prepared.resolvedSpec);
                moduleCache.setPending(moduleKey, promise);
                try {
                  loadedModule = await promise;
                  moduleCache.set(moduleKey, loadedModule);
                } finally {
                  moduleCache.removePending(moduleKey);
                }
              }
            }

            if (!loadedModule) {
              throw new Error(`Prepared import missing cached module for ${prepared.spec.as}`);
            }

            return [key, {
              ...prepared,
              staticMeta: await loadedModule.getStaticMeta?.()
            } satisfies PreparedImportSpec] as const;
          } catch (error) {
            throw new Error(`Imported namespace ${prepared.spec.as} failed to load: ${error instanceof Error ? error.message : String(error)}`);
          }
        })
      );

      return { preparedImports: new Map(preparedEntries) };
    },
    evaluate,
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
        isolate: options?.isolate
      });
    },
    createHostProjectionScope({
      parentScope,
      projection,
      path,
      scopeLabel
    }: {
      parentScope: ScopeRef;
      projection: Record<string, unknown>;
      path: string;
      scopeLabel: string;
    }) {
      let reservedKeys = new Set(Object.keys(projection));
      const hostScope = runtime.createChildScope(parentScope, projection, {
        scopeKey: `${path}:${scopeLabel}-host`,
        pathSuffix: scopeLabel
      });

      return {
        id: hostScope.id,
        path: hostScope.path,
        parent: hostScope.parent,
        store: hostScope.store,
        get value() {
          return this.readVisible();
        },
        get(targetPath: string) {
          return hostScope.get(targetPath);
        },
        has(targetPath: string) {
          return hostScope.has(targetPath);
        },
        readOwn() {
          return hostScope.readOwn();
        },
        readVisible() {
          return hostScope.readVisible();
        },
        materializeVisible() {
          return hostScope.materializeVisible();
        },
        update(targetPath: string, value: unknown) {
          const rootKey = targetPath.split('.')[0];

          if (reservedKeys.has(rootKey)) {
            throw new Error(`Cannot write projected host field: ${targetPath}`);
          }

          hostScope.update(targetPath, value);
        },
        merge(data: Record<string, unknown>) {
          const nextKeys = Object.keys(data);

          if (nextKeys.some((key) => reservedKeys.has(key))) {
            throw new Error(`Cannot merge projected host fields into host scope: ${nextKeys.join(', ')}`);
          }

          hostScope.merge(data);
        },
        replace(data: Record<string, unknown>) {
          reservedKeys = new Set(Object.keys(data));
          hostScope.replace?.(data);
        }
      };
    },
    createActionScope: createOwnedActionScope,
    createComponentHandleRegistry: createOwnedComponentRegistry,
    resolvePreparedImports(inputValue) {
      const schemaUrl = inputValue.schemaUrl;
      return (inputValue.imports ?? []).map((spec): PreparedImportSpec => ({
        schemaUrl,
        spec,
        resolvedSpec: {
          ...spec,
          from: getEnv().resolveImportUrl?.(schemaUrl, spec.from, spec.options) ?? spec.from
        }
      }));
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
    createPageRuntime,
    createValidationScopeRuntime,
    createSurfaceRuntime,
    createDataSourceController(inputValue) {
      return createDataSourceController({
        runtime,
        apiCache,
        asyncGovernance,
        executeApiRequest: (actionType, api, scope, options) => executeApiRequest(actionType, api, scope, undefined, options),
        ...inputValue
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
        compiledSource: inputValue.compiledSource
      });
    },
    refreshDataSource(inputValue: {
      id: string;
      scope?: ScopeRef;
    }) {
      if (!sourceRegistryRef.current) {
        throw new Error('Runtime source registry is not initialized yet');
      }

      return sourceRegistryRef.current.refreshDataSource(inputValue);
    },
    registerReaction(inputValue: {
      id: string;
      compiledReaction: import('@nop-chaos/flux-core').CompiledReaction;
      scope: ScopeRef;
      dispatch: (action: import('@nop-chaos/flux-core').ActionSchema | import('@nop-chaos/flux-core').ActionSchema[] | import('@nop-chaos/flux-core').CompiledActionProgram, ctx?: Partial<import('@nop-chaos/flux-core').ActionContext>) => Promise<import('@nop-chaos/flux-core').ActionResult>;
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
          dispatch: inputValue.dispatch
        }
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
      }

      for (const surfaceRuntime of ownedSurfaceRuntimes) {
        for (const surface of surfaceRuntime.store.getState().entries) {
          sourceRegistryRef.current?.disposeScopeTree(surface.scope.id);
          reactionRegistryRef.current?.disposeScopeTree(surface.scope.id);
        }
      }

      ownedPages.clear();
      ownedSurfaceRuntimes.clear();
      importManager.dispose({ actionScopes: Array.from(ownedActionScopes) });
      importStack.dispose();
      ownedActionScopes.clear();
      executeApiRequest.dispose?.();
    },
    createFormRuntime
  };

  const adapter = createActionRuntimeAdapter({
    getEnv,
    expressionCompiler,
    evaluate,
    executeApiRequest,
    runtime,
    createDialogScope: (ctx) =>
      createScopeRef({
        id: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}:dialog-scope`,
        path: `${ctx.scope.path}.dialog`,
        parent: ctx.scope,
        initialData: {
          dialogId: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}-pending`
        }
      })
  });

  const actionDispatcher = createActionDispatcher({
    getEnv,
    plugins,
    onActionError: input.onActionError,
    evaluator: { evaluate, compileValue, evaluateCompiled },
    adapter,
    runtime
  });

  actionDispatcherRef.current = (action, ctx) => actionDispatcher.dispatch(action, ctx as ActionContext);

  sourceRegistryRef.current = createRuntimeSourceRegistry({
    runtime,
    apiCache,
    asyncGovernance,
    executeApiRequest: (actionType, api, scope, options) => executeApiRequest(actionType, api, scope, undefined, options)
  });
  reactionRegistryRef.current = createRuntimeReactionRegistry();

  executeSourceRef.current = createSourceExecutor({
    runtime,
    executeAction: (action, ctx) => actionDispatcher.dispatch(action, ctx)
  });

  runtimeRef.current = runtime;
  runtimeNodeResolverRef.current = createRuntimeNodeResolver(runtime);

  return runtime;
}
