import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DialogSchema } from './schemas';
import { useSurfaceRenderer } from './use-surface-renderer';

export function DialogRenderer(props: RendererComponentProps<DialogSchema>) {
  useSurfaceRenderer(props, 'dialog');
  return null;
}
