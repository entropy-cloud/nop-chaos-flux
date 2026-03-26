import React from 'react';
import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
  FormRuntime,
  PageRuntime,
  RendererHelpers,
  RendererRuntime,
  RenderNodeInput,
  RenderFragmentOptions,
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
}, partial?: Partial<ActionContext>): ActionContext {
  return {
    runtime: base.runtime,
    scope: partial?.scope ?? base.scope,
    actionScope: partial?.actionScope ?? base.actionScope,
    componentRegistry: partial?.componentRegistry ?? base.componentRegistry,
    node: partial?.node ?? base.node,
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
}): RendererHelpers {
  const dispatch = (action: any, ctx?: Partial<ActionContext>) => input.runtime.dispatch(action, mergeActionContext(input, ctx));
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__actionScope = input.actionScope;
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__componentRegistry = input.componentRegistry;

  return {
    render(renderInput: RenderNodeInput, options?: RenderFragmentOptions) {
      return React.createElement(RenderNodes, { input: renderInput, options });
    },
    evaluate(target, scope) {
      return input.runtime.evaluate(target, scope ?? input.scope);
    },
    createScope(patch, options) {
      return input.runtime.createChildScope(input.scope, patch, options);
    },
    dispatch
  };
}
