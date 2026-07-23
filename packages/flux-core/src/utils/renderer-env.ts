import type {
  ApiFetcher,
  ApiRequestContext,
  ApiResponse,
  RendererEnv,
  StreamApiRequest,
  StreamFetchResult,
  StreamFetcher,
  WebSocketOpener,
} from '../types/renderer-api.js';

export interface RendererEnvDecoratorHooks {
  fetcher?: <T = unknown>(
    next: ApiFetcher,
    api: Parameters<ApiFetcher>[0],
    ctx: ApiRequestContext,
  ) => Promise<ApiResponse<T>>;
  notify?: (
    next: RendererEnv['notify'],
    level: Parameters<RendererEnv['notify']>[0],
    message: Parameters<RendererEnv['notify']>[1],
  ) => void;
  navigate?: (
    next: NonNullable<RendererEnv['navigate']>,
    to: Parameters<NonNullable<RendererEnv['navigate']>>[0],
    options?: Parameters<NonNullable<RendererEnv['navigate']>>[1],
  ) => void;
  /**
   * 拦截 `env.stream` 调用（debugger / 审计日志用）。
   * `next` 为底层 host stream 实现；调用它并按需处理/转发结果。
   */
  stream?: <T = unknown>(
    next: StreamFetcher,
    api: StreamApiRequest,
    ctx: ApiRequestContext,
  ) => Promise<StreamFetchResult<T>>;
  /**
   * 拦截 `env.openSocket` 调用（debugger / 审计日志用）。
   * `next` 为底层 host openSocket 实现；返回 `next(...)` 的连接句柄（或包装层）。
   */
  openSocket?: (
    next: NonNullable<WebSocketOpener>,
    url: string,
    options?: Parameters<NonNullable<WebSocketOpener>>[1],
    ctx?: ApiRequestContext,
  ) => ReturnType<NonNullable<WebSocketOpener>>;
}

export function decorateRendererEnv(
  env: RendererEnv,
  hooks: RendererEnvDecoratorHooks,
): RendererEnv {
  if (
    !hooks.fetcher &&
    !hooks.notify &&
    !hooks.navigate &&
    !hooks.stream &&
    !hooks.openSocket
  ) {
    return env;
  }

  return {
    ...env,
    fetcher: hooks.fetcher
      ? <T = unknown>(api: Parameters<ApiFetcher>[0], ctx: ApiRequestContext) =>
          hooks.fetcher!(env.fetcher as ApiFetcher, api, ctx) as Promise<ApiResponse<T>>
      : env.fetcher,
    notify: hooks.notify
      ? (level, message) => hooks.notify!(env.notify, level, message)
      : env.notify,
    navigate:
      env.navigate && hooks.navigate
        ? (to, options) => hooks.navigate!(env.navigate!, to, options)
        : env.navigate,
    stream:
      env.stream && hooks.stream
        ? <T = unknown>(api: StreamApiRequest, ctx: ApiRequestContext) =>
            hooks.stream!(env.stream as StreamFetcher, api, ctx) as Promise<StreamFetchResult<T>>
        : env.stream,
    openSocket:
      env.openSocket && hooks.openSocket
        ? (url, options, ctx) =>
            hooks.openSocket!(env.openSocket as NonNullable<WebSocketOpener>, url, options, ctx)
        : env.openSocket,
  };
}
