import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { GraphLayout } from './schemas.js';

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphStoreState {
  viewport: GraphViewport;
  layoutMode: GraphLayout;
  searchKeyword: string;
  matchNodeIds: string[];
  matchIndex: number;
  selectedNodeId: string | null;
}

export interface GraphStoreActions {
  setViewport(viewport: GraphViewport): void;
  setLayoutMode(layoutMode: GraphLayout): void;
  applySearch(keyword: string, matchNodeIds: string[]): void;
  advanceMatchIndex(step: number): void;
  clearSearch(): void;
  setSelectedNodeId(nodeId: string | null): void;
}

export type GraphStore = ReturnType<typeof createGraphStore>;
export type GraphStoreApi = StoreApi<GraphStoreState & GraphStoreActions>;

export interface CreateGraphStoreOptions {
  layoutMode?: GraphLayout;
  initialViewport?: GraphViewport;
}

/**
 * 包内 local store（design §7：视口/布局模式/搜索词+匹配索引/选中节点全部 local，不写 scope）。
 * 每个 graph 实例创建独立 store（Zustand vanilla，参照 flow-designer-core 拆分模式）。
 */
export function createGraphStore(options: CreateGraphStoreOptions = {}): GraphStoreApi {
  return createStore<GraphStoreState & GraphStoreActions>()((set) => ({
    viewport: options.initialViewport ?? { x: 0, y: 0, zoom: 1 },
    layoutMode: options.layoutMode ?? 'flow',
    searchKeyword: '',
    matchNodeIds: [],
    matchIndex: -1,
    selectedNodeId: null,
    setViewport: (viewport) => set({ viewport }),
    setLayoutMode: (layoutMode) => set({ layoutMode }),
    applySearch: (searchKeyword, matchNodeIds) =>
      set({ searchKeyword, matchNodeIds, matchIndex: matchNodeIds.length > 0 ? 0 : -1 }),
    advanceMatchIndex: (step) =>
      set((state) => {
        const count = state.matchNodeIds.length;
        if (count <= 0) {
          return { matchIndex: -1 };
        }
        const next = state.matchIndex + step;
        if (next < 0) {
          return { matchIndex: count - 1 };
        }
        if (next >= count) {
          return { matchIndex: 0 };
        }
        return { matchIndex: next };
      }),
    clearSearch: () => set({ searchKeyword: '', matchNodeIds: [], matchIndex: -1 }),
    setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  }));
}
