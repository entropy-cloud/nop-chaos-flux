import { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { history } from '@codemirror/commands';
import type { Extension } from '@codemirror/state';

export interface UseCodeMirrorOptions {
  initialValue?: string;
  placeholder?: string;
  readOnly?: boolean;
  extensions?: Extension[];
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  theme?: 'light' | 'dark';
}

export interface UseCodeMirrorResult {
  editorRef: React.RefObject<HTMLDivElement | null>;
  view: EditorView | null;
}

const readOnlyCompartment = new Compartment();
const extensionsCompartment = new Compartment();
const placeholderCompartment = new Compartment();

function createEditorState(options: UseCodeMirrorOptions): EditorState {
  const extensions: Extension[] = [
    history(),
    readOnlyCompartment.of(EditorState.readOnly.of(options.readOnly ?? false)),
    extensionsCompartment.of(options.extensions ?? []),
    placeholderCompartment.of(options.placeholder ? cmPlaceholder(options.placeholder) : []),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onChange?.(update.state.doc.toString());
      }
      if (update.focusChanged) {
        if (update.view.hasFocus) {
          options.onFocus?.();
        } else {
          options.onBlur?.();
        }
      }
    }),
  ];

  return EditorState.create({
    doc: options.initialValue ?? '',
    extensions,
  });
}

export function useCodeMirror(options: UseCodeMirrorOptions): UseCodeMirrorResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = createEditorState(optionsRef.current);
    const editorView = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = editorView;
    setView(editorView);

    return () => {
      editorView.destroy();
      viewRef.current = null;
      setView(null);
    };
  }, []);

  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;

    const currentDoc = editorView.state.doc.toString();
    const incoming = options.initialValue ?? '';
    if (currentDoc !== incoming) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: incoming },
      });
    }
  }, [options.initialValue]);

  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;

    editorView.dispatch({
      effects: readOnlyCompartment.reconfigure(
        EditorState.readOnly.of(options.readOnly ?? false),
      ),
    });
  }, [options.readOnly]);

  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;

    editorView.dispatch({
      effects: extensionsCompartment.reconfigure(options.extensions ?? []),
    });
  }, [options.extensions]);

  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;

    editorView.dispatch({
      effects: placeholderCompartment.reconfigure(
        options.placeholder ? cmPlaceholder(options.placeholder) : [],
      ),
    });
  }, [options.placeholder]);

  return { editorRef: containerRef, view };
}
