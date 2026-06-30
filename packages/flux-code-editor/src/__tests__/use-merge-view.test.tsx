import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';
import { useMergeView } from '../use-merge-view.js';

let capturedRightView: EditorView | null = null;

afterEach(() => {
  cleanup();
  capturedRightView = null;
});

function MergeProbe(props: {
  original: string;
  modified: string;
  onChange?: (value: string) => void;
  onViewReady?: (view: EditorView) => void;
}) {
  const { editorRef, view } = useMergeView({
    original: props.original,
    modified: props.modified,
    onChange: props.onChange,
  });

  React.useEffect(() => {
    if (view) {
      capturedRightView = view;
      props.onViewReady?.(view);
    }
  });

  return <div ref={editorRef} />;
}

describe('useMergeView (E2h diff hook)', () => {
  it('fires onChange when the right editor document changes', async () => {
    const onChange = vi.fn();
    const onViewReady = vi.fn();

    render(
      <MergeProbe
        original={'line1\noriginal'}
        modified={'line1\nmodified'}
        onChange={onChange}
        onViewReady={onViewReady}
      />,
    );

    await waitFor(() => {
      expect(onViewReady).toHaveBeenCalled();
      expect(capturedRightView).toBeTruthy();
    });

    const view = capturedRightView!;
    const docLen = view.state.doc.length;
    view.dispatch({
      changes: { from: docLen, to: docLen, insert: ' appended' },
    });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(lastCall).toContain('appended');
  });

  it('creates a MergeView with two editor panes (a=original, b=modified)', async () => {
    const onViewReady = vi.fn();

    const { container } = render(
      <MergeProbe
        original={'original text'}
        modified={'modified text'}
        onViewReady={onViewReady}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('.cm-mergeView')).toBeTruthy();
    });

    const editors = container.querySelectorAll('.cm-editor');
    expect(editors.length).toBeGreaterThanOrEqual(2);
  });
});
