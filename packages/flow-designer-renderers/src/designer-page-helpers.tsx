import type {
  ActionNamespaceProvider,
  ActionScope,
  RendererComponentProps,
  SchemaInput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type { DesignerCommandResult } from './designer-command-types.js';
import type { DesignerPageSchema } from './schemas.js';
import type { DesignerContextValue } from './designer-context.js';
import type {
  DesignerConfig,
  GraphDocument,
  NormalizedDesignerConfig,
  TreeDocument,
} from '@nop-chaos/flow-designer-core';
import { layoutStructuredTree, projectTree } from '@nop-chaos/flow-designer-core';

export function normalizeTreeModeConfig(config: DesignerConfig): NormalizedDesignerConfig {
  return {
    version: config.version,
    kind: config.kind,
    nodeTypes: new Map(config.nodeTypes.map((nodeType) => [nodeType.id, nodeType])),
    edgeTypes: new Map((config.edgeTypes ?? []).map((edgeType) => [edgeType.id, edgeType])),
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
    documentMode: config.documentMode,
    treeConfig: config.treeConfig,
  };
}

export function normalizeShortcut(input: string): string[] {
  return input
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function matchesShortcut(event: KeyboardEvent, shortcuts: string[] | undefined): boolean {
  if (!shortcuts || shortcuts.length === 0) {
    return false;
  }

  const eventKey = event.key.toLowerCase();
  return shortcuts.some((shortcut) => {
    const keys = normalizeShortcut(shortcut);
    const wantsCtrl = keys.includes('ctrl');
    const wantsMeta = keys.includes('cmd') || keys.includes('meta');
    const wantsShift = keys.includes('shift');
    const wantsAlt = keys.includes('alt') || keys.includes('option');
    const key = keys.find(
      (part) => !['ctrl', 'cmd', 'meta', 'shift', 'alt', 'option'].includes(part),
    );
    if (!key) {
      return false;
    }

    if (wantsCtrl !== event.ctrlKey) return false;
    if (wantsMeta !== event.metaKey) return false;
    if (wantsShift !== event.shiftKey) return false;
    if (wantsAlt !== event.altKey) return false;
    return key === eventKey.toLowerCase();
  });
}

export function createMergedDesignerProvider(args: {
  designerProvider?: ActionNamespaceProvider;
  upstreamBackHandler?: { provider: ActionNamespaceProvider; method: string };
}): ActionNamespaceProvider | undefined {
  const { designerProvider, upstreamBackHandler } = args;
  if (!designerProvider) {
    return undefined;
  }
  if (!upstreamBackHandler) {
    return designerProvider;
  }

  return {
    kind: designerProvider.kind ?? 'host',
    listMethods() {
      const methods = designerProvider.listMethods?.() ?? [];
      if (methods.includes('navigate-back')) {
        return methods;
      }
      return [...methods, 'navigate-back'];
    },
    invoke(method, payload, ctx) {
      if (method === 'navigate-back') {
        return upstreamBackHandler.provider.invoke(upstreamBackHandler.method, payload, ctx);
      }
      return designerProvider.invoke(method, payload, ctx);
    },
    dispose() {
      designerProvider.dispose?.();
    },
  };
}

export function createDesignerContextValue(args: {
  core: DesignerContextValue['core'];
  commandAdapter: DesignerContextValue['commandAdapter'];
  dispatch: DesignerContextValue['dispatch'];
  config: DesignerContextValue['config'];
  openCreateDialog: DesignerContextValue['openCreateDialog'];
  onPlusButtonClick: DesignerContextValue['onPlusButtonClick'];
  reportHostIssue?: DesignerContextValue['reportHostIssue'];
}): DesignerContextValue {
  return {
    core: args.core,
    commandAdapter: args.commandAdapter,
    dispatch: args.dispatch,
    config: args.config,
    openCreateDialog: args.openCreateDialog,
    onPlusButtonClick: args.onPlusButtonClick,
    reportHostIssue: args.reportHostIssue,
  };
}

export function computeTreeModeDocument(
  treeDocument: TreeDocument,
  config: DesignerConfig,
): GraphDocument {
  const normalizedConfig = normalizeTreeModeConfig(config);
  const projected = projectTree(treeDocument, normalizedConfig);
  const treeConfig = normalizedConfig.treeConfig;
  const nodes = treeConfig
    ? layoutStructuredTree(treeDocument, projected.nodes, treeConfig, normalizedConfig.nodeTypes)
    : projected.nodes;
  return {
    id: treeDocument.id,
    kind: treeDocument.kind,
    name: treeDocument.name,
    version: treeDocument.version,
    meta: treeDocument.meta,
    nodes,
    edges: projected.edges,
  };
}

export interface DesignerCreateDialogState {
  nodeType: import('@nop-chaos/flow-designer-core').NodeTypeConfig;
  position: { x: number; y: number };
}

export async function confirmCreateDialog(args: {
  pendingCreateDialog: DesignerCreateDialogState;
  helpers: RendererComponentProps<DesignerPageSchema>['helpers'];
  designerScope: ScopeRef;
  actionScope: ActionScope | undefined;
  dispatch: (command: import('./designer-command-types.js').DesignerCommand) => DesignerCommandResult;
}) {
  let nextData: Record<string, unknown> | undefined = args.pendingCreateDialog.nodeType.defaults
    ? { ...args.pendingCreateDialog.nodeType.defaults }
    : undefined;

  const submitAction = args.pendingCreateDialog.nodeType.createDialog?.submitAction;
  if (submitAction) {
    const result = await args.helpers.dispatch(submitAction, {
      scope: args.designerScope,
      actionScope: args.actionScope,
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      nextData = {
        ...(nextData ?? {}),
        ...(result.data as Record<string, unknown>),
      };
    }
  }

  return {
    ok: true as const,
    result: args.dispatch({
      type: 'addNode',
      nodeType: args.pendingCreateDialog.nodeType.id,
      position: args.pendingCreateDialog.position,
      data: nextData,
    }),
  };
}

export function renderDesignerSchema(args: {
  schema: SchemaInput;
  helpers: RendererComponentProps<DesignerPageSchema>['helpers'];
  designerScope: ScopeRef;
  actionScope: ActionScope | undefined;
}) {
  return args.helpers.render(args.schema, {
    scope: args.designerScope,
    actionScope: args.actionScope,
  });
}
