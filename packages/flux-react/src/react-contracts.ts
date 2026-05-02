import type { ReactElement } from 'react';
import type {
  BaseSchema,
  RenderRegionHandle as CoreRenderRegionHandle,
  RendererDefinition as CoreRendererDefinition,
  RendererHelpers as CoreRendererHelpers,
  RendererResolvedProps,
  SchemaRendererProps,
  StructuralLoopRenderContext as CoreStructuralLoopRenderContext,
} from '@nop-chaos/flux-core';

export type RendererHelpers = CoreRendererHelpers;
export type RenderOutput = ReactElement | null;
export type RenderRegionHandle = CoreRenderRegionHandle<RenderOutput>;
export type StructuralLoopRenderContext = CoreStructuralLoopRenderContext;
export interface RendererDefinition<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
> extends CoreRendererDefinition<S, P> {
  reactComponent?: (props: Readonly<P>) => ReactElement | null;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
