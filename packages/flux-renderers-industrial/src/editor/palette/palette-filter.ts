import type { ScadaSymbolCategory, ScadaSymbolDefinition } from '../../symbols/symbol-types.js';

/**
 * palette 检索/分组纯函数（plan 531 S2 Phase 1，526 designer-palette-filter 同形态移植）。
 * 与 React/leafer 零耦合，供 editor-palette 消费。
 */

type ScadaPaletteCategory = ScadaSymbolCategory | 'other';

interface ScadaPaletteGroup {
  category: ScadaPaletteCategory;
  symbols: ScadaSymbolDefinition[];
}

/** 分类稳定序（symbol-types.ts:12 六分类 + 缺省 other 兜底组）。 */
const CATEGORY_ORDER: ScadaPaletteCategory[] = ['shape', 'device', 'instrument', 'sensor-control', 'electrical', 'pipe', 'other'];

export function matchesScadaPaletteQuery(
  def: ScadaSymbolDefinition,
  resolvedName: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    resolvedName.toLowerCase().includes(q) ||
    def.type.toLowerCase().includes(q) ||
    (def.category ?? 'other').toLowerCase().includes(q)
  );
}

/**
 * 分类分组 + 组内检索过滤 + 空组剔除。category 缺省（optional 字段，第三方注册可缺）
 * 单列 other 组，不静默丢弃（plan 531 review M-6）。
 */
export function groupScadaPaletteSymbols(
  symbols: ScadaSymbolDefinition[],
  resolvedNameOf: (def: ScadaSymbolDefinition) => string,
  query: string,
): ScadaPaletteGroup[] {
  const filtered = symbols.filter((def) => matchesScadaPaletteQuery(def, resolvedNameOf(def), query));
  const byCategory = new Map<ScadaPaletteCategory, ScadaSymbolDefinition[]>();
  for (const def of filtered) {
    const category = (def.category ?? 'other') as ScadaPaletteCategory;
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(def);
    else byCategory.set(category, [def]);
  }
  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    symbols: byCategory.get(category)!,
  }));
}
