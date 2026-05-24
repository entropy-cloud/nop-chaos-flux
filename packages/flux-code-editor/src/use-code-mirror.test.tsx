// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const editorInstances: Array<{
  dispatch(input: { changes?: { insert: string } }): void;
  destroy(): void;
  state: { doc: { toString(): string; length: number } };
}> = [];

let capturedListener:
  | ((update: { docChanged: boolean; focusChanged: boolean; state: any; view: any }) => void)
  | undefined;

vi.mock('@codemirror/state', () => {
  class Compartment {
    of(value: unknown) {
      return value;
    }

    reconfigure(value: unknown) {
      return { value };
    }
  }

  const EditorState = {
    readOnly: {
      of(value: boolean) {
        return value;
      },
    },
    create(config: { doc?: string }) {
      return {
        doc: {
          text: config.doc ?? '',
          toString() {
            return this.text;
          },
          get length() {
            return this.text.length;
          },
        },
      };
    },
  };

  return { Compartment, EditorState };
});

vi.mock('@codemirror/commands', () => ({
  history: () => ({ kind: 'history' }),
}));

vi.mock('@codemirror/view', () => {
  function EditorView(this: any, { state }: { state: any }) {
    this.state = state;
    this.hasFocus = false;
    this.dispatch = vi.fn((input: { changes?: { insert: string } }) => {
      if (input.changes) {
        this.state.doc.text = input.changes.insert;
        capturedListener?.({
          docChanged: true,
          focusChanged: false,
          state: this.state,
          view: this,
        });
      }
    });
    this.destroy = vi.fn();
    editorInstances.push(this);
  }

  (EditorView as any).updateListener = {
    of(listener: typeof capturedListener) {
      capturedListener = listener;
      return listener;
    },
  };

  (EditorView as any).contentAttributes = {
    of(attributes: unknown) {
      return attributes;
    },
  };

  return {
    EditorView,
    placeholder: () => [],
  };
});

import { useCodeMirror } from './use-code-mirror.js';

afterEach(() => {
  cleanup();
  editorInstances.length = 0;
  capturedListener = undefined;
});

beforeEach(() => {
  editorInstances.length = 0;
  capturedListener = undefined;
});

function Harness(props: {
  onChange?: (value: string) => void;
  onViewReady?: () => void;
}) {
  const { editorRef } = useCodeMirror({ initialValue: 'one', onChange: props.onChange });

  React.useEffect(() => {
    if (editorInstances.length > 0) {
      props.onViewReady?.();
    }
  });

  return <div ref={editorRef} />;
}

describe('useCodeMirror', () => {
  it('uses the latest onChange callback without recreating the editor', async () => {
    const firstOnChange = vi.fn();
    const secondOnChange = vi.fn();
    const onViewReady = vi.fn();

    const rendered = render(<Harness onChange={firstOnChange} onViewReady={onViewReady} />);

    await waitFor(() => {
      expect(onViewReady).toHaveBeenCalled();
      expect(editorInstances).toHaveLength(1);
    });

    const firstInstance = editorInstances[0];

    rendered.rerender(<Harness onChange={secondOnChange} onViewReady={onViewReady} />);

    await waitFor(() => {
      expect(editorInstances).toHaveLength(1);
    });

    editorInstances[0].dispatch({
      changes: { insert: 'two' },
    });

    expect(editorInstances[0]).toBe(firstInstance);
    expect(firstOnChange).not.toHaveBeenCalled();
    expect(secondOnChange).toHaveBeenCalledWith('two');
  });
});
