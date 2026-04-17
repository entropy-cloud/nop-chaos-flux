import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BaseSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import {
  useCurrentComponentRegistry,
  useRenderScope,
  useSchemaProps,
  hasRendererSlotContent,
  resolveRendererSlotContent
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { CrudSchema, CrudStatusSummary } from './crud-schema';
import { normalizeCrudSchema } from './crud-schema';

const EMPTY_ROWS: unknown[] = [];

interface InternalTableHandle {
  refreshSource?: () => void;
  getSelection?: () => string[];
  clearSelection?: () => void;
}

function useCrudStatusPublisher(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: CrudStatusSummary
) {
  const prevSummaryRef = useRef<CrudStatusSummary | undefined>(undefined);

  useEffect(() => {
    if (!scope || !statusPath) {
      return;
    }

    const prev = prevSummaryRef.current;
    const summaryRecord = summary as unknown as Record<string, unknown>;
    const prevRecord = prev as unknown as Record<string, unknown> | undefined;
    if (prevRecord && Object.keys(summaryRecord).every((k) => prevRecord[k] === summaryRecord[k])) {
      return;
    }

    prevSummaryRef.current = summary;
    scope.update(statusPath, summary);
  }, [scope, statusPath, summary]);
}

function useCrudHandle(
  props: RendererComponentProps<CrudSchema>,
  internalTableRef: React.RefObject<InternalTableHandle>,
  handleRefresh: () => void
) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;
  const name = (props.schema as CrudSchema).name;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }

    return componentRegistry.register(
      {
        id,
        name,
        type: 'crud',
        capabilities: {
          hasMethod(method) {
            return ['refresh', 'getSelection', 'clearSelection'].includes(method);
          },
          listMethods() {
            return ['refresh', 'getSelection', 'clearSelection'];
          },
          async invoke(method, _payload) {
            switch (method) {
              case 'refresh':
                handleRefresh();
                return { ok: true };
              case 'getSelection':
                return { ok: true, data: internalTableRef.current?.getSelection?.() ?? [] };
              case 'clearSelection':
                internalTableRef.current?.clearSelection?.();
                return { ok: true };
              default:
                return { ok: false, error: new Error(`Unknown method: ${method}`) };
            }
          },
        },
      },
      { cid }
    );
  }, [componentRegistry, cid, id, name, internalTableRef, handleRefresh]);
}

function useCrudSummary(
  source: unknown[] | undefined,
  selectedRowKeys: string[],
  loading: boolean
): CrudStatusSummary {
  return useMemo<CrudStatusSummary>(() => ({
    loading,
    refreshing: loading,
    itemCount: source?.length ?? 0,
    total: source?.length,
    hasSelection: selectedRowKeys.length > 0,
    selectionCount: selectedRowKeys.length,
    selectedRowKeys,
  }), [source?.length, selectedRowKeys, loading]);
}

export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
  const schemaProps = useSchemaProps(props);
  const normalizedSchema = useMemo(() => normalizeCrudSchema(schemaProps as CrudSchema), [schemaProps]);
  const scope = useRenderScope();

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [loading] = useState(false);

  const source = useMemo(() => {
    const src = schemaProps.source;
    if (Array.isArray(src)) {
      return src as unknown[];
    }
    return EMPTY_ROWS;
  }, [schemaProps.source]);

  const internalTableRef = useRef<InternalTableHandle>({});

  const handleRefresh = useCallback(() => {
    internalTableRef.current?.refreshSource?.();
    if (normalizedSchema.autoClearSelectionOnRefresh) {
      internalTableRef.current?.clearSelection?.();
      setSelectedRowKeys([]);
    }
  }, [normalizedSchema.autoClearSelectionOnRefresh]);

  const summary = useCrudSummary(source, selectedRowKeys, loading);

  useCrudHandle(props, internalTableRef, handleRefresh);
  useCrudStatusPublisher(scope, normalizedSchema.statusPath, summary);

  useEffect(() => {
    if (scope) {
      scope.update('$crud', summary);
    }
  }, [scope, summary]);

  const toolbarContent = resolveRendererSlotContent(props, 'toolbar');
  const bulkActionsContent = resolveRendererSlotContent(props, 'bulkActions');
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: '暂无数据' });

  const hasToolbar = hasRendererSlotContent(toolbarContent);
  const hasBulkActions = hasRendererSlotContent(bulkActionsContent);
  const hasQueryForm = normalizedSchema.queryForm && normalizedSchema.queryForm.body;

  const crudId = props.id;

  const tableSchema = useMemo<BaseSchema>(() => {
    const columns = normalizedSchema.columns ?? [];
    return {
      type: 'table',
      id: `${crudId}-table`,
      source: source,
      columns: columns,
      rowKey: normalizedSchema.rowKey,
      rowSelection: normalizedSchema.selectionOwnership ? { enabled: true, type: 'checkbox' } : undefined,
      selectionOwnership: normalizedSchema.selectionOwnership,
      selectionStatePath: normalizedSchema.selectionStatePath,
      paginationOwnership: normalizedSchema.paginationOwnership,
      paginationStatePath: normalizedSchema.paginationStatePath,
      sortOwnership: normalizedSchema.sortOwnership,
      sortStatePath: normalizedSchema.sortStatePath,
      filterOwnership: normalizedSchema.filterOwnership,
      filterStatePath: normalizedSchema.filterStatePath,
      empty: typeof emptyContent === 'string' ? emptyContent : '暂无数据',
    } as BaseSchema;
  }, [crudId, source, normalizedSchema, emptyContent]);

  return (
    <div
      className={cn('nop-crud', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasQueryForm ? (
        <div className="nop-crud-query" data-slot="crud-query">
          {props.regions.queryForm?.render()}
        </div>
      ) : null}

      {hasToolbar || hasBulkActions ? (
        <div className="nop-crud-toolbar" data-slot="crud-toolbar">
          {hasToolbar ? <div data-slot="crud-toolbar-main">{toolbarContent}</div> : null}
          {hasBulkActions ? <div data-slot="crud-bulk-actions">{bulkActionsContent}</div> : null}
        </div>
      ) : null}

      <div className="nop-crud-table" data-slot="crud-table">
        {props.helpers.render(tableSchema, { pathSuffix: 'table' })}
      </div>
    </div>
  );
}
