import { useEffect } from 'react';
import type { StyleToolType } from './use-style-commands.js';

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
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        invokeWithCatch(handleCopy, onCommandError);
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        invokeWithCatch(handleCut, onCommandError);
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        invokeWithCatch(handlePaste, onCommandError);
      } else if (ctrl && e.key === 'z') {
        e.preventDefault();
        invokeWithCatch(handleUndo, onCommandError);
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        invokeWithCatch(handleRedo, onCommandError);
      } else if (ctrl && e.key === 'b') {
        e.preventDefault();
        void handleStyleTool('bold').catch(onCommandError);
      } else if (ctrl && e.key === 'i') {
        e.preventDefault();
        void handleStyleTool('italic').catch(onCommandError);
      } else if (ctrl && e.key === 'u') {
        e.preventDefault();
        void handleStyleTool('underline').catch(onCommandError);
      } else if (ctrl && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
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
  ]);
}
