import type { BaseSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  createMockRendererProps as createSharedMockRendererProps,
  strictRendererHelpers,
} from '@nop-chaos/flux-react/test-support';

/**
 * Plan 594 (CX-15) R1 裁定 C：adapter shim delegating to the shared options-form
 * core while preserving this package's flat call signature (`schema` required,
 * `id`/`path`/`props`/`helpers` defaults). Status: PERMANENT ai-harness
 * contract — ai test files (WA-ai-006 family) keep the flat shape; there is no
 * retirement follow-up. Seed deltas vs the pre-594 local helper are the
 * declared test-semantics corrections: meta now also seeds hidden/changed
 * (honest four-required), node now seeds the shared mock scope map; the
 * ai-specific meta extras (className/testid/cid) stay layered here.
 */
export function createMockRendererProps<S extends BaseSchema = BaseSchema>(
  partial: Partial<RendererComponentProps<S>> & { schema: S },
): RendererComponentProps<S> {
  const props = createSharedMockRendererProps<S>({
    id: partial.id ?? 'test-node',
    path: partial.path ?? 'test',
    schema: partial.schema,
    templateNode: partial.templateNode,
    node: partial.node,
    props: partial.props ?? ({ type: partial.schema.type } as RendererComponentProps<S>['props']),
    meta: { className: '', testid: undefined, cid: undefined, ...partial.meta },
    events: partial.events,
    helpers: partial.helpers ?? strictRendererHelpers,
    reactions: partial.reactions,
  });
  return { ...props, ...(partial.regions ? { regions: partial.regions } : {}) };
}
