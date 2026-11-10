import React, { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Facet, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useCodeMirror } from './use-code-mirror.js';

// Plan 863 T1: real-EditorView coverage for the branches the @codemirror mock
// harness (use-code-mirror.test.tsx) cannot exercise — mount/unmount
// lifecycle, compartment reconfiguration, and the readOnly switch. Same
// happy-dom real-view idiom as use-code-mirror-controlled.test.tsx.

function Host({
  initial,
  readOnly,
  extensions,
  onView,
}: {
  initial: string;
  readOnly?: boolean;
  extensions?: Extension[];
  onView: (view: EditorView | null) => void;
}) {
  const { editorRef, view } = useCodeMirror({
    initialValue: initial,
    readOnly,
    extensions,
  });
  useEffect(() => {
    onView(view);
  }, [onView, view]);
  return <div ref={editorRef} />;
}

function renderHost(overrides?: { readOnly?: boolean; extensions?: Extension[] }) {
  const captured: { current: EditorView | null } = { current: null };
  const onView = vi.fn((view: EditorView | null) => {
    captured.current = view;
  });
  const utils = render(
    <Host initial="hello" onView={onView} readOnly={overrides?.readOnly} extensions={overrides?.extensions} />,
  );
  const view = () => {
    if (!captured.current) throw new Error('EditorView not mounted');
    return captured.current;
  };
  return { view, onView, utils };
}

describe('useCodeMirror real EditorView branches (plan 863 T1)', () => {
  it('mounts a real EditorView with the initial document and destroys it on unmount', () => {
    const destroySpy = vi.spyOn(EditorView.prototype, 'destroy');
    const { view, utils } = renderHost();
    const mounted = view();

    expect(mounted.state.doc.toString()).toBe('hello');
    expect(mounted.dom.isConnected).toBe(true);

    utils.unmount();

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(mounted.dom.isConnected).toBe(false);
    destroySpy.mockRestore();
  });

  it('reconfigures the extensions compartment when the extensions option changes', () => {
    const marker = Facet.define<number, number>({ combine: (values) => values[values.length - 1] ?? 0 });
    const { view, utils } = renderHost({ extensions: [marker.of(1)] });

    expect(view().state.facet(marker)).toBe(1);

    utils.rerender(
      <Host
        initial="hello"
        onView={vi.fn()}
        extensions={[marker.of(2)] as unknown as Extension[]}
      />,
    );

    expect(view().state.facet(marker)).toBe(2);
  });

  it('toggling readOnly flips the readOnly facet without recreating the view', () => {
    const { view, utils } = renderHost({ readOnly: false });

    expect(view().state.facet(EditorState.readOnly)).toBe(false);
    const viewBefore = view();

    utils.rerender(<Host initial="hello" onView={vi.fn()} readOnly={true} />);

    expect(view()).toBe(viewBefore);
    expect(view().state.facet(EditorState.readOnly)).toBe(true);

    utils.rerender(<Host initial="hello" onView={vi.fn()} readOnly={false} />);

    expect(view().state.facet(EditorState.readOnly)).toBe(false);
  });
});
