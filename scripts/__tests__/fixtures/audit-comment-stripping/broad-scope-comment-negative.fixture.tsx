/**
 * useScopeSelector comment blind spot (2026-08-09): a comment mention without
 * `paths` must not be flagged by find-reactive-render-reads.
 * useScopeSelector((state) => state.items) — comment-only mention.
 */
export function untouched() {
  return 1;
}
