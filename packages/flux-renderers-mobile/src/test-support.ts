import type {
  RendererComponentProps,
  RendererEventHandler,
  RendererHelpers,
  RenderRegionHandle,
} from '@nop-chaos/flux-core';
import type { BaseSchema, TemplateNode } from '@nop-chaos/flux-core';

export interface MockRendererPropsOptions<S extends BaseSchema = BaseSchema> {
  schema?: Partial<S>;
  props?: Record<string, unknown>;
  regions?: Record<string, React.ReactNode>;
  events?: Record<string, RendererEventHandler | undefined>;
  meta?: Partial<RendererComponentProps['meta']>;
  helpers?: Partial<RendererHelpers>;
}

export function createMockRendererProps<S extends BaseSchema = BaseSchema>(
  options: MockRendererPropsOptions<S> = {},
): RendererComponentProps<S> {
  const regions: Record<string, RenderRegionHandle<React.ReactNode>> = {};
  if (options.regions) {
    for (const [key, value] of Object.entries(options.regions)) {
      regions[key] = {
        key,
        templateNode: null as TemplateNode | readonly TemplateNode[] | null,
        render: () => value as React.ReactNode,
      };
    }
  }
  return {
    id: 'mock-node',
    path: 'mock.path',
    schema: { type: 'mock' as unknown as S['type'], ...(options.schema ?? {}) } as S,
    templateNode: {} as RendererComponentProps<S>['templateNode'],
    node: {} as RendererComponentProps<S>['node'],
    props: (options.props ?? {}) as RendererComponentProps<S>['props'],
    meta: {
      ...(options.meta ?? {}),
    } as RendererComponentProps<S>['meta'],
    regions,
    events: (options.events ?? {}) as RendererComponentProps<S>['events'],
    helpers: (options.helpers ?? {}) as RendererHelpers,
    reactions: {},
  };
}
