import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { ReactFlowInstance } from '@xyflow/react';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import {
  DEFAULT_LEVEL_MAP,
  type GraphEdge,
  type GraphLevel,
  type GraphLayout,
  type GraphNode,
  type GraphOrientation,
  type GraphSchema,
} from './schemas.js';
import { computeGraphLayout } from './graph-layout.js';
import { advanceSearchIndex, searchGraphNodes } from './graph-search.js';
import { createGraphStore, type GraphViewport } from './graph-store.js';
import { XyflowCanvas, type GraphCanvasEdge, type GraphCanvasNode } from './xyflow-canvas.js';

const ZOOM_STEP = 1.2;
const DEFAULT_MIN_ZOOM = 0.2;
const DEFAULT_MAX_ZOOM = 2;
const FLOW_NODE_SPREAD_X = 40;
const FLOW_NODE_SPREAD_Y = 32;
const FIT_VIEW_PADDING = 0.12;

interface GraphNodeSelectionPayload {
  type: string;
  nodeId: string | null;
  node: GraphNode | null;
  [key: string]: unknown;
}

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function normalizeNodes(value: unknown): GraphNode[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is GraphNode => Boolean(entry) && typeof entry === 'object');
}

function normalizeEdges(value: unknown): GraphEdge[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is GraphEdge => Boolean(entry) && typeof entry === 'object');
}

function resolveSemanticLevel(
  node: GraphNode,
  levelField: string,
  levelMap: Record<string, string>,
): GraphLevel | undefined {
  const raw = node[levelField];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const mapped = levelMap[raw];
  return mapped === 'info' || mapped === 'success' || mapped === 'warning' || mapped === 'danger'
    ? mapped
    : undefined;
}

function isGraphLayout(value: unknown): value is GraphLayout {
  return value === 'flow' || value === 'hierarchy';
}

