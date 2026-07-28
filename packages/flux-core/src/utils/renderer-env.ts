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
  stream?: <T = unknown>(
    next: StreamFetcher,
    api: StreamApiRequest,
    ctx: ApiRequestContext,
  ) => Promise<StreamFetchResult<T>>;
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

  const fetcherHook = hooks.fetcher;
  const notifyHook = hooks.notify;
  const navigateHook = hooks.navigate;
  const streamHook = hooks.stream;
  const openSocketHook = hooks.openSocket;
  const envNavigate = env.navigate;
  const envStream = env.stream;
  const envOpenSocket = env.openSocket;

  return {
    ...env,
    fetcher: fetcherHook
      ? <T = unknown>(api: Parameters<ApiFetcher>[0], ctx: ApiRequestContext) =>
          fetcherHook(env.fetcher, api, ctx) as Promise<ApiResponse<T>>
      : env.fetcher,
    notify: notifyHook
      ? (level: Parameters<RendererEnv['notify']>[0], message: Parameters<RendererEnv['notify']>[1]) =>
          notifyHook(env.notify, level, message)
      : env.notify,
    navigate: envNavigate && navigateHook
      ? (to: Parameters<NonNullable<RendererEnv['navigate']>>[0], options?: Parameters<NonNullable<RendererEnv['navigate']>>[1]) =>
          navigateHook(envNavigate, to, options)
      : env.navigate,
    stream: envStream && streamHook
      ? <T = unknown>(api: StreamApiRequest, ctx: ApiRequestContext) =>
          streamHook(envStream, api, ctx) as Promise<StreamFetchResult<T>>
      : env.stream,
    openSocket: envOpenSocket && openSocketHook
      ? (url: string, options?: Parameters<NonNullable<WebSocketOpener>>[1], ctx?: ApiRequestContext) =>
          openSocketHook(envOpenSocket, url, options, ctx)
      : env.openSocket,
  };
}
