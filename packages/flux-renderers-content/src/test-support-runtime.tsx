import React from 'react';
import type { RendererEnv, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react';

/**
 * Minimal RendererRuntime for renderer-unit tests that render a component
 * directly (mock props) while the component reads env/scope through the
 * standard runtime hooks (useRendererEnv / useRenderScope).
 */
export function createTestRuntime(envOverride: Partial<RendererEnv> = {}): RendererRuntime {
  const env: RendererEnv = {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify: () => undefined,
    ...envOverride,
  };
  return {
    runtimeId: 'content-test-runtime',
    env,
  } as unknown as RendererRuntime;
}

export function createTestScope(data: Record<string, unknown> = {}): ScopeRef {
  return {
    id: 'root',
    path: '$',
    get(path: string) {
      return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') {
          return undefined;
        }
        return (current as Record<string, unknown>)[segment];
      }, data);
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    value: data,
    update: () => undefined,
    merge: () => undefined,
  };
}

export function TestRuntimeProvider({
  runtime,
  children,
}: {
  runtime: RendererRuntime;
  children: React.ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <ScopeContext.Provider value={createTestScope()}>{children}</ScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}
