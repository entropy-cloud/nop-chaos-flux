import { useEffect } from 'react';
import type { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { matchesShortcut } from './designer-page-helpers.js';
import { focusDesignerCanvasSurface } from './designer-canvas-focus.js';
import type { DesignerCommand } from './designer-command-types.js';

type DesignerCoreLike = ReturnType<typeof createDesignerCore>;

export function useDesignerShortcuts(args: {
  core: DesignerCoreLike;
  rootRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (command: DesignerCommand) => unknown;
  readOnly?: boolean;
}) {
  const { core, rootRef, dispatch, readOnly = false } = args;

  useEffect(() => {
    if (!core.getConfig().features.shortcuts) {
      return;
    }

    const shortcuts = core.getConfig().shortcuts;
    const features = core.getConfig().features;
    const canUseClipboard = features.clipboard !== false;
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const isInsideDesigner = (target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return false;
      }

      return rootRef.current?.contains(target) ?? false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !isInsideDesigner(event.target)) {
        return;
      }

      if (readOnly) {
        return;
      }

      if (matchesShortcut(event, shortcuts.undo) && features.undo !== false) {
        event.preventDefault();
        dispatch({ type: 'undo' });
        return;
      }
      if (matchesShortcut(event, shortcuts.redo) && features.redo !== false) {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.copy)) {
        event.preventDefault();
        dispatch({ type: 'copySelection' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.paste)) {
        event.preventDefault();
        dispatch({ type: 'pasteClipboard' });
        return;
      }
      if (matchesShortcut(event, shortcuts.selectAll)) {
        event.preventDefault();
        dispatch({ type: 'selectAll' });
        return;
      }
      // Ctrl+D duplicates the active/first-selected node; tree mode routes node
      // duplication through tree-owned commands, so the graph-only command
      // would just surface an "unavailable" toast.
      if (
        canUseClipboard &&
        core.getConfig().documentMode !== 'tree' &&
        matchesShortcut(event, shortcuts.duplicate)
      ) {
        event.preventDefault();
        const snapshot = core.getSnapshot();
        const activeNodeId =
          snapshot.activeNode?.id ?? snapshot.selection.selectedNodeIds[0] ?? undefined;
        if (activeNodeId) {
          dispatch({ type: 'duplicateNode', nodeId: activeNodeId });
        }
        return;
      }
      if (matchesShortcut(event, shortcuts.delete)) {
        event.preventDefault();
        dispatch({ type: 'deleteSelection' });
        // 删除会卸载持有 DOM 焦点的节点卡片（role=button tabIndex=0），浏览器把焦点
        // 回落到 <body>，紧随的 undo/redo 键在 isInsideDesigner 处被整个拦掉——
        // 表现为删除“不可撤销”（P0-MA5.1-002）。与节点 x-button 删除路径
        // （designer-xyflow-node onDelete）一致，把焦点交还画布表面。
        focusDesignerCanvasSurface(core);
        return;
      }
      // plan 526 Phase 3【执行期勘误】：方向键微调采用 xyflow 12.10 原生能力——
      // NodeWrapper/NodesSelection 的 onKeyDown 对选中节点按 snapGrid（snapToGrid 开启时）
      // 或 5px（关闭时）步进、Shift ×4，位置经 dragging:false change 落到本仓库
      // use-xyflow-interactions 的 moveNode 提交链（可撤销，与拖拽同路）。
      // 此前自实现的 1px nudge 与原生处理叠加造成一步双移，已移除（见 plan Deferred）。
      if (matchesShortcut(event, shortcuts.save)) {
        event.preventDefault();
        dispatch({ type: 'save' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [core, dispatch, rootRef, readOnly]);
}
