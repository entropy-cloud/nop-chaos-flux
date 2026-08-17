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

    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
