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
import { executeApiSchema, prepareApiRequestForExecution } from './async-data/request-runtime.js';
import { dataUrlToBlob, downloadBlob, resolveDownloadFilename } from './async-data/blob-download.js';
import { createValidationError } from './validation/index.js';
import type { ApiRequestExecutor } from './async-data/request-runtime.js';
import { generateCacheKey, resolveCacheKey } from './async-data/api-cache.js';
import type { SchemaFetchSharingContext } from './async-data/request-in-flight-registry.js';
import type { RuntimeEvalHelpers } from './runtime-eval-helpers.js';

const abortSignalControllers = new WeakMap<AbortSignal, AbortController>();

export function registerAbortSignalController(signal: AbortSignal, controller: AbortController) {
  abortSignalControllers.set(signal, controller);
}

export function unregisterAbortSignalController(signal: AbortSignal) {
  abortSignalControllers.delete(signal);
}

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
      const controller = signal ? abortSignalControllers.get(signal) : undefined;
      if (controller && !controller.signal.aborted) {
        controller.abort(result.error);
      }
      return undefined;
    }

    if (result.ok === false) {
      const message =
        result.error == null
          ? `${field.label ?? field.path} failed async validation`
          : String(result.error);
      throw result.error instanceof Error
        ? result.error
        : new Error(message, result.error == null ? undefined : { cause: result.error });
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
    sharing?: SchemaFetchSharingContext;
  },
): Promise<ActionResult> {
  const env = helpers.getEnv();
  // Auto-inject pagination params from CRUD evaluation bindings when
  // server-paginated loadAction doesn't specify them in the schema. This avoids
  // requiring schema authors to write `${pagination.currentPage}` expressions
  // that can fail in nested scope contexts (dialog form scope, etc.).
  const autoPagination = ctx.evaluationBindings?.__autoPagination as
    | Record<string, number>
    | undefined;
  if (autoPagination) {
    api = {
      ...api,
      params: {
        ...(typeof api.params === 'object' && api.params != null && !Array.isArray(api.params)
          ? (api.params as Record<string, unknown>)
          : {}),
        ...autoPagination,
      } as ApiSchema['params'],
    };
  }
  const messages = action.source?.messages;
  const confirmText = action.source?.confirmText;

  // confirmText gate: evaluate the prompt, call env.confirm, and bail out
  // (cancelled) when the user declines. A missing env.confirm is a config
  // error surfaced as a failure result rather than a silent skip.
  if (confirmText !== undefined && confirmText !== null && confirmText !== '') {
    if (typeof env.confirm !== 'function') {
      return {
        ok: false,
        error: new Error(
          'confirmText is configured on the action but env.confirm is not provided; cannot prompt the user.',
        ),
        attempts: 0,
        failureCount: 0,
      };
    }
    const resolvedConfirmText = helpers.evaluate<string>(confirmText, ctx.scope);
    const confirmed = await env.confirm(resolvedConfirmText);
    if (!confirmed) {
      return createCancelledResult(new Error('User declined the confirmation prompt.'));
    }
  }

  const result = await performAjaxRequest();

  // Author-declared toast messages are processed independently of then/onError.
  if (result.ok && messages?.success) {
    const value = helpers.evaluate<string>(messages.success, ctx.scope);
    env.notify('success', String(value));
  } else if (!result.ok && !result.cancelled && messages?.failed) {
    const value = helpers.evaluate<string>(messages.failed, ctx.scope);
    env.notify('error', String(value));
  }

  return result;

  async function performAjaxRequest(): Promise<ActionResult> {
    const requestControl = resolveRequestControl(action);
    const sharing = helpers.sharing;
    const cacheTTL = requestControl?.cacheTTL;
    const cacheEnabled = typeof cacheTTL === 'number' && cacheTTL > 0;

    try {
      // A11: schema-fetch cross-subscriber dedup + runtime cache, opt-in via
      // control.cacheTTL on a safe HTTP method. Other ajax paths keep the original
      // always-fetch behavior, so owner-local source refresh dedup is untouched.
      if (sharing && cacheEnabled) {
        const evaluatedApi = helpers.evaluate<ApiSchema>(api, ctx.scope);
        const prepared = prepareApiRequestForExecution(
          evaluatedApi,
          ctx.scope,
          env,
          helpers.expressionCompiler,
        );

        if (!isSafeRequestMethod(prepared.request.method)) {
          return await runStandardAjaxRequest(api, ctx, signal, requestControl, helpers, env, () => {});
        }

        const cacheKey = resolveCacheKey(prepared.request, requestControl);

        if (cacheKey) {
          const cached = sharing.apiCache.get<unknown>(cacheKey);
          if (cached) {
            // M-06: a single subscriber aborting never cancels the shared fetch
            // (documented intent), but an already-aborted caller that reaches a
            // cache hit must not receive a success result. The shared fetch is
            // not touched; only this caller's result reflects the abort.
            if (signal?.aborted) {
              return createCancelledResult(signal.reason);
            }
            return { ok: true, data: cached.data, attempts: 0, failureCount: 0, error: undefined };
          }
        }

        const runOnce = (registrySignal: AbortSignal) =>
          executeApiSchema(evaluatedApi, ctx.scope, env, helpers.expressionCompiler, {
            signal: registrySignal,
            preparedRequest: prepared,
            onPreparedRequest: () => {},
            executor: (adaptedApi, executorSignal) =>
              helpers.executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
                signal: executorSignal,
                interactionId: ctx.interactionId,
                control: requestControl,
              }),
            control: requestControl,
          });

        const identityKey = generateCacheKey(prepared.request);
        const response = await sharing.inFlight.acquire(identityKey, runOnce);

        if (cacheKey) {
          sharing.apiCache.set(cacheKey, response.data, cacheTTL as number);
        }

        return {
          ok: true,
          data: response.data,
          attempts: response.attempts,
          failureCount: response.failureCount,
          error: undefined,
        };
      }

      return await runStandardAjaxRequest(api, ctx, signal, requestControl, helpers, env, () => {});
    } catch (error) {
      if (isAbortError(error)) {
        return createCancelledResult(error);
      }

      // HTTP business failures (non-OK fetcher responses) are surfaced as action
      // failure results rather than re-thrown, so the action dispatcher's single
      // error->notify translation reports them exactly once with the backend
      // message carried on `error`. Genuine infrastructure errors (network,
      // adaptor compile failures, etc.) keep re-throwing so `onActionError` /
      // plugin `onError` diagnostic hooks still fire for them.
      if (isHttpResponseFailure(error)) {
        const failureMeta = error as {
          attempts?: number;
          failureCount?: number;
          lastFailureReason?: unknown;
        };

        return {
          ok: false,
          error,
          attempts: failureMeta.attempts ?? 0,
          failureCount: failureMeta.failureCount ?? 1,
        };
      }

      throw error;
    }
  }
}

