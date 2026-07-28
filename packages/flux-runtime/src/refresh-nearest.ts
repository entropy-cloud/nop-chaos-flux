import type {
  ActionContext,
  ActionResult,
  ComponentHandle,
  ComponentHandleRegistryCore,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';

export type RefreshNearestTargetType = 'auto' | 'crud' | 'tree' | 'data-source';

export interface RefreshNearestArgs {
  targetType?: RefreshNearestTargetType;
  notFound?: 'silent' | 'error';
}

type FoundComponent = { kind: 'component'; handle: ComponentHandle; scope: ScopeRef };
type FoundSource = { kind: 'source'; name: string; scope: ScopeRef };
type FoundTarget = FoundComponent | FoundSource;

const COMPONENT_TYPES_BY_TARGET: Record<Exclude<RefreshNearestTargetType, 'auto' | 'data-source'>, string> = {
  crud: 'crud',
  tree: 'tree',
};

/**
 * Walk the scope.parent chain starting at `startScope`, asking each scope's
 * component registry and source registry for the first refreshable target.
 *
 * Component path: each registry along the chain is queried via
 * `findFirstInScope(scope, predicate)`; the registry tree itself is walked via
 * `registry.parent` to cover cases where the component's owning registry
 * differs from the caller's `ctx.componentRegistry` (e.g. nested surfaces).
 *
 * Source path: the runtime-level source registry is queried once per scope
 * (sources are runtime-global, not per component-registry).
 */
export async function findNearestRefreshable(input: {
  startScope: ScopeRef;
  componentRegistry?: ComponentHandleRegistryCore;
  runtime: RendererRuntime;
  targetType: RefreshNearestTargetType;
}): Promise<FoundTarget | null> {
  const { runtime, targetType } = input;
  const wantComponent = targetType === 'auto' || targetType === 'crud' || targetType === 'tree';
  const wantSource = targetType === 'auto' || targetType === 'data-source';
  const componentPredicate =
    targetType === 'auto'
      ? (handle: ComponentHandle) => handle.type === 'crud' || handle.type === 'tree'
      : targetType === 'crud' || targetType === 'tree'
        ? (handle: ComponentHandle) => handle.type === COMPONENT_TYPES_BY_TARGET[targetType]
        : null;

  let scope: ScopeRef | undefined = input.startScope;
  while (scope) {
    if (wantComponent && componentPredicate) {
      let registry: ComponentHandleRegistryCore | undefined = input.componentRegistry;
      while (registry) {
        if (registry.findFirstInScope) {
          const handle = registry.findFirstInScope(scope, componentPredicate);
          if (handle) {
            return { kind: 'component', handle, scope };
          }
        }
        registry = registry.parent;
      }
    }

    if (wantSource) {
      const entry = runtime.findFirstInScope(scope);
      if (entry) {
        return { kind: 'source', name: entry.name, scope: entry.scope };
      }
    }

    scope = scope.parent;
  }

  return null;
}

export async function refreshNearest(
  ctx: ActionContext,
  runtime: RendererRuntime,
  args: RefreshNearestArgs,
): Promise<ActionResult> {
  const targetType = args.targetType ?? 'auto';
  const notFound = args.notFound ?? 'silent';

  const target = await findNearestRefreshable({
    startScope: ctx.scope,
    componentRegistry: ctx.componentRegistry,
    runtime,
    targetType,
  });

  if (!target) {
    return notFound === 'error'
      ? { ok: false, error: new Error('refreshNearest found no refreshable target') }
      : { ok: true, data: { found: false } };
  }

  if (target.kind === 'component') {
    const result = await target.handle.capabilities.invoke('refresh', {}, {
      runtime: ctx.runtime,
      scope: target.scope,
      componentRegistry: ctx.componentRegistry,
      surfaceRuntime: ctx.surfaceRuntime,
      page: ctx.page,
      interactionId: ctx.interactionId,
      signal: ctx.signal,
    });
    return {
      ok: result.ok !== false && result.error === undefined,
      data: result.data,
      error: result.error,
    };
  }

  const refreshed = await runtime.refreshDataSource({
    name: target.name,
    scope: target.scope,
  });
  return {
    ok: refreshed,
    data: { found: true, kind: 'source', name: target.name, refreshed },
  };
}
