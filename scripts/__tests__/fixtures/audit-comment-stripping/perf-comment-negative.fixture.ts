/**
 * JSON.stringify change-detection comment blind spot (2026-08-09): mentions
 * inside comments must not fabricate a window hit.
 * JSON.stringify(a) === JSON.stringify(b) — comment-only, must not be flagged.
 */
export function sum(a: number, b: number) {
  return a + b;
}
