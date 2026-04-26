import { reportRuntimeHostIssue, type ActionSchema, type CompiledRuntimeValue, type ScopeRef } from '@nop-chaos/flux-core';
import type {
  AsyncGovernanceStore,
  AsyncRunHandle,
  DynamicRuntimeValue,
  ReactionRegistryDebugSnapshot,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from '../node-runtime';
import { createRootDependencySet } from '../scope-change';

export const MAX_REACTION_FIRE_COUNT = 10;

export function createReactionLimitError(input: { id: string; scope: ScopeRef; fireCount: number }) {
  return new Error(
    `Reaction "${input.id}" in scope "${input.scope.id}" exceeded MAX_REACTION_FIRE_COUNT (${MAX_REACTION_FIRE_COUNT}) and was disposed`
  );
}

export function normalizeActionArray(actions: unknown): ActionSchema | ActionSchema[] {
  return actions as ActionSchema | ActionSchema[];
}

export function createReactionOwnerId(scopeId: string, reactionId: string) {
  return `reaction:${scopeId}:${reactionId}`;
}

export function createRunHandle(args: {
  asyncGovernance?: AsyncGovernanceStore;
  scope: ScopeRef;
  id: string;
  force: boolean;
}): AsyncRunHandle | undefined {
  return args.asyncGovernance?.beginRun({
    ownerKind: 'reaction',
    ownerId: createReactionOwnerId(args.scope.id, args.id),
    scopeId: args.scope.id,
    cause: args.force ? 'immediate' : 'dependency-change'
  });
}

export function evaluateReactionWatchValue(args: {
  dynamicWatch: DynamicRuntimeValue<unknown> | undefined;
  compiledWatch: CompiledRuntimeValue<unknown> & { value?: unknown };
  runtime: RendererRuntime;
  scope: ScopeRef;
  watchState: RuntimeValueState<unknown> | undefined;
  explicitDependencies: ScopeDependencySet | undefined;
  dependencies: ScopeDependencySet | undefined;
}) {
  const value = args.dynamicWatch
    ? args.runtime.expressionCompiler.evaluateWithState(args.dynamicWatch, args.scope, args.runtime.env, args.watchState!).value
    : args.compiledWatch.value;

  const nextDependencies = args.explicitDependencies ?? collectRuntimeDependencies(args.watchState);
  return {
    value,
    dependencies: nextDependencies
  };
}

export function createExplicitDependencies(dependsOnSource: readonly string[] | undefined) {
  return createRootDependencySet(dependsOnSource);
}

export function reportReactionFireLimit(args: {
  runtime: RendererRuntime;
  id: string;
  scope: ScopeRef;
  fireCount: number;
}) {
  const error = createReactionLimitError({
    id: args.id,
    scope: args.scope,
    fireCount: args.fireCount
  });
  reportRuntimeHostIssue({
    env: args.runtime.env,
    level: 'warning',
    message: error.message,
    error,
    phase: 'action',
    details: {
      reason: 'reaction-fire-count-limit',
      reactionId: args.id,
      scopeId: args.scope.id,
      fireCount: args.fireCount,
      maxFireCount: MAX_REACTION_FIRE_COUNT
    }
  });
  return error;
}

export type OwnedReactionRegistration = {
  id: string;
  dispose(): void;
  getDebugEntry(): ReactionRegistryDebugSnapshot['reactions'][number];
};
