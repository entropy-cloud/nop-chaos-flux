import type {
  ActionContext,
  ApiObject,
  ApiRequestContext,
  ApiResponse,
  RendererEnv,
  RendererMonitor,
  RendererPlugin,
  SchemaInput,
  CompiledSchemaNode
} from '@nop-chaos/flux-core';
import { buildNetworkSummary, createRequestInstanceId, createRequestKey, formatActionResult, formatErrorDetail, normalizeCompiledRoot, summarizeApi, summarizeValueShape } from './controller-helpers';
import { redactData, type NormalizedRedactionOptions } from './redaction';
import type { NopDebuggerStore } from './store';

export function createDebuggerPlugin(store: NopDebuggerStore): RendererPlugin {
  return {
    name: 'nop-debugger',
    beforeCompile(schema: SchemaInput) {
      const rootType = Array.isArray(schema) ? schema[0]?.type : schema.type;
      store.append({
        kind: 'compile:start',
        group: 'compile',
        level: 'info',
        source: 'plugin.beforeCompile',
        summary: `compile start${rootType ? ` (${rootType})` : ''}`
      });
      return schema;
    },
    afterCompile(node: CompiledSchemaNode | CompiledSchemaNode[]) {
      const normalized = normalizeCompiledRoot(node);
      store.append({
        kind: 'compile:end',
        group: 'compile',
        level: 'success',
        source: 'plugin.afterCompile',
        summary: `compile ready (${normalized.rootCount} root${normalized.rootCount === 1 ? '' : 's'})`,
        detail: `type=${normalized.firstType ?? 'n/a'} | path=${normalized.firstPath ?? 'n/a'}`,
        rendererType: normalized.firstType,
        path: normalized.firstPath
      });
      return node;
    },
    beforeAction(action, ctx) {
      store.append({
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'plugin.beforeAction',
        summary: `${action.action} prepared`,
        detail: `nodeId=${ctx.node?.id ?? 'n/a'} | path=${ctx.node?.path ?? 'n/a'}`,
        actionType: action.action,
        nodeId: ctx.node?.id,
        path: ctx.node?.path,
        rendererType: ctx.node?.type
      });
      return action;
    },
    onError(error, payload) {
      store.append({
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'plugin.onError',
        summary: `${payload.phase} error`,
        detail: formatErrorDetail(error),
        nodeId: payload.nodeId,
        path: payload.path
      });
    }
  };
}

