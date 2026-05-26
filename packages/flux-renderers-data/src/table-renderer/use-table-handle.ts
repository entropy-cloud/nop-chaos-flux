import { useEffect, useMemo } from 'react';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { toPartialActionContext } from './capability-action-context.js';
import { toSelectionPayload } from './table-data.js';

export function useTableHandle(
  props: RendererComponentProps<TableSchema>,
  currentPage: number,
  pageSize: number,
  selectedRowKeys: Set<string>,
  selectionOwnership: string,
  selectionStatePath: string | undefined,
  paginationOwnership: string,
  paginationStatePath: string | undefined,
  setSelectionExternal: (keys: Set<string>) => void,
) {
  const componentRegistry = useCurrentComponentRegistry();
  const { events } = props;
  const nodeScope = props.node?.scope;

  const tableHandle = useMemo<ComponentHandle>(
    () => ({
      id: props.id,
      type: 'table',
      capabilities: {
        invoke(method, payload, ctx) {
          const actionContext = toPartialActionContext(ctx);
          switch (method) {
            case 'refresh': {
              if (events.onRefresh) {
                events.onRefresh(null, actionContext);
                } else {
                  const payload = { page: currentPage, pageSize };
                  events.onPageChange?.(null, {
                    scope: nodeScope ?? ctx?.scope,
                    actionScope: actionContext.actionScope,
                    componentRegistry: actionContext.componentRegistry,
                    form: actionContext.form,
                  page: actionContext.page,
                  nodeInstance: actionContext.nodeInstance,
                  evaluationBindings: payload,
                });
              }
              return { ok: true, data: { page: currentPage, pageSize } };
            }
            case 'getSelection': {
              return { ok: true, data: Array.from(selectedRowKeys) };
            }
            case 'setSelection': {
              const nextKeys = toSelectionPayload(payload);
              setSelectionExternal(nextKeys);
              return { ok: true, data: Array.from(nextKeys) };
            }
            default:
              return { ok: false, error: new Error(`Unsupported table handle method: ${method}`) };
          }
        },
        hasMethod(method) {
          return method === 'refresh' || method === 'getSelection' || method === 'setSelection';
        },
        listMethods() {
          return ['refresh', 'getSelection', 'setSelection'];
        },
        getDebugData() {
          return {
            paginationOwnership,
            selectionOwnership,
            paginationStatePath,
            selectionStatePath,
            currentPage,
            pageSize,
            selectedRowKeys: Array.from(selectedRowKeys),
          };
        },
        store: undefined,
      },
    }),
    [
      props.id,
      nodeScope,
      events,
      currentPage,
      pageSize,
      selectedRowKeys,
      selectionOwnership,
      selectionStatePath,
      paginationOwnership,
      paginationStatePath,
      setSelectionExternal,
    ],
  );

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    return componentRegistry.register(tableHandle, {
      cid: props.meta.cid,
    });
  }, [componentRegistry, tableHandle, props.meta.cid]);
}
