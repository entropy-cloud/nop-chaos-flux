import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog, DialogContent } from './dialog.js';
import { Drawer, DrawerContent } from './drawer.js';
import { Sheet, SheetContent } from './sheet.js';
import { AlertDialog, AlertDialogContent } from './alert-dialog.js';

// plan 490 Phase 2: the four overlay components share one size vocabulary —
// the `--overlay-size-*` ladder (xs/sm/base/md/lg/xl) selected through the
// `size` prop. Widths never come from ad-hoc Tailwind width classes.

afterEach(() => {
  cleanup();
});

function mountWithCleanup(ui: React.ReactElement) {
  const view = render(ui);
  return () => view.unmount();
}

describe('Dialog ladder binding (plan 490)', () => {
  it('binds every size tier to its --overlay-size-* token width', () => {
    const expectations: Record<string, string> = {
      xs: 'var(--overlay-size-xs)',
      sm: 'var(--overlay-size-sm)',
      base: 'var(--overlay-size-base)',
      default: 'var(--overlay-size-base)',
      md: 'var(--overlay-size-md)',
      lg: 'var(--overlay-size-lg)',
      xl: 'var(--overlay-size-xl)',
    };

    for (const [size, widthVar] of Object.entries(expectations)) {
      const unmount = mountWithCleanup(
        <Dialog modal={false} open>
          <DialogContent showCloseButton={false} size={size as never}>
            Sized
          </DialogContent>
        </Dialog>,
      );
      const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
      expect(content.style.width).toBe(widthVar);
      unmount();
    }
  });
});

describe('Sheet ladder binding (plan 490)', () => {
  it('defaults to the sm tier: data-size=sm and the sm-viewport cap consumes the ladder token', () => {
    mountWithCleanup(
      <Sheet modal={false} open>
        <SheetContent>
          <div>Sheet body</div>
        </SheetContent>
      </Sheet>,
    );

    const content = document.querySelector('[data-slot="sheet-content"]');
    expect(content?.getAttribute('data-size')).toBe('sm');
    expect(content?.className).toContain('sm:max-w-[var(--overlay-size-sm)]');
    expect(content?.className).not.toContain('sm:max-w-sm');
  });

  it('maps an explicit size tier onto its ladder cap', () => {
    mountWithCleanup(
      <Sheet modal={false} open>
        <SheetContent size="lg">
          <div>Wide sheet body</div>
        </SheetContent>
      </Sheet>,
    );

    const content = document.querySelector('[data-slot="sheet-content"]');
    expect(content?.getAttribute('data-size')).toBe('lg');
    expect(content?.className).toContain('sm:max-w-[var(--overlay-size-lg)]');
  });
});

describe('Drawer ladder binding (plan 490)', () => {
  it('defaults to the sm tier cap on side drawers and emits data-size on the popup', () => {
    mountWithCleanup(
      <Drawer open direction="right">
        <DrawerContent>
          <div>Drawer body</div>
        </DrawerContent>
      </Drawer>,
    );

    const popup = document.querySelector('[data-slot="drawer-popup"]');
    expect(popup?.getAttribute('data-size')).toBe('sm');
    expect(popup?.className).toContain('sm:max-w-[var(--overlay-size-sm)]');
    expect(popup?.className).not.toContain('sm:max-w-sm');
  });

  it('maps an explicit size tier onto its ladder cap', () => {
    mountWithCleanup(
      <Drawer open direction="left">
        <DrawerContent size="base">
          <div>Drawer body</div>
        </DrawerContent>
      </Drawer>,
    );

    const popup = document.querySelector('[data-slot="drawer-popup"]');
    expect(popup?.getAttribute('data-size')).toBe('base');
    expect(popup?.className).toContain('sm:max-w-[var(--overlay-size-base)]');
  });
});

describe('AlertDialog ladder remap (plan 490)', () => {
  it('remaps prop default→sm / sm→xs onto the ladder and emits the mapped tier', () => {
    const unmountDefault = mountWithCleanup(
      <AlertDialog open>
        <AlertDialogContent>
          <div>Confirm body</div>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const defaultContent = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(defaultContent?.getAttribute('data-size')).toBe('sm');
    expect(defaultContent?.className).toContain('max-w-[var(--overlay-size-sm)]');
    unmountDefault();

    const unmountSm = mountWithCleanup(
      <AlertDialog open>
        <AlertDialogContent size="sm">
          <div>Confirm body</div>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const smContent = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(smContent?.getAttribute('data-size')).toBe('xs');
    expect(smContent?.className).toContain('max-w-[var(--overlay-size-xs)]');
    unmountSm();
  });

  it('drops the hardcoded max-w-xs/max-w-sm width classes', () => {
    mountWithCleanup(
      <AlertDialog open>
        <AlertDialogContent>
          <div>Confirm body</div>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const content = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(content?.className).not.toMatch(/max-w-(?:xs|sm)\b/);
  });
});
