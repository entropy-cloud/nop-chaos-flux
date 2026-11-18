interface DependencyEdge {
  from: string;
  to: string;
  kind: 'write' | 'read' | 'derive';
}

interface DependencyImpact {
  cids: string[];
  paths: string[];
  degradedToPathQuery: boolean;
}

export interface DependencyGraph {
  recordWriteEdge(scopeId: string, path: string): void;
  recordReadEdge(cid: string, paths: readonly string[]): void;
  recordDeriveEdge(fromPath: string, cid: string): void;
  queryImpact(path: string): DependencyImpact;
  edgeCount(): number;
  isDegraded(): boolean;
}

const EDGE_LIMIT = 2000;

export function createDependencyGraph(): DependencyGraph {
  const edges = new Map<string, DependencyEdge>();
  let degradedToPathQuery = false;

  function addEdge(edge: DependencyEdge): void {
    if (degradedToPathQuery) return;
    const key = `${edge.kind}:${edge.from}->${edge.to}`;
    if (!edges.has(key)) {
      edges.set(key, edge);
      if (edges.size > EDGE_LIMIT) {
        degradedToPathQuery = true;
        edges.clear();
      }
    }
  }

  return {
    recordWriteEdge(scopeId, path) {
      addEdge({ from: `${scopeId}.${path}`, to: scopeId, kind: 'write' });
    },
    recordReadEdge(cid, paths) {
      for (const path of paths) {
        addEdge({ from: path, to: cid, kind: 'read' });
      }
    },
    recordDeriveEdge(fromPath, cid) {
      addEdge({ from: fromPath, to: cid, kind: 'derive' });
    },
    queryImpact(path) {
      if (degradedToPathQuery) {
        // path-query mode:即时扫描不可用（增量边已清除），返回降级标记
        return { cids: [], paths: [], degradedToPathQuery: true };
      }
      const cids = new Set<string>();
      const paths = new Set<string>();
      // write edges: paths written under the queried prefix
      for (const edge of edges.values()) {
        if (edge.kind === 'write' && edge.from.startsWith(path)) {
          paths.add(edge.from);
        }
        if (edge.kind === 'read' && (edge.from.startsWith(path) || path.startsWith(edge.from))) {
          cids.add(edge.to);
        }
        if (edge.kind === 'derive' && (edge.from.startsWith(path) || path.startsWith(edge.from))) {
          cids.add(edge.to);
        }
      }
      return { cids: [...cids], paths: [...paths], degradedToPathQuery: false };
    },
    edgeCount: () => edges.size,
    isDegraded: () => degradedToPathQuery,
  };
}
