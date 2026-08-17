import * as React from 'react';

function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function readAll(queries: string[]): Array<boolean | null> {
  if (!hasMatchMedia()) {
    return queries.map(() => null);
  }
  return queries.map((query) => window.matchMedia(query).matches);
}

/**
 * Subscribe to multiple CSS media queries at once. Returns one result per
 * query: `true` = matching, `false` = not matching, `null` = environment
 * without matchMedia support (SSR / jsdom).
 *
 * The returned array is refreshed on any query's change event and when the
 * query list content changes.
 */
export function useBreakpoints(queries: string[]): Array<boolean | null> {
  const [matches, setMatches] = React.useState<Array<boolean | null>>(() => readAll(queries));
  // Stable effect key: media queries never contain '|||', so the joined key
  // both drives effect re-runs and reconstructs the list inside the effect
  // (keeping the effect dependency a primitive, React-Compiler friendly).
  const queriesKey = queries.join('|||');

  React.useEffect(() => {
    const qs = queriesKey ? queriesKey.split('|||') : [];
    if (!hasMatchMedia()) {
      setMatches(qs.map(() => null));
      return;
    }

    const mqls = qs.map((query) => window.matchMedia(query));
    const update = () => {
      setMatches(mqls.map((mql) => mql.matches));
    };

    update();
    mqls.forEach((mql) => mql.addEventListener('change', update));
    return () => mqls.forEach((mql) => mql.removeEventListener('change', update));
  }, [queriesKey]);

  return matches;
}
