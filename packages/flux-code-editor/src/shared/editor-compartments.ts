import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import type { CodeMirrorContentAttributes } from '../use-code-mirror.js';

/**
 * WA-code-editor-001 (plan 570): single home for the CodeMirror compartment
 * quartet and its reconfigure-effect builders (was a verbatim quartet ×2
 * plus mirrored effect bodies across use-code-mirror / use-merge-view).
 * Compartment instances are per-EditorState slots — each hook keeps its own
 * module-scope set via {@link createEditorCompartments}; the effect builders
 * here are the single source of the reconfigure expressions.
 */
interface EditorCompartments {
  readonly readOnly: Compartment;
  readonly extensions: Compartment;
  readonly placeholder: Compartment;
  readonly contentAttributes: Compartment;
}

export function createEditorCompartments(): EditorCompartments {
  return {
    readOnly: new Compartment(),
    extensions: new Compartment(),
    placeholder: new Compartment(),
    contentAttributes: new Compartment(),
  };
}

export function readOnlyReconfigure(c: EditorCompartments, readOnly?: boolean) {
  return c.readOnly.reconfigure(EditorState.readOnly.of(readOnly ?? false));
}

export function extensionsReconfigure(c: EditorCompartments, extensions?: Extension[]) {
  return c.extensions.reconfigure(extensions ?? []);
}

export function placeholderReconfigure(c: EditorCompartments, placeholder?: string) {
  return c.placeholder.reconfigure(placeholder ? cmPlaceholder(placeholder) : []);
}

export function contentAttributesReconfigure(c: EditorCompartments, attrs?: CodeMirrorContentAttributes) {
  return c.contentAttributes.reconfigure(EditorView.contentAttributes.of(attrs ?? {}));
}

/** Initial compartment state for EditorState.create / EditorView config. */
export function initialCompartmentExtensions(
  c: EditorCompartments,
  options: {
    readOnly?: boolean;
    extensions?: Extension[];
    placeholder?: string;
    contentAttributes?: CodeMirrorContentAttributes;
  },
): Extension[] {
  return [
    c.readOnly.of(EditorState.readOnly.of(options.readOnly ?? false)),
    c.extensions.of(options.extensions ?? []),
    c.placeholder.of(options.placeholder ? cmPlaceholder(options.placeholder) : []),
    c.contentAttributes.of(EditorView.contentAttributes.of(options.contentAttributes ?? {})),
  ];
}

/**
 * Shared doc/focus update listener (was mirrored verbatim as the
 * createEditorState inline listener and the merge-view rightEditorListener).
 */
export function editorUpdateListener(callbacks: {
  onChange(value: string): void;
  onFocus(): void;
  onBlur(): void;
}): Extension {
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
