import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { GutterMarker, gutter } from '@codemirror/view';
import { sourcePathFacet } from './source-path.js';
import { breakpointsField } from './fields.js';
import type { DebugStore } from '../state/debug-store.js';

/** 断点 gutter 标记。 */
export class BreakpointMarker extends GutterMarker {
  override toDOM() {
    const span = document.createElement('span');
    span.className = 'xlang-debug-breakpoint-marker';
    span.textContent = '●';
    return span;
  }
}

const breakpointMarker = new BreakpointMarker();

/**
 * 断点 gutter（family: breakpoints，D5 §3.4）：断点集合经 Effect→StateField 下行
 * （sync 桥派发）；gutter 点击读 state.field + 调 store.toggleBreakpoint（点击是
 * 无状态 DOM 事件，不消费 store 下行）。
 */
/**
 * gutter 点击→toggle 的核心处理（导出供单测——行块→doc 行的解析在
 * happy-dom 零布局下不可行，B1 修复的可测形态）：lineBlock 为 CM gutter
 * 回调给的 BlockInfo（有 from/to 无 number）。
 */
export function handleGutterClick(
  store: DebugStore,
  view: EditorView,
  lineBlock: { from: number } | undefined | null,
): boolean {
  if (!lineBlock || !Number.isFinite(lineBlock.from)) {
    return false; // 行无法解析（真实浏览器中不发生；happy-dom 零布局产物）
  }
  const sourcePath = view.state.facet(sourcePathFacet);
  const line = view.state.doc.lineAt(lineBlock.from).number;
  store.getState().toggleBreakpoint(sourcePath, line);
  return true;
}

/**
 * 断点在否的判定（导出供单测——P0-MA5.1-004 修复的可测形态）：`breakpointsField`
 * 存的是 **1-based 行号**（handleGutterClick `doc.lineAt(from).number` 入集），
 * 而 CM `lineMarker` 回调给的 `line.from` 是 **文档偏移**——必须先换算行号再查集合。
 */
export function breakpointLineMarker(
  view: EditorView,
  line: { from: number },
): BreakpointMarker | null {
  const field = view.state.field(breakpointsField, false);
  if (field && field.has(view.state.doc.lineAt(line.from).number)) {
    return breakpointMarker;
  }
  return null;
}

export function createBreakpointGutter(store: DebugStore): Extension {
  // B1 修复（plan 617 审计）：gutter 事件必须走 gutter 自带 domEventHandlers——
  // EditorView.domEventHandlers 注册在 contentDOM 上，而 cm-gutters 是其兄弟
  // 子树，事件不冒泡经过 contentDOM（上行链死代码）。
  return gutter({
    class: 'xlang-debug-breakpoint-gutter',
    lineMarker: (view, line) => breakpointLineMarker(view, line),
    // P0-MA5.1-004 根因之二：sync 桥的断点更新是 **纯 effect 事务**（无 doc 变更），
    // CM gutter 缺省不因 StateField 变化重绘标记行——必须显式声明 lineMarkerChange，
    // 否则 field 已更新而 gutter DOM 永不重建（offset 修复后的残留缺陷）。
    lineMarkerChange: (update) =>
      update.startState.field(breakpointsField, false) !==
      update.state.field(breakpointsField, false),
    initialSpacer: () => breakpointMarker,
    domEventHandlers: {
      mousedown(view, lineBlock, event) {
        if (handleGutterClick(store, view, lineBlock)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });
}
