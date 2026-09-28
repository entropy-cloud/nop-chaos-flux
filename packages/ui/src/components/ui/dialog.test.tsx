import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.js';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('renders content with title and description when open', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Smoke Title</DialogTitle>
            <DialogDescription>Smoke description</DialogDescription>
          </DialogHeader>
          <DialogBody>Body text</DialogBody>
          <DialogFooter>Footer text</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const title = screen.getByText('Smoke Title');
    expect(title.getAttribute('data-slot')).toBe('dialog-title');

    const desc = screen.getByText('Smoke description');
    expect(desc.getAttribute('data-slot')).toBe('dialog-description');

    expect(screen.getByText('Body text').closest('[data-slot="dialog-body"]')).toBeTruthy();
    expect(screen.getByText('Footer text').closest('[data-slot="dialog-footer"]')).toBeTruthy();
  });

  it('supports keyboard repositioning for draggable dialogs', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Movable Title</DialogTitle>
            <DialogDescription>Movable description</DialogDescription>
          </DialogHeader>
          <DialogBody>Body text</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    // The header itself is the drag surface (AMIS parity): focusable and
    // arrow-key movable, no dedicated grip button.
    const header = document.querySelector('[data-slot="dialog-header"]') as HTMLDivElement | null;
    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;

    expect(header).toBeTruthy();
    expect(header!.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('[data-slot="dialog-drag-handle"]')).toBeNull();
    expect(popup).toBeTruthy();

    Object.defineProperty(popup!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 100, top: 100, right: 400, bottom: 260, width: 300, height: 160 }),
    });

    fireEvent.keyDown(header!, { key: 'ArrowRight' });
    expect(popup!.style.transform).toContain('translate(16px, 0px)');

    fireEvent.keyDown(header!, { key: 'Home' });
    expect(popup!.style.transform).toBe('translate(-50%, -50%)');
  });

  it('uses the unified surface-overlay token (V12f G6-视角7-02 single-track)', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>Overlay contract</DialogContent>
      </Dialog>,
    );

    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay?.className).toContain('bg-surface-overlay');
    expect(overlay?.className).not.toContain('bg-[var(--dialog-overlay-bg)]');
    expect(overlay?.className).not.toContain('bg-black/10');
  });

  it('maps every size tier to its --overlay-size-* token width and emits data-size (plan 490)', () => {
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
      const { unmount } = render(
        <Dialog modal={false} open>
          <DialogContent showCloseButton={false} size={size as never}>
            Sized
          </DialogContent>
        </Dialog>,
      );

      const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;
      expect(popup).toBeTruthy();
      expect(popup!.style.width).toBe(widthVar);
      expect(popup!.getAttribute('data-size')).toBe(size);
      unmount();
    }
  });

  it('anchors content to the top token when topAnchored with a horizontal-only base transform', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false} topAnchored>
          Top anchored
        </DialogContent>
      </Dialog>,
    );

    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;
    expect(popup).toBeTruthy();
    expect(popup!.className).toContain('top-[var(--dialog-top-offset)]');
    expect(popup!.className).not.toContain('-translate-y-1/2');
    expect(popup!.style.transform).toBe('translate(-50%, 0)');
  });

  it('wraps Tab focus from the last focusable back to the first inside the popup', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Wrap Title</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <input data-testid="wrap-input" aria-label="Wrap input" />
            <button type="button" data-testid="wrap-last">
              Last
            </button>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;
    expect(popup).toBeTruthy();

    // With the grip handle removed, the header div itself is the first
    // focusable inside the popup (draggable default gives it tabIndex=0).
    const first = popup!.querySelector('[data-slot="dialog-header"]') as HTMLDivElement;
    const last = screen.getByTestId('wrap-last') as HTMLButtonElement;
    expect(first).toBeTruthy();

    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  // plan 2026-09-28-4 U7: opening a dialog must move focus inside the popup
  // (WAI-ARIA APG dialog pattern). Live-browser repro showed focus staying on
  // the trigger button; jsdom/happy-dom may mask the timing, see plan notes.
  it('moves initial focus into the popup after opening via trigger', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger data-testid="dialog-opener">Open</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Focus Title</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <input data-testid="focus-input" aria-label="Focus input" />
            </DialogBody>
          </DialogContent>
        </Dialog>
      );
    }

    render(<Harness />);

    const opener = screen.getByTestId('dialog-opener');
    fireEvent.click(opener);

    const popup = await screen.findByText('Focus Title').then(() =>
      document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null,
    );
    expect(popup).toBeTruthy();

    await waitFor(() => {
      expect(popup!.contains(document.activeElement)).toBe(true);
    });
  });
});
