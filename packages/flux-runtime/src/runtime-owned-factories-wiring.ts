import type { ActionContext, ActionResult, ActionSchema } from '@nop-chaos/flux-core';
import { createRuntimeOwnedFactories } from './runtime-owned-factories.js';

type OwnedFactoriesInput = Parameters<typeof createRuntimeOwnedFactories>[0];

export type ActionDispatcherRef = {
  current?: (action: ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult>;
};

export type ExecuteSourceRef = {
  current?: (
    source: import('@nop-chaos/flux-core').SourceSchema,
    scope: import('@nop-chaos/flux-core').ScopeRef,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
};

interface OwnedFactoriesWiringDeps {
  actionDispatcherRef: { current?: (action: ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult> };
  sourceRegistryRef: { current?: { disposeScopeTree: (scopeId: string) => void } };
  reactionRegistryRef: { current?: { disposeScopeTree: (scopeId: string) => void } };
  createValidationScopeRuntime: OwnedFactoriesInput['createValidationScopeRuntime'];
}

export function wireRuntimeOwnedFactories(
  base: Omit<OwnedFactoriesInput, 'createValidationScopeRuntime' | 'dispatchAction' | 'disposeScopeTree'>,
  deps: OwnedFactoriesWiringDeps,
) {
  return createRuntimeOwnedFactories({
    ...base,
    createValidationScopeRuntime: deps.createValidationScopeRuntime,
    dispatchAction: (action, ctx) => {
      if (!deps.actionDispatcherRef.current) {
        throw new Error('Action dispatcher not initialized');
      }
      return deps.actionDispatcherRef.current(action, ctx);
    },
    disposeScope: base.disposeScope,
    disposeScopeTree: (scopeId) => {
      deps.sourceRegistryRef.current?.disposeScopeTree(scopeId);
      deps.reactionRegistryRef.current?.disposeScopeTree(scopeId);
    },
  });
}
