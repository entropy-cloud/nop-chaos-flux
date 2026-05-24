import { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { history } from '@codemirror/commands';
import type { Extension } from '@codemirror/state';

export type CodeMirrorContentAttributes = Record<string, string>;

export interface UseCodeMirrorOptions {
  initialValue?: string;
  placeholder?: string;
  readOnly?: boolean;
  extensions?: Extension[];
  contentAttributes?: CodeMirrorContentAttributes;
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
const contentAttributesCompartment = new Compartment();

function createEditorState(
  options: UseCodeMirrorOptions,
  callbacks: {
    onChange(value: string): void;
    onFocus(): void;
    onBlur(): void;
  },
): EditorState {
  const extensions: Extension[] = [
    history(),
    readOnlyCompartment.of(EditorState.readOnly.of(options.readOnly ?? false)),
    extensionsCompartment.of(options.extensions ?? []),
    placeholderCompartment.of(options.placeholder ? cmPlaceholder(options.placeholder) : []),
    contentAttributesCompartment.of(
      EditorView.contentAttributes.of(options.contentAttributes ?? {}),
    ),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        callbacks.onChange(update.state.doc.toString());
      }
      if (update.focusChanged) {
        if (update.view.hasFocus) {
          callbacks.onFocus();
        } else {
          callbacks.onBlur();
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
  const onChangeRef = useRef(options.onChange);
  const onFocusRef = useRef(options.onFocus);
  const onBlurRef = useRef(options.onBlur);

  useEffect(() => {
    optionsRef.current = options;
    onChangeRef.current = options.onChange;
    onFocusRef.current = options.onFocus;
    onBlurRef.current = options.onBlur;
  }, [options]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = createEditorState(optionsRef.current, {
      onChange: (value) => {
        onChangeRef.current?.(value);
      },
      onFocus: () => {
        onFocusRef.current?.();
      },
      onBlur: () => {
        onBlurRef.current?.();
      },
    });
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
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(options.readOnly ?? false)),
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

  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;

    editorView.dispatch({
      effects: contentAttributesCompartment.reconfigure(
        EditorView.contentAttributes.of(options.contentAttributes ?? {}),
      ),
    });
  }, [options.contentAttributes]);

  return { editorRef: containerRef, view };
}
