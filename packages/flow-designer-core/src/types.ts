import type { ActionSchema, DomainHostStatusSummary, SchemaInput } from '@nop-chaos/flux-core';
import type { DesignerCore } from './designer-core-types.js';

export type ActionIntent = 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';

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
  beforeCreateNode?(input: {
    type: string;
    position: { x: number; y: number };
    data?: Record<string, unknown>;
  }): { type: string; position: { x: number; y: number }; data?: Record<string, unknown> } | false;
  beforeConnect?(input: {
    source: string;
    target: string;
    sourcePort?: string;
    targetPort?: string;
    data?: Record<string, unknown>;
  }):
    | {
        source: string;
        target: string;
        sourcePort?: string;
        targetPort?: string;
        data?: Record<string, unknown>;
      }
    | false;
  beforeDelete?(target: {
    type: 'node' | 'edge';
    id: string;
  }): { type: 'node' | 'edge'; id: string } | false;
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
  shell?: DesignerShellConfig;
  toolbar?: ToolbarConfig;
  shortcuts?: ShortcutsConfig;
  features?: DesignerFeatures;
  rules?: DesignerRules;
  canvas?: CanvasConfig;
  hooks?: DesignerLifecycleHooks;
  classAliases?: Record<string, string>;
  themeStyles?: string;
  documentMode?: 'graph' | 'tree';
  treeConfig?: TreeConfig;
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
  tree?: TreeNodeTypeTreeConfig;
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog';
    body: SchemaInput;
  };
  createDialog?: {
    title?: string;
    body: SchemaInput;
    submitAction?: ActionSchema | ActionSchema[];
  };
  quickActions?: SchemaInput;
}

