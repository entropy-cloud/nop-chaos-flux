import type {
  ActionContext,
  ActionScope,
  CompiledActionNode,
  CompiledActionProgram,
  ComponentHandleRegistry,
  FluxActionEvent,
  FormRuntime,
  NodeInstance,
  PageRuntime,
  SurfaceRuntime,
  RendererHelpers,
  RendererRuntime,
  RenderNodeInput,
  RenderFragmentOptions,
  ScopeRef,
} from '@nop-chaos/flux-core';

function isFluxActionEventCandidate(
  value: unknown,
): value is import('@nop-chaos/flux-core').FluxActionEvent {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Normalize a raw renderer-emitted event into the structured `FluxActionEvent`
 * shape exposed on `ActionContext.event`.
 *
 * Resolution order:
 * 1. `null`/`undefined`/primitives → `undefined` (cannot be normalized).
 * 2. Objects that already carry a string `type` — DOM `Event` instances, React
 *    synthetic events, and `FluxActionEvent` payloads — are returned **as-is**
 *    so the original event identity (and any `preventDefault`/`stopPropagation`
 *    wiring) is preserved.
 * 3. Custom renderer-emitted payloads that lack a string `type` (e.g.
 *    `{ id, conversation }`, `{ reason }`, `{ item, index }`) are **preserved**
 *    so schema expressions like `${event.id}` resolve to the real payload value;
 *    `type` is synthesized as `'custom'` to honor the `FluxActionEvent` string
 *    `type` contract. A meaningful renderer-supplied `type` remains recommended
 *    for self-describing payloads. See `docs/architecture/renderer-runtime.md`
 *    "Event Passthrough Contract".
 */
function normalizeActionEvent(event: unknown): ActionContext['event'] {
  if (event === null || event === undefined) {
    return undefined;
  }

  if (typeof event !== 'object') {
    return undefined;
  }

  if (isFluxActionEventCandidate(event)) {
    return event;
  }

  return { ...(event as Record<string, unknown>), type: 'custom' };
}

export function mergeActionContext(
  base: {
    runtime: RendererRuntime;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
    surfaceRuntime?: SurfaceRuntime;
    nodeInstance?: NodeInstance;
    dialogId?: string;
  },
  partial?: Partial<ActionContext>,
): ActionContext {
  const rawEvent = partial?.event as unknown;

  return {
    runtime: base.runtime,
    scope: partial?.scope ?? base.scope,
    signal: partial?.signal,
    actionScope: partial?.actionScope ?? base.actionScope,
    componentRegistry: partial?.componentRegistry ?? base.componentRegistry,
    nodeInstance: partial?.nodeInstance ?? base.nodeInstance,
    instancePath:
      partial?.instancePath ?? (partial?.nodeInstance ?? base.nodeInstance)?.instancePath,
    form: partial?.form ?? base.form,
    page: partial?.page ?? base.page,
    surfaceRuntime: partial?.surfaceRuntime ?? base.surfaceRuntime,
    event: normalizeActionEvent(rawEvent),
    dialogId: partial?.dialogId ?? base.dialogId,
    prevResult: partial?.prevResult,
    evaluationBindings: partial?.evaluationBindings,
  };
}

export function createNormalizedActionEvent(event: unknown): ActionContext['event'] {
  return normalizeActionEvent(event);
}

function evaluatePreventionField(
  compiled: CompiledActionNode['preventDefault'],
  scope: ScopeRef,
  evaluateCompiled: RendererHelpers['evaluateCompiled'],
  fieldLabel: string,
  eventBinding: FluxActionEvent | undefined,
): boolean {
  if (compiled === undefined) {
    return false;
  }

  const evalScope = eventBinding ? withEventBinding(scope, eventBinding) : scope;

  try {
    return Boolean(evaluateCompiled<boolean>(compiled, evalScope));
  // Errors routed through dispatch error handling — render helper side-effect
  } catch (error) {
    console.error(
      `[flux] ${fieldLabel} expression evaluation failed; falling back to falsy.`,
      error,
    );
    return false;
  }
}

function withEventBinding(scope: ScopeRef, event: FluxActionEvent): ScopeRef {
  const visibleView = () => {
    const base = scope.readVisible();
    return Object.assign(Object.create(base) as Record<string, unknown>, { event });
  };

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return scope.value;
    },
    get(path) {
      return path === 'event' ? event : scope.get(path);
    },
    has(path) {
      return path === 'event' ? true : scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    readVisible: visibleView as () => Record<string, any>,
    materializeVisible: visibleView as () => Record<string, any>,
    update(path, value) {
      scope.update(path, value);
    },
    merge(data) {
      scope.merge(data);
    },
  };
}

