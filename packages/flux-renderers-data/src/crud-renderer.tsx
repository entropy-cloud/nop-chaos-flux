import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIn, type BaseSchema, type RendererComponentProps, type ScopeRef } from '@nop-chaos/flux-core';
import {
  useCurrentComponentRegistry,
  useRenderScope,
  useScopeSelector,
  useSchemaProps,
  hasRendererSlotContent,
  resolveRendererSlotContent
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
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
  const name = (props.props as CrudSchema).name as string | undefined;

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
  const defaultEmptyLabel = t('flux.common.noData');
  const schemaProps = useSchemaProps(props);
  const normalizedSchema = useMemo(() => normalizeCrudSchema(schemaProps as CrudSchema), [schemaProps]);
  const scope = useRenderScope();

  const selectedRowKeys = useScopeSelector(
    (scopeData) => {
      if (normalizedSchema.selectionOwnership !== 'scope' || !normalizedSchema.selectionStatePath) {
        return [] as string[];
      }

      const value = getIn(scopeData, normalizedSchema.selectionStatePath);
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }

      return [] as string[];
    },
    (a, b) => a.length === b.length && a.every((value, index) => value === b[index])
  );
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
  const listActionsContent = resolveRendererSlotContent(props, 'listActions');
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: defaultEmptyLabel });

  const hasToolbar = hasRendererSlotContent(toolbarContent);
  const hasListActions = hasRendererSlotContent(listActionsContent);
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
      empty: typeof emptyContent === 'string' ? emptyContent : defaultEmptyLabel,
    } as BaseSchema;
  }, [crudId, source, normalizedSchema, emptyContent, defaultEmptyLabel]);

  const queryFormSchema = useMemo<BaseSchema | null>(() => {
    const queryForm = normalizedSchema.queryForm;

    if (!queryForm?.body) {
      return null;
    }

    return {
      type: 'form',
      id: `${crudId}-query-form`,
      data: queryForm.data,
      body: queryForm.body,
      actions: queryForm.actions,
      statusPath: queryForm.statusPath,
      layout: queryForm.layout,
    } as BaseSchema;
  }, [crudId, normalizedSchema.queryForm]);

  return (
    <div
      className={cn('nop-crud', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasQueryForm && queryFormSchema ? (
        <div className="nop-crud-query" data-slot="crud-query">
          {props.helpers.render(queryFormSchema, { pathSuffix: 'queryForm' })}
        </div>
      ) : null}

      {hasToolbar || hasListActions ? (
        <div className="nop-crud-toolbar" data-slot="crud-toolbar">
          {hasToolbar ? <div data-slot="crud-toolbar-main">{toolbarContent}</div> : null}
          {hasListActions ? <div data-slot="crud-list-actions">{listActionsContent}</div> : null}
        </div>
      ) : null}

      <div className="nop-crud-table" data-slot="crud-table">
        {props.helpers.render(tableSchema, { pathSuffix: 'table' })}
      </div>
    </div>
  );
}
