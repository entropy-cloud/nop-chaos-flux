import * as React from 'react';
import { subscribeMediaQueries } from './use-media-subscription.js';

/**
 * Subscribe to a single CSS media query. Returns `true` when the query
 * matches, `false` when it does not, and `null` in environments without
 * matchMedia support (SSR / jsdom) so callers can fall back explicitly.
 *
 * This is the subscription primitive of the media-hook family (plan 587
 * WA-ui-004): the public `boolean | null` signature is frozen; useIsMobile
 * delegates to it and useBreakpoints shares its effect core while keeping the
 * array API independent.
 */
export function useBreakpoint(query: string): boolean | null {
  const [matches, setMatches] = React.useState<boolean | null>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    // Sync to the latest value without a synchronous setState in the effect
    // body (the initializer already covers first render; this handles query
    // changes mid-session).
    return subscribeMediaQueries([query], (values) => setMatches(values[0] ?? null));
  }, [query]);

  return matches;
}
