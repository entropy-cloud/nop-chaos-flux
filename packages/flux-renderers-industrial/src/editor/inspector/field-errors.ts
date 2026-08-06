import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 字段级错误映射（design-property-panel.md §6.3）。
 * key = 字段名，value = 错误消息数组。
 */
export type FieldErrors = Record<string, string[]>;

/**
 * 解析 validateScadaConfig 错误 → 字段级错误映射（design-property-panel.md §6.3）。
 *
 * 算法：
 * 1. 按 selectedNodeId 在 workingConfig.symbols 中反查索引。
 * 2. 过滤 `symbols[<index>]` 前缀的错误。
 * 3. 提取字段 key（scope path 第二段）。
 * 4. 嵌套路径（如 symbols[0].bindings.fill）归因到顶层字段（bindings）。
 */
export function parseFieldErrors(
  errors: string[],
  selectedNodeId: string | undefined,
  config: ScadaConfig,
): FieldErrors {
  if (!selectedNodeId || errors.length === 0) return {};
  const selectedIndex = findSymbolIndex(config.symbols, selectedNodeId);
  if (selectedIndex < 0) return {};

  const prefix = `symbols[${selectedIndex}].`;
  const result: FieldErrors = {};

  for (const error of errors) {
    if (!error.startsWith(prefix)) continue;
    const remainder = error.slice(prefix.length);
    const fieldKey = remainder.split(/[.\s]/)[0];
    if (!fieldKey) continue;
    if (!result[fieldKey]) result[fieldKey] = [];
    result[fieldKey].push(error);
  }

  return result;
}

function findSymbolIndex(symbols: ScadaSymbolNode[], id: string): number {
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i].id === id) return i;
    if (symbols[i].children) {
      const childIdx = findSymbolIndex(symbols[i].children!, id);
      if (childIdx >= 0) return i;
    }
  }
  return -1;
}
