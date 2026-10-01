function isDevRuntime(): boolean {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

const warnedKeys = new Set<string>();

export function warnOnce(key: string, message: string): void {
  // 15-01 (plan 483 Phase 7 batch a): dev-gated, repo-wide warnOnce convention.
  if (!isDevRuntime() || warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
}

/** 测试隔离锚：清空模块级去重表（chart-diagnostics reset 先例）。 */
export function resetPivotWarnForTests(): void {
  warnedKeys.clear();
}
