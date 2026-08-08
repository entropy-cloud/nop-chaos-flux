import { ConnectionDragController } from './connection/connection-drag-controller.js';
import { ConnectionOverlayRenderer } from './connection/connection-overlay-renderer.js';
import { findNodeInWorking } from './editor-working-helpers.js';
import type { EditorRuntimeContext } from './runtime-factories.js';
import type { EditorRuntimeMutators } from './runtime-mutators.js';

/**
 * 连线拖拽控制器 wiring + DOM pointer listeners（plan 2026-08-07-1835-2 Phase 1 / multi P1-03）。
 *
 * 从 `use-editor-engine.ts` 抽出（E8 M-1 修正：接通连线三段式 pointer 交互状态机到生产路径，
 * design-connection.md §4.2）。控制器驱动纯逻辑状态机（begin/update/commit）+ overlay 投影，
 * DOM pointer 事件经此入口。提交经 onCommit 写 working copy + undo 栈。
 *
 * 返回 cleanup fn——unmount / 模式切换时退订，防泄漏（R5 不泄漏验证 #4）。
 */
export function wireConnectionDrag(
  ctx: EditorRuntimeContext,
  container: HTMLDivElement,
  writeConnection: EditorRuntimeMutators['writeConnection'],
): () => void {
  const { engine, session, connectionDragActiveRef } = ctx;

  const overlayRenderer = new ConnectionOverlayRenderer(engine);
  const connectionController = new ConnectionDragController(
    {
      getSymbols: () => session.workingConfig.symbols,
      findNode: (id) => findNodeInWorking(session.workingConfig.symbols, id),
      viewportToWorld: (p) => engine.getWorldPoint(p),
    },
    {
      onOverlayUpdate: (state) => overlayRenderer.update(state),
      onCommit: (result) => {
        writeConnection(result.junctionId, result.connections);
      },
    },
  );
  const toViewportPoint = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  // HCA11-P2-2：pointerup 终止态挂 window（{ once: true }），对齐 editor-adapter.ts:80 transform 事务。
  // 释放点在容器外（inspector/palette/browser 边缘）时 container 级 pointerup 不 fire，window 级捕获。
  // 幂等：if (!connectionDragActiveRef.current) return 使容器内 + window 双触发安全（once 自动移除 window listener）。
  const endConnectionDrag = (): void => {
    if (!connectionDragActiveRef.current) return;
    connectionDragActiveRef.current = false;
    connectionController.endDrag();
  };
  const onConnectionPointerDown = (e: PointerEvent) => {
    if (session.mode !== 'edit') return;
    const junction = connectionController.hitTestJunction(toViewportPoint(e));
    if (!junction) return;
    connectionDragActiveRef.current = true;
    connectionController.beginDrag(junction.id);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', endConnectionDrag, { once: true });
    }
    e.preventDefault();
  };
  const onConnectionPointerMove = (e: PointerEvent) => {
    if (!connectionDragActiveRef.current) return;
    connectionController.moveDrag(toViewportPoint(e));
  };
  container.addEventListener('pointerdown', onConnectionPointerDown);
  container.addEventListener('pointermove', onConnectionPointerMove);

  return () => {
    container.removeEventListener('pointerdown', onConnectionPointerDown);
    container.removeEventListener('pointermove', onConnectionPointerMove);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', endConnectionDrag);
    }
    connectionDragActiveRef.current = false;
    connectionController.cancel();
    overlayRenderer.clear();
  };
}