export interface TreeNodeTypeTreeConfig {
  allowBranches?: boolean;
  maxBranches?: number;
  minBranches?: number;
  allowChild?: boolean;
  isTerminal?: boolean;
  branchEdgeType?: string;
  layoutSize?: { width: number; height: number };
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

export interface DesignerShellPanelConfig {
  resizable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface DesignerShellConfig {
  palette?: DesignerShellPanelConfig;
  inspector?: DesignerShellPanelConfig;
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
  controls?: boolean;
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
  | {
      type: 'button';
      action: string;
      icon?: string;
      label?: string;
      disabled?: boolean | string;
      active?: boolean | string;
      intent?: ActionIntent;
    }
  | {
      type: 'switch';
      action?: string;
      label?: string;
      disabled?: boolean | string;
      active?: boolean | string;
    };

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
  shell?: DesignerShellConfig;
  toolbar?: ToolbarConfig;
  shortcuts: ShortcutsConfig;
  features: DesignerFeatures;
  rules: DesignerRules;
  canvas: CanvasConfig;
  hooks?: DesignerLifecycleHooks;
  classAliases?: Record<string, string>;
  themeStyles?: string;
  documentMode?: 'graph' | 'tree';
  treeConfig?: TreeConfig;
}

export interface SelectionSummary {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  activeNodeId: string | null;
  activeEdgeId: string | null;
  activeBranchId: string | null;
}

export interface BranchSummary {
  id: string;
  data: Record<string, unknown>;
  childId?: string;
  childType?: string;
  childLabel?: string;
}

export interface DesignerSnapshot {
  doc: GraphDocument;
  selection: SelectionSummary;
  activeNode: GraphNode | null;
  activeEdge: GraphEdge | null;
  activeBranch: BranchSummary | null;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  readonly: boolean;
  gridEnabled: boolean;
  paletteCollapsed: boolean;
  inspectorCollapsed: boolean;
  paletteWidth: number;
  inspectorWidth: number;
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
  | { type: 'paletteWidthChanged'; width: number }
  | { type: 'inspectorWidthChanged'; width: number }
  | { type: 'transactionStarted'; transactionId: string; label?: string }
  | { type: 'transactionCommitted'; transactionId: string }
  | { type: 'transactionRolledBack'; transactionId: string }
  | { type: 'lifecycleHookError'; hook: string; error: unknown }
  | { type: 'mutationRejected'; method: string; reason: 'tree-owned' }
  | { type: 'presentationChanged'; doc: GraphDocument }
  | { type: 'treeChanged'; tree: TreeDocument; reason: 'command' | 'undo' | 'redo' | 'restore'; commandType?: 'transaction' }
  | { type: 'nodes:moved' }
  | { type: 'nodes:updated' };

export type DesignerEventType = DesignerEvent['type'];

export interface TreeDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  root: TreeNode;
}

export interface TreeNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  child?: TreeNode;
  branches?: TreeNodeBranch[];
}

export interface TreeNodeBranch {
  id: string;
  data: Record<string, unknown>;
  child?: TreeNode;
}

export interface TreeNodeTypeConfig extends NodeTypeConfig {
  /** @deprecated Use `NodeTypeConfig.tree` directly. */
  tree?: TreeNodeTypeTreeConfig;
}

export interface TreeConfig {
  layout: {
    direction: 'TB' | 'LR';
    nodeSpacing: number;
    layerSpacing: number;
  };
  showGatewayNodes: boolean;
  showMergeNodes: boolean;
  /**
   * @deprecated Structured tree layout is mandatory in tree mode; any value is ignored.
   */
  autoLayout?: boolean;
  chainEdgeType?: string;
  branchEdgeType?: string;
  mergeEdgeType?: string;
  emptyBranchSize?: { width: number; height: number };
}

export interface TreeEdgeRuntimeGeometry {
  kind: 'chain' | 'split' | 'merge';
  direction: 'TB' | 'LR';
  ownerId?: string;
  branchId?: string;
  continuationId?: string;
  lineMain?: number;
  fanoutCross?: number;
}

export type TreeProjectionErrorCode =
  | 'duplicate-id'
  | 'reserved-id'
  | 'unknown-node-type'
  | 'invalid-layout-size'
  | 'invalid-spacing'
  | 'invalid-tree-payload'
  | 'cyclic-tree'
  | 'invalid-tree-config'
  | 'invalid-tree'
  | 'shared-node-reference'
  | 'unsupported-version'
  | 'config-migration-failed'
  | 'tree-migration-failed'
  | 'unsupported-tree-edge-decoration'
  | 'tree-host-epoch-required'
  | 'invalid-tree-document-epoch'
  | 'invalid-tree-document-ack'
  | 'tree-host-invalid-ack'
  | 'tree-host-conflict'
  | 'tree-config-update-ignored-requires-remount'
  | 'tree-core-factory-required'
  | 'tree-document-change-action-failed'
  | 'tree-document-change-action-cancelled'
  | 'tree-host-backpressure';

export interface TreeProjectionError {
  code: TreeProjectionErrorCode;
  message: string;
  path?: string;
}

export interface TreeProjectionView {
  tree: TreeDocument;
  document: GraphDocument;
}

export type TreeProjectionResult =
  | { ok: true; view: TreeProjectionView }
  | { ok: false; error: TreeProjectionError };

export type TreeCoreCreationResult =
  | { ok: true; core: DesignerCore }
  | { ok: false; error: TreeProjectionError };

export interface TreeHostReplacementResult {
  ok: boolean;
  error?: TreeProjectionError;
}

export interface TreeCommandResult {
  ok: boolean;
  reason?:
    | 'missing-node'
    | 'unknown-node-type'
    | 'constraint'
    | 'unavailable'
    | 'missing-transaction'
    | 'unchanged';
  error?: unknown;
}

export const TREE_INTERNAL_ID_PREFIX = '__fd_internal__/';
export const TREE_EMPTY_SLOT_NODE_TYPE = '__fd-tree-empty-slot';
export const TREE_VIRTUAL_DATA_KEY = '__fdVirtual';

export type TreeChangeReason = 'command' | 'undo' | 'redo' | 'restore';

export interface TreeDomainAdapter {
  kind: string;
  importToTree(external: Record<string, unknown>): TreeDocument;
  exportFromTree(tree: TreeDocument): Record<string, unknown>;
}

export interface DesignerHostStatusSummary extends DomainHostStatusSummary {
  kind: 'designer';
  dirty: boolean;
  busy: boolean;
  error?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  selectionKind: 'branch' | 'node' | 'edge' | 'none';
  selectionCount: number;
}
