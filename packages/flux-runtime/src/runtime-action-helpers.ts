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
  ValidationRule,
  ActionSchema,
} from '@nop-chaos/flux-core';
import {
  createCancelledResult,
  isAbortError,
  resolveRequestControl,
} from '@nop-chaos/flux-action-core';
import { executeApiSchema } from './async-data/request-runtime.js';
import { createValidationError } from './validation/index.js';
import type { ApiRequestExecutor } from './async-data/request-runtime.js';
import type { RuntimeEvalHelpers } from './runtime-eval-helpers.js';

export async function executeRuntimeValidationRule(
  compiledRule: CompiledValidationRule,
  rule: Extract<ValidationRule, { kind: 'async' }>,
  field: CompiledFormValidationField,
  scope: ScopeRef,
  signal: AbortSignal | undefined,
  ctx: {
    dispatch: (action: ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult>;
  },
): Promise<ValidationError | undefined> {
  try {
    const result = await ctx.dispatch(rule.action, {
      scope,
      signal,
    });

    if (result.cancelled) {
      return undefined;
    }

    if (result.ok === false) {
      throw result.error instanceof Error
        ? result.error
        : new Error(
            result.error == null
              ? `${field.label ?? field.path} failed async validation`
              : String(result.error),
          );
    }

    const adaptedData = result.data;

    if (adaptedData && typeof adaptedData === 'object') {
      const candidate = adaptedData as { valid?: boolean; message?: string };

      if (candidate.valid === false) {
        return createValidationError(
          field,
          compiledRule,
          candidate.message ??
            rule.message ??
            `${field.label ?? field.path} failed async validation`,
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
  },
): Promise<ActionResult> {
  try {
    let monitoredApi: ExecutableApiRequest | undefined;
    const requestControl = resolveRequestControl(action);
    const response = await executeApiSchema(
      api,
      ctx.scope,
      helpers.getEnv(),
      helpers.expressionCompiler,
      {
        signal,
        evaluate: helpers.evaluate,
        onPreparedRequest: (preparedApi) => {
          monitoredApi = preparedApi;
        },
        executor: (adaptedApi) =>
          helpers.executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
            signal,
            interactionId: ctx.interactionId,
            control: requestControl,
          }),
        control: requestControl,
      },
    );

    if (monitoredApi) {
      helpers.getEnv().monitor?.onApiRequest?.({
        api: monitoredApi,
        nodeId: ctx.nodeInstance?.templateNode.id,
        path: ctx.nodeInstance?.templateNode.templatePath,
        interactionId: ctx.interactionId,
      });
    }

    return {
      ok: true,
      data: response.data,
      attempts: response.attempts,
      failureCount: response.failureCount,
      error: undefined,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return createCancelledResult(error);
    }

    throw error;
  }
}
