import type { ScadaSymbolDefinition, LeafNode } from '../symbols/symbol-types.js';

export interface RegistryLeaf {
  id: string;
  node: LeafNode;
  zIndex: number;
  parentId?: string;
  definition?: ScadaSymbolDefinition;
}

export class TreeRegistry {
  private byId = new Map<string, RegistryLeaf>();
  private nodeIndex = new WeakMap<object, string>();

  add(leaf: Omit<RegistryLeaf, 'zIndex'>): RegistryLeaf {
    const entry: RegistryLeaf = { ...leaf, zIndex: this.byId.size };
    this.byId.set(leaf.id, entry);
    this.nodeIndex.set(leaf.node, leaf.id);
    return entry;
  }

  remove(id: string): boolean {
    const entry = this.byId.get(id);
    if (!entry) return false;
    this.nodeIndex.delete(entry.node);
    return this.byId.delete(id);
  }

  get(id: string): RegistryLeaf | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** 节点引用反查 id（I6.4 命中解析：selector.getByPoint 返回最深命中节点 → id）。 */
  findByNode(node: object): string | undefined {
    return this.nodeIndex.get(node);
  }

  getSymbols(): RegistryLeaf[] {
    return [...this.byId.values()];
  }

  size(): number {
    return this.byId.size;
  }

  clear(): void {
    this.byId.clear();
  }

  subtreeIds(id: string): string[] {
    const ids = [id];
    for (const entry of this.byId.values()) {
      if (entry.parentId !== undefined && ids.includes(entry.parentId)) {
        ids.push(entry.id);
      }
    }
    return ids;
  }
}
