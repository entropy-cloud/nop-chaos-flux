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

  /**
   * 节点引用反查 id（I6.4 命中解析：selector.getByPoint 返回最深命中节点 → id）。
   * 真实 leafer `getByPoint` 返回**最深命中节点**（复合图元的子节点，如设备 body/转子），
   * 而 nodeIndex 只登记符号根节点——沿 parent 链上溯直到命中已登记根（gate-3 类 mock↔真实
   * 漂移回归：mock getByPoint 恒返回带 id 的叶子，掩蔽根索引反查失败的缺陷）。
   */
  findByNode(node: object): string | undefined {
    let current: object | null = node;
    while (current !== null) {
      const id = this.nodeIndex.get(current);
      if (id !== undefined) return id;
      current = (current as { parent?: object | null }).parent ?? null;
    }
    return undefined;
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
