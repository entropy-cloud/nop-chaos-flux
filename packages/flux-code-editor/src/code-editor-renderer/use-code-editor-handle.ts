import { useEffect, useMemo, useRef } from 'react';
import type { ComponentHandle } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import type { EditorView } from '@codemirror/view';
import type { CodeEditorRendererProps } from './shared.js';

export interface UseCodeEditorHandleOptions {
  view: EditorView | null;
  initialValueRef: React.RefObject<string>;
}

const HANDLE_TYPE = 'code-editor';

const SUPPORTED_METHODS = ['clear', 'reset', 'focus', 'getEditorView'] as const;

/**
 * Registers a `code-editor` component handle exposing four capabilities:
 * - `clear`: empty the editor content
 * - `reset`: restore the editor to its initial value (captured at mount)
 * - `focus`: focus the editor
 * - `getEditorView`: return the raw CodeMirror EditorView (opaque handle)
 *
 * The handle is registered with the nearest component registry under the
 * node's `cid` so `component:*` actions can resolve it.
 */
export function useCodeEditorHandle(
  props: CodeEditorRendererProps,
  options: UseCodeEditorHandleOptions,
) {
  const componentRegistry = useCurrentComponentRegistry();
  const { view, initialValueRef } = options;
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const handle = useMemo<ComponentHandle>(
    () => ({
      id: props.id,
      type: HANDLE_TYPE,
      capabilities: {
        invoke(method, _payload, _ctx) {
          const editorView = viewRef.current;
          if (!editorView) {
            return { ok: false, error: new Error('Code editor view not ready') };
          }
          switch (method) {
            case 'clear': {
              editorView.dispatch({
                changes: { from: 0, to: editorView.state.doc.length, insert: '' },
              });
              return { ok: true };
            }
            case 'reset': {
              const initial = initialValueRef.current;
              editorView.dispatch({
                changes: { from: 0, to: editorView.state.doc.length, insert: initial },
              });
              return { ok: true };
            }
            case 'focus': {
              editorView.focus();
              return { ok: true };
            }
            case 'getEditorView': {
              return { ok: true, data: editorView };
            }
            default:
              return {
                ok: false,
                error: new Error(`Unsupported code-editor handle method: ${method}`),
              };
          }
        },
        hasMethod(method) {
          return (SUPPORTED_METHODS as readonly string[]).includes(method);
        },
        listMethods() {
          return SUPPORTED_METHODS;
        },
      },
    }),
    [props.id, initialValueRef],
  );

  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(handle, { cid: props.meta.cid });
  }, [componentRegistry, handle, props.meta.cid]);
}
