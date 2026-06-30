import { useEffect, useMemo, useRef } from 'react';
import { toRecord } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  createReadonlyScopeBinding,
  hasRendererSlotContent,
  useCurrentComponentRegistry,
  useRenderScope,
  useRendererEnv,
  useSchemaProps,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, PaginationNext, PaginationPrevious, Separator, cn, useIsMobile } from '@nop-chaos/ui';
import type { CrudSchema, CrudStatusSummary } from './crud-schema.js';
import type { TableSchema } from './schemas.js';
import { normalizeCrudSchema } from './crud-schema.js';
import { TableRenderer } from './table-renderer.js';
import {
  applyQueryToRows,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  EMPTY_ROWS,
  normalizeCrudSourceValue,
  useCrudHandle,
  useCrudLoadAction,
  useCrudRuntimeState,
  useCrudStatusPublisher,
} from './crud-renderer-state.js';
import {
  CrudToolbarBlocks,
  normalizeToolbarBlocks,
  type ToolbarBlockDefinition,
} from './crud-renderer-toolbar.js';
import { createCrudQueryFormId } from './crud-query-form-id.js';
import {
  createCrudOwnerPaths,
  useCrudQueryBridge,
  useCrudVisibleColumnNames,
} from './crud-renderer-ownership.js';
import { useCrudPolling } from './use-crud-polling.js';
import { CrudQueryRegion, resolvePaginationMode, isAtLastPage } from './crud-query-region.js';
import { useInfiniteScroll } from './use-infinite-scroll.js';

type CrudRefreshContext = Parameters<NonNullable<RendererComponentProps<CrudSchema>['events']['onRefresh']>>[1];

