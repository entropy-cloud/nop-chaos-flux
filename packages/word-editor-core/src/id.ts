let idCounter = 0;

/**
 * Single id generator for the word-editor domain models
 * (WA-word-editor-core-001): `<prefix>_<ms>_<counter>`. The three model
 * factories previously hand-rolled this shape per file and dataset-store had
 * drifted to a Math.random + deprecated `substr` variant. Callers keep their
 * own prefix (e.g. the `col_` underscore column-name shape is deliberate —
 * column names are user-facing keys, see dataset-store).
 */
export function createPrefixedId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}
