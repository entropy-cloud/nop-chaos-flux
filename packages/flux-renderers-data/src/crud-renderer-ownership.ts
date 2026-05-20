import { startTransition, useCallback, useMemo, useRef } from 'react';
import { getIn, toRecord, type RendererEventHandler, type ScopeRef } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { CrudSchema } from './crud-schema.js';
import type { CrudPaginationState, CrudQueryState } from './crud-renderer-state.js';
import { areStringArraysEqual } from './table-renderer/column-settings-state.js';

interface CrudQueryFormHandle {
  capabilities?: {
    hasMethod?(method: string): boolean;
    invoke(method: string, args?: unknown, ctx?: unknown): unknown;
  };
}

interface CrudComponentRegistryLike {
  resolve(args: { componentId: string }): CrudQueryFormHandle | undefined;
}

function createCrudQueryEventPayload(args: {
  type: 'crud:query-submit' | 'crud:query-reset';
  query: Record<string, unknown>;
  page: number;
  pageSize: number;
}) {
  return {
    type: args.type,
    query: args.query,
    pagination: {
      currentPage: args.page,
      pageSize: args.pageSize,
    },
    page: args.page,
    pageSize: args.pageSize,
  };
}

export interface CrudOwnerPaths {
  ownerStatePath: string;
  queryStatePath: string;
  paginationStatePath: string;
  sortStatePath: string;
  filterStatePath: string;
  selectionStatePath: string;
  toggledColumnsStatePath?: string;
  orderedColumnsStatePath?: string;
}

export function createCrudOwnerPaths(args: {
  id: string | number | undefined;
  cid: string | number | undefined;
  schema: CrudSchema;
}): CrudOwnerPaths {
  const { id, cid, schema } = args;
  const ownerStatePath = `$_crud.${String(id ?? cid ?? 'crud')}`;
  return {
    ownerStatePath,
    queryStatePath: `${ownerStatePath}.query`,
    paginationStatePath: schema.paginationStatePath ?? `${ownerStatePath}.pagination`,
    sortStatePath: schema.sortStatePath ?? `${ownerStatePath}.sort`,
    filterStatePath: schema.filterStatePath ?? `${ownerStatePath}.filters`,
    selectionStatePath: schema.selectionStatePath ?? `${ownerStatePath}.selection`,
    toggledColumnsStatePath: schema.columnSettings?.toggledColumnsStatePath,
    orderedColumnsStatePath: schema.columnSettings?.orderedColumnsStatePath,
  };
}

export function useCrudVisibleColumnNames(args: {
  schema: CrudSchema;
  defaultColumnNames: string[];
  toggledColumnsStatePath?: string;
  orderedColumnsStatePath?: string;
}) {
  const { schema, defaultColumnNames, toggledColumnsStatePath, orderedColumnsStatePath } = args;

  const state = useScopeSelector(
    (scopeData) => {
      const toggledColumns = toggledColumnsStatePath
        ? getIn(scopeData, toggledColumnsStatePath)
        : undefined;
      const orderedColumns = orderedColumnsStatePath
        ? getIn(scopeData, orderedColumnsStatePath)
        : undefined;
      return {
        toggledColumns: Array.isArray(toggledColumns)
          ? toggledColumns.filter((value): value is string => typeof value === 'string')
          : undefined,
        orderedColumns: Array.isArray(orderedColumns)
          ? orderedColumns.filter((value): value is string => typeof value === 'string')
          : undefined,
      };
    },
    (a, b) =>
      areStringArraysEqual(a?.toggledColumns, b?.toggledColumns) &&
      areStringArraysEqual(a?.orderedColumns, b?.orderedColumns),
    {
      paths: [toggledColumnsStatePath, orderedColumnsStatePath].filter(
        (path): path is string => typeof path === 'string' && path.length > 0,
      ),
    },
  );

  return useMemo(() => {
    const enabled = schema.columnSettings?.enabled === true;
    if (!enabled) {
      return undefined;
    }

    const visibleColumns = state.toggledColumns ?? defaultColumnNames;
    const orderedColumns = state.orderedColumns ?? defaultColumnNames;
    const visibleSet = new Set(visibleColumns);
    return orderedColumns.filter((name) => visibleSet.has(name));
  }, [
    defaultColumnNames,
    schema.columnSettings?.enabled,
    state.orderedColumns,
    state.toggledColumns,
  ]);
}

