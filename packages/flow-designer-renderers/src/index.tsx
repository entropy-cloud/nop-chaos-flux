import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ActionNamespaceProvider,
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry,
  SchemaValue
} from '@nop-chaos/amis-schema';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope } from '@nop-chaos/amis-react';
import { registerRendererDefinitions } from '@nop-chaos/amis-runtime';
import type {
  DesignerCore,
  DesignerSnapshot,
  GraphDocument,
  DesignerConfig,
  NodeTypeConfig,
} from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export interface DesignerPageSchema extends BaseSchema {
  type: 'designer-page';
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

function createDesignerActionProvider(core: DesignerCore): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return [
        'addNode',
        'clearSelection',
        'selectNode',
        'selectEdge',
        'deleteNode',
        'deleteEdge',
        'duplicateNode',
        'updateNodeData',
        'updateEdgeData',
        'export',
        'undo',
        'redo',
        'toggleGrid',
        'save',
        'restore'
      ];
    },
    invoke(method, payload) {
      switch (method) {
        case 'addNode':
          return { ok: true, data: core.addNode(String(payload?.nodeType ?? ''), (payload?.position as { x: number; y: number }) ?? { x: 200, y: 120 }, payload?.data as Record<string, unknown> | undefined) };
        case 'clearSelection':
          core.clearSelection();
          return { ok: true };
        case 'selectNode':
          core.selectNode(typeof payload?.nodeId === 'string' ? payload.nodeId : null);
          return { ok: true };
        case 'selectEdge':
          core.selectEdge(typeof payload?.edgeId === 'string' ? payload.edgeId : null);
          return { ok: true };
        case 'deleteNode':
          core.deleteNode(String(payload?.nodeId ?? ''));
          return { ok: true };
        case 'deleteEdge':
          core.deleteEdge(String(payload?.edgeId ?? ''));
          return { ok: true };
        case 'duplicateNode':
          return { ok: true, data: core.duplicateNode(String(payload?.nodeId ?? '')) };
        case 'updateNodeData':
          core.updateNode(String(payload?.nodeId ?? ''), (payload?.data as Record<string, unknown>) ?? {});
          return { ok: true };
        case 'updateEdgeData':
          core.updateEdge(String(payload?.edgeId ?? ''), (payload?.data as Record<string, unknown>) ?? {});
          return { ok: true };
        case 'export':
          return { ok: true, data: core.exportDocument() };
        case 'undo':
          core.undo();
          return { ok: true };
        case 'redo':
          core.redo();
          return { ok: true };
        case 'toggleGrid':
          core.toggleGrid();
          return { ok: true };
        case 'save':
          core.save();
          return { ok: true };
        case 'restore':
          core.restore();
          return { ok: true };
        default:
          return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    }
  };
}

export { createDesignerActionProvider };

function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const schemaProps = props.props as Record<string, SchemaValue>;
  const document = schemaProps.document as unknown as GraphDocument;
  const config = schemaProps.config as unknown as DesignerConfig;

  const core = useMemo(() => {
    if (!document || !config) return null;
    return createDesignerCore(document, config);
  }, [document, config]);

  const snapshot = useDesignerSnapshot(core!);

  const ctxValue = useMemo<DesignerContextValue>(
    () => ({ core: core!, snapshot, config }),
    [core, snapshot, config]
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
            <DesignerCanvasContent />
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
  const { config, core } = useDesignerContext();
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
      core.addNode(nodeType.id, position);
    },
    [core]
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

