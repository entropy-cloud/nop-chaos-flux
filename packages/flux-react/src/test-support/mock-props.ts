// Plan 863 T3: default helpers are `strictRendererHelpers` (access throws an
// explanatory error). `stubRendererHelpers` is IDENTITY-SEMANTIC and opt-in
// only: evaluate/evaluateCompiled return the raw template expression
// unchanged — use it only when a test genuinely wants pass-through values.
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
  node?: Partial<RendererComponentProps['node']>;
  helpers?: Partial<RendererHelpers>;
  id?: string;
  path?: string;
  templateNode?: RendererComponentProps<S>['templateNode'];
  reactions?: RendererComponentProps<S>['reactions'];
}

export const MOCK_NODE_ID = 'mock-node';
export const MOCK_NODE_PATH = 'mock.path';
export const MOCK_SCOPE_ID = 'mock-scope';

function throwMissingHelpers(member: string): never {
  throw new Error(
    `createMockRendererProps: helpers.${member} was accessed but no helpers were provided. ` +
      'Pass explicit implementations via the `helpers` option, or opt in to the identity stub ' +
      'with `helpers: stubRendererHelpers` (identity semantics: evaluate/evaluateCompiled ' +
      'return the raw template expression unchanged).',
  );
}

/**
 * Default helpers for createMockRendererProps: every member throws an
 * explanatory error on access so tests that rely on helpers fail loudly
 * instead of silently doing nothing (plan 863 T3).
 */
export const strictRendererHelpers = {
  render: () => throwMissingHelpers('render'),
  evaluate: () => throwMissingHelpers('evaluate'),
  evaluateCompiled: () => throwMissingHelpers('evaluateCompiled'),
  createScope: () => throwMissingHelpers('createScope'),
  disposeScope: () => throwMissingHelpers('disposeScope'),
  dispatch: () => throwMissingHelpers('dispatch'),
  executeSource: () => throwMissingHelpers('executeSource'),
} as unknown as RendererHelpers;

/**
 * IDENTITY semantics (explicit opt-in only): evaluate/evaluateCompiled return
 * the raw template expression unchanged, render renders nothing, dispatch
 * always succeeds. Tests that need expression evaluation must provide real
 * implementations instead of relying on this stub.
 */
export const stubRendererHelpers = {
  render: () => null,
  evaluate: <T,>(v: unknown): T => v as T,
  evaluateCompiled: <T,>(v: unknown): T => v as T,
  createScope: () => ({ id: MOCK_SCOPE_ID, path: MOCK_NODE_PATH }),
  disposeScope: () => undefined,
  dispatch: async () => ({ success: true }) as never,
  executeSource: async () => ({ success: true }) as never,
} as unknown as RendererHelpers;

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
    id: options.id ?? MOCK_NODE_ID,
    path: options.path ?? MOCK_NODE_PATH,
    schema: { type: 'mock' as unknown as S['type'], ...(options.schema ?? {}) } as S,
    templateNode:
      options.templateNode ?? ({} as RendererComponentProps<S>['templateNode']),
    node: {
      scope: {
        id: MOCK_SCOPE_ID,
        path: MOCK_NODE_PATH,
        value: {},
      } as RendererComponentProps<S>['node']['scope'],
      ...(options.node ?? {}),
    } as RendererComponentProps<S>['node'],
    props: (options.props ?? {}) as RendererComponentProps<S>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      ...(options.meta ?? {}),
    } as RendererComponentProps<S>['meta'],
    regions,
    events: (options.events ?? {}) as RendererComponentProps<S>['events'],
    helpers: (options.helpers ?? strictRendererHelpers) as RendererHelpers,
    reactions: options.reactions ?? {},
  };
}
