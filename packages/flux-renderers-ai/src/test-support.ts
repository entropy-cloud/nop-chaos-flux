import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { BaseSchema } from '@nop-chaos/flux-core';

/**
 * Build a minimal `RendererComponentProps` stub for unit-testing a renderer in
 * isolation (no full runtime). Only the channels the renderer actually reads
 * need to be provided.
 */
export function createMockRendererProps<S extends BaseSchema = BaseSchema>(
  partial: Partial<RendererComponentProps<S>> & { schema: S },
): RendererComponentProps<S> {
  const regions = partial.regions ?? {};
  const events = partial.events ?? {};
  return {
    id: partial.id ?? 'test-node',
    path: partial.path ?? 'test',
    schema: partial.schema,
    templateNode: partial.templateNode ?? ({} as RendererComponentProps<S>['templateNode']),
    node: partial.node ?? ({} as RendererComponentProps<S>['node']),
    props: partial.props ?? ({ type: partial.schema.type } as RendererComponentProps<S>['props']),
    meta: partial.meta ??
      ({
        visible: true,
        disabled: false,
        className: '',
        testid: undefined,
        cid: undefined,
      } as RendererComponentProps<S>['meta']),
    regions,
    events,
    reactions: partial.reactions ?? {},
    helpers: partial.helpers ??
      ({
        render: () => null,
        evaluate: <T,>(v: unknown): T => v as T,
        evaluateCompiled: <T,>(v: unknown): T => v as T,
        createScope: () => ({ id: 'mock', path: 'mock' }),
        disposeScope: () => undefined,
        dispatch: async () => ({ success: true }) as never,
        executeSource: async () => ({ success: true }) as never,
      } as unknown as RendererComponentProps<S>['helpers']),
  };
}
