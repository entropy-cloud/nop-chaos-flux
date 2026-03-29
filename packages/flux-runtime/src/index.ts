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
import { createComponentHandleRegistry } from './component-handle-registry';
import { createManagedFormRuntime } from './form-runtime';
import { createImportManager } from './imports';
import { createNodeRuntime } from './node-runtime';
import { createManagedPageRuntime } from './page-runtime';
import {
  applyRequestAdaptor,
  applyResponseAdaptor,
  applyResponseDataPath,
  createApiRequestExecutor
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
  applyRequestAdaptor,
  applyResponseAdaptor,
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
  const executeApiRequest = createApiRequestExecutor(input.env);
  const validationRegistry = createBuiltInValidationRegistry();
  let actionScopeCounter = 0;
  let componentRegistryCounter = 0;
  const runtimeRef: { current?: RendererRuntime } = {};
  const nodeRuntime = createNodeRuntime({
    expressionCompiler,
    env: input.env
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
    loader: input.env.importLoader,
    getRuntime: () => {
      if (!runtimeRef.current) {
        throw new Error('Renderer runtime is not initialized yet');
      }

      return runtimeRef.current;
    },
    env: input.env
  });

  async function executeValidationRule(
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ): Promise<ValidationError | undefined> {
    try {
      const api = applyRequestAdaptor(expressionCompiler, evaluate<ApiObject>(rule.api, scope), scope, input.env);
      const response = await executeApiRequest(`validate:${field.path}`, api, scope);
      const adaptedData = applyResponseAdaptor(expressionCompiler, api, response.data, scope, input.env);

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
        const adaptedApi = applyRequestAdaptor(expressionCompiler, api, scope, input.env);
        const response = await executeApiRequest('submitForm', adaptedApi, scope);
        const adaptedData = applyResponseAdaptor(expressionCompiler, adaptedApi, response.data, scope, input.env);

        return {
          ok: response.ok,
          data: adaptedData,
          error: response.ok ? undefined : adaptedData
        };
      }
    });
  }

  async function executeAjaxAction(api: ApiObject, action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const adaptedApi = applyRequestAdaptor(expressionCompiler, api, ctx.scope, input.env);
    const response = await executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form);
    const adaptedData = applyResponseAdaptor(expressionCompiler, adaptedApi, response.data, ctx.scope, input.env);

    if (action.dataPath && response.ok && ctx.page) {
      const nextData = applyResponseDataPath(ctx.page.store.getState().data, action.dataPath, adaptedData);
      ctx.page.store.setData(nextData);
    }

    return {
      ok: response.ok,
      data: adaptedData,
      error: response.ok ? undefined : adaptedData
    };
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    const compiled = expressionCompiler.compileValue(target);
    return expressionCompiler.evaluateValue(compiled, scope, input.env) as T;
  }

  const { dispatch } = createActionDispatcher({
    env: input.env,
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
    env: input.env,
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
    createFormRuntime
  };

  runtimeRef.current = runtime;

  return runtime;
}

