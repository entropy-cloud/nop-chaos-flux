import React from 'react';
import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
  FormRuntime,
  NodeInstance,
  PageRuntime,
  RendererHelpers,
  RendererRuntime,
  RenderNodeInput,
  RenderFragmentOptions,
  NodeLocator,
  ScopeRef
} from '@nop-chaos/flux-core';
import { RenderNodes } from './render-nodes';

export { RenderNodes } from './render-nodes';

export function mergeActionContext(base: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
  nodeInstance?: NodeInstance;
  locator?: NodeLocator;
}, partial?: Partial<ActionContext>): ActionContext {
  return {
    runtime: base.runtime,
    scope: partial?.scope ?? base.scope,
    actionScope: partial?.actionScope ?? base.actionScope,
    componentRegistry: partial?.componentRegistry ?? base.componentRegistry,
    node: partial?.node ?? base.node,
    nodeInstance: partial?.nodeInstance ?? base.nodeInstance,
    locator: partial?.locator ?? base.locator,
    form: partial?.form ?? base.form,
    page: partial?.page ?? base.page,
    event: partial?.event,
    dialogId: partial?.dialogId,
    prevResult: partial?.prevResult
  };
}

export const EMPTY_SCOPE_DATA: Record<string, any> = {};

export function createHelpers(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
  nodeInstance?: NodeInstance;
  locator?: NodeLocator;
}): RendererHelpers {
  const dispatch = (action: any, ctx?: Partial<ActionContext>) => input.runtime.dispatch(action, mergeActionContext(input, ctx));
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__actionScope = input.actionScope;
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__componentRegistry = input.componentRegistry;

  return {
    render(renderInput: RenderNodeInput, options?: RenderFragmentOptions) {
      return React.createElement(RenderNodes, {
        input: renderInput,
        options: {
          ...options,
          ownerNode: options?.ownerNode ?? input.node,
          ownerNodeInstance: options?.ownerNodeInstance ?? input.nodeInstance
        }
      });
    },
    evaluate(target, scope) {
      return input.runtime.evaluate(target, scope ?? input.scope);
    },
    createScope(patch, options) {
      return input.runtime.createChildScope(input.scope, patch, options);
    },
    dispatch,
    executeSource(source, options) {
      return input.runtime.executeSource({
        source,
        scope: options?.scope ?? input.scope,
        ctx: mergeActionContext(input)
      });
    }
  };
}
