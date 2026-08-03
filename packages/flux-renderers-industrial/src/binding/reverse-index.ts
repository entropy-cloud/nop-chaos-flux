import type { ScadaBinding, ScadaSymbolNode } from '../serialization/config-types.js';

export interface BindingTarget {
  symbolId: string;
  property: string;
}

export interface SymbolBindingTarget extends BindingTarget {
  pointId: string;
}

interface IndexEntry extends BindingTarget {
  pointId: string;
}

const POINT_REF_PATTERN = /@\{([^{}]+)\}/g;

/**
 * 组态内表达式 `@{pointId}` 引用提取（语法级）。
 * 前缀隔离：`@{}` = 组态点表引用；`$xxx` flux scope 引用不落本层（I10.3）。
 */
export function extractPointIdRefs(expression: string): string[] {
  const ids: string[] = [];
  const pattern = new RegExp(POINT_REF_PATTERN.source, POINT_REF_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(expression)) !== null) {
    const id = match[1].trim();
    if (id) ids.push(id);
  }
  return ids;
}

export function collectBindingPointIds(binding: ScadaBinding): string[] {
  const ids = new Set<string>();
  if (binding.point) ids.add(binding.point);
  if (binding.expression) {
    for (const id of extractPointIdRefs(binding.expression)) ids.add(id);
  }
  return [...ids];
}

/**
 * 绑定反向索引（I6.1）：pointId → [{symbolId, property}]。
 * 场景打开/图元增删时增量维护（meta2d bindDatas 蓝本）。
 */
export class ReverseIndex {
  private byPoint = new Map<string, IndexEntry[]>();
  private bySymbol = new Map<string, IndexEntry[]>();
  private bindingsBySymbol = new Map<string, Record<string, ScadaBinding>>();

  constructor(symbols?: ScadaSymbolNode[]) {
    if (symbols) this.build(symbols);
  }

  build(symbols: ScadaSymbolNode[]): void {
    this.clear();
    for (const symbol of symbols) {
      this.addSymbol(symbol);
    }
  }

  addSymbol(node: ScadaSymbolNode): void {
    this.indexNode(node);
    for (const child of node.children ?? []) {
      this.addSymbol(child);
    }
  }

  removeSymbol(symbolId: string): void {
    const entries = this.bySymbol.get(symbolId);
    if (!entries) return;
    for (const entry of entries) {
      const list = this.byPoint.get(entry.pointId);
      if (!list) continue;
      const remaining = list.filter((item) => item.symbolId !== symbolId);
      if (remaining.length === 0) this.byPoint.delete(entry.pointId);
      else this.byPoint.set(entry.pointId, remaining);
    }
    this.bySymbol.delete(symbolId);
    this.bindingsBySymbol.delete(symbolId);
  }

  updateSymbol(node: ScadaSymbolNode): void {
    this.removeSymbol(node.id);
    this.addSymbol(node);
  }

  lookup(pointId: string): BindingTarget[] {
    return (this.byPoint.get(pointId) ?? []).map(({ symbolId, property }) => ({ symbolId, property }));
  }

  lookupSymbol(symbolId: string): SymbolBindingTarget[] {
    return (this.bySymbol.get(symbolId) ?? []).map(({ pointId, property }) => ({
      symbolId,
      property,
      pointId,
    }));
  }

  getBindings(symbolId: string): Record<string, ScadaBinding> | undefined {
    return this.bindingsBySymbol.get(symbolId);
  }

  pointIds(): string[] {
    return [...this.byPoint.keys()];
  }

  clear(): void {
    this.byPoint.clear();
    this.bySymbol.clear();
    this.bindingsBySymbol.clear();
  }

  private indexNode(node: ScadaSymbolNode): void {
    const bindings = node.bindings ?? {};
    if (Object.keys(bindings).length > 0) {
      this.bindingsBySymbol.set(node.id, bindings);
    }
    for (const [property, binding] of Object.entries(bindings)) {
      for (const pointId of collectBindingPointIds(binding)) {
        const entry: IndexEntry = { symbolId: node.id, property, pointId };
        const pointList = this.byPoint.get(pointId) ?? [];
        pointList.push(entry);
        this.byPoint.set(pointId, pointList);
        const symbolList = this.bySymbol.get(node.id) ?? [];
        symbolList.push(entry);
        this.bySymbol.set(node.id, symbolList);
      }
    }
  }
}
