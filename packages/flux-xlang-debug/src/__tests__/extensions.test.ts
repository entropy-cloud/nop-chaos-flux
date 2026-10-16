import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import {
  breakpointsField,
  createBreakpointGutter,
  handleGutterClick,
  createDebugStore,
  exceptionLinesField,
  sourcePathFacet,
  suspendedLinesField,
  syncStoreToExtensions,
  setBreakpointsEffect,
} from '../index.js';

import type { Extension } from '@codemirror/state';

function createView(doc: string, extensions: Extension | readonly Extension[]) {
  // 需真实挂载：sync 桥以 dom.isConnected 判定销毁态（未挂载会被守卫拦截）
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({
    state: EditorState.create({ doc, extensions }),
    parent,
  });
  return view;
}

describe('breakpoint gutter', () => {
  it('handleGutterClick toggles with facet anchor and doc line (B1 core)', () => {
    const store = createDebugStore();
    const view = createView('let a = 1;\nlet b = 2;', [
      sourcePathFacet.of('a.xpl'),
      createBreakpointGutter(store),
    ]);
    // B1 核心处理直测：行块 {from:0} → doc.lineAt(0).number = 1 → toggle
    expect(handleGutterClick(store, view, { from: 0 })).toBe(true);
    expect(store.getState().breakpoints).toEqual([{ sourcePath: 'a.xpl', line: 1 }]);
    expect(handleGutterClick(store, view, { from: 0 })).toBe(true);
    expect(store.getState().breakpoints).toEqual([]);
    // 无法解析的行块：忽略（不抛错不 toggle）
    expect(handleGutterClick(store, view, undefined)).toBe(false);
    expect(store.getState().breakpoints).toEqual([]);
    // gutter DOM 结构存在（CM 注册面）
    expect(view.dom.querySelector('.xlang-debug-breakpoint-gutter')).toBeTruthy();
    view.destroy();
  });

  it('breakpoints field reflects dispatched effect', () => {
    const view = createView('let a = 1;\nlet b = 2;', [breakpointsField]);
    view.dispatch({ effects: setBreakpointsEffect.of([1]) });
    expect(view.state.field(breakpointsField).has(1)).toBe(true);
    expect(view.state.field(breakpointsField).has(2)).toBe(false);
    view.dispatch({ effects: setBreakpointsEffect.of([]) });
    expect(view.state.field(breakpointsField).size).toBe(0);
    view.destroy();
  });
});

describe('store → extension sync bridge', () => {
  it('dispatches three-family effects on store change (anchor matched)', () => {
    const store = createDebugStore();
    const view = createView('let a = 1;\nlet b = 2;', [
      sourcePathFacet.of('a.xpl'),
      suspendedLinesField,
      exceptionLinesField,
      breakpointsField,
    ]);
    const dispose = syncStoreToExtensions({
      store,
      view,
      getSourcePath: (v) => v.state.facet(sourcePathFacet),
    });

    store.getState().setBreakpoints([{ sourcePath: 'a.xpl', line: 1 }]);
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 2 });
    store.getState().addException({ sourcePath: 'a.xpl', line: 1, message: 'boom' });

    expect(view.state.field(breakpointsField).has(1)).toBe(true);
    const suspended = view.state.field(suspendedLinesField);
    expect(suspended.size).toBe(1);
    const exceptions = view.state.field(exceptionLinesField);
    expect(exceptions.size).toBe(1);

    // 锚点不匹配：切换文档锚点后 store 变更清空装饰（doc-source-mismatch 过滤）
    store.getState().setBreakpoints([{ sourcePath: 'other.xpl', line: 1 }]);
    expect(view.state.field(breakpointsField).size).toBe(0);

    dispose();
    // dispose 后 store 变更不再派发
    store.getState().setBreakpoints([{ sourcePath: 'a.xpl', line: 2 }]);
    expect(view.state.field(breakpointsField).size).toBe(0);
    view.destroy();
  });

  it('dispose is idempotent', () => {
    const store = createDebugStore();
    const view = createView('let a = 1;', [breakpointsField]);
    const dispose = syncStoreToExtensions({ store, view, getSourcePath: () => 'a.xpl' });
    dispose();
    expect(() => dispose()).not.toThrow();
    view.destroy();
  });
});
