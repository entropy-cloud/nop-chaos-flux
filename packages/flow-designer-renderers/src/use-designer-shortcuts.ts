import { useEffect } from 'react';
import type { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { matchesShortcut } from './designer-page-helpers.js';
import type { DesignerCommand } from './designer-command-types.js';

type DesignerCoreLike = ReturnType<typeof createDesignerCore>;

export function useDesignerShortcuts(args: {
  core: DesignerCoreLike;
  rootRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (command: DesignerCommand) => unknown;
  readOnly?: boolean;
}) {
  const { core, rootRef, dispatch, readOnly = false } = args;

  useEffect(() => {
    if (!core.getConfig().features.shortcuts) {
      return;
    }

    const shortcuts = core.getConfig().shortcuts;
    const features = core.getConfig().features;
    const canUseClipboard = features.clipboard !== false;
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const isInsideDesigner = (target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return false;
      }

      return rootRef.current?.contains(target) ?? false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !isInsideDesigner(event.target)) {
        return;
      }

      if (readOnly) {
        return;
      }

      if (matchesShortcut(event, shortcuts.undo) && features.undo !== false) {
        event.preventDefault();
        dispatch({ type: 'undo' });
        return;
      }
      if (matchesShortcut(event, shortcuts.redo) && features.redo !== false) {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.copy)) {
        event.preventDefault();
        dispatch({ type: 'copySelection' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.paste)) {
        event.preventDefault();
        dispatch({ type: 'pasteClipboard' });
        return;
      }
      if (matchesShortcut(event, shortcuts.delete)) {
        event.preventDefault();
        dispatch({ type: 'deleteSelection' });
        return;
      }
      if (matchesShortcut(event, shortcuts.save)) {
        event.preventDefault();
        dispatch({ type: 'save' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [core, dispatch, rootRef, readOnly]);
}
