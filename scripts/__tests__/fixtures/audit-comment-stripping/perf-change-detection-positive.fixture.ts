export function changed(prev: unknown, next: unknown) {
  return JSON.stringify(prev) === JSON.stringify(next);
}
