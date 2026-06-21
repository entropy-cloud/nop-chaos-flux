import { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { MergeView } from '@codemirror/merge';
import type { Extension } from '@codemirror/state';
import type { CodeMirrorContentAttributes } from './use-code-mirror.js';

export interface UseMergeViewOptions {
  original: string;
  modified: string;
  placeholder?: string;
  readOnly?: boolean;
  extensions?: Extension[];
  contentAttributes?: CodeMirrorContentAttributes;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface UseMergeViewResult {
  editorRef: React.RefObject<HTMLDivElement | null>;
  view: EditorView | null;
  mergeView: MergeView | null;
}

const readOnlyCompartment = new Compartment();
const extensionsCompartment = new Compartment();
const placeholderCompartment = new Compartment();
const contentAttributesCompartment = new Compartment();

function rightEditorListener(
  callbacks: {
    onChange(value: string): void;
    onFocus(): void;
    onBlur(): void;
  },
): Extension {
  return EditorView.updateListener.of((update) => {
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
  });
}

interface EditorStateConfig {
  doc: string;
  extensions: Extension[];
}

function buildEditorConfig(
  doc: string,
  options: {
    readOnly: boolean;
    extensions: Extension[];
    placeholder: string | undefined;
    contentAttributes: CodeMirrorContentAttributes | undefined;
    ariaLabel?: string;
  },
  listeners?: {
    onChange(value: string): void;
    onFocus(): void;
    onBlur(): void;
  },
): EditorStateConfig {
  const extensions: Extension[] = [
    history(),
    readOnlyCompartment.of(EditorState.readOnly.of(options.readOnly)),
    extensionsCompartment.of(options.extensions),
    placeholderCompartment.of(options.placeholder ? cmPlaceholder(options.placeholder) : []),
    contentAttributesCompartment.of(
      EditorView.contentAttributes.of({
        ...(options.ariaLabel ? { 'aria-label': options.ariaLabel } : {}),
        ...(options.contentAttributes ?? {}),
      }),
    ),
  ];
  if (listeners) {
    extensions.push(rightEditorListener(listeners));
  }
  return { doc, extensions };
}

export function useMergeView(options: UseMergeViewOptions): UseMergeViewResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const [mergeViewState, setMergeView] = useState<MergeView | null>(null);
  const [rightView, setRightView] = useState<EditorView | null>(null);

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

    const callbacks = {
      onChange: (value: string) => onChangeRef.current?.(value),
      onFocus: () => onFocusRef.current?.(),
      onBlur: () => onBlurRef.current?.(),
    };

    const sharedExtensions = optionsRef.current.extensions ?? [];

    const leftConfig = buildEditorConfig(
      optionsRef.current.original ?? '',
      {
        readOnly: true,
        extensions: sharedExtensions,
        placeholder: undefined,
        contentAttributes: optionsRef.current.contentAttributes,
        ariaLabel: 'Diff original',
      },
      // no listeners on left — left is read-only and not the user's editing surface
    );

    const rightConfig = buildEditorConfig(
      optionsRef.current.modified ?? '',
      {
        readOnly: optionsRef.current.readOnly ?? false,
        extensions: sharedExtensions,
        placeholder: optionsRef.current.placeholder,
        contentAttributes: optionsRef.current.contentAttributes,
      },
      callbacks,
    );

    const instance = new MergeView({
      a: leftConfig,
      b: rightConfig,
      parent: containerRef.current,
    });

    mergeViewRef.current = instance;
    setMergeView(instance);
    setRightView(instance.b);

    return () => {
      instance.destroy();
      mergeViewRef.current = null;
      setMergeView(null);
      setRightView(null);
    };
  }, []);

  // Sync original (left / diffValue) when it changes externally.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    const currentOriginal = instance.a.state.doc.toString();
    const incomingOriginal = options.original ?? '';
    if (currentOriginal !== incomingOriginal) {
      instance.a.dispatch({
        changes: { from: 0, to: instance.a.state.doc.length, insert: incomingOriginal },
      });
    }
  }, [options.original]);

  // Sync modified (right / value) when it changes externally.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    const currentModified = instance.b.state.doc.toString();
    const incomingModified = options.modified ?? '';
    if (currentModified !== incomingModified) {
      instance.b.dispatch({
        changes: { from: 0, to: instance.b.state.doc.length, insert: incomingModified },
      });
    }
  }, [options.modified]);

  // Reconfigure readOnly on the right editor.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    instance.b.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(options.readOnly ?? false)),
    });
  }, [options.readOnly]);

  // Reconfigure extensions on both editors.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    const ext = options.extensions ?? [];
    instance.a.dispatch({ effects: extensionsCompartment.reconfigure(ext) });
    instance.b.dispatch({ effects: extensionsCompartment.reconfigure(ext) });
  }, [options.extensions]);

  // Reconfigure placeholder on the right editor.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    instance.b.dispatch({
      effects: placeholderCompartment.reconfigure(
        options.placeholder ? cmPlaceholder(options.placeholder) : [],
      ),
    });
  }, [options.placeholder]);

  // Reconfigure content attributes on both editors.
  useEffect(() => {
    const instance = mergeViewRef.current;
    if (!instance) return;
    const attrs = EditorView.contentAttributes.of(options.contentAttributes ?? {});
    instance.a.dispatch({ effects: contentAttributesCompartment.reconfigure(attrs) });
    instance.b.dispatch({ effects: contentAttributesCompartment.reconfigure(attrs) });
  }, [options.contentAttributes]);

  return { editorRef: containerRef, view: rightView, mergeView: mergeViewState };
}
