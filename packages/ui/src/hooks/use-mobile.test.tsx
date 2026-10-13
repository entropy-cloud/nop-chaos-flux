import React from 'react';
import { cleanup, render, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsMobile } from './use-mobile.js';

// CX-9 plan 587 (WA-ui-004) characterization: the three media-hook
// generations had zero SSR-contract pins. This file pins the useIsMobile
// boolean contract: never null, 768px threshold, matchMedia-driven updates,
// and (pre-delegation) the frozen innerWidth initial value in
// matchMedia-less environments.
function stripMatchMedia(run: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
  try {
    run();
  } finally {
    if (descriptor) {
      Object.defineProperty(window, 'matchMedia', descriptor);
    } else {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  }
}

describe('useIsMobile (WA-ui-004 characterization)', () => {
  const samples: Array<boolean | undefined> = [];

  function lastSample(): boolean | undefined {
    return samples[samples.length - 1];
  }

  afterEach(() => {
    cleanup();
    (window as { innerWidth?: number }).innerWidth = 1024;
    samples.length = 0;
  });

  function Probe() {
    // Push-based capture (no outer-variable reassignment during render).
    samples.push(useIsMobile());
    return null;
  }

  it('returns the boolean false contract on the default desktop viewport', () => {
    render(<Probe />);
    expect(lastSample()).toBe(false);
  });

  it('returns true below the 768px threshold', () => {
    (window as { innerWidth?: number }).innerWidth = 500;
    render(<Probe />);
    expect(lastSample()).toBe(true);
  });

  it('keeps tracking the threshold across matchMedia change events', () => {
    // happy-dom's MediaQueryList starts its internal matches-state at `false`,
    // so the first observable change dispatch is a false→true transition —
    // start desktop, flip to mobile, flip back.
    render(<Probe />);
    expect(lastSample()).toBe(false);

    (window as { innerWidth?: number }).innerWidth = 500;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toBe(true);

    (window as { innerWidth?: number }).innerWidth = 1024;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toBe(false);
  });

  it('freezes at the boolean false contract when matchMedia is absent (m4 note 2)', () => {
    stripMatchMedia(() => {
      (window as { innerWidth?: number }).innerWidth = 500;
      render(<Probe />);
      // Post-delegation contract (plan 587 m4 note 2): the delegated
      // useBreakpoint primitive initializes to null without matchMedia and
      // `?? false` freezes the boolean at false — the legacy self-hosted hook
      // froze at the first innerWidth read (true on a 500px viewport). All
      // consumers branch on truthiness and do not observe this.
      expect(lastSample()).toBe(false);
    });
  });

  it('returns false in a matchMedia-less desktop environment', () => {
    stripMatchMedia(() => {
      render(<Probe />);
      expect(lastSample()).toBe(false);
    });
  });
});
