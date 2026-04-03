import type { DesignerConfig, NormalizedDesignerConfig } from '../types';

export function normalizeConfig(config: DesignerConfig): NormalizedDesignerConfig {
  const nodeTypes = new Map(config.nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const edgeTypes = new Map((config.edgeTypes ?? []).map((edgeType) => [edgeType.id, edgeType]));

  return {
    version: config.version,
    kind: config.kind,
    nodeTypes,
    edgeTypes,
    palette: config.palette,
    toolbar: config.toolbar,
    shortcuts: {
      undo: ['Ctrl+Z', 'Cmd+Z'],
      redo: ['Ctrl+Y', 'Cmd+Y', 'Ctrl+Shift+Z', 'Cmd+Shift+Z'],
      copy: ['Ctrl+C', 'Cmd+C'],
      paste: ['Ctrl+V', 'Cmd+V'],
      delete: ['Delete', 'Backspace'],
      ...config.shortcuts,
    },
    features: {
      undo: true,
      redo: true,
      history: true,
      grid: true,
      minimap: true,
      fitView: true,
      export: true,
      shortcuts: true,
      floatingToolbar: true,
      clipboard: true,
      autoLayout: false,
      multiSelect: false,
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
  };
}
