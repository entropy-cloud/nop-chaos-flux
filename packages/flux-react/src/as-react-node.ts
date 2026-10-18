import type { ReactNode } from 'react';
import type { RendererRenderOutput } from '@nop-chaos/flux-core';

/**
 * The single sanctioned cast seam for renderer render outputs.
 *
 * `RendererRenderOutput` is typed `unknown` by contract (renderer outputs are
 * dynamically shaped), which used to push every renderer package into writing
 * its own local `value as React.ReactNode` shim — 30 drifting copies across 13
 * packages (FM-018). Renderers must import this helper instead; the unsound
 * cast lives in exactly one auditable place. Returns the value unchanged at
 * runtime.
 */
export function asReactNode(output: RendererRenderOutput): ReactNode {
  return output as ReactNode;
}
