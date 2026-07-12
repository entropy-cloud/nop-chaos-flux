import { createReadonlyScopeBinding } from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { CrudSchema } from './crud-schema.js';
import type { TableSchema } from './schemas.js';

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

/**
 * AUDIT-03: the single, documented cast seam for CRUD→Table renderer delegation.
 *
 * The CRUD composes a `TableRenderer` from a CRUD-derived `tableSchema` plus the
 * CRUD's own `regions` / `events` / `helpers` / `node` / `templateNode`. These are
 * structurally compatible — the table only reads the region keys, event names, and
 * helpers it declares — but they are typed under different schema generics
 * (`CrudSchema` vs `TableSchema`), so a cast is unavoidable. Centralizing it here
 * keeps the unsafe surface to one audited location instead of scattered
 * `as unknown as` at each field. Only the genuinely cross-generic fields are cast;
 * `props`/`meta`/`helpers`/`schema` are assigned without any cast.
 */
export function delegateTableRendererProps(
  source: RendererComponentProps<CrudSchema>,
  tableSchema: TableSchema,
  tableResolvedProps: RendererComponentProps<TableSchema>['props'],
  crudScope: ReturnType<typeof createReadonlyScopeBinding>,
): RendererComponentProps<TableSchema> {
  return {
    id: `${source.id}-table`,
    path: `${source.path}.table`,
    schema: tableSchema,
    templateNode:
      source.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
    node: {
      ...source.node,
      scope: crudScope,
    } as unknown as RendererComponentProps<TableSchema>['node'],
    props: tableResolvedProps,
    meta: {
      ...source.meta,
      cid: undefined,
      className: undefined,
      testid: undefined,
    },
    regions: source.regions as RendererComponentProps<TableSchema>['regions'],
    events: source.events as RendererComponentProps<TableSchema>['events'],
    reactions: source.reactions as RendererComponentProps<TableSchema>['reactions'],
    helpers: source.helpers,
  };
}

export function resolveCrudSlotContent(
  slotKey: string,
  props: RendererComponentProps<CrudSchema>,
  crudScope: ReturnType<typeof createReadonlyScopeBinding>,
  options?: { metaKey?: string; fallback?: React.ReactNode },
) {
  const regionContent = props.regions[slotKey]?.render({ scope: crudScope });
  if (regionContent !== undefined && regionContent !== null) {
    return regionContent;
  }

  const propValue = (props.props as Record<string, unknown>)[slotKey] as
    | React.ReactNode
    | undefined;
  if (propValue !== undefined && propValue !== null) {
    return propValue;
  }

  if (options?.metaKey) {
    const metaValue = (props.meta as unknown as Record<string, unknown>)[options.metaKey] as
      | React.ReactNode
      | undefined;
    if (metaValue !== undefined && metaValue !== null) {
      return metaValue;
    }
  }

  return options?.fallback;
}
