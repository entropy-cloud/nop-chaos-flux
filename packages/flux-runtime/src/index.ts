import type {
  ActionContext,
  ActionScope,
  ActionResult,
  ActionSchema,
  CompiledFormValidationModel,
  ComponentHandleRegistry,
  ExpressionCompiler,
  FormRuntime,
  PageRuntime,
  PageStoreApi,
  RendererEnv,
  RendererPlugin,
  RendererRegistry,
  RendererRuntime,
  SchemaCompiler,
  ScopeRef,
  SourceSchema
} from '@nop-chaos/flux-core';
import { createCompiledCidState } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope } from './action-scope';
import { createActionDispatcher } from './action-runtime';
import { createApiCacheStore } from './api-cache';
import { createComponentHandleRegistry } from './component-handle-registry';
import { createDataSourceController, createSourceExecutor } from './data-source-runtime';
import { createManagedFormRuntime } from './form-runtime';
import { createImportManager } from './imports';
import { createNodeRuntime } from './node-runtime';
import { createManagedPageRuntime } from './page-runtime';
import { createRuntimeNodeResolver } from './node-resolver';
import { createApiRequestExecutor, executeApiSchema } from './request-runtime';
import { createRuntimeReactionRegistry } from './reaction-runtime';
import { sortRendererPlugins } from './runtime-plugins';
import { createSchemaCompiler } from './schema-compiler';
import { createScopeRef, createScopeStore, toRecord } from './scope';
import { createRuntimeSourceRegistry } from './source-registry';
import { validateRule } from './validation-runtime';
import { createBuiltInValidationRegistry } from './validation';
import { createRuntimeEvalHelpers } from './runtime-eval-helpers';
import { executeRuntimeValidationRule, executeRuntimeAjaxAction } from './runtime-action-helpers';

export { createRendererRegistry, registerRendererDefinitions } from './registry';
export { createSchemaCompiler, validateSchema } from './schema-compiler';
export { createScopeRef } from './scope';
export { createActionScope } from './action-scope';
export { createComponentHandleRegistry } from './component-handle-registry';
export { createFormComponentHandle } from './form-component-handle';
export { createApiCacheStore, resolveCacheKey } from './api-cache';
export { createAbortScope, withRetry, withTimeout, type RetryOptions } from './operation-control';
export { scopeChangeHitsDependencies } from './scope-change';
export { publishOwnerStatus, createReadonlyScopeBinding } from './status-owner';
export { isOwnerCompatible, type OwnerBoundaryKind } from './form-runtime-lifecycle';
export {
  executeApiObject,
  prepareApiData,
  buildUrlWithParams
} from './request-runtime';

