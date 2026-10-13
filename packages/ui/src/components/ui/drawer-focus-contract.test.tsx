import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer, DrawerContent } from './drawer.js';

// CX-9 plan 587 characterization + discrimination:
// - wrap Tab pin: the drawer Popup wrap layer had zero Tab tests (gap).
// - m5: drawer Popup runs ONLY the wrap handler; a consumer onKeyDown on
//   DrawerContent (inner element, bubbles to the Popup) must not be swallowed.
// - initial-focus fallback test is a DECLARED INCREMENT (plan 587 M1): it is
//   red until the useSurfaceFocusWrap initial-focus layer is wired into the
//   drawer.
describe('Drawer focus contract', () => {
  afterEach(() => {
    cleanup();
  });

  it('wraps Tab from the last focusable back to the first inside the drawer popup', () => {
    render(
      <Drawer open>
        <DrawerContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </DrawerContent>
      </Drawer>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    render(
      <Drawer open>
        <DrawerContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </DrawerContent>
      </Drawer>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it('does not swallow a consumer onKeyDown on DrawerContent (bubbles into the Popup wrap)', () => {
    const userOnKeyDown = vi.fn();
    render(
      <Drawer open>
        <DrawerContent showCloseButton={false} onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </DrawerContent>
      </Drawer>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    // The consumer handler on the inner Content still fires (bubble order:
    // Content user handler → Popup wrap layer).
    expect(userOnKeyDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(first);
  });

  // DECLARED INCREMENT (plan 587 M1, drawer initial-focus fallback): the
  // drawer joins the initial-focus layer. happy-dom cannot reproduce the
  // upstream focus-loss scenario at face level (Base UI's DrawerContent does
  // not forward the initialFocus defeat lever to its Popup the way
  // SheetContent/AlertDialogContent do), so the behavioral discrimination
  // lives in use-surface-focus-wrap.test.tsx (primitive level) and the
  // real-browser anchor is tests/e2e/component-lab/c1-1-host-surfaces.spec.ts.
  // Here the face pins the APG outcome contract: focus ends up inside the
  // popup after open.
  it('keeps focus inside the popup after open (APG contract pin, declared increment)', async () => {
    render(
      <Drawer open>
        <DrawerContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
        </DrawerContent>
      </Drawer>,
    );
    const popup = document.querySelector('[data-slot="drawer-popup"]') as HTMLElement | null;
    expect(popup).toBeTruthy();

    await waitFor(() => {
      expect(popup!.contains(document.activeElement)).toBe(true);
    });
  });
});