function isSafeRequestMethod(method: string | undefined): boolean {
  const normalized = (method ?? 'get').toLowerCase();
  return normalized === 'get' || normalized === 'head' || normalized === 'options';
}

async function runStandardAjaxRequest(
  api: ApiSchema,
  ctx: ActionContext,
  signal: AbortSignal | undefined,
  requestControl: ReturnType<typeof resolveRequestControl>,
  helpers: {
    getEnv: () => RendererEnv;
    expressionCompiler: ExpressionCompiler;
    evaluate: RuntimeEvalHelpers['evaluate'];
    executeApiRequest: ApiRequestExecutor;
  },
  env: RendererEnv,
  _reportMonitor: (api: ExecutableApiRequest | undefined) => void,
): Promise<ActionResult> {
  const response = await executeApiSchema(api, ctx.scope, env, helpers.expressionCompiler, {
    signal,
    evaluate: helpers.evaluate,
    onPreparedRequest: () => {},
    executor: (adaptedApi) =>
      helpers.executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
        signal,
        interactionId: ctx.interactionId,
        control: requestControl,
      }),
    control: requestControl,
  });

  return {
    ok: true,
    data: response.data,
    attempts: response.attempts,
    failureCount: response.failureCount,
    error: undefined,
  };
}

function isHttpResponseFailure(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'response' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}


