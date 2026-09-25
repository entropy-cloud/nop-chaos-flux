import type { ActionSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';
import type { InputSchema } from './schemas.js';

/**
 * Missing-components L2.1 (plan 505): user-select / department-select.
 * Data-plane types mirror `docs/architecture/org-data-source-protocol.md`
 * (plan 504) — the org family's single data contract; the shared consumer
 * implementation lives in `renderers/org/` (whose normalized runtime type
 * is stricter: unknown fields collapse into `extra` during parsing).
 */
export interface OrgNode {
  [key: string]: SchemaValue;
  id: string;
  name: string;
  type?: string;
  disabled?: boolean;
  disabledTip?: string;
  /** `true` = leaf: no children request is dispatched on expand. */
  leaf?: boolean;
  /** Inline children count as already-loaded; absent = unknown (lazy). */
  children?: OrgNode[];
  /** Provider passthrough (avatar, title, pinyin, adPath, ...). */
  extra?: SchemaObject;
}

export interface OrgNodePage {
  nodes: OrgNode[];
  total?: number;
  hasMore?: boolean;
}

export interface OrgSelectSchema extends InputSchema {
  /** Static inline nodes (normalizer §3.1 tolerant parsing applies). */
  options?: OrgNode[];
  /** Lazy-load one level of children. Root load injects `orgNodeId: ''`. */
  sourceChildren?: ActionSchema;
  /** Flat keyword search; injects `searchQuery` (300ms debounce). */
  sourceSearch?: ActionSchema;
  /** Echo resolution for unseen selected values; injects `orgValues`. */
  sourceResolve?: ActionSchema;
  multiple?: boolean;
  searchable?: boolean;
  /** `append` (default) merges remote results after local matches; `replace` shows remote only. */
  searchMergeMode?: 'append' | 'replace';
  /**
   * Selectable node types (§3 mixed-tree rule): non-matching nodes stay
   * visible/navigable but cannot be selected; untyped nodes are generic
   * and selectable. Defaults per renderer (user-select `['user']`,
   * department-select `['department']`).
   */
  selectableTypes?: string[];
  /** Page size injected as `orgPageSize` (default 50). */
  pageSize?: number;
  /** Strings are expressions evaluated in the form scope at dispatch time. */
  extraParams?: Record<string, SchemaValue>;
}

export interface UserSelectSchema extends OrgSelectSchema {
  type: 'user-select';
}

export interface DepartmentSelectSchema extends OrgSelectSchema {
  type: 'department-select';
}

/**
 * Region cascade picker (missing-components L2.2, plan 506). Narrowed org
 * family contract: cascade browsing only — no search, no multi-select
 * (v1 Non-Goals). All levels selectable by default (protocol §3: region
 * defaults to every level selectable); `selectableTypes` may narrow.
 */
export interface InputCitySchema
  extends Omit<OrgSelectSchema, 'sourceSearch' | 'multiple' | 'searchable' | 'searchMergeMode'> {
  type: 'input-city';
}
