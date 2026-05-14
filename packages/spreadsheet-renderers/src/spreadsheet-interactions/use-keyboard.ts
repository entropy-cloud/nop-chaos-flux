import { useEffect } from 'react';
import type { StyleToolType } from './use-style-commands.js';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
  );
}

function invokeWithCatch(handler: () => Promise<void>, onError: (error: unknown) => void) {
  void handler().catch(onError);
}

export function useKeyboard(
  selectedCell: { row: number; col: number } | null,
  handleCopy: () => Promise<void>,
  handleCut: () => Promise<void>,
  handlePaste: () => Promise<void>,
  handleUndo: () => Promise<void>,
  handleRedo: () => Promise<void>,
  handleStyleTool: (tool: StyleToolType) => Promise<void>,
  handleClear: () => Promise<void>,
  onCommandError: (error: unknown) => void,
  setShowFindReplace: React.Dispatch<React.SetStateAction<boolean>>,
  setShowCommentInput: React.Dispatch<React.SetStateAction<boolean>>,
  rootRef: React.RefObject<HTMLElement | null>,
  readOnly?: boolean,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const root = rootRef.current;
      const activeElement = document.activeElement;
      const eventInsideRoot = e.target instanceof Node && root ? root.contains(e.target) : false;
      const activeInsideRoot = activeElement instanceof Node && root ? root.contains(activeElement) : false;

      if (root && !eventInsideRoot && !activeInsideRoot) {
        return;
      }

      if (isEditableTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        invokeWithCatch(handleCopy, onCommandError);
      } else if (ctrl && e.key === 'x') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        invokeWithCatch(handleCut, onCommandError);
      } else if (ctrl && e.key === 'v') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        invokeWithCatch(handlePaste, onCommandError);
      } else if (ctrl && e.key === 'z') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        invokeWithCatch(handleUndo, onCommandError);
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        invokeWithCatch(handleRedo, onCommandError);
      } else if (ctrl && e.key === 'b') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        void handleStyleTool('bold').catch(onCommandError);
      } else if (ctrl && e.key === 'i') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        void handleStyleTool('italic').catch(onCommandError);
      } else if (ctrl && e.key === 'u') {
        if (readOnly) {
          return;
        }
        e.preventDefault();
        void handleStyleTool('underline').catch(onCommandError);
      } else if (ctrl && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (readOnly) {
          return;
        }
        if (selectedCell && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          invokeWithCatch(handleClear, onCommandError);
        }
      } else if (e.key === 'Escape') {
        setShowFindReplace(false);
        setShowCommentInput(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleCopy,
    handleCut,
    handlePaste,
    handleUndo,
    handleRedo,
    handleStyleTool,
    handleClear,
    onCommandError,
    selectedCell,
    setShowFindReplace,
    setShowCommentInput,
    rootRef,
    readOnly,
  ]);
}
