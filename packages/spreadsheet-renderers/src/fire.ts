export function fire(fn: () => Promise<unknown>): void {
  void fn();
}