export function createRendererRuntime(input: {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler?: ExpressionCompiler;
  schemaCompiler?: SchemaCompiler;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
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
  let disposed = false;

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
    getEnv
  });

  const { evaluate, compileValue, evaluateCompiled } = createRuntimeEvalHelpers(expressionCompiler, getEnv);

  const evalCtx = { getEnv, expressionCompiler, evaluate, executeApiRequest };

  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const page = createManagedPageRuntime({
      data,
      pageStore: input.pageStore,
      disposeScope: (scopeId) => {
        sourceRegistryRef.current?.disposeScopeTree(scopeId);
        reactionRegistryRef.current?.disposeScopeTree(scopeId);
      }
    });

    ownedPages.add(page);
    return page;
  }

  function createFormRuntime(inputValue: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
    lifecycle?: import('@nop-chaos/flux-core').FormLifecycleHandlers;
  }): FormRuntime {
    return createManagedFormRuntime({
      ...inputValue,
      executeValidationRule: (compiledRule, rule, field, scope) =>
        executeRuntimeValidationRule(compiledRule, rule, field, scope, evalCtx),
      validateRule: (compiledRule, value, field, scope) => validateRule(compiledRule, value, field, scope, validationRegistry),
      submitApi: async (api, scope, options) => {
        const response = await executeApiSchema(api, scope, getEnv(), expressionCompiler, {
          evaluate,
          executor: (adaptedApi) => executeApiRequest('submitForm', adaptedApi, scope, undefined, {
            interactionId: options?.interactionId
          })
        });

        return {
          ok: true,
          data: response.data,
          error: undefined
        };
      }
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
    compile(schema) {
      return schemaCompiler.compile(schema);
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
    createActionScope: createOwnedActionScope,
    createComponentHandleRegistry: createOwnedComponentRegistry,
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
    createDataSourceController(inputValue) {
      return createDataSourceController({
        runtime,
        apiCache,
        executeApiRequest: (actionType, api, scope, options) => executeApiRequest(actionType, api, scope, undefined, options),
        ...inputValue,
        targetPath: inputValue.dataPath
      });
    },
    registerDataSource(inputValue: {
      id: string;
      schema: import('@nop-chaos/flux-core').DataSourceSchema;
      scope: ScopeRef;
    }) {
      if (!sourceRegistryRef.current) {
        throw new Error('Runtime source registry is not initialized yet');
      }

      return sourceRegistryRef.current.registerDataSource({
        ...inputValue
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
      schema: import('@nop-chaos/flux-core').ReactionSchema;
      scope: ScopeRef;
      dispatch: (action: import('@nop-chaos/flux-core').ActionSchema | import('@nop-chaos/flux-core').ActionSchema[], ctx?: Partial<import('@nop-chaos/flux-core').ActionContext>) => Promise<import('@nop-chaos/flux-core').ActionResult>;
    }) {
      if (!reactionRegistryRef.current) {
        throw new Error('Runtime reaction registry is not initialized yet');
      }

      return reactionRegistryRef.current.registerReaction({
        id: inputValue.id,
        runtime,
        scope: inputValue.scope,
        watch: inputValue.schema.watch,
        dependsOn: inputValue.schema.dependsOn,
        when: inputValue.schema.when,
        immediate: inputValue.schema.immediate,
        debounce: inputValue.schema.debounce,
        once: inputValue.schema.once,
        actions: inputValue.schema.actions,
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
    setEnv(env: import('@nop-chaos/flux-core').RendererEnv) {
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

        for (const dialog of page.store.getState().dialogs) {
          sourceRegistryRef.current?.disposeScopeTree(dialog.scope.id);
          reactionRegistryRef.current?.disposeScopeTree(dialog.scope.id);
        }

        for (const surface of page.store.getState().surfaces) {
          sourceRegistryRef.current?.disposeScopeTree(surface.scope.id);
          reactionRegistryRef.current?.disposeScopeTree(surface.scope.id);
        }
      }

      ownedPages.clear();
      importManager.dispose({ actionScopes: Array.from(ownedActionScopes) });
      ownedActionScopes.clear();
      executeApiRequest.dispose?.();
    },
    createFormRuntime
  };

  const actionDispatcher = createActionDispatcher({
    getEnv,
    plugins,
    onActionError: input.onActionError,
    evaluate,
    compileValue,
    evaluateCompiled,
    refreshDataSource: (inputValue) => runtime.refreshDataSource(inputValue),
    executeAjaxAction: (api, action, ctx, signal) => executeRuntimeAjaxAction(api, action, ctx, signal, evalCtx),
    submitFormAction: async (api, _action, ctx) => ctx.form!.submit(api, { interactionId: ctx.interactionId }),
    openDrawer: async (drawer, ctx) => {
      if (!ctx.page) {
        return { ok: false, error: new Error('openDrawer requires page runtime') };
      }

      const drawerScope = createScopeRef({
        id: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}:drawer-scope`,
        path: `${ctx.scope.path}.drawer`,
        parent: ctx.scope,
        initialData: {
          dialogId: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}-pending`,
          drawerId: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}-pending`
        }
      });
      const drawerId = ctx.page.openSurface('drawer', drawer, drawerScope, runtime, {
        actionScope: ctx.actionScope,
        componentRegistry: ctx.componentRegistry,
        ownerNodeInstance: ctx.nodeInstance
      });
      drawerScope.update('dialogId', drawerId);
      drawerScope.update('drawerId', drawerId);
      return { ok: true, data: { drawerId } };
    },
    showToast: async (args, ctx) => {
      const level = typeof args?.level === 'string' && ['info', 'success', 'warning', 'error'].includes(args.level)
        ? args.level as 'info' | 'success' | 'warning' | 'error'
        : 'info';
      const message = typeof args?.message === 'string' ? args.message : 'Action completed';
      ctx.runtime.env.notify(level, message);
      return { ok: true, data: args };
    },
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

  sourceRegistryRef.current = createRuntimeSourceRegistry({
    runtime,
    apiCache,
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
