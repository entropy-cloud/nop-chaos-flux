export function areStringArraysEqual(a?: string[], b?: string[]) {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function normalizeOrderedColumns(rawOrderedColumns: string[], defaultOrderedColumns: string[]) {
  const knownColumns = new Set(defaultOrderedColumns);
  const normalized = rawOrderedColumns.filter((key) => knownColumns.has(key));
  for (const key of defaultOrderedColumns) {
    if (!normalized.includes(key)) {
      normalized.push(key);
    }
  }
  return normalized;
}
