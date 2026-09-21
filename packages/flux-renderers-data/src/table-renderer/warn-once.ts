import { isDevRuntime } from './use-table-tree.js';

const warned = new Set<string>();

/** One-time dev warn keyed by a stable diagnostic code (gd-* failure paths). */
export function warnOnce(key: string, message: string): void {
  // 15-01 (plan 483 Phase 7 batch a): dev-gated, matching the renderer-wide
  // isDevRuntime convention (keyboard.tsx / table-body-row-rendering.tsx).
  if (!isDevRuntime() || warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(message);
}
