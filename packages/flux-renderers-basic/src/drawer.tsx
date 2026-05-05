import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DrawerSchema } from './schemas';
import { useSurfaceRenderer } from './use-surface-renderer';

export function DrawerRenderer(props: RendererComponentProps<DrawerSchema>) {
  useSurfaceRenderer(props, 'drawer');
  return null;
}
