import type { RendererEnv } from '@nop-chaos/flux-core';
import { createEnv } from './env';
import { getToken } from './store';

export function hashNavigate(to: string | number, options?: { replace?: boolean }): void {
  if (typeof to === 'string') {
    const target = to.startsWith('#') ? to : `#${to}`;
    if (options?.replace) {
      window.location.replace(`${window.location.pathname}${window.location.search}${target}`);
    } else {
      window.location.hash = target.slice(1);
    }
  } else if (typeof to === 'number' && to < 0) {
    window.history.back();
  }
}

export function currentReturnTo(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#/' || hash === '#') return '/';
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

export function redirectToLogin(returnTo?: string): void {
  const target = returnTo ?? currentReturnTo();
  const encoded = encodeURIComponent(target);
  const current = window.location.hash;
  if (current.includes('#/auth/login')) return;
  window.location.hash = `/auth/login?returnTo=${encoded}`;
}

let envSingleton: RendererEnv | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getAppEnv(): RendererEnv {
  if (envSingleton) return envSingleton;
  envSingleton = createEnv({
    getToken,
    navigate: hashNavigate,
    onUnauthorized: () => {
      if (unauthorizedHandler) unauthorizedHandler();
      else redirectToLogin();
    },
  });
  return envSingleton;
}
