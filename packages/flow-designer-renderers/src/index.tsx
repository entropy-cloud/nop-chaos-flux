import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ActionNamespaceProvider,
  BaseSchema,
  RendererEnv,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry,
  SchemaValue
} from '@nop-chaos/amis-schema';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope, useRendererEnv } from '@nop-chaos/amis-react';
import { registerRendererDefinitions } from '@nop-chaos/amis-runtime';
import type {
  DesignerCore,
  DesignerSnapshot,
  GraphDocument,
  DesignerConfig,
  NodeTypeConfig
} from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import {
  createDesignerCommandAdapter,
  type DesignerCommand,
  type DesignerCommandAdapter,
  type DesignerCommandResult
} from './designer-command-adapter';
import {
  renderDesignerCanvasBridge,
  type DesignerCanvasAdapterKind
} from './canvas-bridge';

export interface DesignerPageSchema extends BaseSchema {
  type: 'designer-page';
  canvasAdapter?: DesignerCanvasAdapterKind;
}

export interface DesignerFieldSchema extends BaseSchema {
  type: 'designer-field';
  fieldType?: 'text' | 'number' | 'select' | 'textarea';
  options?: Array<{ label: string; value: string }>;
}

export interface DesignerCanvasSchema extends BaseSchema {
  type: 'designer-canvas';
}

export interface DesignerPaletteSchema extends BaseSchema {
  type: 'designer-palette';
}

export interface DesignerNodeCardSchema extends BaseSchema {
  type: 'designer-node-card';
  nodeId?: string;
}

export interface DesignerEdgeRowSchema extends BaseSchema {
  type: 'designer-edge-row';
  edgeId?: string;
}

interface DesignerContextValue {
  core: DesignerCore;
  commandAdapter: DesignerCommandAdapter;
  dispatch: (command: DesignerCommand) => DesignerCommandResult;
  snapshot: DesignerSnapshot;
  config: DesignerConfig;
}

const DesignerContext = React.createContext<DesignerContextValue | null>(null);

function useDesignerContext(): DesignerContextValue {
  const ctx = React.useContext(DesignerContext);
  if (!ctx) {
    throw new Error('Designer components must be used within a designer-page');
  }
  return ctx;
}

function useDesignerSnapshot(core: DesignerCore): DesignerSnapshot {
  const [snapshot, setSnapshot] = useState<DesignerSnapshot>(() => core.getSnapshot());

  useEffect(() => {
    setSnapshot(core.getSnapshot());
    const unsub = core.subscribe(() => {
      setSnapshot(core.getSnapshot());
    });
    return unsub;
  }, [core]);

  return snapshot;
}

function notifyCommandFailure(
  notify: RendererEnv['notify'] | undefined,
  error: string | undefined,
  reason?: string
) {
  if (!error || reason === 'unchanged') {
    return;
  }

  notify?.('warning', error);
}

function toActionResult(result: DesignerCommandResult) {
  return {
    ok: result.ok,
    data: result.exported ?? result.data,
    error: result.error ? new Error(result.error) : undefined
  };
}

