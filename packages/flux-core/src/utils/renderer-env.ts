import type {
  ApiFetcher,
  ApiRequestContext,
  ApiResponse,
  RendererEnv,
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
}

export function decorateRendererEnv(
  env: RendererEnv,
  hooks: RendererEnvDecoratorHooks,
): RendererEnv {
  if (!hooks.fetcher && !hooks.notify && !hooks.navigate) {
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
  };
}
