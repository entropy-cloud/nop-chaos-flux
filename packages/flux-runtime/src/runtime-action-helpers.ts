import type {
  ActionContext,
  ActionResult,
  ApiSchema,
  CompiledActionNode,
  CompiledFormValidationField,
  CompiledValidationRule,
  ExecutableApiRequest,
  ExpressionCompiler,
  RendererEnv,
  ScopeRef,
  ValidationError,
  ValidationRule
} from '@nop-chaos/flux-core';
import { resolveRequestControl } from '@nop-chaos/flux-action-core';
import { isAbortError } from './error-utils';
import { applyResponseDataPath, executeApiSchema } from './async-data/request-runtime';
import { createValidationError } from './validation';
import type { ApiRequestExecutor } from './async-data/request-runtime';
import type { RuntimeEvalHelpers } from './runtime-eval-helpers';

export async function executeRuntimeValidationRule(
  compiledRule: CompiledValidationRule,
  rule: Extract<ValidationRule, { kind: 'async' }>,
  field: CompiledFormValidationField,
  scope: ScopeRef,
  signal: AbortSignal | undefined,
  ctx: {
    getEnv: () => RendererEnv;
    expressionCompiler: ExpressionCompiler;
    evaluate: RuntimeEvalHelpers['evaluate'];
    executeApiRequest: ApiRequestExecutor;
  }
): Promise<ValidationError | undefined> {
  try {
    const response = await executeApiSchema(rule.api, scope, ctx.getEnv(), ctx.expressionCompiler, {
      signal,
      evaluate: ctx.evaluate,
      executor: (adaptedApi) => ctx.executeApiRequest(`validate:${field.path}`, adaptedApi, scope, undefined, { signal })
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
    if (isAbortError(error)) {
      return undefined;
    }

    throw error;
  }
}

export async function executeRuntimeAjaxAction(
  api: ApiSchema,
  action: CompiledActionNode,
  ctx: ActionContext,
  signal: AbortSignal | undefined,
  helpers: {
    getEnv: () => RendererEnv;
    expressionCompiler: ExpressionCompiler;
    evaluate: RuntimeEvalHelpers['evaluate'];
    executeApiRequest: ApiRequestExecutor;
  }
): Promise<ActionResult> {
  let monitoredApi: ExecutableApiRequest | undefined;
  const requestControl = resolveRequestControl(action);
  const response = await executeApiSchema(api, ctx.scope, helpers.getEnv(), helpers.expressionCompiler, {
    signal,
    evaluate: helpers.evaluate,
    onPreparedRequest: (preparedApi) => {
      monitoredApi = preparedApi;
    },
    executor: (adaptedApi) => helpers.executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
      signal,
      interactionId: ctx.interactionId,
      control: requestControl
    }),
    control: requestControl
  });

  if (monitoredApi) {
    helpers.getEnv().monitor?.onApiRequest?.({
      api: monitoredApi,
      nodeId: ctx.nodeInstance?.templateNode.id,
      path: ctx.nodeInstance?.templateNode.templatePath,
      interactionId: ctx.interactionId
    });
  }

  const dataPath = action.targeting?.dataPath;

  if (dataPath && ctx.page) {
    const nextData = applyResponseDataPath(ctx.page.store.getState().data, dataPath, response.data);
    ctx.page.store.setData(nextData);
  }

  return {
    ok: true,
    data: response.data,
    attempts: response.attempts,
    failureCount: response.failureCount,
    error: undefined
  };
}
