import React, { useRef } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSurfaceFocusWrap } from './use-surface-focus-wrap.js';

// CX-9 plan 587 (WA-ui-001): migration target of the retired
// wrap-surface-tab-focus.ts and use-dialog-initial-focus.ts direct tests. The
// wrap pins (roundtrip / hidden exclusion / non-interference) and the
// initial-focus pins travel with the behavior into the single shared
// primitive. Hidden-exclusion pins are B-FORM PINS: the retired A-form
// (offsetParent !== null) filter was vacuous in happy-dom (offsetParent is
// `undefined`, so every candidate passed and hidden elements were NOT
// excluded in this environment); under the unified B-form they execute for
// real here, and they stay red if the enumeration is ever reverted to A-form
// (dynamic discrimination anchor).

function renderSurface(children: React.ReactNode) {
  let captured: React.KeyboardEvent<HTMLElement> | null = null;
  function Surface() {
    const popupRef = useRef<HTMLDivElement>(null);
    const { handleSurfaceKeyDown } = useSurfaceFocusWrap(popupRef);
    return (
      <div
        ref={popupRef}
        data-testid="popup"
        onKeyDown={(event) => {
          captured = event;
          handleSurfaceKeyDown(event);
        }}
      >
        {children}
      </div>
    );
  }
  render(<Surface />);
  return {
    capturedEvent: () => {
      if (!captured) {
        throw new Error('no keydown captured');
      }
      return captured;
    },
  };
}

describe('useSurfaceFocusWrap — wrap layer (migrated from wrap-surface-tab-focus)', () => {
  afterEach(() => {
    cleanup();
  });

  it('wraps Tab from the last focusable back to the first', () => {
    renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it('leaves mid-list Tab untouched (not prevented, focus not forced)', () => {
    const { capturedEvent } = renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="middle">
          Middle
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const middle = screen.getByTestId('middle');
    const last = screen.getByTestId('last');

    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab' });

    expect(capturedEvent().defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(last);
  });

  it('ignores non-Tab keys', () => {
    const { capturedEvent } = renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Enter' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Escape' });
    expect(document.activeElement).toBe(last);
    expect(document.activeElement).not.toBe(first);
    expect(capturedEvent().defaultPrevented).toBe(false);
  });

  it('self-wraps when the only enabled button is both wrap ends (disabled head skipped by the selector)', () => {
    const { capturedEvent } = renderSurface(
      <>
        <button type="button" data-testid="disabled-head" disabled>
          Disabled head
        </button>
        <button type="button" data-testid="only-enabled">
          Only enabled
        </button>
      </>,
    );
    const onlyEnabled = screen.getByTestId('only-enabled');

    onlyEnabled.focus();
    fireEvent.keyDown(onlyEnabled, { key: 'Tab', shiftKey: true });

    expect(capturedEvent().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(onlyEnabled);
  });

  it('[B-form] excludes hidden elements at the end of the list when wrapping forward', () => {
    renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last-visible">
          Last visible
        </button>
        <button type="button" data-testid="hidden-tail" style={{ display: 'none' }}>
          Hidden tail
        </button>
      </>,
    );
    const first = screen.getByTestId('first');
    const lastVisible = screen.getByTestId('last-visible');
    const hiddenTail = screen.getByTestId('hidden-tail');

    lastVisible.focus();
    fireEvent.keyDown(lastVisible, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(hiddenTail);
  });

  it('[B-form] excludes hidden elements at the start of the list when wrapping backward', () => {
    renderSurface(
      <>
        <button type="button" data-testid="hidden-head" style={{ display: 'none' }}>
          Hidden head
        </button>
        <button type="button" data-testid="first-visible">
          First visible
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const firstVisible = screen.getByTestId('first-visible');
    const last = screen.getByTestId('last');
    const hiddenHead = screen.getByTestId('hidden-head');

    firstVisible.focus();
    fireEvent.keyDown(firstVisible, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
    expect(document.activeElement).not.toBe(hiddenHead);
  });

  it('[B-form] skips a hidden ancestor chain (element inside a display:none subtree)', () => {
    renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <div style={{ display: 'none' }}>
          <button type="button" data-testid="inside-hidden">
            Inside hidden
          </button>
        </div>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');
    const insideHidden = screen.getByTestId('inside-hidden');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(insideHidden);
  });

  it('[B-form seam] honors an injected checkVisibility=false verdict over the ancestor chain', () => {
    renderSurface(
      <>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </>,
    );
    const last = screen.getByTestId('last');

    // m2 injection seam: real browsers answer via checkVisibility; the mock
    // forces that code path inside happy-dom and must win over the (visible)
    // ancestor chain, proving the B-form consults checkVisibility first.
    Object.defineProperty(last, 'checkVisibility', {
      configurable: true,
      value: () => false,
    });

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(last);
  });
});

// Migrated 1:1 from use-dialog-initial-focus.test.tsx (plan 2026-09-28-4 U7):
// the fallback must re-establish focus inside the popup exactly once, and stay
// a no-op when focus is already inside.
describe('useSurfaceFocusWrap — initial-focus layer (migrated from useDialogInitialFocusFallback)', () => {
  afterEach(() => {
    cleanup();
  });

  it('focuses the first tabbable inside the popup when focus was lost', async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      const { handleSurfaceKeyDown } = useSurfaceFocusWrap(ref);
      return (
        <div ref={ref} data-testid="popup" onKeyDown={handleSurfaceKeyDown}>
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
      const { handleSurfaceKeyDown } = useSurfaceFocusWrap(ref);
      return (
        <div ref={ref} data-testid="popup" onKeyDown={handleSurfaceKeyDown}>
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
      const { handleSurfaceKeyDown } = useSurfaceFocusWrap(ref);
      return (
        <div ref={ref} data-testid="popup" onKeyDown={handleSurfaceKeyDown}>
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

  it('treats an injected checkVisibility=false first candidate as not tabbable (B-form seam)', async () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      const { handleSurfaceKeyDown } = useSurfaceFocusWrap(ref);
      return (
        <div
          ref={(node: HTMLDivElement | null) => {
            ref.current = node;
            if (node) {
              const firstButton = node.querySelector('[data-testid="check-invisible"]');
              if (firstButton) {
                Object.defineProperty(firstButton, 'checkVisibility', {
                  configurable: true,
                  value: () => false,
                });
              }
            }
          }}
          data-testid="popup"
          onKeyDown={handleSurfaceKeyDown}
        >
          <button type="button" data-testid="check-invisible">
            Check-invisible
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
