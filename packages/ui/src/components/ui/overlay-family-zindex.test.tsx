import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GLOBAL_Z_INDEX_BASELINE_VALUE, setGlobalZIndex } from '../../hooks/use-global-z-index.js';
import { AlertDialog, AlertDialogContent } from './alert-dialog.js';
import { Dialog, DialogContent } from './dialog.js';
import { Drawer, DrawerContent } from './drawer.js';
import { Sheet, SheetContent, SheetOverlay } from './sheet.js';

// CX-9 plan 587 (WA-ui-003, draft review M3) characterization: the four modal
// families each assemble their own z-index context instance — overlay reads
// its OWN family's provider, orphans read nothing, and nested different-family
// surfaces never cross-read. These pins hold before AND after the
// createOverlayZIndex() factory extraction, and go red if the factory is ever
// collapsed into one shared context singleton.
function readInlineZIndex(el: Element | null | undefined): number {
  if (!el) return NaN;
  const inline = (el as HTMLElement).style?.zIndex;
  if (inline === '' || inline === undefined || inline === null) return NaN;
  return Number(inline);
}

describe('overlay family z-index assembly (WA-ui-003 characterization)', () => {
  const BASELINE = GLOBAL_Z_INDEX_BASELINE_VALUE;

  afterEach(() => {
    cleanup();
    setGlobalZIndex(BASELINE);
  });

  it('Dialog overlay shares the dialog family context with the dialog popup', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>Body</DialogContent>
      </Dialog>,
    );
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    const content = document.querySelector('[data-slot="dialog-content"]');

    const overlayZ = readInlineZIndex(overlay);
    expect(Number.isFinite(overlayZ)).toBe(true);
    expect(overlayZ).toBe(readInlineZIndex(content));
    expect(overlayZ).toBeGreaterThanOrEqual(BASELINE);
  });

  it('Drawer overlay shares the drawer family context with the drawer viewport', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Drawer open>
        <DrawerContent showCloseButton={false}>Body</DrawerContent>
      </Drawer>,
    );
    const overlay = document.querySelector('[data-slot="drawer-overlay"]');
    const popup = document.querySelector('[data-slot="drawer-popup"]');
    const viewport = popup?.parentElement ?? null;

    const overlayZ = readInlineZIndex(overlay);
    expect(Number.isFinite(overlayZ)).toBe(true);
    expect(overlayZ).toBe(readInlineZIndex(viewport));
    expect(overlayZ).toBeGreaterThanOrEqual(BASELINE);
  });

  it('Sheet overlay shares the sheet family context with the sheet popup', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>Body</SheetContent>
      </Sheet>,
    );
    const overlay = document.querySelector('[data-slot="sheet-overlay"]');
    const content = document.querySelector('[data-slot="sheet-content"]');

    const overlayZ = readInlineZIndex(overlay);
    expect(Number.isFinite(overlayZ)).toBe(true);
    expect(overlayZ).toBe(readInlineZIndex(content));
    expect(overlayZ).toBeGreaterThanOrEqual(BASELINE);
  });

  it('AlertDialog overlay shares the alert-dialog family context with its popup', () => {
    setGlobalZIndex(BASELINE);
    render(
      <AlertDialog open>
        <AlertDialogContent>Body</AlertDialogContent>
      </AlertDialog>,
    );
    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
    const content = document.querySelector('[data-slot="alert-dialog-content"]');

    const overlayZ = readInlineZIndex(overlay);
    expect(Number.isFinite(overlayZ)).toBe(true);
    expect(overlayZ).toBe(readInlineZIndex(content));
    expect(overlayZ).toBeGreaterThanOrEqual(BASELINE);
  });

  // M3 pin A: an orphan overlay rendered inside a FOREIGN family's provider
  // must not read that family's z-index — it stays inline-zIndex-free. (Base
  // UI suppresses a nested dialog-family Backdrop inside another open dialog's
  // popup, so the orphan probe mounts the Sheet overlay without its own root,
  // which keeps it a real DOM element while leaving its family provider
  // absent.)
  it('[M3] orphan Sheet overlay inside a Dialog provider carries no inline z-index', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <SheetOverlay />
        </DialogContent>
      </Dialog>,
    );
    const dialogContent = document.querySelector('[data-slot="dialog-content"]');
    const orphanOverlay = document.querySelector('[data-slot="sheet-overlay"]');

    expect(orphanOverlay).toBeTruthy();
    const orphanZ = readInlineZIndex(orphanOverlay);
    expect(Number.isFinite(orphanZ)).toBe(false);
    // The dialog's own z-index must not leak into the orphan.
    expect(orphanZ).not.toBe(readInlineZIndex(dialogContent));
  });

  // M3 pin B: nested different-family surfaces do not cross-read — the sheet
  // overlay follows the sheet's own provider value, not the dialog's. (The
  // sheet content is mounted without its root for the same nested-Backdrop
  // suppression reason as pin A; the provider topology under test is
  // unchanged.)
  it('[M3] nested Sheet inside Dialog keeps per-family values (no cross-read)', () => {
    setGlobalZIndex(BASELINE);
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <SheetContent showCloseButton={false}>Nested sheet body</SheetContent>
        </DialogContent>
      </Dialog>,
    );
    const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]');
    const dialogContent = document.querySelector('[data-slot="dialog-content"]');
    const sheetOverlay = document.querySelector('[data-slot="sheet-overlay"]');
    const sheetContent = document.querySelector('[data-slot="sheet-content"]');

    const dialogZ = readInlineZIndex(dialogContent);
    const sheetZ = readInlineZIndex(sheetContent);
    expect(Number.isFinite(dialogZ)).toBe(true);
    expect(Number.isFinite(sheetZ)).toBe(true);
    // Each overlay follows its own family popup.
    expect(readInlineZIndex(dialogOverlay)).toBe(dialogZ);
    expect(readInlineZIndex(sheetOverlay)).toBe(sheetZ);
    // Global counter still orders the two families.
    expect(sheetZ).toBeGreaterThan(dialogZ);
    // And the sheet overlay did NOT cross-read the dialog family value.
    expect(readInlineZIndex(sheetOverlay)).not.toBe(dialogZ);
  });

  it('a later Dialog re-assembles with a fresh counter value above an open Sheet', () => {
    setGlobalZIndex(BASELINE);
    render(
      <>
        <Sheet open>
          <SheetContent showCloseButton={false}>First</SheetContent>
        </Sheet>
        <Dialog modal={false} open>
          <DialogContent showCloseButton={false}>Second</DialogContent>
        </Dialog>
      </>,
    );
    const sheetZ = readInlineZIndex(document.querySelector('[data-slot="sheet-content"]'));
    const dialogZ = readInlineZIndex(document.querySelector('[data-slot="dialog-content"]'));
    expect(dialogZ).toBeGreaterThan(sheetZ);
  });
});