/**
 * `download` built-in action (host-channels contract, plan 512 L3.3):
 * fetch → blob → trigger save, reusing the canonical blob-download pipeline.
 * Args forms (contract §3):
 *   1. `{ api: {...} }` — blob fetch of an ExecutableApiRequest shape;
 *   2. `{ url, filename? }` — `data:` URL saved directly;
 *   3. `{ url }` — endpoint returning `{ url }` in the envelope data; that
 *      link (data: → decoded; http(s) → second blob GET) is then saved.
 * Non-success envelopes notify a download error and fail the action.
 */
export async function executeRuntimeDownloadAction(
  args: { api?: Record<string, unknown>; url?: string; filename?: string },
  helpers: {
    executeApiRequest: ApiRequestExecutor;
    scope: ScopeRef;
    signal: AbortSignal | undefined;
    notifyError: () => void;
  },
): Promise<ActionResult> {
  const { executeApiRequest, scope, signal, notifyError } = helpers;

  const fail = (error: Error): ActionResult => {
    notifyError();
    return { ok: false, error };
  };

  const saveBlob = (blob: Blob, filename: string | undefined, url?: string) => {
    downloadBlob(blob, filename || filenameFromUrl(url) || 'download');
  };

  const blobGet = async (url: string, filename?: string): Promise<ActionResult> => {
    const response = await executeApiRequest<Blob>(
      'download',
      { url, method: 'get', responseType: 'blob' },
      scope,
      undefined,
      { signal },
    );
    if (response.status !== 0 || !(response.data instanceof Blob)) {
      return fail(new Error(`download request failed for ${url}`));
    }
    const disposition = response.headers?.['content-disposition'];
    saveBlob(response.data, filename || resolveDownloadFilename({ downloadFileName: undefined }, disposition), url);
    return { ok: true };
  };

  // Form 1: explicit api object → blob fetch through the envelope pipeline.
  if (args.api && typeof args.api === 'object') {
    const api = {
      responseType: 'blob',
      ...args.api,
      downloadFileName: args.filename ?? (args.api as { downloadFileName?: string }).downloadFileName,
    } as ExecutableApiRequest;
    const response = await executeApiRequest<Blob>('download', api, scope, undefined, { signal });
    if (response.status !== 0 || !(response.data instanceof Blob)) {
      return fail(new Error('download request failed (non-success envelope)'));
    }
    const disposition = response.headers?.['content-disposition'];
    const filename = resolveDownloadFilename({ downloadFileName: args.filename }, disposition) ?? 'download';
    downloadBlob(response.data, filename);
    return { ok: true };
  }

  // Forms 2/3: url-based.
  if (typeof args.url === 'string' && args.url) {
    if (args.url.startsWith('data:')) {
      saveBlob(await dataUrlToBlob(args.url), args.filename, args.url);
      return { ok: true };
    }
    // Endpoint: JSON envelope; look for a `url` field in the data.
    const response = await executeApiRequest<unknown>('download', { url: args.url, method: 'get' }, scope, undefined, {
      signal,
    });
    if (response.status !== 0) {
      return fail(new Error(`download request failed for ${args.url}`));
    }
    const data = response.data as { url?: unknown; filename?: unknown } | null | undefined;
    if (data && typeof data === 'object' && typeof (data as { url?: unknown }).url === 'string') {
      const link = (data as { url: string }).url;
      const serverFilename =
        args.filename ??
        (typeof (data as { filename?: unknown }).filename === 'string'
          ? (data as { filename: string }).filename
          : undefined);
      if (link.startsWith('data:')) {
        saveBlob(await dataUrlToBlob(link), serverFilename, link);
        return { ok: true };
      }
      return blobGet(link, serverFilename);
    }
    return fail(new Error('download response carried no url field'));
  }

  return fail(new Error('download action requires args.api or args.url'));
}

function filenameFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const path = url.split(/[?#]/)[0];
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last || undefined;
}
