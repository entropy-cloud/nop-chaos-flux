import type { Extension } from '@codemirror/state';
import { EditorView, GutterMarker, gutter } from '@codemirror/view';
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
export function createBreakpointGutter(store: DebugStore): Extension {
  const markerGutter = gutter({
    class: 'xlang-debug-breakpoint-gutter',
    lineMarker: (view, line) => {
      const field = view.state.field(breakpointsField, false);
      if (field && field.has(line.from)) {
        return breakpointMarker;
      }
      return null;
    },
    initialSpacer: () => breakpointMarker,
  });

  const clickHandler = EditorView.domEventHandlers({
    mousedown(event, view) {
      const target = event.target as HTMLElement | null;
      if (!target || !target.closest('.xlang-debug-breakpoint-gutter')) {
        return false;
      }
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) {
        return false;
      }
      const line = view.state.doc.lineAt(pos).number;
      const sourcePath = view.state.facet(sourcePathFacet);
      store.getState().toggleBreakpoint(sourcePath, line);
      event.preventDefault();
      return true;
    },
  });

  return [
    breakpointsField,
    markerGutter,
    clickHandler,
    EditorView.theme({
      '.xlang-debug-breakpoint-marker': { color: '#e11d48', cursor: 'pointer' },
      '.xlang-debug-breakpoint-gutter': { width: '18px', cursor: 'pointer' },
    }),
  ];
}

