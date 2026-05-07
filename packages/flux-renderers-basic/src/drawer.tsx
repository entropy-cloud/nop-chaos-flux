import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DrawerSchema } from './schemas.js';
import { useSurfaceRenderer } from './use-surface-renderer.js';

export function DrawerRenderer(props: RendererComponentProps<DrawerSchema>) {
  useSurfaceRenderer(props, 'drawer');
  return null;
}
