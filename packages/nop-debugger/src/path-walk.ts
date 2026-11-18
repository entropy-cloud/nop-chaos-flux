/** Walk a dot-separated path (array indices as numeric segments) through a record. */
export function getPathValue(data: Record<string, unknown>, path: string): unknown {
  let current: unknown = data;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
