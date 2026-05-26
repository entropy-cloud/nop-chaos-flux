import { vi } from 'vitest';
import type { ComponentActionInvocation, NamespacedActionInvocation } from '@nop-chaos/flux-core';
import { createActionRuntimeAdapter } from '../action-adapter.js';
import { createActionScope } from '../action-scope.js';
import { createScopeRef } from '../scope.js';

export { createActionRuntimeAdapter, createActionScope };
export type { ComponentActionInvocation, NamespacedActionInvocation };

export function createAdapter() {
  return createActionRuntimeAdapter({
    getEnv: () => ({ notify: vi.fn() }) as any,
    expressionCompiler: {} as any,
    evaluate: <T>(target: unknown) => target as T,
    executeApiRequest: vi.fn() as any,
    runtime: {
      env: { notify: vi.fn() },
      createChildScope: vi.fn(),
      refreshDataSource: vi.fn(),
      registry: {
        get: vi.fn(() => undefined),
      },
    } as any,
    createSurfaceScope: vi.fn(),
  });
}

export function createCtx(overrides: Record<string, unknown> = {}) {
  return {
    runtime: { env: { notify: vi.fn() } },
    scope: createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} }),
    ...overrides,
  } as any;
}

export function createBuiltInInvocation(
  action: string,
  args?: Record<string, unknown>,
  targeting?: Record<string, unknown>,
) {
  return {
    action,
    args,
    targeting: targeting ?? {},
    actionNode: {},
  } as any;
}
