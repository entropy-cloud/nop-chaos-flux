/**
 * Internal shared subscription core for the media-query hooks (plan 587
 * WA-ui-004). Both `useBreakpoint` (single query, boolean|null) and
 * `useBreakpoints` (array API kept independent — per-query delegation would
 * mean hooks-in-a-loop, which is forbidden) run this same effect core: sync to
 * the latest matches one frame after the effect run, re-read on every change
 * event, and tear down both the frame callback and the listeners. Not exported
 * from the package root.
 */
export function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function subscribeMediaQueries(
  queries: string[],
  onMatches: (matches: boolean[]) => void,
): () => void {
  if (!hasMatchMedia()) {
    return () => {};
  }

  const mqls = queries.map((query) => window.matchMedia(query));
  const readAll = () => onMatches(mqls.map((mql) => mql.matches));

  // Sync to the latest values without a synchronous setState in the effect
  // body (the state initializer already covers first render; this handles
  // query-list changes mid-session).
  const identity = requestAnimationFrame(readAll);
  mqls.forEach((mql) => mql.addEventListener('change', readAll));
  return () => {
    cancelAnimationFrame(identity);
    mqls.forEach((mql) => mql.removeEventListener('change', readAll));
  };
}
