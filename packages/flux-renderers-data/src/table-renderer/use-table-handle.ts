import { useEffect, useMemo } from 'react';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas';
import { toSelectionPayload } from './table-data';

export function useTableHandle(
  props: RendererComponentProps<TableSchema>,
  currentPage: number,
  pageSize: number,
  selectedRowKeys: Set<string>,
  selectionOwnership: string,
  selectionStatePath: string | undefined,
  paginationOwnership: string,
  paginationStatePath: string | undefined,
  setSelectionExternal: (keys: Set<string>) => void
) {
  const componentRegistry = useCurrentComponentRegistry();
  const { helpers, events } = props;

  const tableHandle = useMemo<ComponentHandle>(() => ({
    id: props.id,
    type: 'table',
    capabilities: {
      invoke(method, payload, ctx) {
        switch (method) {
          case 'refresh': {
            if (events.onRefresh) {
              events.onRefresh(null, {
                scope: ctx.scope,
                actionScope: ctx.actionScope,
                componentRegistry: ctx.componentRegistry,
                form: ctx.form,
                page: ctx.page,
                node: ctx.node,
                nodeInstance: ctx.nodeInstance
              });
            } else {
              events.onPageChange?.(null, {
                scope: helpers.createScope({ page: currentPage, pageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
                actionScope: ctx.actionScope,
                componentRegistry: ctx.componentRegistry,
                form: ctx.form,
                page: ctx.page,
                node: ctx.node,
                nodeInstance: ctx.nodeInstance
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
          selectedRowKeys: Array.from(selectedRowKeys)
        };
      },
      store: undefined
    }
  }), [
    props.id,
    events,
    helpers,
    currentPage,
    pageSize,
    selectedRowKeys,
    selectionOwnership,
    selectionStatePath,
    paginationOwnership,
    paginationStatePath,
    setSelectionExternal,
  ]);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    return componentRegistry.register(tableHandle, {
      cid: props.meta.cid,
      locator: props.nodeInstance.locator
    });
  }, [componentRegistry, tableHandle, props.meta.cid, props.nodeInstance.locator]);
}
