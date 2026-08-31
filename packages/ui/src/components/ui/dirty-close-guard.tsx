'use client';

import * as React from 'react';

import { t } from '../../lib/i18n.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog.js';

export interface DirtyCloseGuardOptions {
  /** Re-evaluated at every close request, so stale render-time dirtiness is harmless. */
  isDirty: () => boolean;
  /** Invoked when the surface must close unconditionally (clean close or confirmed discard). */
  onClose: () => void;
}

export interface DirtyCloseGuard {
  /** Route surface `onOpenChange(false)` requests (X, ESC, outside click) through this. */
  requestClose: () => void;
  /** Render alongside the guarded surface (portal-based, placement is free). */
  guardDialog: React.ReactElement;
}

/**
 * Dirty-close guard primitive for controlled Dialog/Drawer surfaces: intercepts
 * implicit close channels while the content is dirty, shows a discard
 * confirmation, and only closes on explicit confirmation or when clean.
 */
export function useDirtyCloseGuard({ isDirty, onClose }: DirtyCloseGuardOptions): DirtyCloseGuard {
  const [discardPromptOpen, setDiscardPromptOpen] = React.useState(false);

  const requestClose = React.useCallback(() => {
    if (isDirty()) {
      setDiscardPromptOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const keepEditing = React.useCallback(() => {
    setDiscardPromptOpen(false);
  }, []);

  const discardAndClose = React.useCallback(() => {
    setDiscardPromptOpen(false);
    onClose();
  }, [onClose]);

  const guardDialog = (
    <AlertDialog
      open={discardPromptOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) keepEditing();
      }}
    >
      <AlertDialogContent data-slot="dirty-close-guard">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('flux.dialog.unsavedChangesTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('flux.dialog.unsavedChangesBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={keepEditing}>
            {t('flux.dialog.unsavedChangesKeep')}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={discardAndClose}>
            {t('flux.dialog.unsavedChangesDiscard')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestClose, guardDialog };
}
