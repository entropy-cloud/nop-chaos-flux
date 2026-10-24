import React, { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';
import { useCodeMirror } from './use-code-mirror.js';

// P1-MA4.4-009 regression guard: the controlled-value "model -> editor"
// direction. The whole suite had a single rerender that never changed the
// value; the echo latch (:110) and selection preservation had zero sentinels
// — a latch failure (typing -> external update -> cursor jumps to doc end)
// would stay green (audit Round G / G-02). Real EditorView per the
// base-extensions.test.tsx happy-dom idiom; the @codemirror mock harness has
// no selection and is explicitly ruled out.

function ContainedEditor({
  initial,
  onChange,
  onView,
}: {
  initial: string;
  onChange?: (next: string) => void;
  onView: (view: EditorView | null) => void;
}) {
  const { editorRef, view } = useCodeMirror({ initialValue: initial, onChange });
  useEffect(() => {
    onView(view);
  }, [onView, view]);
  return <div ref={editorRef} />;
}

function renderEditor(initial: string) {
  const captured: { current: EditorView | null } = { current: null };
  const onView = vi.fn((view: EditorView | null) => {
    captured.current = view;
  });
  const onChange = vi.fn();

  const utils = render(<ContainedEditor initial={initial} onChange={onChange} onView={onView} />);

  const view = () => {
    if (!captured.current) throw new Error('EditorView not mounted');
    return captured.current;
  };
  const rerenderWithValue = (value: string) => {
    utils.rerender(<ContainedEditor initial={value} onChange={onChange} onView={onView} />);
  };

  expect(view().state.doc.toString()).toBe(initial);
  return { view, rerenderWithValue, onChange };
}

describe('useCodeMirror controlled model->editor direction (P1-MA4.4-009)', () => {
  it('an external value change updates the editor content', () => {
    const { view, rerenderWithValue } = renderEditor('const a = 1;');

    rerenderWithValue('const b = 2;');

    expect(view().state.doc.toString()).toBe('const b = 2;');
  });

  it('echo latch: a parent echo of the typed value does not disturb the caret', () => {
    // controlled loop: typing -> onChange -> parent rerenders with the typed
    // value -> the latch (currentDoc !== incoming) must skip the re-dispatch,
    // leaving the caret where the user typed it
    const { view, rerenderWithValue, onChange } = renderEditor('abcd');

    act(() => {
      // user types 'e' at the end (caret lands at 5); onChange updates parent
      view().dispatch({ changes: { from: 4, insert: 'e' }, selection: { anchor: 5 } });
    });
    expect(onChange).toHaveBeenCalledWith('abcde');

    // parent echoes the typed value back
    rerenderWithValue('abcde');

    // latch: doc already equals incoming -> no re-dispatch -> caret intact
    expect(view().state.doc.toString()).toBe('abcde');
    expect(view().state.selection.main.head).toBe(5);
  });

  it('genuine external value change updates content (selection collapse to 0 is current semantics — gap registered)', () => {
    const { view, rerenderWithValue } = renderEditor('abcd');

    rerenderWithValue('wxyz');

    expect(view().state.doc.toString()).toBe('wxyz');
    // CURRENT semantics: full-document replacement collapses the caret to 0 —
    // the audit's promised selection preservation for genuine external
    // changes is NOT implemented; registered as a candidate (plan
    // Non-Blocking Follow-ups), not pinned as desired behavior here.
    expect(view().state.selection.main.head).toBe(0);
  });
});
