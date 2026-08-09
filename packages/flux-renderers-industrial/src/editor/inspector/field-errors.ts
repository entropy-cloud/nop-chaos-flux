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
 * 1. 按 selectedNodeId 在 workingConfig.symbols 中反查完整 scope path（含 children 嵌套层）。
 * 2. 过滤 `<scopePath>.` 前缀的错误（顶层=`symbols[<index>]`，嵌套=`symbols[<index>].children[<i>]...`）。
 * 3. 提取字段 key（scope path 末段之后的第一个 path 段）。
 * 4. 嵌套路径（如 symbols[0].bindings.fill）归因到顶层字段（bindings）。
 */
export function parseFieldErrors(
  errors: string[],
  selectedNodeId: string | undefined,
  config: ScadaConfig,
): FieldErrors {
  if (!selectedNodeId || errors.length === 0) return {};
  const scopePath = findSymbolScopePath(config.symbols, selectedNodeId);
  if (!scopePath) return {};

  const prefix = `${scopePath}.`;
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

/**
 * 反查 nodeId 的完整 validate.ts scope path（plan 2026-08-08-1230-1 Phase 2 / P2-FE-1）。
 *
 * 先前 findSymbolIndex 对 group 子节点返回父节点顶层索引，导致嵌套错误格式
 * `symbols[N].children[M].field` 的 fieldKey 被错提为 `children[M]`（错误静默丢失）。
 * 改为返回完整 scope path，与 validate.ts:342 `symbols[N].children[M]` 格式对齐。
 */
function findSymbolScopePath(
  symbols: ScadaSymbolNode[],
  id: string,
  basePath = 'symbols',
): string | undefined {
  for (let i = 0; i < symbols.length; i++) {
    const scope = `${basePath}[${i}]`;
    if (symbols[i].id === id) return scope;
    if (symbols[i].children) {
      const childPath = findSymbolScopePath(symbols[i].children!, id, `${scope}.children`);
      if (childPath) return childPath;
    }
  }
  return undefined;
}