export function useCrudQueryBridge(args: {
  componentRegistry: CrudComponentRegistryLike | undefined;
  queryFormId: string;
  scope: ScopeRef | undefined;
  queryStatePath: string;
  queryDraftStatePath?: string;
  paginationStatePath: string;
  queryState: CrudQueryState;
  paginationState: CrudPaginationState;
  defaultQuery: Record<string, unknown>;
  shouldFetchOnQueryChange: boolean;
  onQuerySubmit: RendererEventHandler | undefined;
  onQueryReset: RendererEventHandler | undefined;
}) {
  const {
    componentRegistry,
    queryFormId,
    scope,
    queryStatePath,
    queryDraftStatePath,
    paginationStatePath,
    queryState,
    paginationState,
    defaultQuery,
    shouldFetchOnQueryChange,
    onQuerySubmit,
    onQueryReset,
  } = args;
  const submitSequenceRef = useRef(0);

  const submitQueryValues = useCallback(
    (nextValues: Record<string, unknown>, sequence = submitSequenceRef.current) => {
      if (sequence !== submitSequenceRef.current) {
        return false;
      }

      if (scope) {
        scope.update(queryStatePath, {
          values: nextValues,
          refreshCount: queryState.refreshCount + 1,
        });
      }

      if (shouldFetchOnQueryChange && sequence === submitSequenceRef.current) {
        const payload = createCrudQueryEventPayload({
          type: 'crud:query-submit',
          query: nextValues,
          page: 1,
          pageSize: paginationState.pageSize,
        });
        onQuerySubmit?.(payload, {
          scope,
          event: payload,
          evaluationBindings: payload,
        });
      }

      return true;
    },
    [
      onQuerySubmit,
      paginationState.pageSize,
      queryState.refreshCount,
      queryStatePath,
      scope,
      shouldFetchOnQueryChange,
    ],
  );

  const resetQueryValues = useCallback(() => {
    const handle = componentRegistry?.resolve({ componentId: queryFormId });
    if (handle?.capabilities?.hasMethod?.('reset')) {
      void Promise.resolve(
        handle.capabilities.invoke('reset', { values: defaultQuery }, {} as never),
      );
    }

    if (!scope) {
      return;
    }

    startTransition(() => {
      scope.update(queryStatePath, {
        values: defaultQuery,
        refreshCount: queryState.refreshCount + 1,
      });
      scope.update(paginationStatePath, { currentPage: 1, pageSize: paginationState.pageSize });
    });

    if (shouldFetchOnQueryChange) {
      const payload = createCrudQueryEventPayload({
        type: 'crud:query-reset',
        query: defaultQuery,
        page: 1,
        pageSize: paginationState.pageSize,
      });
      onQueryReset?.(payload, {
        scope,
        event: payload,
        evaluationBindings: payload,
      });
    }
  }, [
    componentRegistry,
    defaultQuery,
    onQueryReset,
    paginationState.pageSize,
    paginationStatePath,
    queryFormId,
    queryState.refreshCount,
    queryStatePath,
    scope,
    shouldFetchOnQueryChange,
  ]);

  const handleQuerySubmit = useCallback(async () => {
    const submitSequence = submitSequenceRef.current + 1;
    submitSequenceRef.current = submitSequence;
    const draftQuery = queryDraftStatePath ? toRecord(scope?.get?.(queryDraftStatePath)) : {};
    const handle = componentRegistry?.resolve({ componentId: queryFormId });
    if (handle?.capabilities?.hasMethod?.('getValues')) {
      if (handle.capabilities.hasMethod?.('validate')) {
        const validateResult = (await Promise.resolve(
          handle.capabilities.invoke('validate', undefined, {} as never),
        )) as { ok?: boolean };
        if (submitSequence !== submitSequenceRef.current || !validateResult?.ok) {
          return;
        }
      }

      const valuesResult = (await Promise.resolve(
        handle.capabilities.invoke('getValues', undefined, {} as never),
      )) as { ok?: boolean; data?: unknown };
      if (submitSequence !== submitSequenceRef.current) {
        return;
      }

      if (valuesResult.ok && valuesResult.data && typeof valuesResult.data === 'object') {
        submitQueryValues(toRecord(valuesResult.data), submitSequence);
        return;
      }
    }

    submitQueryValues(
      Object.keys(draftQuery).length > 0 ? draftQuery : queryState.values,
      submitSequence,
    );
  }, [componentRegistry, queryDraftStatePath, queryFormId, queryState.values, scope, submitQueryValues]);

  return {
    handleQuerySubmit,
    handleQueryReset: resetQueryValues,
  };
}
