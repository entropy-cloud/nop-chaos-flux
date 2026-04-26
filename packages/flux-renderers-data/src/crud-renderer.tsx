import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toRecord } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentComponentRegistry, useRenderScope, useSchemaProps } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Separator, cn } from '@nop-chaos/ui';
import type { CrudSchema, CrudStatusSummary } from './crud-schema';
import { normalizeCrudSchema } from './crud-schema';
import {
  applyQueryToRows,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  EMPTY_ROWS,
  normalizeCrudSourceValue,
  useCrudHandle,
  useCrudRuntimeState,
  useCrudStatusPublisher,
  type InternalTableHandle,
} from './crud-renderer-state';
import { CrudToolbarBlocks, normalizeToolbarBlocks } from './crud-renderer-toolbar';
import { createCrudOwnerPaths, useCrudQueryBridge, useCrudVisibleColumnNames } from './crud-renderer-ownership';

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const defaultEmptyLabel = t('flux.common.noData');
  const schemaProps = useSchemaProps(props);
  const normalizedSchema = useMemo(() => normalizeCrudSchema(schemaProps as CrudSchema), [schemaProps]);
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();

  const ownerPaths = useMemo(() => createCrudOwnerPaths({ id: props.id, cid: props.meta.cid, schema: normalizedSchema }), [normalizedSchema, props.id, props.meta.cid]);
  const defaultQuery = useMemo(
    () => ({ ...toRecord(normalizedSchema.defaultParams), ...toRecord(normalizedSchema.queryForm?.defaultParams), ...toRecord(normalizedSchema.queryForm?.data) }),
    [normalizedSchema.defaultParams, normalizedSchema.queryForm?.data, normalizedSchema.queryForm?.defaultParams]
  );

  const { queryState, paginationState, sortState, filterState, selectedRowKeys } = useCrudRuntimeState({
    scope,
    ownerStatePath: ownerPaths.ownerStatePath,
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
  }, [filterState, ownerPaths.ownerStatePath, paginationState, queryState, scope, selectedRowKeys, sortState]);

  const resolvedSource = useMemo(() => normalizeCrudSourceValue(schemaProps.source), [schemaProps.source]);
  const source = resolvedSource.rows.length > 0 ? resolvedSource.rows : EMPTY_ROWS;
  const effectiveQuery = queryState.refreshCount > 0 ? queryState.values : defaultQuery;
  const filteredRows = useMemo(() => applyQueryToRows(source, effectiveQuery), [effectiveQuery, source]);
  const internalTableRef = useRef<InternalTableHandle>({});
  const queryStatePath = ownerPaths.queryStatePath;
  const paginationStatePath = ownerPaths.paginationStatePath;
  const sortStatePath = ownerPaths.sortStatePath;
  const filterStatePath = ownerPaths.filterStatePath;
  const selectionStatePath = ownerPaths.selectionStatePath;
  const shouldFetchOnQueryChange = normalizedSchema.clientMode?.loadDataOnce === true
    ? normalizedSchema.clientMode.fetchOnFilter === true
    : true;
  const defaultColumnNames = useMemo(
    () => (normalizedSchema.columns ?? []).filter((column) => column.hidden !== true).map((column, index) => column.name ?? `column-${index}`),
    [normalizedSchema.columns]
  );
  const visibleColumnNames = useCrudVisibleColumnNames({
    schema: normalizedSchema,
    defaultColumnNames,
    toggledColumnsStatePath: ownerPaths.toggledColumnsStatePath,
    orderedColumnsStatePath: ownerPaths.orderedColumnsStatePath,
  });

  const handleRefresh = useCallback(() => {
    internalTableRef.current?.refreshSource?.();
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      internalTableRef.current?.clearSelection?.();
      scope?.update(selectionStatePath, []);
    }

    scope?.update(queryStatePath, {
      values: queryState.values,
      refreshCount: queryState.refreshCount + 1,
    });

    props.events.onRefresh?.(undefined, {
      // Keep refresh actions on the owner scope so runtime-owned refreshSource can resolve the upstream source entry.
      scope,
    });
  }, [normalizedSchema.autoClearSelectionOnRefresh, props.events, queryState.refreshCount, queryState.values, queryStatePath, scope, selectionStatePath]);

  const queryFormId = `${props.id}-query-form`;
  const { handleQuerySubmit, handleQueryReset } = useCrudQueryBridge({
    componentRegistry,
    queryFormId,
    scope,
    queryStatePath,
    paginationStatePath,
    queryState,
    paginationState,
    defaultQuery,
    shouldFetchOnQueryChange,
    onQuerySubmit: props.events.onQuerySubmit,
    onQueryReset: props.events.onQueryReset,
  });

  const summary = useMemo<CrudStatusSummary>(() => ({
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
  }), [effectiveQuery, filterState, filteredRows.length, paginationState, resolvedSource.total, selectedRowKeys, sortState, visibleColumnNames]);

  useCrudHandle(props, internalTableRef, handleRefresh);
  useCrudStatusPublisher(scope, normalizedSchema.statusPath, summary);

  useEffect(() => {
    scope?.update('$crud', summary);
  }, [scope, summary]);

  const toolbarContent = resolveRendererSlotContent(props, 'toolbar');
  const listActionsContent = resolveRendererSlotContent(props, 'listActions');
  const footerToolbarContent = resolveRendererSlotContent(props, 'footerToolbar');
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: defaultEmptyLabel });

  const headerBlocks = useMemo(() => normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'header'), [normalizedSchema.toolbarLayout]);
  const footerBlocks = useMemo(() => normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'footer'), [normalizedSchema.toolbarLayout]);
  const hasToolbar = hasRendererSlotContent(toolbarContent);
  const hasListActions = hasRendererSlotContent(listActionsContent);
  const hasFooterToolbar = hasRendererSlotContent(footerToolbarContent);

  const tableSchema = useMemo<BaseSchema>(() => {
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
        enabled: true,
        currentPage: paginationState.currentPage,
        pageSize: paginationState.pageSize,
        pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
        showSizeChanger: true,
      },
      empty: typeof emptyContent === 'string' ? emptyContent : defaultEmptyLabel,
      quickSaveAction: normalizedSchema.quickSaveAction,
      quickSaveItemAction: normalizedSchema.quickSaveItemAction,
    };

    if (normalizedSchema.selectionOwnership) {
      base.rowSelection = { type: normalizedSchema.selection?.type ?? 'checkbox', selectedRowKeys };
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

    return base as BaseSchema;
  }, [defaultEmptyLabel, emptyContent, filterStatePath, filteredRows, normalizedSchema.columnSettings, normalizedSchema.columns, normalizedSchema.onRefresh, normalizedSchema.onRowClick, normalizedSchema.quickSaveAction, normalizedSchema.quickSaveItemAction, normalizedSchema.responsive, normalizedSchema.rowKey, normalizedSchema.selection?.type, normalizedSchema.selectionOwnership, paginationState.currentPage, paginationState.pageSize, paginationStatePath, props.id, selectedRowKeys, selectionStatePath, sortStatePath]);

  const queryFormSchema = useMemo<BaseSchema | null>(() => {
    const queryForm = normalizedSchema.queryForm;
    if (!queryForm?.body) {
      return null;
    }

    const base: Record<string, unknown> = {
      type: 'form',
      id: queryFormId,
      data: queryState.values,
      body: queryForm.body,
      mode: queryForm.layout === 'horizontal' ? 'horizontal' : 'normal',
      submitAction: {
        action: 'setValue',
        args: {
          path: queryStatePath,
          value: {
            values: '${$form.values}',
            refreshCount: queryState.refreshCount + 1,
          },
        },
      },
    };

    if (queryForm.actions !== undefined) {
      base.actions = queryForm.actions;
    }

    if (queryForm.statusPath !== undefined) {
      base.statusPath = queryForm.statusPath;
    }

    if (normalizedSchema.onQuerySubmit && shouldFetchOnQueryChange) {
      base.onSubmitSuccess = normalizedSchema.onQuerySubmit;
    }

    return base as BaseSchema;
  }, [normalizedSchema.onQuerySubmit, normalizedSchema.queryForm, queryFormId, queryState.refreshCount, queryState.values, queryStatePath, shouldFetchOnQueryChange]);

  const handleToolbarPageChange = useCallback((page: number) => {
    scope?.update(paginationStatePath, { currentPage: page, pageSize: paginationState.pageSize });
  }, [paginationState.pageSize, paginationStatePath, scope]);

  const handleToolbarPageSizeChange = useCallback((pageSize: number) => {
    scope?.update(paginationStatePath, { currentPage: 1, pageSize });
  }, [paginationStatePath, scope]);

  return (
    <div className={cn('nop-crud', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {queryFormSchema ? (
        <div className="nop-crud-query" data-slot="crud-query">
          {props.helpers.render(queryFormSchema, { pathSuffix: 'queryForm' })}
          <div className="mt-2 flex gap-2" data-slot="crud-query-controls">
            <Button variant="outline" size="sm" onClick={() => void handleQuerySubmit()}>{t('flux.common.search')}</Button>
            <Button variant="outline" size="sm" onClick={handleQueryReset}>{t('flux.common.reset')}</Button>
          </div>
        </div>
      ) : null}

      {hasToolbar || hasListActions || headerBlocks.length > 0 ? (
        <div className="nop-crud-toolbar" data-slot="crud-toolbar">
          {hasToolbar ? <div data-slot="crud-toolbar-main">{toolbarContent}</div> : null}
          {hasListActions ? <div data-slot="crud-list-actions">{listActionsContent}</div> : null}
          <CrudToolbarBlocks slot="header" blocks={headerBlocks} summary={summary} listActionsContent={listActionsContent} hasListActions={hasListActions} pagination={paginationState} onPageChange={handleToolbarPageChange} onPageSizeChange={handleToolbarPageSizeChange} />
        </div>
      ) : null}

      <div className="nop-crud-table" data-slot="crud-table">
        {props.helpers.render(tableSchema, { pathSuffix: 'table' })}
      </div>

      {hasFooterToolbar || footerBlocks.length > 0 ? (
        <div className="nop-crud-footer" data-slot="crud-footer">
          {hasFooterToolbar ? <div data-slot="crud-footer-toolbar">{footerToolbarContent}</div> : null}
          {footerBlocks.length > 0 ? (
            <>
              <Separator />
              <CrudToolbarBlocks slot="footer" blocks={footerBlocks} summary={summary} listActionsContent={listActionsContent} hasListActions={hasListActions} pagination={paginationState} onPageChange={handleToolbarPageChange} onPageSizeChange={handleToolbarPageSizeChange} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
