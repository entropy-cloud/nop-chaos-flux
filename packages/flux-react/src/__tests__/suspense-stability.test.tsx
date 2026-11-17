// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createStabilityTracker } from '@nop-chaos/flux-runtime';
import { registerSuspenseStabilityTracker, SuspenseStabilityFallback } from '../suspense-stability.js';
import { render } from '@testing-library/react';

describe('Suspense stability accounting (M2)', () => {
  it('holds the suspense counter while the fallback is mounted and releases on unmount', () => {
    const tracker = createStabilityTracker();
    registerSuspenseStabilityTracker(() => tracker);
    const { unmount } = render(<SuspenseStabilityFallback>loading…</SuspenseStabilityFallback>);
    expect(tracker.getSnapshot().counters.suspense).toBe(1);
    expect(tracker.isStable()).toBe(false);
    unmount();
    expect(tracker.getSnapshot().counters.suspense).toBe(0);
    expect(tracker.isStable()).toBe(true);
    registerSuspenseStabilityTracker(null);
  });

  it('no-ops without a registered provider', () => {
    registerSuspenseStabilityTracker(null);
    const tracker = createStabilityTracker();
    registerSuspenseStabilityTracker(() => tracker);
    const { unmount } = render(<SuspenseStabilityFallback>x</SuspenseStabilityFallback>);
    unmount();
    expect(tracker.getSnapshot().counters.suspense).toBe(0);
    registerSuspenseStabilityTracker(null);
  });
});
