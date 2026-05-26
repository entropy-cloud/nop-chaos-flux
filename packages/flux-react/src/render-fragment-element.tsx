import React from 'react';
import type {
  NodeInstance,
  RenderNodeInput,
  RenderFragmentOptions,
} from '@nop-chaos/flux-core';
import { RenderNodes } from './render-nodes.js';

export function renderFragmentElement(
  renderInput: RenderNodeInput,
  options?: RenderFragmentOptions,
  ownerNodeInstance?: NodeInstance,
) {
  const inputNodeInstance =
    renderInput && typeof renderInput === 'object' && 'nodeInstance' in renderInput
      ? ((renderInput as { nodeInstance?: NodeInstance }).nodeInstance ?? undefined)
      : undefined;

  return React.createElement(RenderNodes, {
    input: renderInput,
    options: {
      ...options,
      ownerNodeInstance: options?.ownerNodeInstance ?? ownerNodeInstance ?? inputNodeInstance,
    },
  });
}
