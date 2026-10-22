import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { breakpointsField, setBreakpointsEffect, BreakpointMarker } from '../index.js';
import { breakpointLineMarker } from '../extension/breakpoint-gutter.js';
import { EditorView } from '@codemirror/view';

// P0-MA5.1-004 判别测试（docs/plans/2026-10-22-0500-arm2-fix-P0-MA5.1-004）：
// breakpointsField 存 1-based 行号，而 CM lineMarker 回调给的是文档偏移。
// 旧实现 `field.has(line.from)` 以偏移查行号集合 → 永不命中（除非首行恰 1 字符
// 使 offset===行号——本测试 doc 首行 10 字符，line2.from=10 ≠ 2，钉死碰撞面）。

function createView(doc: string) {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [breakpointsField] }),
    parent,
  });
  return view;
}

describe('breakpoint line marker matches by line number, not doc offset', () => {
  it('returns the marker for a breakpointed line and null otherwise', () => {
    const view = createView('let a = 1;\nlet b = 2;\nlet c = 3;');
    // 行号 2 设断点（与 handleGutterClick 入集语义一致）
    view.dispatch({ effects: setBreakpointsEffect.of([2]) });

    const line2 = view.state.doc.lineAt(11); // from=11 → number=2
    expect(line2.number).toBe(2);
    expect(breakpointLineMarker(view, line2)).toBeInstanceOf(BreakpointMarker);

    const line1 = view.state.doc.lineAt(0);
    expect(line1.number).toBe(1);
    expect(breakpointLineMarker(view, line1)).toBeNull();

    const line3 = view.state.doc.lineAt(22);
    expect(breakpointLineMarker(view, line3)).toBeNull();

    // 清空断点后同样 null
    view.dispatch({ effects: setBreakpointsEffect.of([]) });
    expect(breakpointLineMarker(view, line2)).toBeNull();
  });
});
