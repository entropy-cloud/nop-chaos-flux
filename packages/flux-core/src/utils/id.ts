/**
 * Time-scoped unique id: `<ms>-<base36 random>` (7 random chars). This is the
 * historically dominant id shape across designer/runtime packages; call sites
 * needing a different shape (prefixed, colon-joined, underscored) keep their
 * local format deliberately — see cq-2 genId site annotations.
 */
export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