export function decorateDebuggerEnv(input: {
  enabled: boolean;
  env: RendererEnv;
  store: NopDebuggerStore;
  redaction: NormalizedRedactionOptions;
  requestState: Map<string, { startedAt: number; requestInstanceId: string; interactionId?: string; nodeId?: string; path?: string }>;
}): RendererEnv {
  if (!input.enabled) {
    return input.env;
  }

  const baseMonitor = input.env.monitor;
  const decoratedMonitor: RendererMonitor = {
    ...baseMonitor,
    onRenderStart(payload) {
      input.store.append({
        kind: 'render:start',
        group: 'render',
        level: 'info',
        source: 'monitor.onRenderStart',
        summary: `${payload.type} render start`,
        detail: `nodeId=${payload.nodeId} | path=${payload.path}`,
        nodeId: payload.nodeId,
        path: payload.path,
        rendererType: payload.type
      });
      baseMonitor?.onRenderStart?.(payload);
    },
    onRenderEnd(payload) {
      input.store.append({
        kind: 'render:end',
        group: 'render',
        level: 'success',
        source: 'monitor.onRenderEnd',
        summary: `${payload.type} rendered in ${payload.durationMs}ms`,
        detail: `nodeId=${payload.nodeId} | path=${payload.path}`,
        nodeId: payload.nodeId,
        path: payload.path,
        rendererType: payload.type,
        durationMs: payload.durationMs
      });
      baseMonitor?.onRenderEnd?.(payload);
    },
    onActionStart(payload) {
      input.store.append({
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'monitor.onActionStart',
        summary: `${payload.actionType} started`,
        detail: `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`,
        actionType: payload.actionType,
        interactionId: payload.interactionId,
        nodeId: payload.nodeId,
        path: payload.path
      });
      baseMonitor?.onActionStart?.(payload);
    },
    onActionEnd(payload) {
      input.store.append({
        kind: 'action:end',
        group: 'action',
        level: payload.result?.ok === false ? 'error' : 'success',
        source: 'monitor.onActionEnd',
        summary: `${payload.actionType} ${formatActionResult(payload.result)} in ${payload.durationMs}ms`,
        detail: `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`,
        actionType: payload.actionType,
        interactionId: payload.interactionId,
        nodeId: payload.nodeId,
        path: payload.path,
        durationMs: payload.durationMs
      });
      baseMonitor?.onActionEnd?.(payload);
    },
    onApiRequest(payload) {
      const requestKey = createRequestKey(payload.api, payload.nodeId, payload.path);
      const requestInstanceId = payload.requestInstanceId ?? createRequestInstanceId();
      if (!input.requestState.has(requestInstanceId)) {
        input.requestState.set(requestInstanceId, {
          startedAt: Date.now(),
          requestInstanceId,
          interactionId: payload.interactionId,
          nodeId: payload.nodeId,
          path: payload.path
        });
        input.store.append({
          kind: 'api:start',
          group: 'api',
          level: 'info',
          source: 'monitor.onApiRequest',
          summary: summarizeApi(payload.api),
          detail: `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`,
          nodeId: payload.nodeId,
          path: payload.path,
          requestKey,
          requestInstanceId,
          interactionId: payload.interactionId,
          exportedData: redactData(payload.api.data, input.redaction),
          network: buildNetworkSummary({ api: payload.api })
        });
      }
      baseMonitor?.onApiRequest?.(payload);
    },
    onError(payload) {
      input.store.append({
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'monitor.onError',
        summary: `${payload.phase} error`,
        detail: formatErrorDetail(payload.error),
        nodeId: payload.nodeId,
        path: payload.path
      });
      baseMonitor?.onError?.(payload);
    }
  };

  const decoratedFetcher = async <T,>(api: ApiObject, ctx: ApiRequestContext): Promise<ApiResponse<T>> => {
    const requestKey = createRequestKey(api);
    const startedAt = Date.now();
    const requestInstanceId = ctx.requestInstanceId ?? createRequestInstanceId();
    const existingRequest = input.requestState.get(requestInstanceId);
    input.requestState.set(requestInstanceId, {
      startedAt,
      requestInstanceId,
      interactionId: ctx.interactionId ?? existingRequest?.interactionId,
      nodeId: existingRequest?.nodeId,
      path: existingRequest?.path
    });

    if (!ctx.env.monitor?.onApiRequest) {
      input.store.append({
        kind: 'api:start',
        group: 'api',
        level: 'info',
        source: 'fetcher',
        summary: summarizeApi(api),
        detail: 'request started via fetcher wrapper',
        requestKey,
        requestInstanceId,
        interactionId: ctx.interactionId,
        exportedData: redactData(api.data, input.redaction),
        network: buildNetworkSummary({ api })
      });
    }

    try {
      const response = await input.env.fetcher<T>(api, ctx);
      const responseShape = summarizeValueShape(response.data);
      input.store.append({
        kind: 'api:end',
        group: 'api',
        level: response.ok ? 'success' : 'error',
        source: 'fetcher',
        summary: `${summarizeApi(api)} -> ${response.status}`,
        detail: response.data == null ? 'no response data' : `response ${responseShape.responseType}${responseShape.keys.length ? ` | keys=${responseShape.keys.join(',')}` : ''}`,
        requestKey,
        requestInstanceId,
        interactionId: ctx.interactionId ?? existingRequest?.interactionId,
        durationMs: Math.max(0, Date.now() - startedAt),
        exportedData: redactData(response.data, input.redaction),
        network: buildNetworkSummary({
          api,
          response: response as ApiResponse<unknown>
        })
      });
      input.requestState.delete(requestInstanceId);
      return response;
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      input.store.append({
        kind: aborted ? 'api:abort' : 'error',
        group: aborted ? 'api' : 'error',
        level: aborted ? 'warning' : 'error',
        source: 'fetcher',
        summary: aborted ? `${summarizeApi(api)} aborted` : `${summarizeApi(api)} failed`,
        detail: formatErrorDetail(error),
        requestKey,
        requestInstanceId,
        interactionId: ctx.interactionId ?? existingRequest?.interactionId,
        durationMs: Math.max(0, Date.now() - startedAt),
        network: buildNetworkSummary({
          api,
          aborted
        })
      });
      input.requestState.delete(requestInstanceId);
      throw error;
    }
  };

  return {
    ...input.env,
    fetcher: decoratedFetcher,
    notify(level, message) {
      input.store.append({
        kind: 'notify',
        group: 'notify',
        level,
        source: 'env.notify',
        summary: `${level}: ${message}`
      });
      input.env.notify(level, message);
    },
    monitor: decoratedMonitor
  };
}

export function appendActionErrorEvent(store: NopDebuggerStore, error: unknown, ctx: ActionContext) {
  store.append({
    kind: 'error',
    group: 'error',
    level: 'error',
    source: 'root.onActionError',
    summary: 'action error',
    detail: formatErrorDetail(error),
    nodeId: ctx.node?.id,
    path: ctx.node?.path,
    rendererType: ctx.node?.type
  });
}
