import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent } from './dialog.js';

// CX-9 plan 587 m5 characterization: dialog Popup composition order is
// wrap-first then user handler (wrapSurfaceTabFocus → props.onKeyDown), and a
// consumer onKeyDown must never be swallowed. These pins survive the
// useSurfaceFocusWrap migration byte-for-byte.
describe('Dialog onKeyDown composition (m5)', () => {
  afterEach(() => {
    cleanup();
  });

  it('runs wrap before the user handler: Tab from the last focusable reaches props.onKeyDown already wrapped', () => {
    const userOnKeyDown = vi.fn();
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false} draggable={false} onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </DialogContent>
      </Dialog>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(userOnKeyDown).toHaveBeenCalledTimes(1);
    // The wrap already ran when the user handler saw the event (order pin),
    // and the user handler was not swallowed by the wrap layer.
    expect(userOnKeyDown.mock.calls[0]![0].defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('leaves a non-boundary Tab unwrapped: the user handler sees defaultPrevented=false', () => {
    const userOnKeyDown = vi.fn();
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false} draggable={false} onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="middle">
            Middle
          </button>
          <button type="button" data-testid="last">
            Last
          </button>
        </DialogContent>
      </Dialog>,
    );
    const middle = screen.getByTestId('middle');
    const first = screen.getByTestId('first');

    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab' });

    expect(userOnKeyDown).toHaveBeenCalledTimes(1);
    expect(userOnKeyDown.mock.calls[0]![0].defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(first);
  });

  it('forwards non-Tab keys to the user handler without wrapping', () => {
    const userOnKeyDown = vi.fn();
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false} draggable={false} onKeyDown={userOnKeyDown}>
          <input data-testid="first" aria-label="First" />
          <button type="button" data-testid="last">
            Last
          </button>
        </DialogContent>
      </Dialog>,
    );
    const last = screen.getByTestId('last');
    const first = screen.getByTestId('first');

    last.focus();
    fireEvent.keyDown(last, { key: 'ArrowDown' });

    expect(userOnKeyDown).toHaveBeenCalledTimes(1);
    expect(userOnKeyDown.mock.calls[0]![0].key).toBe('ArrowDown');
    expect(document.activeElement).toBe(last);
    expect(document.activeElement).not.toBe(first);
  });
});