function hasPreventionRequest(program: CompiledActionProgram): boolean {
  return program.nodes.some(
    (node) => node.preventDefault !== undefined || node.stopPropagation !== undefined,
  );
}

function invokeEventMethod(
  event: { preventDefault?: () => void; stopPropagation?: () => void } | undefined,
  method: 'preventDefault' | 'stopPropagation',
): boolean {
  if (!event) {
    return false;
  }

  const fn = event[method];
  if (typeof fn !== 'function') {
    return false;
  }

  try {
    fn.call(event);
    return true;
  // Errors routed through dispatch error handling — render helper side-effect
  } catch {
    return false;
  }
}

/**
 * Apply schema-declared preventDefault / stopPropagation synchronously, before
 * the action body is dispatched. See `docs/architecture/renderer-runtime.md`
 * "Schema-Driven Prevention" for the timing contract.
 *
 * Returns the normalized event so the caller can pass it through to dispatch.
 */
export function applySchemaDrivenPrevention(args: {
  program: CompiledActionProgram;
  normalizedEvent: FluxActionEvent | undefined;
  scope: ScopeRef;
  evaluateCompiled: RendererHelpers['evaluateCompiled'];
}): FluxActionEvent | undefined {
  const { program, normalizedEvent, scope, evaluateCompiled } = args;

  if (!hasPreventionRequest(program)) {
    return normalizedEvent;
  }

  if (!normalizedEvent) {
    console.warn(
      '[flux] preventDefault/stopPropagation requested but no native event is available in this context.',
    );
    return normalizedEvent;
  }

  let didPrevent = false;
  let didStop = false;

  for (const node of program.nodes) {
    if (!didPrevent && evaluatePreventionField(node.preventDefault, scope, evaluateCompiled, 'preventDefault', normalizedEvent)) {
      didPrevent = invokeEventMethod(normalizedEvent, 'preventDefault');
    }
    if (
      !didStop &&
      evaluatePreventionField(node.stopPropagation, scope, evaluateCompiled, 'stopPropagation', normalizedEvent)
    ) {
      didStop = invokeEventMethod(normalizedEvent, 'stopPropagation');
    }

    if (didPrevent && didStop) {
      break;
    }
  }

  return normalizedEvent;
}

export const EMPTY_SCOPE_DATA: Record<string, any> = {};

export function createRendererHelpers(
  input: {
    runtime: RendererRuntime;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
    surfaceRuntime?: SurfaceRuntime;
    nodeInstance?: NodeInstance;
    dialogId?: string;
  },
  render: (renderInput: RenderNodeInput, options?: RenderFragmentOptions) => React.ReactNode,
): RendererHelpers {
  const dispatch = (action: any, ctx?: Partial<ActionContext>) =>
    input.runtime.dispatch(action, mergeActionContext(input, ctx));
  (
    dispatch as typeof dispatch & {
      __actionScope?: ActionScope;
      __componentRegistry?: ComponentHandleRegistry;
    }
  ).__actionScope = input.actionScope;
  (
    dispatch as typeof dispatch & {
      __actionScope?: ActionScope;
      __componentRegistry?: ComponentHandleRegistry;
    }
  ).__componentRegistry = input.componentRegistry;

  return {
    render,
    evaluate(target, scope) {
      return input.runtime.evaluate(target, scope ?? input.scope);
    },
    evaluateCompiled(target, scope) {
      return input.runtime.evaluateCompiled(target, scope ?? input.scope);
    },
    createScope(patch, options) {
      return input.runtime.createChildScope(input.scope, patch, options);
    },
    disposeScope(scopeId) {
      input.runtime.disposeScope(scopeId);
    },
    dispatch,
    executeSource(source, options) {
      return input.runtime.executeSource({
        source,
        scope: options?.scope ?? input.scope,
        ctx: mergeActionContext(input),
      });
    },
  };
}
