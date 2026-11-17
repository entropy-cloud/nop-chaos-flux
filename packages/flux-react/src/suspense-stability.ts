import { useEffect, type ReactNode } from 'react';
import type { StabilityTracker } from '@nop-chaos/flux-core';

type StabilityTrackerProvider = () => StabilityTracker | undefined;

let trackerProvider: StabilityTrackerProvider | null = null;

/**
 * Host-global provider so debugger kernels can wire the runtime's stability
 * tracker into Suspense boundary accounting (M2) without a reverse dependency
 * from flux-react to the debugger package.
 */
export function registerSuspenseStabilityTracker(provider: StabilityTrackerProvider | null): void {
  trackerProvider = provider;
}

export function SuspenseStabilityFallback({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const tracker = trackerProvider?.();
    if (!tracker) return undefined;
    return tracker.acquire('suspense');
  }, []);
  return children;
}