export function GraphRenderer(props: RendererComponentProps<GraphSchema>) {
  const resolved = props.props;
  const componentRegistry = useCurrentComponentRegistry();

  const rawNodes = useMemo(() => normalizeNodes(resolved.nodes), [resolved.nodes]);
  const rawEdges = useMemo(() => normalizeEdges(resolved.edges), [resolved.edges]);
  const layout = isGraphLayout(resolved.layout) ? resolved.layout : 'flow';
  const orientation: GraphOrientation = resolved.orientation === 'TB' ? 'TB' : 'LR';
  const labelField = typeof resolved.labelField === 'string' ? resolved.labelField : 'label';
  const typeField = typeof resolved.typeField === 'string' ? resolved.typeField : 'type';
  const levelField = typeof resolved.levelField === 'string' ? resolved.levelField : 'level';
  const levelMap = useMemo(
    () => ({ ...DEFAULT_LEVEL_MAP, ...(resolved.levelMap ?? {}) }),
    [resolved.levelMap],
  );
  const fitView = resolved.fitView !== false;
  const zoomable = resolved.zoomable !== false;
  const pannable = resolved.pannable !== false;
  const selectable = resolved.selectable !== false;
  const searchable = resolved.searchable === true;
  const showControls = resolved.showControls !== false;
  const minZoom = typeof resolved.minZoom === 'number' ? resolved.minZoom : DEFAULT_MIN_ZOOM;
  const maxZoom = typeof resolved.maxZoom === 'number' ? resolved.maxZoom : DEFAULT_MAX_ZOOM;

  const [store] = useState(() => createGraphStore({ layoutMode: layout }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ReactFlowInstance<GraphCanvasNode, GraphCanvasEdge> | null>(null);
  const initialViewportRef = useRef<GraphViewport | null>(null);
  const nodesRef = useRef<GraphNode[]>(rawNodes);
  const nodeByIdRef = useRef<Map<string, GraphNode>>(new Map());
  const projectionPositionsRef = useRef<ReadonlyMap<string, { x: number; y: number }>>(new Map());
  const minZoomRef = useRef(minZoom);
  const maxZoomRef = useRef(maxZoom);
  // 最新交互处理函数镜像：canvas 侧回调必须引用稳定（xyflow 的 SelectionListener /
  // StoreUpdater 依赖回调 identity，引用每次变化会触发额外派发/更新风暴）。
  const canvasHandlersRef = useRef({
    onNodeClick: (_nodeId: string) => undefined as void,
    onNodeDoubleClick: (_nodeId: string) => undefined as void,
    onSelectionChange: (_nodeId: string | null) => undefined as void,
    onPaneClick: () => undefined as void,
    onViewportChange: (_viewport: GraphViewport) => undefined as void,
    onInstanceReady: (_instance: ReactFlowInstance<GraphCanvasNode, GraphCanvasEdge> | null) =>
      undefined as void,
  });

  const viewport = useStore(store, (state) => state.viewport);
  const layoutMode = useStore(store, (state) => state.layoutMode);
  const searchKeyword = useStore(store, (state) => state.searchKeyword);
  const matchNodeIds = useStore(store, (state) => state.matchNodeIds);
  const matchIndex = useStore(store, (state) => state.matchIndex);
  const selectedNodeId = useStore(store, (state) => state.selectedNodeId);

  const projection = useMemo(
    () => computeGraphLayout(rawNodes, rawEdges, layoutMode, orientation),
    [rawNodes, rawEdges, layoutMode, orientation],
  );

  // 句柄/事件处理读取的最新数据镜像（不在 render 期读写 ref，react-compiler 安全）
  useEffect(() => {
    minZoomRef.current = minZoom;
    maxZoomRef.current = maxZoom;
    nodesRef.current = rawNodes;
    nodeByIdRef.current = new Map(rawNodes.map((node) => [node.id, node]));
    projectionPositionsRef.current = new Map(
      rawNodes.map((node, index) => [
        node.id,
        projection.positions.get(node.id) ?? {
          x: 24 + index * FLOW_NODE_SPREAD_X,
          y: 24 + index * FLOW_NODE_SPREAD_Y,
        },
      ]),
    );
  }, [minZoom, maxZoom, rawNodes, projection.positions]);

  const empty = rawNodes.length === 0 && rawEdges.length === 0;
  const searching = searchKeyword.length > 0;

  const fireNodeEvent = (type: string, nodeId: string | null, node: GraphNode | null) => {
    const handler = props.events[type];
    if (!handler) {
      return;
    }
    const fullPayload: GraphNodeSelectionPayload = { type, nodeId, node };
    void handler(fullPayload, { scope: props.node.scope });
  };

  const syncSelection = (nodeId: string | null) => {
    const previous = store.getState().selectedNodeId;
    if (previous === nodeId) {
      return;
    }
    store.getState().setSelectedNodeId(nodeId);
    const node = nodeId ? nodeByIdRef.current.get(nodeId) ?? null : null;
    fireNodeEvent('onSelectionChange', nodeId, node);
  };

  const locateNode = (nodeId: string) => {
    const instance = instanceRef.current;
    const position = projectionPositionsRef.current.get(nodeId);
    if (!instance || !position) {
      return;
    }
    const size = { width: 180, height: 56 };
    instance.setCenter(position.x + size.width / 2, position.y + size.height / 2, {
      zoom: Math.max(0.5, Math.min(instance.getZoom(), 1.25)),
      duration: 320,
    });
  };

  const zoomBy = (factor: number) => {
    const state = store.getState();
    const nextZoom = Math.min(
      maxZoomRef.current,
      Math.max(minZoomRef.current, state.viewport.zoom * factor),
    );
    if (nextZoom === state.viewport.zoom) {
      return;
    }
    const element = containerRef.current;
    const centerX = (element?.clientWidth ?? 0) / 2;
    const centerY = (element?.clientHeight ?? 0) / 2;
    const scale = nextZoom / state.viewport.zoom;
    state.setViewport({
      x: centerX - scale * (centerX - state.viewport.x),
      y: centerY - scale * (centerY - state.viewport.y),
      zoom: nextZoom,
    });
  };

  const resetViewport = () => {
    const initial = initialViewportRef.current ?? { x: 0, y: 0, zoom: 1 };
    store.getState().setViewport(initial);
  };

  const applySearchKeyword = (keyword: string) => {
    const matches = searchGraphNodes(keyword, nodesRef.current, { labelField, typeField, levelField });
    store.getState().applySearch(keyword, matches);
    return matches;
  };

  const clearSearch = () => {
    store.getState().clearSearch();
  };

  const cycleAndLocate = (step: number) => {
    const state = store.getState();
    if (state.matchNodeIds.length === 0) {
      return;
    }
    const next = advanceSearchIndex(state.matchIndex, state.matchNodeIds.length, step);
    store.getState().advanceMatchIndex(step);
    const target = state.matchNodeIds[next];
    if (target) {
      syncSelection(target);
      locateNode(target);
    }
  };

  const focusNodeById = (nodeId: string): boolean => {
    const target = nodeByIdRef.current.get(nodeId);
    if (!target) {
      instanceRef.current?.fitView({ padding: FIT_VIEW_PADDING });
      return false;
    }
    syncSelection(nodeId);
    locateNode(nodeId);
    return true;
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      cycleAndLocate(event.shiftKey ? -1 : 1);
    }
  };

  const handleViewportChange = (next: GraphViewport) => {
    if (!initialViewportRef.current) {
      initialViewportRef.current = next;
    }
    // 受控视口写回守卫：React Flow 的 onMove 在受控 viewport prop 变化时也会触发，
    // 值相等时跳过写回，避免「prop 变化 → onMove → 写回 → prop 变化」更新风暴。
    const current = store.getState().viewport;
    if (current.x === next.x && current.y === next.y && current.zoom === next.zoom) {
      return;
    }
    store.getState().setViewport(next);
  };

  // 最新交互处理函数镜像：canvas 回调必须引用稳定（xyflow 的 SelectionListener/StoreUpdater
  // 依赖回调 identity，引用每次变化会触发额外事件派发与更新风暴）。此 effect 无依赖数组，
  // 每次渲染后刷新镜像；下方 stable* useCallback([]) 仅经镜像间接调用。
  useEffect(() => {
    canvasHandlersRef.current = {
      onNodeClick: (nodeId) => {
        const node = nodeByIdRef.current.get(nodeId);
        if (selectable) {
          syncSelection(nodeId);
        }
        if (node) {
          fireNodeEvent('onNodeClick', nodeId, node);
        }
      },
      onNodeDoubleClick: (nodeId) => {
        const node = nodeByIdRef.current.get(nodeId);
        if (node) {
          fireNodeEvent('onNodeDoubleClick', nodeId, node);
        }
      },
      onSelectionChange: selectable ? syncSelection : () => undefined,
      onPaneClick: () => {
        if (selectable) {
          syncSelection(null);
        }
      },
      onViewportChange: handleViewportChange,
      onInstanceReady: (instance) => {
        instanceRef.current = instance;
      },
    };
  });

  const stableOnNodeClick = useCallback(
    (nodeId: string) => canvasHandlersRef.current.onNodeClick(nodeId),
    [],
  );
  const stableOnNodeDoubleClick = useCallback(
    (nodeId: string) => canvasHandlersRef.current.onNodeDoubleClick(nodeId),
    [],
  );
  const stableOnSelectionChange = useCallback(
    (nodeId: string | null) => canvasHandlersRef.current.onSelectionChange(nodeId),
    [],
  );
  const stableOnPaneClick = useCallback(() => canvasHandlersRef.current.onPaneClick(), []);
  const stableOnViewportChange = useCallback(
    (nextViewport: GraphViewport) => canvasHandlersRef.current.onViewportChange(nextViewport),
    [],
  );
  const stableOnInstanceReady = useCallback(
    (instance: ReactFlowInstance<GraphCanvasNode, GraphCanvasEdge> | null) =>
      canvasHandlersRef.current.onInstanceReady(instance),
    [],
  );

  // 数据/布局变化后自适应视口（fitView 开启时）
  const dataRevision = `${rawNodes.length}:${rawEdges.length}`;
  useEffect(() => {
    if (!fitView) {
      return;
    }
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }
    instance.fitView({ padding: FIT_VIEW_PADDING });
  }, [dataRevision, layoutMode, fitView]);

  // 畸形数据硬契约（design §6 graph-edge-dangling）：边引用缺失节点 → 跳过 + dev 告警，
  // 渲染永不抛错。数据变化时告警一次（skippedEdges 引用随投影 memo 变化）。
  useEffect(() => {
    if (projection.skippedEdges.length === 0) {
      return;
    }
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `[graph] skipped ${projection.skippedEdges.length} dangling edge(s) referencing missing nodes`,
        projection.skippedEdges,
      );
    }
  }, [projection.skippedEdges]);

  const zoomByEvent = useEffectEvent(zoomBy);
  const resetViewportEvent = useEffectEvent(resetViewport);
  const applySearchKeywordEvent = useEffectEvent(applySearchKeyword);
  const clearSearchEvent = useEffectEvent(clearSearch);
  const focusNodeByIdEvent = useEffectEvent(focusNodeById);
  const syncSelectionEvent = useEffectEvent(syncSelection);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    const handle: ComponentHandle = {
      id: props.id,
      name: typeof resolved.name === 'string' ? resolved.name : undefined,
      type: 'graph',
      capabilities: {
        invoke(method, payload) {
          switch (method) {
            case 'zoomIn':
              zoomByEvent(ZOOM_STEP);
              return { ok: true };
            case 'zoomOut':
              zoomByEvent(1 / ZOOM_STEP);
              return { ok: true };
            case 'fitView': {
              const instance = instanceRef.current;
              instance?.fitView({
                padding: typeof payload?.padding === 'number' ? payload.padding : FIT_VIEW_PADDING,
              });
              return { ok: true };
            }
            case 'resetView':
              resetViewportEvent();
              return { ok: true };
            case 'setLayout': {
              const requested = payload?.layout;
              if (!isGraphLayout(requested)) {
                return {
                  ok: true,
                  data: { layout: store.getState().layoutMode, skipped: true },
                };
              }
              store.getState().setLayoutMode(requested);
              return { ok: true, data: { layout: requested } };
            }
            case 'focusNode': {
              const nodeId = typeof payload?.nodeId === 'string' ? payload.nodeId : '';
              const located = nodeId.length > 0 && focusNodeByIdEvent(nodeId);
              return { ok: true, data: { located } };
            }
            case 'search': {
              const keyword = typeof payload?.keyword === 'string' ? payload.keyword : '';
              if (keyword.length === 0) {
                clearSearchEvent();
                return { ok: true, data: { count: 0 } };
              }
              const matches = applySearchKeywordEvent(keyword);
              if (matches.length > 0) {
                syncSelectionEvent(matches[0]);
                locateNode(matches[0]);
              }
              return { ok: true, data: { count: matches.length } };
            }
            default:
              return { ok: false, error: new Error(`Unsupported graph handle method: ${method}`) };
          }
        },
        hasMethod(method) {
          return (
            method === 'zoomIn' ||
            method === 'zoomOut' ||
            method === 'fitView' ||
            method === 'resetView' ||
            method === 'setLayout' ||
            method === 'focusNode' ||
            method === 'search'
          );
        },
        listMethods() {
          return ['zoomIn', 'zoomOut', 'fitView', 'resetView', 'setLayout', 'focusNode', 'search'];
        },
        getDebugData() {
          const state = store.getState();
          return {
            viewport: state.viewport,
            layout: state.layoutMode,
            search: {
              keyword: state.searchKeyword,
              matchCount: state.matchNodeIds.length,
              index: state.matchIndex,
            },
            selectedNodeId: state.selectedNodeId,
          };
        },
      },
    };
    return componentRegistry.register(handle, { cid: props.meta.cid });
  }, [componentRegistry, props.id, props.meta.cid, store, resolved.name]);

  // canvasNodes 必须引用稳定：React Flow 受控 nodes 的 prop 同步 effect 依赖数组引用，
  // 每次渲染重建数组会触发 setNodes 更新风暴（Maximum update depth exceeded）。
  // 选中态不写入 xyflow node.selected 字段（会触发 elevateNodesOnSelect z-index 更新风暴），
  // 而是经 node data 下发（renderer 自持单选模型，design §4.2）。
  const canvasNodes: GraphCanvasNode[] = useMemo(() => {
    const region = props.regions.node;
    const renderContent = (node: GraphNode, index: number): React.ReactNode | undefined =>
      region ? asReactNode(region.render({ bindings: { node, nodeId: node.id, index } })) : undefined;
    const matches = new Set(matchNodeIds);
    return rawNodes.map((node, index) => {
      const position =
        projection.positions.get(node.id) ?? {
          x: 24 + index * FLOW_NODE_SPREAD_X,
          y: 24 + index * FLOW_NODE_SPREAD_Y,
        };
      return {
        id: node.id,
        type: 'graphNode' as const,
        position,
        data: {
          node,
          nodeId: node.id,
          index,
          selected: selectedNodeId === node.id,
          semanticLevel: resolveSemanticLevel(node, levelField, levelMap),
          matching: matches.has(node.id),
          content: renderContent(node, index),
        },
      };
    });
  }, [rawNodes, projection, matchNodeIds, selectedNodeId, levelField, levelMap, props.regions]);

  const canvasEdges: GraphCanvasEdge[] = useMemo(
    () =>
      projection.layoutedEdges.map((edge) => ({
        id: edge.id ?? `${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.animated === true,
      })),
    [projection.layoutedEdges],
  );

  if (empty) {
    const emptyContent = props.regions.empty
      ? asReactNode(props.regions.empty.render())
      : t('flux.common.noData');
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="graph"
        className={cn('nop-graph', props.meta.className)}
      >
        <div
          data-slot="graph-empty"
          className="flex h-full w-full items-center justify-center text-sm text-muted-foreground"
        >
          {emptyContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="graph"
      data-state={searching ? 'searching' : undefined}
      data-layout={layoutMode}
      className={cn('nop-graph', props.meta.className)}
    >
      <XyflowCanvas
        nodes={canvasNodes}
        edges={canvasEdges}
        viewport={viewport}
        onViewportChange={stableOnViewportChange}
        fitView={fitView}
        zoomable={zoomable}
        pannable={pannable}
        minZoom={minZoom}
        maxZoom={maxZoom}
        onlyRenderVisibleElements
        onNodeClick={stableOnNodeClick}
        onNodeDoubleClick={stableOnNodeDoubleClick}
        onSelectionChange={stableOnSelectionChange}
        onPaneClick={stableOnPaneClick}
        onInstanceReady={stableOnInstanceReady}
      />
      {searchable ? (
        <div
          data-slot="graph-search"
          className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-border bg-background/95 p-2 shadow-sm"
        >
          <Input
            data-slot="graph-search-input"
            value={searchKeyword}
            onChange={(event) => applySearchKeyword(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('flux.graph.searchPlaceholder')}
            className="h-8 w-44"
          />
          {searching ? (
            <span
              data-slot="graph-search-result"
              className="text-xs tabular-nums text-muted-foreground"
            >
              {matchIndex >= 0 ? `${matchIndex + 1}/${matchNodeIds.length}` : '0'}
            </span>
          ) : null}
          {searching ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('flux.graph.clearSearch')}
              onClick={clearSearch}
              className="h-8 px-2"
            >
              ×
            </Button>
          ) : null}
        </div>
      ) : null}
      {showControls ? (
        <div
          data-slot="graph-controls"
          className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/95 p-1 shadow-sm"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            data-slot="graph-control-zoom-in"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            data-slot="graph-control-zoom-out"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fit view"
            data-slot="graph-control-fit"
            onClick={() => instanceRef.current?.fitView({ padding: FIT_VIEW_PADDING })}
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle layout"
            data-slot="graph-control-layout"
            onClick={() =>
              store.getState().setLayoutMode(layoutMode === 'flow' ? 'hierarchy' : 'flow')
            }
            className="h-8 px-2 text-xs"
          >
            {layoutMode}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
