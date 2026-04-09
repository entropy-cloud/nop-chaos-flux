import { useEffect } from 'react';
import type { StyleToolType } from './use-style-commands.js';

export function useKeyboard(
  selectedCell: { row: number; col: number } | null,
  handleCopy: () => Promise<void>,
  handleCut: () => Promise<void>,
  handlePaste: () => Promise<void>,
  handleUndo: () => Promise<void>,
  handleRedo: () => Promise<void>,
  handleStyleTool: (tool: StyleToolType) => Promise<void>,
  handleClear: () => Promise<void>,
  setShowFindReplace: React.Dispatch<React.SetStateAction<boolean>>,
  setShowCommentInput: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') { e.preventDefault(); handleCopy(); }
      else if (ctrl && e.key === 'x') { e.preventDefault(); handleCut(); }
      else if (ctrl && e.key === 'v') { e.preventDefault(); handlePaste(); }
      else if (ctrl && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); handleRedo(); }
      else if (ctrl && e.key === 'b') { e.preventDefault(); handleStyleTool('bold'); }
      else if (ctrl && e.key === 'i') { e.preventDefault(); handleStyleTool('italic'); }
      else if (ctrl && e.key === 'u') { e.preventDefault(); handleStyleTool('underline'); }
      else if (ctrl && e.key === 'f') { e.preventDefault(); setShowFindReplace(prev => !prev); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCell && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          handleClear();
        }
      } else if (e.key === 'Escape') {
        setShowFindReplace(false);
        setShowCommentInput(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handleCut, handlePaste, handleUndo, handleRedo, handleStyleTool, handleClear, selectedCell, setShowFindReplace, setShowCommentInput]);
}
