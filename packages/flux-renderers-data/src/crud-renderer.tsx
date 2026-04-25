import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  toRecord,
  useCrudHandle,
  useCrudRuntimeState,
  useCrudStatusPublisher,
  type InternalTableHandle,
} from './crud-renderer-state';
import { CrudToolbarBlocks, normalizeToolbarBlocks } from './crud-renderer-toolbar';

function readQueryValues(container: HTMLElement | null): Record<string, unknown> {
  if (!container) {
    return {};
  }

  const values: Record<string, unknown> = {};
  const fields = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    '[data-slot="form-body"] input[name], [data-slot="form-body"] textarea[name], [data-slot="form-body"] select[name]'
  );

  fields.forEach((field) => {
    const key = field.name;
    if (!key) {
      return;
    }

    if (field instanceof HTMLInputElement) {
      if (field.type === 'checkbox') {
        values[key] = field.checked;
        return;
      }

      if (field.type === 'radio') {
        if (field.checked) {
          values[key] = field.value;
        }
        return;
      }
    }

    values[key] = field.value;
  });

  return values;
}

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const defaultEmptyLabel = t('flux.common.noData');
  const schemaProps = useSchemaProps(props);
  const normalizedSchema = useMemo(() => normalizeCrudSchema(schemaProps as CrudSchema), [schemaProps]);
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();

  const ownerStatePath = useMemo(() => `$_crud.${props.id ?? props.meta.cid ?? 'crud'}`, [props.id, props.meta.cid]);
  const defaultQuery = useMemo(
    () => ({ ...toRecord(normalizedSchema.defaultParams), ...toRecord(normalizedSchema.queryForm?.defaultParams), ...toRecord(normalizedSchema.queryForm?.data) }),
    [normalizedSchema.defaultParams, normalizedSchema.queryForm?.data, normalizedSchema.queryForm?.defaultParams]
  );

  const { queryState, paginationState, sortState, filterState, selectedRowKeys } = useCrudRuntimeState({
    scope,
    ownerStatePath,
    queryStatePath: `${ownerStatePath}.query`,
    paginationStatePath: normalizedSchema.paginationStatePath ?? `${ownerStatePath}.pagination`,
    sortStatePath: normalizedSchema.sortStatePath ?? `${ownerStatePath}.sort`,
    filterStatePath: normalizedSchema.filterStatePath ?? `${ownerStatePath}.filters`,
    selectionStatePath: normalizedSchema.selectionStatePath ?? `${ownerStatePath}.selection`,
    defaultQuery,
    fallbackPageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    if (!scope) {
      return;
    }

    scope.update(ownerStatePath, {
      query: queryState,
      pagination: paginationState,
      sort: sortState,
      filters: filterState,
      selection: selectedRowKeys,
    });
  }, [filterState, ownerStatePath, paginationState, queryState, scope, selectedRowKeys, sortState]);

  const resolvedSource = useMemo(() => normalizeCrudSourceValue(schemaProps.source), [schemaProps.source]);
  const source = resolvedSource.rows.length > 0 ? resolvedSource.rows : EMPTY_ROWS;
  const effectiveQuery = queryState.refreshCount > 0 ? queryState.values : defaultQuery;
  const filteredRows = useMemo(() => applyQueryToRows(source, effectiveQuery), [effectiveQuery, source]);
  const [loading] = useState(false);
  const internalTableRef = useRef<InternalTableHandle>({});
  const queryContainerRef = useRef<HTMLDivElement>(null);

  const queryStatePath = `${ownerStatePath}.query`;
  const paginationStatePath = normalizedSchema.paginationStatePath ?? `${ownerStatePath}.pagination`;
  const sortStatePath = normalizedSchema.sortStatePath ?? `${ownerStatePath}.sort`;
  const filterStatePath = normalizedSchema.filterStatePath ?? `${ownerStatePath}.filters`;
  const selectionStatePath = normalizedSchema.selectionStatePath ?? `${ownerStatePath}.selection`;
  const shouldFetchOnQueryChange = normalizedSchema.clientMode?.loadDataOnce === true
    ? normalizedSchema.clientMode.fetchOnFilter === true
    : true;

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

  const handleQuerySubmit = useCallback(async () => {
    const nextValues = readQueryValues(queryContainerRef.current);
    const handle = componentRegistry?.resolve({ componentId: queryFormId });
    if (handle?.capabilities?.hasMethod?.('submit')) {
      await handle.capabilities.invoke('submit', undefined, {} as never);

      if (shouldFetchOnQueryChange) {
        props.events.onQuerySubmit?.(undefined, {
          scope,
          evaluationBindings: { query: nextValues },
        });
      }

      return;
    }

    if (scope) {
      scope.update(queryStatePath, {
        values: nextValues,
        refreshCount: queryState.refreshCount + 1,
      });
    }

    if (shouldFetchOnQueryChange) {
      props.events.onQuerySubmit?.(undefined, {
        scope,
        evaluationBindings: { query: nextValues },
      });
    }
  }, [componentRegistry, props.events, queryFormId, queryState.refreshCount, queryStatePath, scope, shouldFetchOnQueryChange]);

  const summary = useMemo<CrudStatusSummary>(() => ({
    loading,
    refreshing: loading,
    itemCount: filteredRows.length,
    total: resolvedSource.total,
    hasSelection: selectedRowKeys.length > 0,
    selectionCount: selectedRowKeys.length,
    selectedRowKeys,
    query: effectiveQuery,
    pagination: paginationState,
    sort: sortState,
    filters: filterState,
  }), [effectiveQuery, filterState, filteredRows.length, loading, paginationState, resolvedSource.total, selectedRowKeys, sortState]);

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

  const handleQueryReset = useCallback(() => {
    const handle = componentRegistry?.resolve({ componentId: queryFormId });
    if (handle?.capabilities?.hasMethod?.('reset')) {
      void handle.capabilities.invoke('reset', { values: defaultQuery }, {} as never);
    }

    if (!scope) {
      return;
    }

    startTransition(() => {
      scope.update(queryStatePath, { values: defaultQuery, refreshCount: queryState.refreshCount + 1 });
      scope.update(paginationStatePath, { currentPage: 1, pageSize: paginationState.pageSize });
    });

    if (shouldFetchOnQueryChange) {
      props.events.onQueryReset?.(undefined, {
        scope,
        evaluationBindings: { query: defaultQuery },
      });
    }
  }, [componentRegistry, defaultQuery, paginationState.pageSize, paginationStatePath, props.events, queryFormId, queryState.refreshCount, queryStatePath, scope, shouldFetchOnQueryChange]);

  const handleToolbarPageChange = useCallback((page: number) => {
    scope?.update(paginationStatePath, { currentPage: page, pageSize: paginationState.pageSize });
  }, [paginationState.pageSize, paginationStatePath, scope]);

  const handleToolbarPageSizeChange = useCallback((pageSize: number) => {
    scope?.update(paginationStatePath, { currentPage: 1, pageSize });
  }, [paginationStatePath, scope]);

  return (
    <div className={cn('nop-crud', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {queryFormSchema ? (
        <div className="nop-crud-query" data-slot="crud-query" ref={queryContainerRef}>
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
