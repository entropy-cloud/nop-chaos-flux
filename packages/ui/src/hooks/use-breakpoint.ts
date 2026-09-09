import * as React from 'react';

/**
 * Subscribe to a single CSS media query. Returns `true` when the query
 * matches, `false` when it does not, and `null` in environments without
 * matchMedia support (SSR / jsdom) so callers can fall back explicitly.
 */
export function useBreakpoint(query: string): boolean | null {
  const [matches, setMatches] = React.useState<boolean | null>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Sync to the latest value without a synchronous setState in the effect
    // body (the initializer already covers first render; this handles query
    // changes mid-session).
    const identity = requestAnimationFrame(() => setMatches(mql.matches));
    mql.addEventListener('change', onChange);
    return () => {
      cancelAnimationFrame(identity);
      mql.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}
