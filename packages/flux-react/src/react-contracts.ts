import type { ReactElement } from 'react';
import type {
  BaseSchema,
  RenderRegionHandle as CoreRenderRegionHandle,
  RendererDefinition as CoreRendererDefinition,
  RendererHelpers as CoreRendererHelpers,
  SchemaRendererProps,
  StructuralLoopRenderContext as CoreStructuralLoopRenderContext,
} from '@nop-chaos/flux-core';

export type RendererHelpers = CoreRendererHelpers;
export type RenderRegionHandle = CoreRenderRegionHandle;
export type StructuralLoopRenderContext = CoreStructuralLoopRenderContext;
export interface RendererDefinition<S extends BaseSchema = BaseSchema>
  extends CoreRendererDefinition<S> {
  reactComponent?: (props: Record<string, unknown>) => ReactElement | null;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
