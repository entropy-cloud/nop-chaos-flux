import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getIn,
  toRecord,
  toStringArray,
  type ActionResult,
  type ReactionHandle,
  type RendererEnv,
  type RendererHelpers,
  type RendererComponentProps,
  type ScopeRef,
} from '@nop-chaos/flux-core';
import type { CrudSchema } from './crud-schema.js';
import {
  EMPTY_ROWS,
  createCrudEvaluationBindings,
  normalizeCrudSourceValue,
  normalizePagination,
  type CrudFilterState,
  type CrudPaginationState,
  type CrudSortState,
} from './crud-renderer-state.js';

export interface CrudLoadActionResult {
  rows: unknown[];
  total: number | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
  /**
   * Arms a promise that resolves with the settle result when the NEXT load
   * dispatch settles. Used by the infinite-scroll load-more path: the renderer
   * bumps `currentPage` (the load effect drives fetching) and returns this
   * promise so the infinite hook can track loading/error and guard concurrent
   * triggers (G5).
   */
  loadMore: () => Promise<ActionResult>;
}

export function useCrudLoadAction(args: {
  enabled: boolean;
  loadReaction: ReactionHandle | undefined;
  loadAllData: boolean;
  accumulateRows: boolean;
  onError: RendererComponentProps<CrudSchema>['events']['onError'];
  helpers: RendererHelpers;
  env: RendererEnv | undefined;
  scope: ScopeRef | undefined;
  nodeScope: ScopeRef | undefined;
  pagination: CrudPaginationState;
  query: Record<string, unknown>;
  sort: CrudSortState;
  filters: CrudFilterState;
  selection: string[];
  paginationStatePath: string;
  queryStatePath: string;
  sortStatePath: string;
  filterStatePath: string;
  selectionStatePath: string;
  ownerStatePath: string;
  statusPath?: string;
  dataStatePath?: string;
  totalField?: string;
  pageField?: string;
  pageSizeField?: string;
}): CrudLoadActionResult {
  const {
    enabled,
    loadReaction,
    loadAllData,
    accumulateRows,
    onError,
    helpers,
    env,
    scope,
    nodeScope,
    pagination,
    query,
    sort,
    filters,
    selection,
    paginationStatePath,
    queryStatePath,
    sortStatePath,
    filterStatePath,
    selectionStatePath,
    ownerStatePath,
    statusPath,
    dataStatePath,
    totalField,
    pageField,
    pageSizeField,
  } = args;

  const [rows, setRows] = useState<unknown[]>(EMPTY_ROWS);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const loadedAllRef = useRef(false);
  // reload() re-triggers the imperative dispatch in the load effect below (the
  // only path that captures the result into rows/total). force() alone fires the
  // reaction's ajax but its result is not captured, so a nonce state is bumped
  // to make the effect re-run and re-dispatch.
  const [reloadNonce, setReloadNonce] = useState(0);
  // Page whose rows currently live in state. In infinite+loadAction mode a
  // strictly higher page number appends (accumulate); anything else (reload,
  // query change, server-correction) replaces the accumulated set.
  const lastSettledPageRef = useRef(0);
  // Single-slot resolver armed by `loadMore()`: resolved with the settle
  // result when the next load dispatch settles (or with a no-op result when
  // the dispatch effect bails without dispatching), so the infinite hook can
  // drive loading/error and the G5 concurrent guard from a real thenable.
  const loadMoreResolveRef = useRef<((result: ActionResult) => void) | undefined>(undefined);

  // Per-instance child scope projection of the CRUD scope variables
  // (pagination/query/sort/filters/selection). The loadAction dispatches against
  // this scope so the request layer's includeScope extraction resolves the
  // documented CRUD scope variables (CONTEXT.md) instead of the raw store.
  const crudScopeRef = useRef<ScopeRef | undefined>(undefined);
  // Latest evaluation bindings for error reporting from the load callbacks
  // (reactive force() dispatches carry no renderer-side ctx).
  const lastBindingsRef = useRef<Record<string, unknown>>({});

  const reload = useCallback(() => {
    loadedAllRef.current = false;
    setReloadNonce((value) => value + 1);
  }, []);

  const settleLoadMore = useCallback(
    (result: ActionResult) => {
      const resolve = loadMoreResolveRef.current;
      loadMoreResolveRef.current = undefined;
      resolve?.(result);
    },
    [],
  );

  const loadMore = useCallback(() => {
    const promise = new Promise<ActionResult>((resolve) => {
      loadMoreResolveRef.current = resolve;
    });
    return promise;
  }, []);

  const reportError = useCallback(
    (err: Error, evaluationBindings: Record<string, unknown>) => {
      setError(err);
      if (onError) {
        void onError(
          { type: 'load-error', error: err },
          {
            scope: scope ?? nodeScope,
            event: { type: 'load-error', error: err },
            evaluationBindings: { ...evaluationBindings, error: err },
          },
        );
        return;
      }
      env?.notify?.('error', err.message);
    },
    [env, nodeScope, onError, scope],
  );

  // Activate the reaction handle on mount and register:
  //  1. a bindings provider (reactive triggers + manual refresh inject CRUD
  //     internal state into the action's evaluationBindings),
  //  2. a scope override (dispatch against the CRUD scope projection child
  //     scope, so includeScope extraction resolves CRUD scope variables),
  //  3. load lifecycle callbacks (capture dispatch results — including
  //     reactive force() dispatches the reaction registry would drop).
  useEffect(() => {
    if (!enabled || !loadReaction) {
      return;
    }

    // Register bindings provider: reads current CRUD state directly from scope
    // (NOT from React state closures) to avoid stale-data issues during
    // synchronous scope-change notification. Also refreshes the CRUD scope
    // projection child scope so every dispatch (imperative + reactive) sees
    // current pagination/query/sort/filters/selection data.
    const proxyHandle = loadReaction as ReactionHandle & {
      __setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
      __setScopeOverride?(scope: ScopeRef | undefined): void;
      __setIgnoreWritesTo?(paths: readonly string[] | undefined): void;
      __setLoadCallbacks?(
        callbacks: {
          onStart?: () => void;
          onSettle?: (result: ActionResult) => void;
        } | undefined,
      ): void;
    };
    if (!crudScopeRef.current) {
      crudScopeRef.current = helpers.createScope({}, {
        pathSuffix: 'crud-load',
        scopeKey: `${(scope ?? nodeScope)?.id ?? 'crud'}:load`,
      });
    }
    proxyHandle.__setScopeOverride?.(crudScopeRef.current);

    // Declare the scope paths this CRUD instance owns itself: its owner state
    // slice, the internal load-revision counter, and any configured
    // status/data publication targets, plus the per-slice state paths
    // (pagination/query/sort/filter/selection). Writes to these paths are
    // CRUD-internal bookkeeping (or CRUD-originated data publication) — they
    // must not re-trigger the reaction (a captured load result would otherwise
    // feed a fetch → state-write → fetch loop). Custom state paths (e.g. a
    // scope-authored `paginationStatePath`) must be declared too, otherwise a
    // CRUD-driven write fires BOTH the reactive force() dispatch and the
    // imperative load effect dispatch — the double-fetch defect (2-8).
    proxyHandle.__setIgnoreWritesTo?.(
      Array.from(
        new Set([
          ownerStatePath,
          '__crudLoadRevision',
          paginationStatePath,
          queryStatePath,
          sortStatePath,
          filterStatePath,
          selectionStatePath,
          ...(statusPath ? [statusPath] : []),
          ...(dataStatePath ? [dataStatePath] : []),
        ]),
      ),
    );
    proxyHandle.__setBindingsProvider?.(() => {
      const activeScope = scope ?? nodeScope;
      const snapshot = activeScope?.readVisible() ?? {};
      const bindings = createCrudEvaluationBindings({
        pagination: normalizePagination(
          getIn(snapshot, paginationStatePath),
          pagination.pageSize,
        ),
        query: (getIn(snapshot, queryStatePath) as Record<string, unknown>) ?? {},
        sort: (getIn(snapshot, sortStatePath) as CrudSortState) ?? {},
        filters: (getIn(snapshot, filterStatePath) as CrudFilterState) ?? {},
        selection: toStringArray(getIn(snapshot, selectionStatePath)),
        pageField,
        pageSizeField,
      });
      lastBindingsRef.current = bindings;
      crudScopeRef.current?.replace?.({
        pagination: bindings.pagination,
        query: bindings.query,
        sort: bindings.sort,
        filters: bindings.filters,
        selection: bindings.selection,
      });
      return bindings;
    });
    proxyHandle.__setScopeOverride?.(crudScopeRef.current);

    proxyHandle.__setLoadCallbacks?.({
      onStart: () => {
        setLoading(true);
        setError(undefined);
      },
      onSettle: (result) => {
        if (result.cancelled) {
          // A newer dispatch owns loading state; do not touch it.
          settleLoadMore(result);
          return;
        }
        if (!result.ok) {
          const err =
            result.error instanceof Error
              ? result.error
              : typeof result.error === 'string'
                ? new Error(result.error)
                : new Error('loadAction failed');
          reportError(err, lastBindingsRef.current);
          setLoading(false);
          settleLoadMore(result);
          return;
        }

        const normalized = normalizeCrudSourceValue(result.data);
        // totalField: custom response field name for the total count (amis:
        // totalField). Overrides the built-in total/count keys when present.
        if (totalField) {
          const rawRecord = toRecord(result.data);
          const customTotal = rawRecord[totalField];
          if (typeof customTotal === 'number' && Number.isFinite(customTotal)) {
            normalized.total = customTotal;
          }
        }
        // Infinite+loadAction accumulate contract (design.md): each page load
        // appends its rows via concat — the table expresses the accumulated
        // count via pageSize growth (`currentPage * pageSize`). Strictly
        // forward page numbers append; anything else (reload, query change,
        // server correction) replaces. No key dedup: server offset pagination
        // guarantees disjoint pages.
        const page = pagination.currentPage;
        if (accumulateRows && page > lastSettledPageRef.current) {
          setRows((previousRows) => [...previousRows, ...normalized.rows]);
        } else {
          setRows(normalized.rows);
        }
        lastSettledPageRef.current = page;
        setTotal(normalized.total);

        if (normalized.serverPagination && (scope ?? nodeScope)) {
          const correctedPage = normalized.serverPagination.currentPage ?? pagination.currentPage;
          const correctedPageSize = normalized.serverPagination.pageSize ?? pagination.pageSize;
          (scope ?? nodeScope)!.update(paginationStatePath, {
            currentPage: correctedPage,
            pageSize: correctedPageSize,
          });
        }

        if (loadAllData) {
          loadedAllRef.current = true;
        }

        setLoading(false);
        settleLoadMore(result);
      },
    });

    loadReaction.ready();

    return () => {
      proxyHandle.__setBindingsProvider?.(undefined);
      proxyHandle.__setScopeOverride?.(undefined);
      proxyHandle.__setIgnoreWritesTo?.(undefined);
      proxyHandle.__setLoadCallbacks?.(undefined);
    };
  }, [enabled, loadReaction, scope, nodeScope, ownerStatePath, statusPath, dataStatePath, totalField, paginationStatePath, queryStatePath, sortStatePath, filterStatePath, selectionStatePath, pagination.pageSize, pageField, pageSizeField, loadAllData, accumulateRows, pagination, reportError, helpers, settleLoadMore]);

  useEffect(() => {
    if (!enabled || !loadReaction) {
      settleLoadMore({ ok: true, cancelled: true });
      return;
    }

    if (loadAllData && loadedAllRef.current) {
      settleLoadMore({ ok: true, cancelled: true });
      return;
    }

    const controller = new AbortController();

    const evaluationBindings = createCrudEvaluationBindings({
      pagination,
      query,
      sort,
      filters,
      selection,
      pageField,
      pageSizeField,
    });

    // Result processing (rows/total/error/loading) is handled uniformly by the
    // load callbacks registered on the reaction handle — the same sink that
    // captures reactive force() dispatches.
    void loadReaction
      .dispatch({
        evaluationBindings,
        signal: controller.signal,
      })
      .catch(() => {
        // dispatch failures are surfaced through the load callbacks (onSettle)
      });

    return () => {
      controller.abort();
    };
    // Note: all CRUD internal state (pagination/query/sort/filters/selection)
    // is intentionally in deps. In table mode, pagination/pageSize changes
    // bypass CRUD handlers — TableRenderer writes directly to scope, and the
    // CRUD detects the change via useScopeSelector → re-render → this effect.
    // Server-correction loop prevention relies on scope.update value
    // comparison (Fix 3) once implemented; until then, the loop is
    // self-stabilizing (at most 1 extra fetch).
  }, [
    enabled,
    loadReaction,
    loadAllData,
    scope,
    nodeScope,
    pagination,
    query,
    sort,
    filters,
    selection,
    paginationStatePath,
    reloadNonce,
    pageField,
    pageSizeField,
    settleLoadMore,
  ]);

  useEffect(() => {
    return () => {
      if (crudScopeRef.current) {
        helpers.disposeScope(crudScopeRef.current.id);
        crudScopeRef.current = undefined;
      }
    };
  }, [helpers]);

  return useMemo(
    () => ({ rows, total, loading, error, reload, loadMore }),
    [rows, total, loading, error, reload, loadMore],
  );
}
