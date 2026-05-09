import React from 'react';
import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
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
import { RenderNodes } from './render-nodes.js';

function isFluxActionEventCandidate(
  value: unknown,
): value is import('@nop-chaos/flux-core').FluxActionEvent {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function normalizeActionEvent(event: unknown): ActionContext['event'] {
  if (!event) {
    return undefined;
  }

  if (isFluxActionEventCandidate(event)) {
    return event;
  }

  const candidate = event as {
    type?: unknown;
    nativeEvent?: unknown;
    currentTarget?: unknown;
    target?: unknown;
    preventDefault?: unknown;
    stopPropagation?: unknown;
  };

  if (typeof candidate.type !== 'string') {
    return undefined;
  }

  const nativeEvent =
    candidate.nativeEvent instanceof Event
      ? candidate.nativeEvent
      : event instanceof Event
        ? event
        : undefined;
  const currentTarget =
    candidate.currentTarget instanceof HTMLElement ? candidate.currentTarget : null;
  const target = candidate.target instanceof HTMLElement ? candidate.target : null;

  return {
    type: candidate.type,
    nativeEvent,
    currentTarget,
    target,
    preventDefault:
      typeof candidate.preventDefault === 'function'
        ? () => (candidate.preventDefault as () => void).call(event)
        : undefined,
    stopPropagation:
      typeof candidate.stopPropagation === 'function'
        ? () => (candidate.stopPropagation as () => void).call(event)
        : undefined,
  };
}

export { RenderNodes } from './render-nodes.js';

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

export const EMPTY_SCOPE_DATA: Record<string, any> = {};

export function createHelpers(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
  surfaceRuntime?: SurfaceRuntime;
  nodeInstance?: NodeInstance;
  dialogId?: string;
}): RendererHelpers {
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
    render(renderInput: RenderNodeInput, options?: RenderFragmentOptions) {
      return React.createElement(RenderNodes, {
        input: renderInput,
        options: {
          ...options,
          ownerNodeInstance: options?.ownerNodeInstance ?? input.nodeInstance,
        },
      });
    },
    evaluate(target, scope) {
      return input.runtime.evaluate(target, scope ?? input.scope);
    },
    evaluateCompiled(target, scope) {
      return input.runtime.evaluateCompiled(target, scope ?? input.scope);
    },
    createScope(patch, options) {
      return input.runtime.createChildScope(input.scope, patch, options);
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
