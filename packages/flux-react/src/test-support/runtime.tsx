import React from 'react';
import type { RendererEnv, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { createDefaultEnv } from '../defaults.js';
import { RuntimeContext, ScopeContext } from '../contexts.js';

/**
 * Minimal RendererRuntime for renderer-unit tests that render a component
 * directly (mock props) while the component reads env/scope through the
 * standard runtime hooks (useRendererEnv / useRenderScope).
 */
export function createTestRuntime(envOverride: Partial<RendererEnv> = {}): RendererRuntime {
  return {
    runtimeId: 'test-runtime',
    env: createDefaultEnv(envOverride),
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
