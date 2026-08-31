const warned = new Set<string>();

/** One-time dev warn keyed by a stable diagnostic code (gd-* failure paths). */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(message);
}

export function resetWarnedKeysForTests(): void {
  warned.clear();
}
