import type {
  ActionContext,
  ActionScope,
  ActionResult,
  ActionSchema,
  ApiObject,
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
import { createDataSourceController } from './data-source-runtime';
import { createManagedFormRuntime } from './form-runtime';
import { createImportManager } from './imports';
import { createNodeRuntime } from './node-runtime';
import { createManagedPageRuntime } from './page-runtime';
import {
  applyResponseDataPath,
  createApiRequestExecutor,
  executeApiObject
} from './request-runtime';
import { createSchemaCompiler } from './schema-compiler';
import { createScopeRef, createScopeStore, toRecord } from './scope';
import { validateRule } from './validation-runtime';
import { createBuiltInValidationRegistry, createValidationError } from './validation';

export { createRendererRegistry, registerRendererDefinitions } from './registry';
export { createSchemaCompiler } from './schema-compiler';
export { createScopeRef } from './scope';
export { createActionScope } from './action-scope';
export { createComponentHandleRegistry } from './component-handle-registry';
export { createFormComponentHandle } from './form-component-handle';
export { createApiCacheStore, resolveCacheKey } from './api-cache';
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
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const schemaCompiler = input.schemaCompiler ?? createSchemaCompiler({
    registry: input.registry,
    expressionCompiler,
    plugins: input.plugins
  });
  const envRef: { current: RendererEnv } = {
    current: input.env
  };
  const getEnv = () => envRef.current;
  const apiCache = createApiCacheStore();
  const executeApiRequest = createApiRequestExecutor(getEnv);
  const validationRegistry = createBuiltInValidationRegistry();
  let actionScopeCounter = 0;
  let componentRegistryCounter = 0;
  const runtimeRef: { current?: RendererRuntime } = {};
  const nodeRuntime = createNodeRuntime({
    expressionCompiler,
    getEnv
  });

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
      const api = evaluate<ApiObject>(rule.api, scope);
      const response = await executeApiObject(api, scope, getEnv(), expressionCompiler, {
        executor: (adaptedApi) => executeApiRequest(`validate:${field.path}`, adaptedApi, scope)
      });
      const adaptedData = response.data;

      if (response.ok && adaptedData && typeof adaptedData === 'object') {
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

      if (!response.ok) {
        return createValidationError(field, compiledRule, rule.message ?? `${field.label ?? field.path} failed async validation`);
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
  }): FormRuntime {
    return createManagedFormRuntime({
      ...inputValue,
      executeValidationRule,
      validateRule: (compiledRule, value, field, scope) => validateRule(compiledRule, value, field, scope, validationRegistry),
      submitApi: async (api, scope) => {
        const response = await executeApiObject(api, scope, getEnv(), expressionCompiler, {
          executor: (adaptedApi) => executeApiRequest('submitForm', adaptedApi, scope)
        });

        return {
          ok: response.ok,
          data: response.data,
          error: response.ok ? undefined : response.data
        };
      }
    });
  }

  async function executeAjaxAction(api: ApiObject, action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const response = await executeApiObject(api, ctx.scope, getEnv(), expressionCompiler, {
      executor: (adaptedApi) => executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form)
    });

    if (action.dataPath && response.ok && ctx.page) {
      const nextData = applyResponseDataPath(ctx.page.store.getState().data, action.dataPath, response.data);
      ctx.page.store.setData(nextData);
    }

    return {
      ok: response.ok,
      data: response.data,
      error: response.ok ? undefined : response.data
    };
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    const compiled = expressionCompiler.compileValue(target);
    return expressionCompiler.evaluateValue(compiled, scope, getEnv()) as T;
  }

  const { dispatch } = createActionDispatcher({
    getEnv,
    plugins: input.plugins,
    onActionError: input.onActionError,
    evaluate,
    executeAjaxAction,
    submitFormAction: async (api, _action, ctx) => ctx.form!.submit(api),
    runtime: {
      compile(schema) {
        return schemaCompiler.compile(schema);
      }
    },
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

  const runtime: RendererRuntime = {
    registry: input.registry,
    get env() {
      return getEnv();
    },
    expressionCompiler,
    schemaCompiler,
    plugins: input.plugins ?? [],
    compile(schema) {
      return schemaCompiler.compile(schema);
    },
    evaluate,
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
    releaseImportedNamespaces(args) {
      importManager.releaseImportedNamespaces(args);
    },
    dispatch,
    createPageRuntime,
    createDataSourceController(inputValue) {
      return createDataSourceController({
        runtime,
        apiCache,
        executeApiRequest: (actionType, api, scope, options) => executeApiRequest(actionType, api, scope, undefined, options),
        ...inputValue
      });
    },
    createFormRuntime
  };

  runtimeRef.current = runtime;

  return runtime;
}