function asReactNode(value: unknown): React.ReactNode {
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
function delegateTableRendererProps(
  source: RendererComponentProps<CrudSchema>,
  tableSchema: TableSchema,
  tableResolvedProps: RendererComponentProps<TableSchema>['props'],
  crudScope: ReturnType<typeof createReadonlyScopeBinding>,
): RendererComponentProps<TableSchema> {
  return {
    id: `${source.id}-table`,
    path: `${source.path}.table`,
    schema: tableSchema,
    // `templateNode` / `node` carry the CrudSchema generic; the table only consumes
    // their structural shape (instance path / scope), so they cross the generic
    // boundary here — the single audited `as unknown as` seam for this delegation.
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
    helpers: source.helpers,
  };
}

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const defaultEmptyLabel = t('flux.common.noData');
  const onRefresh = props.events.onRefresh;
  const nodeScope = props.node.scope;
  const schemaProps = useSchemaProps(props);
  // Memoize the normalized schema on the resolved props so its nested fields
  // (defaultParams / queryForm) stay referentially stable across renders, which
  // in turn lets `defaultQuery` memoize cleanly (H18).
  const normalizedSchema = useMemo(
    () => normalizeCrudSchema(schemaProps as CrudSchema),
    [schemaProps],
  );
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const env = useRendererEnv();
  const isMobile = useIsMobile();
  const refreshCountRef = useRef(0);

  const ownerPaths = createCrudOwnerPaths({ id: props.id, cid: props.meta.cid, schema: normalizedSchema });
  // H18: stabilize defaultQuery identity on the (now-memoized) normalizedSchema so
  // downstream memoization (useCrudRuntimeState init effect, useCrudQueryBridge,
  // CrudQueryRegion) does not bust every render.
  const defaultQuery = useMemo(
    () => ({
      ...toRecord(normalizedSchema.defaultParams),
      ...toRecord(normalizedSchema.queryForm?.defaultParams),
      ...toRecord(normalizedSchema.queryForm?.data),
    }),
    [normalizedSchema],
  );

  const { queryState, paginationState, sortState, filterState, selectedRowKeys } =
    useCrudRuntimeState({
      scope,
      queryStatePath: ownerPaths.queryStatePath,
      paginationStatePath: ownerPaths.paginationStatePath,
      sortStatePath: ownerPaths.sortStatePath,
      filterStatePath: ownerPaths.filterStatePath,
      selectionStatePath: ownerPaths.selectionStatePath,
      defaultQuery,
      fallbackPageSize: DEFAULT_PAGE_SIZE,
    });

  useEffect(() => {
    if (!scope) {
      return;
    }

    scope.update(ownerPaths.ownerStatePath, {
      query: queryState,
      pagination: paginationState,
      sort: sortState,
      filters: filterState,
      selection: selectedRowKeys,
    });
  }, [
    filterState,
    ownerPaths.ownerStatePath,
    paginationState,
    queryState,
    scope,
    selectedRowKeys,
    sortState,
  ]);

  const loadActionConfig = normalizedSchema.loadAction;
  const useLoadAction = Boolean(loadActionConfig);
  const loadAllData = normalizedSchema.loadAllData === true;
  const dataStatePath = normalizedSchema.dataStatePath;

  const queryStatePath = ownerPaths.queryStatePath;
  const queryDraftStatePath = `${queryStatePath}.$draft`;
  const paginationStatePath = ownerPaths.paginationStatePath;
  const sortStatePath = ownerPaths.sortStatePath;
  const filterStatePath = ownerPaths.filterStatePath;
  const selectionStatePath = ownerPaths.selectionStatePath;

  const loadResult = useCrudLoadAction({
    enabled: useLoadAction,
    loadAction: loadActionConfig,
    loadAllData,
    onError: props.events.onError,
    helpers: props.helpers,
    env,
    scope,
    nodeScope,
    pagination: paginationState,
    query: queryState,
    sort: sortState,
    filters: filterState,
    selection: selectedRowKeys,
    paginationStatePath,
  });

  const clientSideQueryFiltering =
    !useLoadAction || loadAllData || normalizedSchema.clientMode?.loadDataOnce === true;
  const resolvedSource = useLoadAction
    ? { rows: loadResult.rows, total: loadResult.total }
    : normalizeCrudSourceValue(schemaProps.source);
  const source = resolvedSource.rows.length > 0 ? resolvedSource.rows : EMPTY_ROWS;
  const effectiveQuery = queryState;
  const filteredRows = clientSideQueryFiltering ? applyQueryToRows(source, effectiveQuery) : source;

  useEffect(() => {
    if (!dataStatePath || !scope) {
      return;
    }
    scope.update(dataStatePath, source);
  }, [dataStatePath, scope, source]);
  const shouldFetchOnQueryChange =
    useLoadAction || normalizedSchema.clientMode?.loadDataOnce !== true
      ? true
      : normalizedSchema.clientMode.fetchOnFilter === true;
  const defaultColumnNames = (normalizedSchema.columns ?? [])
    .filter((column) => column.hidden !== true)
    .map((column, index) => column.name ?? `column-${index}`);
  const visibleColumnNames = useCrudVisibleColumnNames({
    schema: normalizedSchema,
    defaultColumnNames,
    toggledColumnsStatePath: ownerPaths.toggledColumnsStatePath,
    orderedColumnsStatePath: ownerPaths.orderedColumnsStatePath,
  });

  const summary: CrudStatusSummary = {
    loading: useLoadAction ? loadResult.loading : false,
    refreshing: false,
    itemCount: filteredRows.length,
    total: resolvedSource.total,
    hasSelection: selectedRowKeys.length > 0,
    selectionCount: selectedRowKeys.length,
    selectedRowKeys,
    query: effectiveQuery,
    pagination: paginationState,
    sort: sortState,
    filters: filterState,
    visibleColumnNames,
  };
  const crudScope = createReadonlyScopeBinding(scope, '$crud', () => summary);

  const handleRefresh = (ctx?: CrudRefreshContext): Promise<unknown> | void => {
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      scope?.update(selectionStatePath, []);
    }

    if (useLoadAction) {
      loadResult.reload();
    }

    refreshCountRef.current += 1;

    const refreshSummary = {
      type: 'refresh',
      refreshCount: refreshCountRef.current,
      query: queryState,
      selectionCleared: normalizedSchema.autoClearSelectionOnRefresh === true,
      selectedRowKeys,
    };

    return onRefresh?.(refreshSummary, {
      scope: scope ?? ctx?.scope ?? nodeScope,
      event: refreshSummary,
      actionScope: ctx?.actionScope,
      componentRegistry: ctx?.componentRegistry,
      form: ctx?.form,
      page: ctx?.page,
      nodeInstance: ctx?.nodeInstance,
      instancePath: ctx?.instancePath,
      interactionId: ctx?.interactionId,
      signal: ctx?.signal,
      evaluationBindings: {
        ...(ctx?.evaluationBindings ?? {}),
        ...refreshSummary,
        $crud: summary,
      },
    });
  };

  const queryFormId = createCrudQueryFormId(props.id, props.path);
  const { handleQuerySubmit, handleQueryReset } = useCrudQueryBridge({
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
    onQuerySubmit: props.events.onQuerySubmit,
    onQueryReset: props.events.onQueryReset,
  });

  useCrudStatusPublisher(scope, normalizedSchema.statusPath, summary);

  const pollingState = useCrudPolling({
    polling: normalizedSchema.polling,
    componentRegistry,
    scope,
  });

  const paginationMode = resolvePaginationMode(normalizedSchema.pagination, undefined);
  const loadDataOnce = normalizedSchema.clientMode?.loadDataOnce === true;
  const atLastPage = isAtLastPage(resolvedSource.total, paginationState.currentPage, paginationState.pageSize);
  const infiniteActive = paginationMode === 'infinite' && !loadDataOnce;
  const infiniteSentinelEnabled = infiniteActive && filteredRows.length > 0;
  const infiniteSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleLoadMore = (): Promise<unknown> | void => {
    if (loadDataOnce || atLastPage) {
      return;
    }
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      scope?.update(selectionStatePath, []);
    }
    scope?.update(paginationStatePath, {
      currentPage: paginationState.currentPage + 1,
      pageSize: paginationState.pageSize,
    });
    // When the renderer owns fetching (no loadAction), drive the refresh and
    // return its promise so the infinite-scroll hook can track loading/error
    // and guard concurrent triggers (G5). With a loadAction, the owner hook
    // drives fetching; do not double-trigger here.
    if (!useLoadAction) {
      return handleRefresh();
    }
  };

  const infiniteState = useInfiniteScroll({
    enabled: infiniteSentinelEnabled,
    sentinelRef: infiniteSentinelRef,
    onLoadMore: handleLoadMore,
  });

  function resolveCrudSlotContent(
    slotKey: string,
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

  const toolbarContent = resolveCrudSlotContent('toolbar');
  const listActionsContent = resolveCrudSlotContent('listActions');
  const footerToolbarContent = resolveCrudSlotContent('footerToolbar');
  const tableEmptyContent = normalizedSchema.empty ?? defaultEmptyLabel;

  const headerBlocksRaw = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'header');
  const footerBlocksRaw = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'footer');

  function resolveToolbarBlocks(
    blocks: ToolbarBlockDefinition[],
    mode: 'pages' | 'infinite',
  ): ToolbarBlockDefinition[] {
    let resolved = blocks;
    if (mode === 'infinite') {
      resolved = resolved.filter(
        (block) => block.type !== 'pagination' && block.type !== 'switch-per-page',
      );
    }
    if (isMobile) {
      resolved = resolved.filter((block) => block.type !== 'switch-per-page');
    }
    return resolved;
  }

  const headerBlocks = resolveToolbarBlocks(headerBlocksRaw, paginationMode);
  const footerBlocks = resolveToolbarBlocks(footerBlocksRaw, paginationMode);
  const hasToolbar = hasRendererSlotContent(asReactNode(toolbarContent));
  const hasListActions = hasRendererSlotContent(asReactNode(listActionsContent));
  const hasFooterToolbar = hasRendererSlotContent(asReactNode(footerToolbarContent));

  const pollingToggleBlockVisible =
    headerBlocks.some((block) => block.type === 'polling-toggle') ||
    footerBlocks.some((block) => block.type === 'polling-toggle');
  const pollingToggleProps = pollingToggleBlockVisible
    ? {
        visible: true,
        active: pollingState.effectiveEnabled && pollingState.userToggle,
        onToggle: pollingState.toggle,
      }
    : undefined;

  const tableSchema = (() => {
    const base: Record<string, unknown> = {
      type: 'table',
      id: `${props.id}-table`,
      source: filteredRows as BaseSchema['data'],
      columns: normalizedSchema.columns ?? [],
      rowKey: normalizedSchema.rowKey,
      selectionOwnership: 'scope',
      selectionStatePath,
      paginationOwnership: 'scope',
      paginationStatePath,
      sortOwnership: 'scope',
      sortStatePath,
      filterOwnership: 'scope',
      filterStatePath,
      pagination: {
        enabled: paginationMode === 'pages',
        serverPaged: useLoadAction && !loadAllData,
        total: useLoadAction && !loadAllData ? resolvedSource.total : undefined,
        currentPage: paginationState.currentPage,
        pageSize:
          paginationMode === 'infinite'
            ? Math.max(paginationState.pageSize, paginationState.currentPage * paginationState.pageSize)
            : paginationState.pageSize,
        pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
        showSizeChanger: paginationMode === 'pages',
        mode: paginationMode,
      },
      empty: tableEmptyContent,
      quickSaveAction: normalizedSchema.quickSaveAction,
      quickSaveItemAction: normalizedSchema.quickSaveItemAction,
    };

    if (normalizedSchema.selection) {
      base.rowSelection = {
        type: normalizedSchema.selection.type ?? 'checkbox',
        selectedRowKeys,
        keepOnPageChange: normalizedSchema.selection.keepOnPageChange,
        maxSelectionLength: normalizedSchema.selection.maxSelectionLength,
        checkableWhen: normalizedSchema.selection.checkableWhen,
      };
    }

    if (normalizedSchema.onRefresh) {
      base.onRefresh = normalizedSchema.onRefresh;
    }

    if (normalizedSchema.onRowClick) {
      base.onRowClick = normalizedSchema.onRowClick;
    }

    if (normalizedSchema.columnSettings) {
      base.columnSettings = normalizedSchema.columnSettings;
    }

    if (normalizedSchema.responsive) {
      base.responsive = normalizedSchema.responsive;
    }

    return base as TableSchema;
  })();
  const tableResolvedProps: RendererComponentProps<TableSchema>['props'] = {
    ...tableSchema,
    disabled: props.props.disabled,
    className: props.props.className,
    frameClassName: props.props.frameClassName,
    testid: props.props.testid,
    cid: props.props.cid,
  };
  const tableRendererProps = delegateTableRendererProps(
    props,
    tableSchema,
    tableResolvedProps,
    crudScope,
  );
  const hasQueryForm = Boolean(props.regions.queryFormRegion?.templateNode);

  const handleClearSelection = () => {
    scope?.update(selectionStatePath, []);
  };

  const handleToggleSelection = (key: unknown) => {
    if (!scope || key === undefined || key === null) {
      return;
    }
    const keyStr = String(key);
    const next = selectedRowKeys.includes(keyStr)
      ? selectedRowKeys.filter((existing) => existing !== keyStr)
      : [...selectedRowKeys, keyStr];
    scope.update(selectionStatePath, next);
  };

  useCrudHandle(props, selectedRowKeys, handleClearSelection, handleRefresh, handleToggleSelection);

  const handleToolbarPageChange = (page: number) => {
    scope?.update(paginationStatePath, { currentPage: page, pageSize: paginationState.pageSize });
    if (!useLoadAction) {
      handleRefresh();
    }
  };

  const handleToolbarPageSizeChange = (pageSize: number) => {
    scope?.update(paginationStatePath, { currentPage: 1, pageSize });
    if (!useLoadAction) {
      handleRefresh();
    }
  };

  const handleQuerySubmitWithFeedback = () => {
    void handleQuerySubmit().catch((error) => {
      const fallback = new Error(t('flux.common.queryFailed'), {
        cause: error,
      });
      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : fallback.message,
      );
    });
  };

  const listMode = normalizedSchema.listMode ?? 'table';
  const nonTableMode = listMode === 'cards' || listMode === 'list';
  const listTotalPages = Math.max(1, Math.ceil(filteredRows.length / paginationState.pageSize));
  const listAtLastPage = paginationState.currentPage >= listTotalPages;

  // Build the nested carrier schema (list/cards) inline. The React Compiler auto-memoizes this,
  // and the carrier wrapper below is keyed on pagination/selection state so the nested
  // `helpers.render` subtree remounts (and re-evaluates template bindings) when that state changes.
  const carrierSchema: BaseSchema | null = nonTableMode
    ? (() => {
        const carrierRows =
          listMode === 'cards'
            ? filteredRows.slice(
                (paginationState.currentPage - 1) * paginationState.pageSize,
                paginationState.currentPage * paginationState.pageSize,
              )
            : filteredRows;
        const rawSchema = props.schema;
        const base = {
          items: carrierRows as BaseSchema['data'],
          selectionMode: 'none' as const,
          keyField: normalizedSchema.rowKey,
          empty: tableEmptyContent,
        };
        if (listMode === 'list') {
          return {
            ...base,
            type: 'list' as const,
            item: rawSchema.item,
            pagination: { enabled: true, mode: 'page' as const, pageSize: paginationState.pageSize },
            paginationOwnership: 'scope' as const,
            paginationStatePath,
          };
        }
        return {
          ...base,
          type: 'cards' as const,
          card: rawSchema.card,
        };
      })()
    : null;

  const carrierNode =
    carrierSchema && nonTableMode
      ? props.helpers.render(carrierSchema, {
          scope: crudScope,
          pathSuffix: listMode,
        })
      : null;

  return (
    <div
      className={cn('nop-crud', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-responsive={isMobile ? 'narrow' : undefined}
    >
      {hasQueryForm ? (
        <CrudQueryRegion
          filterTogglable={normalizedSchema.filterTogglable}
          queryState={queryState}
          defaultQuery={defaultQuery}
          isMobile={isMobile}
          queryFormRegionRender={() =>
            asReactNode(
              props.regions.queryFormRegion?.render({
                pathSuffix: 'queryForm',
                scope: crudScope,
              }),
            )
          }
          onSubmit={handleQuerySubmitWithFeedback}
          onReset={handleQueryReset}
        />
      ) : null}

      {hasToolbar || hasListActions || headerBlocks.length > 0 || pollingToggleProps ? (
        <div className="nop-crud-toolbar flex flex-col gap-3" data-slot="crud-toolbar">
          <div className="flex flex-wrap items-center gap-3">
          {hasToolbar ? (
            <div data-slot="crud-toolbar-main">{asReactNode(toolbarContent)}</div>
          ) : null}
          {hasListActions ? (
            <div data-slot="crud-list-actions">{asReactNode(listActionsContent)}</div>
          ) : null}
          </div>
          <CrudToolbarBlocks
            slot="header"
            blocks={headerBlocks}
            summary={summary}
            listActionsContent={asReactNode(listActionsContent)}
            hasListActions={hasListActions}
            pagination={paginationState}
            onPageChange={handleToolbarPageChange}
            onPageSizeChange={handleToolbarPageSizeChange}
            pollingToggle={pollingToggleProps}
          />
        </div>
      ) : null}

      {nonTableMode ? (
        <div
          className="nop-crud-list-body"
          data-slot="crud-list-body"
          data-list-mode={listMode}
          // AUDIT-02: the carrier used to be force-remounted via a key on
          // pagination/selection state to mask per-render recompilation. The carrier
          // now stays mounted across CRUD-owned state changes: its `item`/`card`
          // template is compiled once (on first mount) and the carrier updates
          // reactively as `carrierSchema.items` / scope bindings change, instead of
          // being torn down and recompiled on every page/selection change.
        >
          {asReactNode(carrierNode)}
          {paginationMode === 'pages' ? (
            <div
              className="nop-crud-list-pagination mt-3 flex flex-wrap items-center justify-end gap-2"
              data-slot="crud-list-pagination"
              data-list-mode={listMode}
            >
              <PaginationPrevious
                text={t('flux.pagination.previous')}
                aria-label={t('flux.pagination.previous')}
                onClick={() => handleToolbarPageChange(Math.max(1, paginationState.currentPage - 1))}
                className={paginationState.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                aria-disabled={paginationState.currentPage <= 1 || undefined}
              />
              <span className="text-sm text-muted-foreground">
                {t('flux.pagination.page', {
                  current: paginationState.currentPage,
                  total: listTotalPages,
                })}
              </span>
              <PaginationNext
                text={t('flux.pagination.next')}
                aria-label={t('flux.pagination.next')}
                onClick={() => handleToolbarPageChange(paginationState.currentPage + 1)}
                className={listAtLastPage ? 'pointer-events-none opacity-50' : undefined}
                aria-disabled={listAtLastPage || undefined}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="nop-crud-table" data-slot="crud-table">
          <TableRenderer {...tableRendererProps} />
        </div>
      )}

      {paginationMode === 'infinite' ? (
        <div className="nop-crud-infinite" data-slot="crud-infinite">
          <div data-slot="crud-infinite-status">
            {loadDataOnce
              ? t('flux.crud.loadedAll', { count: filteredRows.length })
              : atLastPage
                ? t('flux.crud.noMoreData')
                : infiniteState.error
                  ? t('flux.crud.loadFailed')
                  : infiniteState.loading
                    ? t('flux.crud.loadingMore')
                    : ''}
          </div>
          {infiniteSentinelEnabled ? (
            <div
              ref={infiniteSentinelRef}
              data-slot="crud-infinite-sentinel"
              style={{ height: 1 }}
              aria-hidden
            />
          ) : null}
          {infiniteState.error ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                infiniteState.setError(undefined);
                handleLoadMore();
              }}
            >
              {t('flux.common.retry')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasFooterToolbar || footerBlocks.length > 0 || pollingToggleProps ? (
        <div className="nop-crud-footer" data-slot="crud-footer">
          {hasFooterToolbar ? (
            <div data-slot="crud-footer-toolbar">{asReactNode(footerToolbarContent)}</div>
          ) : null}
          {footerBlocks.length > 0 || pollingToggleProps ? (
            <>
              <Separator />
              <CrudToolbarBlocks
                slot="footer"
                blocks={footerBlocks}
                summary={summary}
                listActionsContent={asReactNode(listActionsContent)}
                hasListActions={hasListActions}
                pagination={paginationState}
                onPageChange={handleToolbarPageChange}
                onPageSizeChange={handleToolbarPageSizeChange}
                pollingToggle={pollingToggleProps}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
