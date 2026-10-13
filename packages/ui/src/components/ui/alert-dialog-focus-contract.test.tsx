import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertDialog, AlertDialogContent } from './alert-dialog.js';

// CX-9 plan 587 M1 DECLARED INCREMENT (alert-dialog two-layer integration):
// these tests are RED until useSurfaceFocusWrap is wired into
// AlertDialogContent (wrap layer + initial-focus fallback + m5 user-handler
// passthrough).
describe('AlertDialog focus contract (declared increment)', () => {
  afterEach(() => {
    cleanup();
  });

  it('wraps Tab from the last focusable back to the first inside the alert dialog popup', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it('re-establishes focus inside the popup when the upstream initial-focus move is lost', async () => {
    // Loss-path reproduction via Base UI's PUBLIC initialFocus contract (the
    // alert-dialog popup reuses DialogPopup): a function returning false tells
    // the focus manager to do nothing — the exact "enqueueFocus lost" scenario
    // the fallback layer exists for.
    render(
      <>
        <button type="button" data-testid="outside-trigger">
          Trigger
        </button>
        <AlertDialog open>
          <AlertDialogContent initialFocus={() => false}>
            <input data-testid="first" aria-label="First" />
          </AlertDialogContent>
        </AlertDialog>
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
      <AlertDialog open>
        <AlertDialogContent>
          <input data-testid="first" aria-label="First" />
        </AlertDialogContent>
      </AlertDialog>,
    );
    const popup = document.querySelector('[data-slot="alert-dialog-content"]') as HTMLElement | null;
    expect(popup).toBeTruthy();

    await waitFor(() => {
      expect(popup!.contains(document.activeElement)).toBe(true);
    });
  });

  it('runs wrap before the user handler: props.onKeyDown is not swallowed', () => {
    const userOnKeyDown = vi.fn();
    render(
      <AlertDialog open>
        <AlertDialogContent onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </AlertDialogContent>
      </AlertDialog>,
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
