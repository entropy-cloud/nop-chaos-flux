import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sheet, SheetContent } from './sheet.js';

// CX-9 plan 587 M1 DECLARED INCREMENT (sheet two-layer integration): these
// tests are RED until useSurfaceFocusWrap is wired into SheetContent (wrap
// layer + initial-focus fallback + m5 user-handler passthrough).
describe('Sheet focus contract (declared increment)', () => {
  afterEach(() => {
    cleanup();
  });

  it('wraps Tab from the last focusable back to the first inside the sheet popup', () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </SheetContent>
      </Sheet>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </SheetContent>
      </Sheet>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it('re-establishes focus inside the popup when the upstream initial-focus move is lost', async () => {
    // Loss-path reproduction via Base UI's PUBLIC initialFocus contract: a
    // function returning false tells the focus manager to do nothing — the
    // exact "enqueueFocus lost" scenario the fallback layer exists for. The
    // fallback must then re-establish focus on the first tabbable.
    render(
      <>
        <button type="button" data-testid="outside-trigger">
          Trigger
        </button>
        <Sheet open>
          <SheetContent showCloseButton={false} initialFocus={() => false}>
            <input data-testid="first" aria-label="First" />
          </SheetContent>
        </Sheet>
      </>,
    );
    const trigger = screen.getByTestId('outside-trigger');
    const first = screen.getByTestId('first');

    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await waitFor(
      () => {
        expect(document.activeElement).toBe(first);
      },
      { timeout: 500 },
    );
  });

  it('keeps focus inside the popup after open on the healthy path (APG contract pin)', async () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <input data-testid="first" aria-label="First" />
        </SheetContent>
      </Sheet>,
    );
    const popup = document.querySelector('[data-slot="sheet-content"]') as HTMLElement | null;
    expect(popup).toBeTruthy();

    await waitFor(() => {
      expect(popup!.contains(document.activeElement)).toBe(true);
    });
  });

  it('runs wrap before the user handler: props.onKeyDown is not swallowed', () => {
    const userOnKeyDown = vi.fn();
    render(
      <Sheet open>
        <SheetContent showCloseButton={false} onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </SheetContent>
      </Sheet>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(userOnKeyDown).toHaveBeenCalledTimes(1);
    expect(userOnKeyDown.mock.calls[0]![0].defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });
});
