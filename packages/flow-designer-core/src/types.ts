import type { SchemaInput } from '@nop-chaos/flux-core';

export interface GraphDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  data: Record<string, unknown>;
}

export interface DesignerLifecycleHooks {
  beforeCreateNode?(input: { type: string; position: { x: number; y: number }; data?: Record<string, unknown> }): { type: string; position: { x: number; y: number }; data?: Record<string, unknown> } | false;
  beforeConnect?(input: { source: string; target: string; sourcePort?: string; targetPort?: string; data?: Record<string, unknown> }): { source: string; target: string; sourcePort?: string; targetPort?: string; data?: Record<string, unknown> } | false;
  beforeDelete?(target: { type: 'node' | 'edge'; id: string }): { type: 'node' | 'edge'; id: string } | false;
  afterCommand?(event: DesignerEvent): void;
}

export interface DesignerConfig {
  $schema?: string;
  version: string;
  extends?: string | DesignerConfig;
  kind: string;
  nodeTypes: NodeTypeConfig[];
  edgeTypes?: EdgeTypeConfig[];
  palette?: PaletteConfig;
  toolbar?: ToolbarConfig;
  shortcuts?: ShortcutsConfig;
  features?: DesignerFeatures;
  rules?: DesignerRules;
  canvas?: CanvasConfig;
  hooks?: DesignerLifecycleHooks;
  classAliases?: Record<string, string>;
  themeStyles?: string;
}

export interface NodeTypeConfig {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  body: SchemaInput;
  ports?: PortConfig[];
  appearance?: NodeTypeAppearance;
  roles?: NodeRoleConfig;
  constraints?: NodeConstraintConfig;
  defaults?: Record<string, unknown>;
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog';
    body: SchemaInput;
  };
  createDialog?: {
    title?: string;
    body: SchemaInput;
    submitAction?: Record<string, unknown>;
  };
  quickActions?: SchemaInput;
}

export interface NodeRoleConfig {
  provides?: string[];
  accepts?: string[];
  rejects?: string[];
}

export interface NodeTypeAppearance {
  className?: string;
  borderRadius?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  borderWidth?: number;
  borderColor?: string;
  borderColorSelected?: string;
  minWidth?: number;
  minHeight?: number;
}

export interface PortConfig {
  id: string;
  label?: string;
  direction: 'input' | 'output';
  position?: 'top' | 'right' | 'bottom' | 'left';
  roles?: {
    provides?: string[];
    accepts?: string[];
    rejects?: string[];
  };
  maxConnections?: number | 'unlimited';
  appearance?: {
    className?: string;
    size?: number;
  };
}

export interface NodeConstraintConfig {
  maxInstances?: number | 'unlimited';
  minInstances?: number;
  allowMove?: boolean;
  allowResize?: boolean;
  allowIncoming?: boolean;
  allowOutgoing?: boolean;
  maxIncoming?: number;
  maxOutgoing?: number;
}

export interface EdgeTypeConfig {
  id: string;
  label?: string;
  body?: SchemaInput;
  appearance?: {
    stroke?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    animated?: boolean;
    markerEnd?: 'arrow' | 'arrowClosed' | 'none';
  };
  defaults?: Record<string, unknown>;
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog';
    body: SchemaInput;
  };
  match?: {
    when?: string;
    sourceRoles?: string[];
    targetRoles?: string[];
  };
}

export interface PaletteConfig {
  searchable?: boolean;
  groups: PaletteGroupConfig[];
}

export interface PaletteGroupConfig {
  id: string;
  label: string;
  description?: string;
  nodeTypes: string[];
  expanded?: boolean;
}

export interface DesignerRules {
  allowSelfLoop?: boolean;
  allowMultiEdge?: boolean;
  defaultEdgeType?: string;
}

export interface DesignerFeatures {
  undo?: boolean;
  redo?: boolean;
  history?: boolean;
  grid?: boolean;
  minimap?: boolean;
  fitView?: boolean;
  export?: boolean;
  shortcuts?: boolean;
  floatingToolbar?: boolean;
  clipboard?: boolean;
  autoLayout?: boolean;
  multiSelect?: boolean;
}

export interface CanvasConfig {
  background?: 'dots' | 'lines' | 'cross' | 'none';
  gridSize?: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  pannable?: boolean;
  zoomable?: boolean;
  snapToGrid?: boolean;
}

export type ToolbarItem =
  | { type: 'back'; label?: string; action?: string }
  | { type: 'title'; body: string }
  | { type: 'badge'; text: string; level: string }
  | { type: 'text'; text: string }
  | { type: 'divider' }
  | { type: 'spacer' }
  | { type: 'button'; action: string; icon?: string; label?: string; disabled?: string; active?: string; variant?: 'default' | 'primary' | 'danger' };

export interface ToolbarConfig {
  items: ToolbarItem[];
}

export interface ShortcutsConfig {
  undo?: string[];
  redo?: string[];
  copy?: string[];
  paste?: string[];
  delete?: string[];
  selectAll?: string[];
  save?: string[];
}

export interface NormalizedDesignerConfig {
  version: string;
  kind: string;
  nodeTypes: Map<string, NodeTypeConfig>;
  edgeTypes: Map<string, EdgeTypeConfig>;
  palette?: PaletteConfig;
  toolbar?: ToolbarConfig;
  shortcuts: ShortcutsConfig;
  features: DesignerFeatures;
  rules: DesignerRules;
  canvas: CanvasConfig;
  hooks?: DesignerLifecycleHooks;
  classAliases?: Record<string, string>;
  themeStyles?: string;
}

export interface SelectionSummary {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  activeNodeId: string | null;
  activeEdgeId: string | null;
}

export interface DesignerSnapshot {
  doc: GraphDocument;
  selection: SelectionSummary;
  activeNode: GraphNode | null;
  activeEdge: GraphEdge | null;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  gridEnabled: boolean;
  paletteCollapsed: boolean;
  inspectorCollapsed: boolean;
  viewport: { x: number; y: number; zoom: number };
}

export type DesignerEvent =
  | { type: 'selectionChanged'; selection: SelectionSummary }
  | { type: 'nodeAdded'; node: GraphNode }
  | { type: 'nodeUpdated'; node: GraphNode }
  | { type: 'nodeDeleted'; nodeId: string }
  | { type: 'nodeMoved'; node: GraphNode }
  | { type: 'edgeAdded'; edge: GraphEdge }
  | { type: 'edgeUpdated'; edge: GraphEdge }
  | { type: 'edgeDeleted'; edgeId: string }
  | { type: 'documentChanged'; doc: GraphDocument }
  | { type: 'historyChanged'; canUndo: boolean; canRedo: boolean }
  | { type: 'dirtyChanged'; isDirty: boolean }
  | { type: 'viewportChanged'; viewport: { x: number; y: number; zoom: number } }
  | { type: 'gridToggled'; enabled: boolean }
  | { type: 'paletteCollapseChanged'; collapsed: boolean }
  | { type: 'inspectorCollapseChanged'; collapsed: boolean }
  | { type: 'transactionStarted'; transactionId: string; label?: string }
  | { type: 'transactionCommitted'; transactionId: string }
  | { type: 'transactionRolledBack'; transactionId: string }
  | { type: 'lifecycleHookError'; hook: string; error: string }
  | { type: 'nodes:moved' }
  | { type: 'nodes:updated' };

export type DesignerEventType = DesignerEvent['type'];
