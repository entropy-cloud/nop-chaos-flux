import { useEffect, useRef } from 'react';
import { toRecord } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  useCurrentComponentRegistry,
  useRenderScope,
  useRendererEnv,
  useSchemaProps,
} from '@nop-chaos/flux-react';
import { createReadonlyScopeBinding } from '@nop-chaos/flux-react/unstable';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Separator, cn } from '@nop-chaos/ui';
import type { CrudSchema, CrudStatusSummary } from './crud-schema.js';
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
  type InternalTableHandle,
} from './crud-renderer-state.js';
import { CrudToolbarBlocks, normalizeToolbarBlocks } from './crud-renderer-toolbar.js';
import type { TableSchema } from './schemas.js';
import {
  createCrudOwnerPaths,
  useCrudQueryBridge,
  useCrudVisibleColumnNames,
} from './crud-renderer-ownership.js';

type CrudRefreshContext = Parameters<NonNullable<RendererComponentProps<CrudSchema>['events']['onRefresh']>>[1];

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const defaultEmptyLabel = t('flux.common.noData');
  const onRefresh = props.events.onRefresh;
  const nodeScope = props.node.scope;
  const schemaProps = useSchemaProps(props);
  const authoredSchema = props.templateNode.schema as CrudSchema | undefined;
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
  const internalTableRef = useRef<InternalTableHandle>({});
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
  const quickSaveAction = normalizedSchema.quickSaveAction ?? authoredSchema?.quickSaveAction;
  const quickSaveItemAction =
    normalizedSchema.quickSaveItemAction ?? authoredSchema?.quickSaveItemAction;
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
    internalTableRef.current?.refreshSource?.();
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      internalTableRef.current?.clearSelection?.();
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

  const queryFormId = `${props.id}-query-form`;
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

  useCrudHandle(props, internalTableRef, handleRefresh);
  useCrudStatusPublisher(scope, normalizedSchema.statusPath, summary);

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
  const emptyContent = resolveCrudSlotContent('empty', { fallback: defaultEmptyLabel });
  const tableEmpty = typeof emptyContent === 'string' ? emptyContent : defaultEmptyLabel;

  const headerBlocks = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'header');
  const footerBlocks = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'footer');
  const hasToolbar = hasRendererSlotContent(asReactNode(toolbarContent));
  const hasListActions = hasRendererSlotContent(asReactNode(listActionsContent));
  const hasFooterToolbar = hasRendererSlotContent(asReactNode(footerToolbarContent));

  const tableSchema: TableSchema = (() => {
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
      empty: tableEmpty,
      quickSaveAction,
      quickSaveItemAction,
    };

    if (normalizedSchema.selection) {
      base.rowSelection = { type: normalizedSchema.selection.type ?? 'checkbox', selectedRowKeys };
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
  const tableRendererProps: RendererComponentProps<TableSchema> =
    ({
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
    }) satisfies RendererComponentProps<TableSchema>;

  const queryFormSchema: BaseSchema | null = (() => {
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
      };

    if (queryForm.actions !== undefined) {
      base.actions = queryForm.actions;
    }

    if (queryForm.statusPath !== undefined) {
      base.statusPath = queryForm.statusPath;
    }

    return base as BaseSchema;
  })();

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
      {queryFormSchema ? (
        <div className="nop-crud-query" data-slot="crud-query">
          {asReactNode(
            props.helpers.render(queryFormSchema, { pathSuffix: 'queryForm', scope: crudScope }),
          )}
          <div className="mt-2 flex gap-2" data-slot="crud-query-controls">
            <Button variant="outline" size="sm" onClick={handleQuerySubmitWithFeedback}>
              {t('flux.common.search')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleQueryReset}>
              {t('flux.common.reset')}
            </Button>
          </div>
        </div>
      ) : null}

      {hasToolbar || hasListActions || headerBlocks.length > 0 ? (
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
          />
        </div>
      ) : null}

      <div className="nop-crud-table" data-slot="crud-table">
        <TableRenderer {...tableRendererProps} />
      </div>

      {hasFooterToolbar || footerBlocks.length > 0 ? (
        <div className="nop-crud-footer" data-slot="crud-footer">
          {hasFooterToolbar ? (
            <div data-slot="crud-footer-toolbar">{asReactNode(footerToolbarContent)}</div>
          ) : null}
          {footerBlocks.length > 0 ? (
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
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
