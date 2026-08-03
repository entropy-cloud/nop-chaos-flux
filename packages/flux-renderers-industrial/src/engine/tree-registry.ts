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

  add(leaf: Omit<RegistryLeaf, 'zIndex'>): RegistryLeaf {
    const entry: RegistryLeaf = { ...leaf, zIndex: this.byId.size };
    this.byId.set(leaf.id, entry);
    return entry;
  }

  remove(id: string): boolean {
    return this.byId.delete(id);
  }

  get(id: string): RegistryLeaf | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
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
