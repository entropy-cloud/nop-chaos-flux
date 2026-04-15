import type { TreeDomainAdapter } from './types';

const adapters = new Map<string, TreeDomainAdapter>();

export function registerTreeDomainAdapter(adapter: TreeDomainAdapter): void {
  if (adapters.has(adapter.kind)) {
    throw new Error(`TreeDomainAdapter with kind "${adapter.kind}" is already registered`);
  }
  adapters.set(adapter.kind, adapter);
}

export function getTreeDomainAdapter(kind: string): TreeDomainAdapter | undefined {
  return adapters.get(kind);
}

export function listTreeDomainAdapters(): string[] {
  return Array.from(adapters.keys());
}

export function clearTreeDomainAdapters(): void {
  adapters.clear();
}
