import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import {
  breakpointsField,
  createBreakpointGutter,
  createDebugStore,
  handleGutterClick,
  sourcePathFacet,
  syncStoreToExtensions,
} from '../index.js';
import { breakpointLineMarker } from '../extension/breakpoint-gutter.js';

// P0-MA4.5/MA5.1 连带集成探针：真实 store + gutter + field + sync 桥全链——
// gutter 点击 → store.toggleBreakpoint → sync 派发 setBreakpointsEffect →
// field 更新 → lineMarker 命中行号。live（/#/xlang-debug）中标记行未出现，
// 本测试判定断点在 unit 链还是装配层。

function createView(doc: string, store: ReturnType<typeof createDebugStore>) {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [sourcePathFacet.of('demo.xpl'), createBreakpointGutter(store), breakpointsField],
    }),
    parent,
  });
}

describe('full breakpoint chain: click → store → sync → field → marker', () => {
  it('clicking line 2 makes the line-2 marker resolvable', () => {
    const store = createDebugStore();
    const view = createView('let a = 1;\nlet b = 2;\nlet c = 3;', store);
    const dispose = syncStoreToExtensions({
      store,
      view,
      getSourcePath: (v) => v.state.facet(sourcePathFacet),
    });

    expect(handleGutterClick(store, view, { from: 11 })).toBe(true); // line 2
    expect(store.getState().breakpoints).toEqual([{ sourcePath: 'demo.xpl', line: 2 }]);
    expect(view.state.field(breakpointsField).has(2)).toBe(true);

    const line2 = view.state.doc.lineAt(11);
    expect(breakpointLineMarker(view, line2)).not.toBeNull();

    dispose();
  });
});
