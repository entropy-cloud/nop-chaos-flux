import * as React from 'react';
import { hasMatchMedia, subscribeMediaQueries } from './use-media-subscription.js';

/**
 * Subscribe to multiple CSS media queries at once. Returns one result per
 * query: `true` = matching, `false` = not matching, `null` = environment
 * without matchMedia support (SSR / jsdom).
 *
 * The returned array is refreshed on any query's change event and when the
 * query list content changes. The array API stays independent of the single
 * `useBreakpoint` primitive (plan 587 WA-ui-004): delegating per query would
 * mean hooks-in-a-loop, which is forbidden — only the subscription effect core
 * is shared.
 */
export function useBreakpoints(queries: string[]): Array<boolean | null> {
  const [matches, setMatches] = React.useState<Array<boolean | null>>(() => {
    if (!hasMatchMedia()) {
      return queries.map(() => null);
    }
    return queries.map((query) => window.matchMedia(query).matches);
  });
  // Stable effect key: media queries never contain '|||', so the joined key
  // both drives effect re-runs and reconstructs the list inside the effect
  // (keeping the effect dependency a primitive, React-Compiler friendly).
  const queriesKey = queries.join('|||');

  React.useEffect(() => {
    const qs = queriesKey ? queriesKey.split('|||') : [];
    return subscribeMediaQueries(qs, (values) => setMatches(values));
  }, [queriesKey]);

  return matches;
}
