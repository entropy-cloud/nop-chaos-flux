interface PendingEntry<T> {
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: T) => void;
}

export function cancelPendingDebounce<K, T>(
  pendingMap: Map<K, PendingEntry<T>>,
  key: K,
  resolveWith?: T
): boolean {
  const previous = pendingMap.get(key);
  if (!previous) return false;
  clearTimeout(previous.timer);
  previous.resolve(resolveWith as T);
  pendingMap.delete(key);
  return true;
}

export function scheduleDebounce<K, T>(
  pendingMap: Map<K, PendingEntry<T>>,
  key: K,
  timeoutMs: number,
  factory: () => T | Promise<T>
): Promise<T> {
  cancelPendingDebounce(pendingMap, key);

  return new Promise<T>((resolve) => {
    const timer = setTimeout(async () => {
      pendingMap.delete(key);
      resolve(await factory());
    }, timeoutMs);

    pendingMap.set(key, { timer, resolve });
  });
}
