import { useEffect, useRef } from 'react';
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
import { Button, Separator, cn } from '@nop-chaos/ui';
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
  useCrudRuntimeState,
  useCrudStatusPublisher,
} from './crud-renderer-state.js';
import { CrudToolbarBlocks, normalizeToolbarBlocks } from './crud-renderer-toolbar.js';
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

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const defaultEmptyLabel = t('flux.common.noData');
  const onRefresh = props.events.onRefresh;
  const nodeScope = props.node.scope;
  const schemaProps = useSchemaProps(props);
  const normalizedSchema = normalizeCrudSchema(schemaProps as CrudSchema);
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const env = useRendererEnv();

  const ownerPaths = createCrudOwnerPaths({ id: props.id, cid: props.meta.cid, schema: normalizedSchema });
  const defaultQuery = {
    ...toRecord(normalizedSchema.defaultParams),
    ...toRecord(normalizedSchema.queryForm?.defaultParams),
    ...toRecord(normalizedSchema.queryForm?.data),
  };

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

  const resolvedSource = normalizeCrudSourceValue(schemaProps.source);
  const source = resolvedSource.rows.length > 0 ? resolvedSource.rows : EMPTY_ROWS;
  const effectiveQuery = queryState.refreshCount > 0 ? queryState.values : defaultQuery;
  const filteredRows = applyQueryToRows(source, effectiveQuery);
  const queryStatePath = ownerPaths.queryStatePath;
  const queryDraftStatePath = `${queryStatePath}.$draft`;
  const paginationStatePath = ownerPaths.paginationStatePath;
  const sortStatePath = ownerPaths.sortStatePath;
  const filterStatePath = ownerPaths.filterStatePath;
  const selectionStatePath = ownerPaths.selectionStatePath;
  const shouldFetchOnQueryChange =
    normalizedSchema.clientMode?.loadDataOnce === true
      ? normalizedSchema.clientMode.fetchOnFilter === true
      : true;
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
    loading: false,
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

  const handleRefresh = (ctx?: CrudRefreshContext) => {
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      scope?.update(selectionStatePath, []);
    }

    scope?.update(queryStatePath, {
      values: queryState.values,
      refreshCount: queryState.refreshCount + 1,
    });

    const refreshSummary = {
      type: 'refresh',
      refreshCount: queryState.refreshCount + 1,
      query: queryState.values,
      selectionCleared: normalizedSchema.autoClearSelectionOnRefresh === true,
      selectedRowKeys,
    };

    onRefresh?.(refreshSummary, {
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

  const queryFormId = createCrudQueryFormId(props.schema.id, props.path);
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

  const handleLoadMore = () => {
    if (loadDataOnce || atLastPage) {
      return;
    }
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      scope?.update(selectionStatePath, []);
    }
    scope?.update(queryStatePath, {
      values: queryState.values,
      refreshCount: queryState.refreshCount + 1,
    });
    scope?.update(paginationStatePath, {
      currentPage: paginationState.currentPage + 1,
      pageSize: paginationState.pageSize,
    });
    handleRefresh();
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
  const headerBlocks = paginationMode === 'infinite'
    ? headerBlocksRaw.filter((block) => block.type !== 'pagination' && block.type !== 'switch-per-page')
    : headerBlocksRaw;
  const footerBlocks = paginationMode === 'infinite'
    ? footerBlocksRaw.filter((block) => block.type !== 'pagination' && block.type !== 'switch-per-page')
    : footerBlocksRaw;
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
  const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  const tableResolvedProps: RendererComponentProps<TableSchema>['props'] = {
    ...tableSchema,
    disabled: props.props.disabled,
    className: props.props.className,
    frameClassName: props.props.frameClassName,
    testid: props.props.testid,
    cid: props.props.cid,
  };
  const tableRendererProps: RendererComponentProps<TableSchema> = {
    id: `${props.id}-table`,
    path: `${props.path}.table`,
    schema: tableSchema,
    templateNode:
      props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
    node: {
      ...props.node,
      scope: crudScope,
    } as unknown as RendererComponentProps<TableSchema>['node'],
    props: tableResolvedProps,
    meta: {
      ...props.meta,
      cid: undefined,
      className: undefined,
      testid: undefined,
    },
    regions: props.regions as RendererComponentProps<TableSchema>['regions'],
    events: tableEvents,
    helpers: props.helpers,
  };
  const hasQueryForm = Boolean(props.regions.queryFormRegion?.templateNode);

  const handleClearSelection = () => {
    scope?.update(selectionStatePath, []);
  };

  useCrudHandle(props, selectedRowKeys, handleClearSelection, handleRefresh);

  const handleToolbarPageChange = (page: number) => {
    scope?.update(paginationStatePath, { currentPage: page, pageSize: paginationState.pageSize });
  };

  const handleToolbarPageSizeChange = (pageSize: number) => {
    scope?.update(paginationStatePath, { currentPage: 1, pageSize });
  };

  const handleQuerySubmitWithFeedback = () => {
    void handleQuerySubmit().catch((error) => {
      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
      );
    });
  };

  return (
    <div
      className={cn('nop-crud', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasQueryForm ? (
        <CrudQueryRegion
          filterTogglable={normalizedSchema.filterTogglable}
          queryState={queryState}
          defaultQuery={defaultQuery}
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

      <div className="nop-crud-table" data-slot="crud-table">
        <TableRenderer {...tableRendererProps} />
      </div>

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
