import type {
  ActionContext,
  ActionScope,
  ActionResult,
  ActionSchema,
  ApiSchema,
  ExecutableApiRequest,
  OperationControlConfig,
  SourceSchema,
  CompiledRuntimeValue,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  ComponentHandleRegistry,
  CompiledValidationRule,
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
  ValidationError,
  ValidationRule
} from '@nop-chaos/flux-core';
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
import {
  applyResponseDataPath,
  createApiRequestExecutor,
  executeApiSchema
} from './request-runtime';
import { createRuntimeReactionRegistry } from './reaction-runtime';
import { sortRendererPlugins } from './runtime-plugins';
import { createSchemaCompiler } from './schema-compiler';
import { createScopeRef, createScopeStore, toRecord } from './scope';
import { createRuntimeSourceRegistry } from './source-registry';
import { validateRule } from './validation-runtime';
import { createBuiltInValidationRegistry, createValidationError } from './validation';

export { createRendererRegistry, registerRendererDefinitions } from './registry';
export { createSchemaCompiler, validateSchema } from './schema-compiler';
export { createScopeRef } from './scope';
export { createActionScope } from './action-scope';
export { createComponentHandleRegistry } from './component-handle-registry';
export { createFormComponentHandle } from './form-component-handle';
export { createApiCacheStore, resolveCacheKey } from './api-cache';
export { createAbortScope, withRetry, withTimeout, type RetryOptions } from './operation-control';
export { scopeChangeHitsDependencies } from './scope-change';
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
  const schemaCompiler = input.schemaCompiler ?? createSchemaCompiler({
    registry: input.registry,
    expressionCompiler,
    plugins
  });
  const envRef: { current: RendererEnv } = {
    current: input.env
  };
  const getEnv = () => envRef.current;
  const compiledValueCache = new WeakMap<object, ReturnType<ExpressionCompiler['compileValue']>>();
  const apiCache = createApiCacheStore();
  const executeApiRequest = createApiRequestExecutor(getEnv);
  const sourceRegistryRef: { current?: ReturnType<typeof createRuntimeSourceRegistry> } = {};
  const reactionRegistryRef: { current?: ReturnType<typeof createRuntimeReactionRegistry> } = {};
  const validationRegistry = createBuiltInValidationRegistry();
  let actionScopeCounter = 0;
  let componentRegistryCounter = 0;
  const runtimeRef: { current?: RendererRuntime } = {};
  const nodeRuntime = createNodeRuntime({
    expressionCompiler,
    getEnv
  });
  const runtimeNodeResolverRef: { current?: ReturnType<typeof createRuntimeNodeResolver> } = {};

  function createOwnedActionScope(scopeInput: { id?: string; parent?: ActionScope } = {}) {
    actionScopeCounter += 1;
    return createActionScope({
      id: scopeInput.id ?? `action-scope-${actionScopeCounter}`,
      parent: scopeInput.parent
    });
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

  async function executeValidationRule(
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ): Promise<ValidationError | undefined> {
    try {
      const response = await executeApiSchema(rule.api, scope, getEnv(), expressionCompiler, {
        evaluate,
        executor: (adaptedApi) => executeApiRequest(`validate:${field.path}`, adaptedApi, scope)
      });
      const adaptedData = response.data;

      if (adaptedData && typeof adaptedData === 'object') {
        const candidate = adaptedData as { valid?: boolean; message?: string };

        if (candidate.valid === false) {
          return createValidationError(
            field,
            compiledRule,
            candidate.message ?? rule.message ?? `${field.label ?? field.path} failed async validation`
          );
        }

        if (candidate.valid === true) {
          return undefined;
        }
      }

      return undefined;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        ((error as { name?: string }).name === 'AbortError' || (error as { code?: string }).code === 'ABORT_ERR')
      ) {
        return undefined;
      }

      throw error;
    }
  }

  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    return createManagedPageRuntime({
      data,
      pageStore: input.pageStore
    });
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
      executeValidationRule,
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

  async function executeAjaxAction(api: ApiSchema, action: ActionSchema, ctx: ActionContext, signal?: AbortSignal): Promise<ActionResult> {
    let monitoredApi: ExecutableApiRequest | undefined;
    const response = await executeApiSchema(api, ctx.scope, getEnv(), expressionCompiler, {
      signal,
      evaluate,
      onPreparedRequest: (preparedApi) => {
        monitoredApi = preparedApi;
      },
      executor: (adaptedApi) => executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
        signal,
        interactionId: ctx.interactionId,
        control: action.control as OperationControlConfig | undefined
      }),
      control: action.control as OperationControlConfig | undefined
    });

    if (monitoredApi) {
      getEnv().monitor?.onApiRequest?.({
        api: monitoredApi,
        nodeId: ctx.node?.id,
        path: ctx.node?.path,
        interactionId: ctx.interactionId
      });
    }

    if (action.dataPath && ctx.page) {
      const nextData = applyResponseDataPath(ctx.page.store.getState().data, action.dataPath, response.data);
      ctx.page.store.setData(nextData);
    }

    return {
      ok: true,
      data: response.data,
      error: undefined
    };
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    return evaluateCompiled(compileValue<T>(target as T), scope);
  }

  function compileValue<T = unknown>(target: T): CompiledRuntimeValue<T> {
    const cacheable = target != null && typeof target === 'object';

    if (!cacheable) {
      return expressionCompiler.compileValue(target);
    }

    const cached = compiledValueCache.get(target as object);

    if (cached) {
      return cached as CompiledRuntimeValue<T>;
    }

    const compiled = expressionCompiler.compileValue(target);
    compiledValueCache.set(target as object, compiled);
    return compiled as CompiledRuntimeValue<T>;
  }

  function evaluateCompiled<T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef): T {
    return expressionCompiler.evaluateValue(compiled, scope, getEnv()) as T;
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
    resolveNode(locator, options) {
      if (!runtimeNodeResolverRef.current) {
        throw new Error('Runtime node resolver is not initialized yet');
      }

      return runtimeNodeResolverRef.current.resolveNode(locator, options);
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
    getReactionDebugSnapshot() {
      return reactionRegistryRef.current?.getDebugSnapshot() ?? { reactions: [] };
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
    executeAjaxAction,
    submitFormAction: async (api, _action, ctx) => ctx.form!.submit(api, { interactionId: ctx.interactionId }),
    openDrawer: async (drawer, ctx) => {
      ctx.runtime.env.notify('info', 'Drawer support is not wired yet');
      return { ok: true, data: drawer };
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
        id: `${ctx.node?.id ?? ctx.scope.id}:dialog-scope`,
        path: `${ctx.scope.path}.dialog`,
        parent: ctx.scope,
        initialData: {
          dialogId: `${ctx.node?.id ?? ctx.scope.id}-pending`
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
