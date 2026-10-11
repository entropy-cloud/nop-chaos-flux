// WA-layout-002 (plan 567): every list-flavored layout renderer narrows the
// same schema boundary — resolved props arrive as `unknown` and the compiled
// item shapes are package-internal contracts. Six hand-written
// `Array.isArray(...) ? (x as unknown as T[]) : []` seams drifted toward copy
// noise; this named seam keeps the single explicit `as T[]` in one place with
// the boundary contract declared once.
export function compiledItems<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
