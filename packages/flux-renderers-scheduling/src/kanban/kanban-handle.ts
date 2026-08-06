import type { ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { BoardData } from './kanban.types.js';

/**
 * 22-12: design.md §8 声明的 component:* 句柄操作面。由 KanbanBoard 每次渲染后
 * 刷新镜像（calendar navRef 模式），句柄 invoke 经 getSurface() 读取最新操作面。
 */
export interface KanbanHandleSurface {
  scrollToCard: (cardId: string) => boolean;
  scrollToColumn: (columnId: string) => boolean;
  addCard: (columnId: string, card?: Record<string, any>, index?: number) => boolean;
  removeCard: (cardId: string) => boolean;
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => boolean;
  collapseColumn: (columnId: string, collapsed: boolean) => boolean;
  getData: () => BoardData;
  getColumnsCount: () => number;
}

export const KANBAN_HANDLE_METHODS = [
  'scrollToCard',
  'scrollToColumn',
  'addCard',
  'removeCard',
  'moveCard',
  'collapseColumn',
  'getData',
] as const;

/**
 * 注册 kanban ComponentHandle（gantt.tsx / calendar.tsx 同模式）。mutation 句柄
 * 在 controlled/受控模式下返回失败（mutation 被丢弃，不得声称已发生）。
 */
export function registerKanbanHandle(input: {
  componentRegistry: ComponentHandleRegistry;
  id?: string;
  cid?: number;
  getSurface: () => KanbanHandleSurface;
}): () => void {
  const { componentRegistry, id, cid, getSurface } = input;
  const handle: ComponentHandle = {
    id,
    type: 'kanban',
    capabilities: {
      invoke(method, payload) {
        const surface = getSurface();
        switch (method) {
          case 'scrollToCard': {
            const cardId = (payload as { cardId?: string } | undefined)?.cardId;
            if (typeof cardId !== 'string') {
              return { ok: false, error: new Error('kanban scrollToCard requires a cardId') };
            }
            return surface.scrollToCard(cardId)
              ? { ok: true }
              : { ok: false, error: new Error(`kanban card not found: ${cardId}`) };
          }
          case 'scrollToColumn': {
            const columnId = (payload as { columnId?: string } | undefined)?.columnId;
            if (typeof columnId !== 'string') {
              return { ok: false, error: new Error('kanban scrollToColumn requires a columnId') };
            }
            return surface.scrollToColumn(columnId)
              ? { ok: true }
              : { ok: false, error: new Error(`kanban column not found: ${columnId}`) };
          }
          case 'addCard': {
            const p = payload as
              | { columnId?: string; card?: Record<string, any>; options?: { index?: number }; index?: number }
              | undefined;
            const columnId = p?.columnId;
            if (typeof columnId !== 'string') {
              return { ok: false, error: new Error('kanban addCard requires a columnId') };
            }
            const ok = surface.addCard(columnId, p?.card, p?.options?.index ?? p?.index);
            return ok
              ? { ok: true }
              : { ok: false, error: new Error('kanban board is controlled; addCard mutation is disabled') };
          }
          case 'removeCard': {
            const cardId = (payload as { cardId?: string } | undefined)?.cardId;
            if (typeof cardId !== 'string') {
              return { ok: false, error: new Error('kanban removeCard requires a cardId') };
            }
            const ok = surface.removeCard(cardId);
            return ok
              ? { ok: true }
              : { ok: false, error: new Error('kanban card not found or board is controlled') };
          }
          case 'moveCard': {
            const p = payload as
              | { cardId?: string; toColumnId?: string; toIndex?: number }
              | undefined;
            if (typeof p?.cardId !== 'string' || typeof p?.toColumnId !== 'string') {
              return { ok: false, error: new Error('kanban moveCard requires cardId and toColumnId') };
            }
            const ok = surface.moveCard(p.cardId, p.toColumnId, typeof p.toIndex === 'number' ? p.toIndex : 0);
            return ok
              ? { ok: true }
              : { ok: false, error: new Error('kanban moveCard failed: card or column missing, or board is controlled') };
          }
          case 'collapseColumn': {
            const p = payload as { columnId?: string; collapsed?: boolean } | undefined;
            if (typeof p?.columnId !== 'string') {
              return { ok: false, error: new Error('kanban collapseColumn requires a columnId') };
            }
            const ok = surface.collapseColumn(p.columnId, p.collapsed === true);
            return ok
              ? { ok: true }
              : { ok: false, error: new Error('kanban board collapsed state is controlled; collapseColumn is disabled') };
          }
          case 'getData':
            return { ok: true, data: surface.getData() };
          default:
            return { ok: false, error: new Error(`Unsupported kanban method: ${method}`) };
        }
      },
      hasMethod(method) {
        return (KANBAN_HANDLE_METHODS as readonly string[]).includes(method);
      },
      listMethods() {
        return [...KANBAN_HANDLE_METHODS];
      },
      getDebugData() {
        return { columns: getSurface().getColumnsCount() };
      },
    },
  };
  return componentRegistry.register(handle, { cid });
}
