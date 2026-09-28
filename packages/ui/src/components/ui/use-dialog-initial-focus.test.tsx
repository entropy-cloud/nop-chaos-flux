import React, { useRef } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDialogInitialFocusFallback } from './use-dialog-initial-focus.js';

afterEach(() => {
  cleanup();
});

// plan 2026-09-28-4 U7: base-ui's initial focus move can be lost (enqueueFocus
// rAF cancellation); the fallback must re-establish focus inside the popup
// exactly once, and stay a no-op when focus is already inside.
describe('useDialogInitialFocusFallback', () => {
  it('focuses the first tabbable inside the popup when focus was lost', async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogInitialFocusFallback(ref);
      return (
        <div ref={ref} data-testid="popup">
          <span>label</span>
          <button type="button" data-testid="first-tabbable">
            First
          </button>
          <button type="button" data-testid="second-tabbable">
            Second
          </button>
        </div>
      );
    }

    render(<Harness />);
    expect(document.activeElement).toBe(document.body);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('first-tabbable'));
    });
  });

  it('stays a no-op when focus is already inside the popup', async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogInitialFocusFallback(ref);
      return (
        <div ref={ref} data-testid="popup">
          <button type="button" data-testid="first-tabbable">
            First
          </button>
          <button type="button" data-testid="intended-target">
            Intended
          </button>
        </div>
      );
    }

    render(<Harness />);
    const intended = screen.getByTestId('intended-target');
    intended.focus();
    expect(document.activeElement).toBe(intended);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(intended);
  });

  it('treats a hidden first candidate as not tabbable and falls through', async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogInitialFocusFallback(ref);
      return (
        <div ref={ref} data-testid="popup">
          <button type="button" data-testid="hidden" style={{ display: 'none' }}>
            Hidden
          </button>
          <button type="button" data-testid="visible">
            Visible
          </button>
        </div>
      );
    }

    render(<Harness />);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('visible'));
    });
  });
});
