import type { RendererEventHandler, ScopeRef } from '@nop-chaos/flux-core';

export interface PivotEventBinding {
  vtableEvent: string;
  handlerKey: string;
  payloadType: string;
}

/** VTable 实例事件 → schema 事件 handler 键 的静态桥接表（Failure Path pivot-event-bridge 挂载点）。 */
export const PIVOT_EVENT_BINDINGS: readonly PivotEventBinding[] = [
  { vtableEvent: 'click_cell', handlerKey: 'onCellClick', payloadType: 'pivot:cell-click' },
  { vtableEvent: 'selected_cell', handlerKey: 'onSelectionChange', payloadType: 'pivot:selection-change' },
  { vtableEvent: 'sort_click', handlerKey: 'onSort', payloadType: 'pivot:sort-click' },
  { vtableEvent: 'drillmenu_click', handlerKey: 'onDrill', payloadType: 'pivot:drill-click' },
  { vtableEvent: 'change_cell_value', handlerKey: 'onCellEdit', payloadType: 'pivot:cell-edit' },
];

export interface PivotEventsAttachOptions {
  instance: {
    on(event: string, handler: (args: unknown) => void): unknown;
    off?(event: string, handler: (args: unknown) => void): unknown;
  };
  /** 每次触发时读取的最新 handler 表（ref 镜像，避免闭包过期）。 */
  getHandlers: () => Readonly<Record<string, RendererEventHandler | undefined>>;
  scope: ScopeRef | undefined;
}

/** 注册 VTable 实例事件监听；返回注销函数。单个回调抛错被捕获，不影响表格（pivot-event-bridge）。 */
export function attachPivotEvents(options: PivotEventsAttachOptions): () => void {
  const { instance, getHandlers, scope } = options;
  const listeners = new Map<string, (args: unknown) => void>();
  for (const binding of PIVOT_EVENT_BINDINGS) {
    const listener = (rawArgs: unknown) => {
      const handler = getHandlers()[binding.handlerKey];
      if (!handler) {
        return;
      }
      const raw =
        rawArgs && typeof rawArgs === 'object' ? (rawArgs as Record<string, unknown>) : {};
      const { col, row } = raw;
      const payload = {
        type: binding.payloadType,
        ...raw,
        col,
        row,
      };
      try {
        void handler(payload, { event: payload, evaluationBindings: payload, scope });
      } catch (error) {
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error(`[pivot-table] 事件 ${binding.vtableEvent} 回调抛错`, error);
        }
      }
    };
    instance.on(binding.vtableEvent, listener);
    listeners.set(binding.vtableEvent, listener);
  }
  return () => {
    for (const binding of PIVOT_EVENT_BINDINGS) {
      const listener = listeners.get(binding.vtableEvent);
      if (listener && typeof instance.off === 'function') {
        instance.off(binding.vtableEvent, listener);
      }
    }
  };
}