function createDesignerActionProvider(core: DesignerCore): ActionNamespaceProvider {
  const adapter = createDesignerCommandAdapter(core);

  return {
    kind: 'host',
    listMethods() {
      return [
        'addNode',
        'addEdge',
        'clearSelection',
        'selectNode',
        'selectEdge',
        'deleteNode',
        'deleteEdge',
        'duplicateNode',
        'moveNode',
        'reconnectEdge',
        'updateNodeData',
        'updateEdgeData',
        'export',
        'undo',
        'redo',
        'toggleGrid',
        'setViewport',
        'save',
        'restore'
      ];
    },
    invoke(method, payload, ctx) {
      switch (method) {
        case 'addNode': {
          const result = adapter.execute({
            type: 'addNode',
            nodeType: String(payload?.nodeType ?? ''),
            position: (payload?.position as { x: number; y: number } | undefined) ?? { x: 200, y: 120 },
            data: payload?.data as Record<string, unknown> | undefined
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'addEdge': {
          const result = adapter.execute({
            type: 'addEdge',
            source: String(payload?.source ?? ''),
            target: String(payload?.target ?? ''),
            data: payload?.data as Record<string, unknown> | undefined
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'clearSelection': {
          const result = adapter.execute({ type: 'clearSelection' });
          return toActionResult(result);
        }
        case 'selectNode': {
          const result = adapter.execute({ type: 'selectNode', nodeId: typeof payload?.nodeId === 'string' ? payload.nodeId : null });
          return toActionResult(result);
        }
        case 'selectEdge': {
          const result = adapter.execute({ type: 'selectEdge', edgeId: typeof payload?.edgeId === 'string' ? payload.edgeId : null });
          return toActionResult(result);
        }
        case 'deleteNode': {
          const result = adapter.execute({ type: 'deleteNode', nodeId: String(payload?.nodeId ?? '') });
          return toActionResult(result);
        }
        case 'deleteEdge': {
          const result = adapter.execute({ type: 'deleteEdge', edgeId: String(payload?.edgeId ?? '') });
          return toActionResult(result);
        }
        case 'duplicateNode': {
          const result = adapter.execute({ type: 'duplicateNode', nodeId: String(payload?.nodeId ?? '') });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'moveNode': {
          const result = adapter.execute({
            type: 'moveNode',
            nodeId: String(payload?.nodeId ?? ''),
            position: (payload?.position as { x: number; y: number } | undefined) ?? { x: 0, y: 0 }
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'reconnectEdge': {
          const result = adapter.execute({
            type: 'reconnectEdge',
            edgeId: String(payload?.edgeId ?? ''),
            source: String(payload?.source ?? ''),
            target: String(payload?.target ?? '')
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'updateNodeData': {
          const result = adapter.execute({
            type: 'updateNodeData',
            nodeId: String(payload?.nodeId ?? ''),
            data: (payload?.data as Record<string, unknown>) ?? {}
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'updateEdgeData': {
          const result = adapter.execute({
            type: 'updateEdgeData',
            edgeId: String(payload?.edgeId ?? ''),
            data: (payload?.data as Record<string, unknown>) ?? {}
          });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'export': {
          const result = adapter.execute({ type: 'export' });
          return toActionResult(result);
        }
        case 'undo': {
          const result = adapter.execute({ type: 'undo' });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'redo': {
          const result = adapter.execute({ type: 'redo' });
          notifyCommandFailure(ctx?.runtime?.env?.notify, result.error, result.reason);
          return toActionResult(result);
        }
        case 'toggleGrid': {
          const result = adapter.execute({ type: 'toggleGrid' });
          return toActionResult(result);
        }
        case 'setViewport': {
          const result = adapter.execute({
            type: 'setViewport',
            viewport: (payload?.viewport as { x: number; y: number; zoom: number } | undefined) ?? { x: 0, y: 0, zoom: 1 }
          });
          return toActionResult(result);
        }
        case 'save': {
          const result = adapter.execute({ type: 'save' });
          return toActionResult(result);
        }
        case 'restore': {
          const result = adapter.execute({ type: 'restore' });
          return toActionResult(result);
        }
        default:
          return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    }
  };
}

export { createDesignerActionProvider };
export {
  DesignerCardCanvasBridge,
  DesignerXyflowPreviewBridge,
  DesignerXyflowCanvasBridge,
  renderDesignerCanvasBridge,
  type DesignerCanvasAdapterKind,
  type DesignerCanvasBridgeProps
} from './canvas-bridge';

function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const schemaProps = props.props as Record<string, SchemaValue>;
  const document = schemaProps.document as unknown as GraphDocument;
  const config = schemaProps.config as unknown as DesignerConfig;
  const canvasAdapter = (schemaProps.canvasAdapter as DesignerCanvasAdapterKind | undefined) ?? 'xyflow';

  const core = useMemo(() => {
    if (!document || !config) return null;
    return createDesignerCore(document, config);
  }, [document, config]);

  const snapshot = useDesignerSnapshot(core!);
  const env = useRendererEnv();
  const commandAdapter = useMemo(() => (core ? createDesignerCommandAdapter(core) : null), [core]);
  const dispatch = useCallback(
    (command: DesignerCommand) => {
      const result = commandAdapter!.execute(command);
      notifyCommandFailure(env.notify, result.error, result.reason);
      return result;
    },
    [commandAdapter, env]
  );

  const ctxValue = useMemo<DesignerContextValue>(
    () => ({ core: core!, commandAdapter: commandAdapter!, dispatch, snapshot, config }),
    [commandAdapter, core, dispatch, snapshot, config]
  );
  const actionScope = useCurrentActionScope();
  const designerProvider = useMemo(() => (core ? createDesignerActionProvider(core) : undefined), [core]);

  useEffect(() => {
    if (!actionScope || !designerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', designerProvider);
  }, [actionScope, designerProvider]);

  const toolbarSlot = resolveRendererSlotContent(props, 'toolbar');
  const inspectorSlot = resolveRendererSlotContent(props, 'inspector');

  if (!core) {
    return <div>Designer requires document and config props</div>;
  }

  return (
    <DesignerContext.Provider value={ctxValue}>
      <div className="fd-page">
        <div className="fd-page__header">
          {hasRendererSlotContent(toolbarSlot) ? toolbarSlot : null}
        </div>
        <div className="fd-page__content">
          <div className="fd-page__palette">
            <DesignerPaletteContent />
          </div>
          <div className="fd-page__canvas">
            <DesignerCanvasContent canvasAdapter={canvasAdapter} />
          </div>
          <div className="fd-page__inspector">
            {hasRendererSlotContent(inspectorSlot) ? inspectorSlot : <DefaultInspector />}
          </div>
        </div>
      </div>
    </DesignerContext.Provider>
  );
}

function DesignerPaletteContent() {
  const { config, dispatch } = useDesignerContext();
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['basic']));

  const nodeTypes = config.nodeTypes;
  const paletteGroups = config.palette?.groups ?? [];

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleAddNode = useCallback(
    (nodeType: NodeTypeConfig) => {
      const position = { x: 180 + Math.random() * 200, y: 120 + Math.random() * 200 };
      dispatch({ type: 'addNode', nodeType: nodeType.id, position });
    },
    [dispatch]
  );

  const filteredGroups = paletteGroups.map((group) => ({
    ...group,
    nodeTypes: group.nodeTypes.filter((ntId) => {
      const nt = nodeTypes.find((n) => n.id === ntId);
      if (!nt) return false;
      if (!search) return true;
      return nt.label.toLowerCase().includes(search.toLowerCase()) || nt.id.toLowerCase().includes(search.toLowerCase());
    })
  })).filter((g) => g.nodeTypes.length > 0);

  return (
    <div className="fd-palette">
      <div className="fd-palette__header">
        <h3>Node Palette</h3>
        {config.palette?.searchable !== false && (
          <input
            type="text"
            className="fd-palette__search"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <div className="fd-palette__groups">
        {filteredGroups.map((group) => (
          <div key={group.id} className="fd-palette__group">
            <div
              className="fd-palette__group-header"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="fd-palette__group-toggle">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
              <span className="fd-palette__group-label">{group.label}</span>
            </div>
            {expandedGroups.has(group.id) && (
              <div className="fd-palette__group-items">
                {group.nodeTypes.map((ntId) => {
                  const nt = nodeTypes.find((n) => n.id === ntId);
                  if (!nt) return null;
                  return (
                    <button
                      key={nt.id}
                      className="fd-palette__item"
                      onClick={() => handleAddNode(nt)}
                      title={nt.description ?? nt.label}
                    >
                      <span className="fd-palette__item-icon">{nt.icon ?? '○'}</span>
                      <span className="fd-palette__item-label">{nt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignerCanvasContent(props: { canvasAdapter: DesignerCanvasAdapterKind }) {
  const { dispatch, snapshot } = useDesignerContext();
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);

  const handlePaneClick = useCallback(() => {
    setPendingConnectionSourceId(null);
    setReconnectingEdgeId(null);
    dispatch({ type: 'clearSelection' });
  }, [dispatch]);

  const handleNodeClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch({ type: 'selectNode', nodeId });
    },
    [dispatch]
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch({ type: 'selectEdge', edgeId });
    },
    [dispatch]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'deleteNode', nodeId });
    },
    [dispatch]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'duplicateNode', nodeId });
    },
    [dispatch]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      dispatch({ type: 'deleteEdge', edgeId });
    },
    [dispatch]
  );

  return renderDesignerCanvasBridge(props.canvasAdapter, {
    snapshot,
    onPaneClick: handlePaneClick,
    pendingConnectionSourceId,
    reconnectingEdgeId,
    onNodeSelect: handleNodeClick,
    onEdgeSelect: handleEdgeClick,
    onStartConnection: (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setReconnectingEdgeId(null);
      setPendingConnectionSourceId(nodeId);
    },
    onCancelConnection: (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (pendingConnectionSourceId === nodeId) {
        setPendingConnectionSourceId(null);
      }
    },
    onCompleteConnection: (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (!pendingConnectionSourceId || pendingConnectionSourceId === nodeId) {
        return;
      }

      const result = dispatch({ type: 'addEdge', source: pendingConnectionSourceId, target: nodeId });
      if (result.ok) {
        setPendingConnectionSourceId(null);
      }
    },
    onStartReconnect: (edgeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setPendingConnectionSourceId(null);
      setReconnectingEdgeId(edgeId);
    },
    onCancelReconnect: (edgeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (reconnectingEdgeId === edgeId) {
        setReconnectingEdgeId(null);
      }
    },
    onCompleteReconnect: (edgeId: string, nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const edge = snapshot.doc.edges.find((item) => item.id === edgeId);
      if (!edge || edge.target === nodeId) {
        return;
      }

      const result = dispatch({ type: 'reconnectEdge', edgeId, source: edge.source, target: nodeId });
      if (result.ok) {
        setReconnectingEdgeId(null);
      }
    },
    onDuplicateNode: (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      handleDuplicateNode(nodeId);
    },
    onDeleteNode: (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      handleDeleteNode(nodeId);
    },
    onDeleteEdge: (edgeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      handleDeleteEdge(edgeId);
    },
    onMoveNode: (nodeId: string, event: React.MouseEvent, position?: { x: number; y: number }) => {
      event.stopPropagation();
      const node = snapshot.doc.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }
      dispatch({
        type: 'moveNode',
        nodeId,
        position: position ?? { x: node.position.x + 24, y: node.position.y + 24 }
      });
    },
    onViewportChange: (viewport: { x: number; y: number; zoom: number }, event: React.MouseEvent) => {
      event.stopPropagation();
      dispatch({ type: 'setViewport', viewport });
    }
  });
}

function DefaultInspector() {
  const { dispatch, snapshot } = useDesignerContext();
  const { activeNode, activeEdge } = snapshot;

  if (activeNode) {
    return (
      <div className="fd-inspector">
        <h3 className="fd-inspector__title">Node Properties</h3>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Type</label>
          <div className="fd-inspector__value">{activeNode.type}</div>
        </div>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Label</label>
          <input
            type="text"
            className="fd-inspector__input"
            value={String(activeNode.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeNode.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="fd-inspector__section">
              <label className="fd-inspector__label">{key}</label>
              <input
                type="text"
                className="fd-inspector__input"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <button
            className="fd-inspector__button fd-inspector__button--danger"
            onClick={() => dispatch({ type: 'deleteNode', nodeId: activeNode.id })}
          >
            Delete Node
          </button>
        </div>
      </div>
    );
  }

  if (activeEdge) {
    return (
      <div className="fd-inspector">
        <h3 className="fd-inspector__title">Edge Properties</h3>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Label</label>
          <input
            type="text"
            className="fd-inspector__input"
            value={String(activeEdge.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeEdge.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="fd-inspector__section">
              <label className="fd-inspector__label">{key}</label>
              <input
                type="text"
                className="fd-inspector__input"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <button
            className="fd-inspector__button fd-inspector__button--danger"
            onClick={() => dispatch({ type: 'deleteEdge', edgeId: activeEdge.id })}
          >
            Delete Edge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fd-inspector fd-inspector--empty">
      <p className="fd-inspector__empty-text">Select a node or edge to edit its properties</p>
    </div>
  );
}

function DesignerFieldRenderer(props: RendererComponentProps<DesignerFieldSchema>) {
  const schemaProps = props.props as Record<string, SchemaValue>;
  const label = schemaProps.label as string | undefined;
  const name = schemaProps.name as string;
  const fieldType = schemaProps.fieldType as string | undefined;
  const options = schemaProps.options as Array<{ label: string; value: string }> | undefined;
  const ctx = useDesignerContext();
  const { dispatch, snapshot } = ctx;
  const { activeNode, activeEdge } = snapshot;

  const value = activeNode?.data[name] ?? activeEdge?.data[name] ?? '';

  const handleChange = useCallback(
    (newValue: string) => {
      if (activeNode) {
        dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [name]: newValue } });
      } else if (activeEdge) {
        dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [name]: newValue } });
      }
    },
    [dispatch, activeNode, activeEdge, name]
  );

  return (
    <div className="fd-field">
      {label && <label className="fd-field__label">{label}</label>}
      {fieldType === 'textarea' ? (
        <textarea
          className="fd-field__textarea"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : fieldType === 'select' && options ? (
        <select
          className="fd-field__select"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : fieldType === 'number' ? (
        <input
          type="number"
          className="fd-field__input"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="fd-field__input"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
    </div>
  );
}

function DesignerCanvasRenderer() {
  return <DesignerCanvasContent canvasAdapter="xyflow" />;
}

function DesignerPaletteRenderer() {
  return <DesignerPaletteContent />;
}

export const flowDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'designer-page',
    component: DesignerPageRenderer,
    regions: ['toolbar', 'inspector', 'dialogs'],
    actionScopePolicy: 'new'
  },
  {
    type: 'designer-field',
    component: DesignerFieldRenderer
  },
  {
    type: 'designer-canvas',
    component: DesignerCanvasRenderer
  },
  {
    type: 'designer-palette',
    component: DesignerPaletteRenderer
  }
];

export function registerFlowDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
}

export function createFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
  return registerFlowDesignerRenderers(baseRegistry);
}