function DesignerCanvasContent() {
  const { core, snapshot } = useDesignerContext();
  const { doc, selection } = snapshot;

  const handlePaneClick = useCallback(() => {
    core.clearSelection();
  }, [core]);

  const handleNodeClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      core.selectNode(nodeId);
    },
    [core]
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      core.selectEdge(edgeId);
    },
    [core]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      core.deleteNode(nodeId);
    },
    [core]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      core.duplicateNode(nodeId);
    },
    [core]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      core.deleteEdge(edgeId);
    },
    [core]
  );

  return (
    <div className="fd-canvas" onClick={handlePaneClick}>
      <div className="fd-canvas__nodes">
        {doc.nodes.map((node) => (
          <div
            key={node.id}
            className={classNames(
              'fd-node',
              selection.activeNodeId === node.id && 'fd-node--selected',
              node.type && `fd-node--${node.type}`
            )}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              minWidth: 160,
              padding: '12px 16px',
              background: '#fff',
              borderRadius: 8,
              border: selection.activeNodeId === node.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={(e) => handleNodeClick(node.id, e)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>
                {getNodeIcon(node.type)}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {String(node.data.label ?? node.type)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {node.type}
                </div>
              </div>
            </div>
            {selection.activeNodeId === node.id && (
              <div
                className="fd-node__actions"
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  display: 'flex',
                  gap: 4
                }}
              >
                <button
                  className="fd-node__action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateNode(node.id);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Duplicate"
                >
                  ⧉
                </button>
                <button
                  className="fd-node__action fd-node__action--delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            )}
            {getNodePorts(node.type).map((port) => (
              <div
                key={port.id}
                className={`fd-port fd-port--${port.direction}`}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: port.direction === 'input' ? '#3b82f6' : '#10b981',
                  border: '2px solid #fff',
                  ...(port.position === 'left' ? { left: -5, top: '50%', transform: 'translateY(-50%)' } : {}),
                  ...(port.position === 'right' ? { right: -5, top: '50%', transform: 'translateY(-50%)' } : {}),
                  ...(port.position === 'top' ? { top: -5, left: '50%', transform: 'translateX(-50%)' } : {}),
                  ...(port.position === 'bottom' ? { bottom: -5, left: '50%', transform: 'translateX(-50%)' } : {})
                }}
                title={port.label ?? port.id}
              />
            ))}
          </div>
        ))}
      </div>
      <svg
        className="fd-canvas__edges"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {doc.edges.map((edge) => {
          const sourceNode = doc.nodes.find((n) => n.id === edge.source);
          const targetNode = doc.nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const sourceX = sourceNode.position.x + 160;
          const sourceY = sourceNode.position.y + 30;
          const targetX = targetNode.position.x;
          const targetY = targetNode.position.y + 30;

          const midX = (sourceX + targetX) / 2;
          const edgeLabel = edge.data.label != null ? String(edge.data.label) : null;

          return (
            <g
              key={edge.id}
              onClick={(e) => handleEdgeClick(edge.id, e as unknown as React.MouseEvent)}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            >
              <path
                d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                fill="none"
                stroke={selection.activeEdgeId === edge.id ? '#3b82f6' : '#94a3b8'}
                strokeWidth={selection.activeEdgeId === edge.id ? 3 : 2}
                markerEnd="url(#arrowhead)"
              />
              {edgeLabel && (
                <text
                  x={midX}
                  y={(sourceY + targetY) / 2 - 10}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={12}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                >
                  {edgeLabel}
                </text>
              )}
              {selection.activeEdgeId === edge.id && (
                <g
                  transform={`translate(${midX + 20}, ${(sourceY + targetY) / 2 + 5})`}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEdge(edge.id);
                  }}
                >
                  <circle r={10} fill="#ef4444" />
                  <text textAnchor="middle" dy={4} fill="#fff" fontSize={14}>
                    ×
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={10}
            markerHeight={7}
            refX={9}
            refY={3.5}
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
      <div className="fd-canvas__info" style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'rgba(255,255,255,0.9)',
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        color: '#64748b'
      }}>
        Nodes: {doc.nodes.length} | Edges: {doc.edges.length}
      </div>
    </div>
  );
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '▶',
    end: '■',
    task: '⚙',
    condition: '◇',
    parallel: '⫼',
    loop: '↻'
  };
  return icons[type] ?? '○';
}

function getNodePorts(type: string): Array<{ id: string; direction: 'input' | 'output'; position: string; label?: string }> {
  switch (type) {
    case 'start':
      return [{ id: 'out', direction: 'output', position: 'right' }];
    case 'end':
      return [{ id: 'in', direction: 'input', position: 'left' }];
    case 'task':
    case 'condition':
    case 'parallel':
    case 'loop':
      return [
        { id: 'in', direction: 'input', position: 'left' },
        { id: 'out', direction: 'output', position: 'right' }
      ];
    default:
      return [
        { id: 'in', direction: 'input', position: 'left' },
        { id: 'out', direction: 'output', position: 'right' }
      ];
  }
}

function DefaultInspector() {
  const { core, snapshot } = useDesignerContext();
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
            onChange={(e) => core.updateNode(activeNode.id, { label: e.target.value })}
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
                onChange={(e) => core.updateNode(activeNode.id, { [key]: e.target.value })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <button
            className="fd-inspector__button fd-inspector__button--danger"
            onClick={() => core.deleteNode(activeNode.id)}
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
            onChange={(e) => core.updateEdge(activeEdge.id, { label: e.target.value })}
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
                onChange={(e) => core.updateEdge(activeEdge.id, { [key]: e.target.value })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <button
            className="fd-inspector__button fd-inspector__button--danger"
            onClick={() => core.deleteEdge(activeEdge.id)}
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
  const { core, snapshot } = ctx;
  const { activeNode, activeEdge } = snapshot;

  const value = activeNode?.data[name] ?? activeEdge?.data[name] ?? '';

  const handleChange = useCallback(
    (newValue: string) => {
      if (activeNode) {
        core.updateNode(activeNode.id, { [name]: newValue });
      } else if (activeEdge) {
        core.updateEdge(activeEdge.id, { [name]: newValue });
      }
    },
    [core, activeNode, activeEdge, name]
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
  return <DesignerCanvasContent />;
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
