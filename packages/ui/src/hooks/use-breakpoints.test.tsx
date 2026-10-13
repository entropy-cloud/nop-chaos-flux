import React from 'react';
import { cleanup, render, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBreakpoints } from './use-breakpoints.js';

// CX-9 plan 587 (WA-ui-004) characterization: the array API stays independent
// (no per-query delegation) and its SSR contract is one null per query.
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

describe('useBreakpoints (WA-ui-004 characterization)', () => {
  const samples: Array<Array<boolean | null> | undefined> = [];

  function lastSample(): Array<boolean | null> | undefined {
    return samples[samples.length - 1];
  }

  afterEach(() => {
    cleanup();
    (window as { innerWidth?: number }).innerWidth = 1024;
    samples.length = 0;
  });

  function Probe({ queries }: { queries: string[] }) {
    // Push-based capture (no outer-variable reassignment during render).
    samples.push(useBreakpoints(queries));
    return null;
  }

  it('returns one null per query in an environment without matchMedia (SSR contract)', () => {
    stripMatchMedia(() => {
      render(<Probe queries={['(max-width: 767px)', '(min-width: 1024px)']} />);
      expect(lastSample()).toEqual([null, null]);
    });
  });

  it('returns one boolean verdict per query when matchMedia exists', () => {
    (window as { innerWidth?: number }).innerWidth = 500;
    render(<Probe queries={['(max-width: 767px)', '(min-width: 1024px)']} />);
    expect(lastSample()).toEqual([true, false]);
  });

  it('re-reads the full list when any subscribed query changes', () => {
    render(<Probe queries={['(max-width: 767px)', '(max-width: 1279px)']} />);
    expect(lastSample()).toEqual([false, true]);

    act(() => {
      (window as { innerWidth?: number }).innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toEqual([true, true]);
  });

  it('resubscribes when the query list content changes', async () => {
    const { rerender } = render(<Probe queries={['(max-width: 767px)']} />);
    expect(lastSample()).toEqual([false]);

    act(() => {
      (window as { innerWidth?: number }).innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });
    expect(lastSample()).toEqual([true]);

    // The rAF sync inside the resubscribed effect refreshes the list for the
    // new query set one frame after the effect run.
    rerender(<Probe queries={['(max-width: 767px)', '(max-width: 400px)']} />);
    await waitFor(() => {
      expect(lastSample()).toEqual([true, false]);
    });
  });
});
