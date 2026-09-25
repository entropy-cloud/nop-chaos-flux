import { useMemo } from 'react';
import type { ActionSchema, RendererHelpers, ScopeRef, SchemaValue } from '@nop-chaos/flux-core';
import { filterLocalOptions, mergeNodesById, type OrgNode } from './org-data-protocol.js';
import { useOrgChildren, useOrgEcho, useOrgSearch } from './use-org-source.js';

/**
 * Composite data surface for org-family renderers (protocol §9: the single
 * shared implementation — user-select / department-select / region must all
 * consume this, not fork their own). The echo pool is derived at render time
 * from every node source; resolve results come back from `useOrgEcho`.
 */
export function useOrgData(input: {
  helpers: RendererHelpers;
  scope?: ScopeRef;
  options?: OrgNode[];
  sourceChildren?: ActionSchema;
  sourceSearch?: ActionSchema;
  sourceResolve?: ActionSchema;
  pageSize?: number;
  extraParams?: Record<string, SchemaValue>;
  searchMergeMode?: 'append' | 'replace';
  panelOpen: boolean;
  /** Current field value (single or array) driving echo resolution. */
  selectedValues?: unknown;
}): {
  children: ReturnType<typeof useOrgChildren>;
  search: ReturnType<typeof useOrgSearch>;
  echoPool: OrgNode[];
  /** Merged local+remote results for the current query (§7 searchMergeMode). */
  searchResults: OrgNode[] | null;
  labelsFor: (values: unknown) => Record<string, string>;
} {
  const {
    helpers,
    scope,
    options,
    sourceChildren,
    sourceSearch,
    sourceResolve,
    pageSize,
    extraParams,
    searchMergeMode = 'append',
    panelOpen,
    selectedValues,
  } = input;
  const staticOptions = useMemo(() => options ?? [], [options]);
  const children = useOrgChildren({
    helpers,
    scope,
    sourceChildren,
    pageSize,
    extraParams,
    enabled: panelOpen,
    hasStaticRoot: staticOptions.length > 0,
  });
  const search = useOrgSearch({
    helpers,
    scope,
    sourceSearch,
    pageSize,
    extraParams,
    enabled: panelOpen,
  });

  const selectedEchoValues = useMemo(() => {
    const list = Array.isArray(selectedValues)
      ? selectedValues
      : selectedValues == null
        ? []
        : [selectedValues];
    return list.map((value) => String(value)).filter((value) => value !== '');
  }, [selectedValues]);

  const loadedNodes = useMemo(() => {
    const all: OrgNode[] = [...staticOptions, ...children.rootState.nodes];
    for (const state of Object.values(children.nodeStates)) {
      all.push(...state.nodes);
    }
    if (search.remoteNodes) {
      all.push(...search.remoteNodes);
    }
    return all;
  }, [children.nodeStates, children.rootState.nodes, search.remoteNodes, staticOptions]);

  // Pre-resolve pass feeds resolved nodes into the pool below; the first
  // pass computes `missing` from everything except resolve output.
  const bootstrapPool = useMemo(
    () => mergeNodesById([], loadedNodes),
    [loadedNodes],
  );
  const resolvedNodes = useOrgEcho({
    helpers,
    scope,
    sourceResolve,
    extraParams,
    values: selectedEchoValues,
    echoPool: bootstrapPool,
    enabled: true,
  });
  const echoPool = useMemo(
    () => mergeNodesById(bootstrapPool, resolvedNodes),
    [bootstrapPool, resolvedNodes],
  );

  const trimmed = search.query.trim();
  const searchResults = (() => {
    if (!trimmed) {
      return null;
    }
    const localMatches = filterLocalOptions(staticOptions, trimmed);
    if (!sourceSearch) {
      return localMatches;
    }
    if (search.remoteNodes == null) {
      return searchMergeMode === 'append' ? localMatches : null;
    }
    if (search.status === 'error') {
      return [];
    }
    if (searchMergeMode === 'replace') {
      return search.remoteNodes;
    }
    return mergeNodesById(localMatches, search.remoteNodes);
  })();

  const labelsFor = (values: unknown) => {
    const list = Array.isArray(values) ? values : values == null ? [] : [values];
    const byId = new Map(echoPool.map((node) => [node.id, node.name]));
    const labels: Record<string, string> = {};
    for (const value of list) {
      const key = String(value);
      labels[key] = byId.get(key) ?? key;
    }
    return labels;
  };

  return { children, search, echoPool, searchResults, labelsFor };
}

export type OrgDataState = ReturnType<typeof useOrgData>;
