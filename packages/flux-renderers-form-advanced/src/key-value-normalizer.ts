export type RawKeyValuePair = { id?: string; key: string; value: string };

export const EMPTY_RAW_KEY_VALUE_PAIRS: RawKeyValuePair[] = [];

/**
 * Normalize raw form/scope data into raw key-value pairs WITHOUT assigning a
 * positional fallback id. Items that carry no authored `id` keep `id: undefined`
 * so the renderer can substitute a stable compatibility id (G18).
 */
export function toRawKeyValuePairs(value: unknown): RawKeyValuePair[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const candidate = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      id: typeof candidate.id === 'string' ? candidate.id : undefined,
      key: typeof candidate.key === 'string' ? candidate.key : '',
      value: typeof candidate.value === 'string' ? candidate.value : '',
    };
  });
}

export function rawKeyValuePairsEqual(a: RawKeyValuePair[], b: RawKeyValuePair[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every(
    (pair, index) =>
      pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value,
  );
}
