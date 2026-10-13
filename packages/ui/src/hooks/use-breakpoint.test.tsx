import React from 'react';
import { cleanup, render, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBreakpoint } from './use-breakpoint.js';

// CX-9 plan 587 (WA-ui-004) characterization: useBreakpoint is the
// subscription primitive — public `boolean | null` signature is frozen
// (null = environment without matchMedia support, SSR / jsdom).
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

describe('useBreakpoint (WA-ui-004 characterization)', () => {
  const samples: Array<boolean | null | undefined> = [];

  function lastSample(): boolean | null | undefined {
    return samples[samples.length - 1];
  }

  afterEach(() => {
    cleanup();
    (window as { innerWidth?: number }).innerWidth = 1024;
    samples.length = 0;
  });

  function Probe({ query }: { query: string }) {
    // Push-based capture (no outer-variable reassignment during render).
    samples.push(useBreakpoint(query));
    return null;
  }

  it('returns null in an environment without matchMedia (SSR contract)', () => {
    stripMatchMedia(() => {
      render(<Probe query="(max-width: 767px)" />);
      expect(lastSample()).toBeNull();
    });
  });

  it('returns boolean false above the query threshold', () => {
    render(<Probe query="(max-width: 767px)" />);
    expect(lastSample()).toBe(false);
  });

  it('returns boolean true below the query threshold', () => {
    (window as { innerWidth?: number }).innerWidth = 500;
    render(<Probe query="(max-width: 767px)" />);
    expect(lastSample()).toBe(true);
  });

  it('updates on matchMedia change events (resize-driven in happy-dom)', () => {
    render(<Probe query="(max-width: 500px)" />);
    expect(lastSample()).toBe(false);

    act(() => {
      (window as { innerWidth?: number }).innerWidth = 400;
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toBe(true);

    act(() => {
      (window as { innerWidth?: number }).innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toBe(false);
  });
});
