import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DialogSchema } from './schemas.js';
import { useSurfaceRenderer } from './use-surface-renderer.js';

export function DialogRenderer(props: RendererComponentProps<DialogSchema>) {
  useSurfaceRenderer(props, 'dialog');
  return null;
}
