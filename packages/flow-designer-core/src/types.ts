import type { SchemaInput } from '@nop-chaos/amis-schema';

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

export interface DesignerConfig {
  $schema?: string;
  version: string;
  extends?: string | DesignerConfig;
  kind: string;
  nodeTypes: NodeTypeConfig[];
  edgeTypes?: EdgeTypeConfig[];
  palette?: PaletteConfig;
  features?: DesignerFeatures;
  rules?: DesignerRules;
  permissions?: DesignerPermissions;
  canvas?: CanvasConfig;
}

export interface NodeTypeConfig {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  appearance?: NodeAppearanceConfig;
  roles?: NodeRoleConfig;
  ports?: PortConfig[];
  constraints?: NodeConstraintConfig;
  permissions?: NodePermissionConfig;
  defaults?: Record<string, unknown>;
  renderer?: {
    type?: string;
    variant?: string;
  };
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

export interface NodeAppearanceConfig {
  className?: string;
  icon?: string;
  color?: string;
  accent?: string;
}

export interface NodeRoleConfig {
  provides?: string[];
  accepts?: string[];
  rejects?: string[];
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

export interface NodePermissionConfig {
  canCreate?: boolean | string;
  canDelete?: boolean | string;
  canMove?: boolean | string;
  canDuplicate?: boolean | string;
  canEdit?: boolean | string;
  canConnect?: boolean | string;
}

export interface EdgeTypeConfig {
  id: string;
  label?: string;
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
  validateConnection?: string;
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

export interface DesignerPermissions {
  canAddNode?: boolean | string;
  canDeleteNode?: boolean | string;
  canEditNode?: boolean | string;
  canConnect?: boolean | string;
  canExport?: boolean | string;
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

export interface NormalizedDesignerConfig {
  version: string;
  kind: string;
  nodeTypes: Map<string, NodeTypeConfig>;
  edgeTypes: Map<string, EdgeTypeConfig>;
  palette?: PaletteConfig;
  features: DesignerFeatures;
  rules: DesignerRules;
  permissions: DesignerPermissions;
  canvas: CanvasConfig;
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
  | { type: 'gridToggled'; enabled: boolean };

export type DesignerEventType = DesignerEvent['type'];
