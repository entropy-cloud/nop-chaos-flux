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
  // plan 2026-08-05-1253-1 Phase 2（open-audit P2-1）：parentId → 直接子 id 集索引，
  // 使 subtreeIds 退化为 O(subtree) DFS，不再依赖「父先于子插入」隐式不变式
  // （undo-redo diff / 第三方逆序直调可破 forward + ids.includes 实现）。
  private childrenOf = new Map<string, Set<string>>();

  add(leaf: Omit<RegistryLeaf, 'zIndex'>): RegistryLeaf {
    const entry: RegistryLeaf = { ...leaf, zIndex: this.byId.size };
    this.byId.set(leaf.id, entry);
    this.nodeIndex.set(leaf.node, leaf.id);
    if (leaf.parentId !== undefined) {
      let children = this.childrenOf.get(leaf.parentId);
      if (!children) {
        children = new Set<string>();
        this.childrenOf.set(leaf.parentId, children);
      }
      children.add(leaf.id);
    }
    return entry;
  }

  remove(id: string): boolean {
    const entry = this.byId.get(id);
    if (!entry) return false;
    this.nodeIndex.delete(entry.node);
    this.byId.delete(id);
    // 子树断链（Decision：被删根的子条目整体不再经其可达，符合「删除 group 连同子树」语义）：
    // 删 childrenOf 中以 id 为 key 的条目；从其 parent 的 childrenOf Set 中移除 id。
    this.childrenOf.delete(id);
    if (entry.parentId !== undefined) {
      const siblings = this.childrenOf.get(entry.parentId);
      if (siblings) {
        siblings.delete(id);
        if (siblings.size === 0) this.childrenOf.delete(entry.parentId);
      }
    }
    return true;
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
    this.childrenOf.clear();
  }

  /**
   * 以 id 为根的子树 id 集（含自身）。plan 2026-08-05-1253-1 Phase 2：改 childrenOf 索引 + DFS，
   * O(subtree) 且不依赖「父先于子插入」隐式不变式（undo-redo diff / 第三方逆序直调不再漏收）。
   * 顺序保持 parent-before-children（pre-order DFS），与旧 forward 实现正序插入时一致。
   */
  subtreeIds(id: string): string[] {
    const ids = [id];
    const stack = [id];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      const children = this.childrenOf.get(cur);
      if (!children) continue;
      for (const child of children) {
        ids.push(child);
        stack.push(child);
      }
    }
    return ids;
  }
}
