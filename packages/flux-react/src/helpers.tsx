import type {
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
import { renderFragmentElement } from './render-fragment-element.js';
import {
  createNormalizedActionEvent,
  createRendererHelpers,
  EMPTY_SCOPE_DATA,
  mergeActionContext,
} from './renderer-helpers.js';

export { RenderNodes } from './render-nodes.js';
export { createNormalizedActionEvent, EMPTY_SCOPE_DATA, mergeActionContext };

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
  return createRendererHelpers(input, (renderInput: RenderNodeInput, options?: RenderFragmentOptions) => {
      return renderFragmentElement(renderInput, options, input.nodeInstance);
    });
}
