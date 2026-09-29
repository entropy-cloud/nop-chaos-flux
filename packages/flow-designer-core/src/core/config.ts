import type { DesignerConfig, NormalizedDesignerConfig, ToolbarConfig } from '../types.js';

// Hosts that do not configure a toolbar still get the three load-bearing
// commands; keyboard-only access is not an acceptable default surface.
// An explicit `toolbar: { items: [] }` from the host keeps the toolbar hidden.
const DEFAULT_TOOLBAR_ITEMS: ToolbarConfig['items'] = [
  { type: 'button', action: 'undo', icon: 'undo' },
  { type: 'button', action: 'redo', icon: 'redo' },
  { type: 'spacer' },
  { type: 'button', action: 'save', icon: 'save' },
];

const DEFAULT_TOOLBAR: ToolbarConfig = { items: DEFAULT_TOOLBAR_ITEMS };

export function normalizeConfig(config: DesignerConfig): NormalizedDesignerConfig {
  const nodeTypes = new Map(config.nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const edgeTypes = new Map((config.edgeTypes ?? []).map((edgeType) => [edgeType.id, edgeType]));

  return {
    version: config.version,
    kind: config.kind,
    nodeTypes,
    edgeTypes,
    palette: config.palette,
    shell: config.shell,
    toolbar: config.toolbar ?? DEFAULT_TOOLBAR,
    shortcuts: {
      undo: ['Ctrl+Z', 'Cmd+Z'],
      redo: ['Ctrl+Y', 'Cmd+Y', 'Ctrl+Shift+Z', 'Cmd+Shift+Z'],
      copy: ['Ctrl+C', 'Cmd+C'],
      paste: ['Ctrl+V', 'Cmd+V'],
      delete: ['Delete', 'Backspace'],
      selectAll: ['Ctrl+A', 'Cmd+A'],
      duplicate: ['Ctrl+D', 'Cmd+D'],
      ...config.shortcuts,
    },
    features: {
      undo: true,
      redo: true,
      history: true,
      grid: true,
      minimap: true,
      controls: true,
      fitView: true,
      export: true,
      shortcuts: true,
      floatingToolbar: true,
      clipboard: true,
      autoLayout: false,
      multiSelect: true,
      ...config.features,
    },
    rules: {
      allowSelfLoop: false,
      allowMultiEdge: true,
      defaultEdgeType: 'default',
      ...config.rules,
    },
    canvas: {
      background: 'dots',
      gridSize: 24,
      minZoom: 0.1,
      maxZoom: 4,
      defaultZoom: 1,
      pannable: true,
      zoomable: true,
      snapToGrid: true,
      ...config.canvas,
    },
    hooks: config.hooks,
    classAliases: config.classAliases,
    themeStyles: config.themeStyles,
    documentMode: config.documentMode,
    treeConfig: config.treeConfig,
  };
}
