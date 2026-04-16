function collectUsedIds(items: Array<Record<string, unknown>>): Set<string> {
  const used = new Set<string>();

  for (const item of items) {
    if (typeof item.id === 'string' && item.id.length > 0) {
      used.add(item.id);
    }
  }

  return used;
}

export function createNextCompositeItemId(items: Array<Record<string, unknown>>, prefix: string): string {
  const used = collectUsedIds(items);
  let next = items.length + 1;

  while (used.has(`${prefix}${next}`)) {
    next += 1;
  }

  return `${prefix}${next}`;
}
