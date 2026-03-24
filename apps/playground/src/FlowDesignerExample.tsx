import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GraphDocument,
  DesignerConfig,
  NodeTypeConfig,
  DesignerSnapshot
} from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

interface FlowDesignerProps {
  document: GraphDocument;
  config: DesignerConfig;
}

export function FlowDesignerExample({ document: initialDoc, config }: FlowDesignerProps) {
  const [doc, setDoc] = useState(initialDoc);
  const [activeTab, setActiveTab] = useState<'designer' | 'json'>('designer');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['basic', 'logic', 'execution']));
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const core = useMemo(() => createDesignerCore(doc, config), [config, doc]);

  const [snapshot, setSnapshot] = useState<DesignerSnapshot>(() => core.getSnapshot());

  useEffect(() => {
    const unsub = core.subscribe((event) => {
      setSnapshot(core.getSnapshot());
      if (event.type === 'documentChanged') {
        setDoc(event.doc);
      }
      if (event.type === 'nodeAdded') {
        showToast(`Node added: ${event.node.type}`);
      }
      if (event.type === 'edgeAdded') {
        showToast('Edge connected');
      }
      if (event.type === 'nodeDeleted') {
        showToast('Node deleted');
      }
      if (event.type === 'edgeDeleted') {
        showToast('Edge deleted');
      }
    });
    return unsub;
  }, [core, showToast]);

  const handleExport = useCallback(() => {
    const json = core.exportDocument();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name ?? 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Document exported');
  }, [core, doc.name, showToast]);

  const handleSave = useCallback(() => {
    core.save();
    localStorage.setItem('workflow-doc', JSON.stringify(core.getDocument()));
    showToast('Document saved');
  }, [core, showToast]);

  const handleRestore = useCallback(() => {
    const saved = localStorage.getItem('workflow-doc');
    if (saved) {
      const restoredDoc = JSON.parse(saved) as GraphDocument;
      const newCore = createDesignerCore(restoredDoc, config);
      setDoc(restoredDoc);
      setSnapshot(newCore.getSnapshot());
      showToast('Document restored');
    }
  }, [showToast, config]);

  const handleUndo = useCallback(() => {
    core.undo();
  }, [core]);

  const handleRedo = useCallback(() => {
    core.redo();
  }, [core]);

  const handleClearSelection = useCallback(() => {
    core.clearSelection();
  }, [core]);

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

  const handleAddNode = useCallback(
    (nodeType: NodeTypeConfig) => {
      const position = { x: 180 + Math.random() * 400, y: 120 + Math.random() * 300 };
      core.addNode(nodeType.id, position);
    },
    [core]
  );

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

  const nodeTypes = config.nodeTypes;
  const paletteGroups = config.palette?.groups ?? [];

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
    <div className="flow-designer-example na-theme-root fd-theme-root">
      <div className="fd-toolbar">
        <h2 className="fd-toolbar__title">{doc.name}</h2>
        <div className="fd-toolbar__spacer" />
        <div className="fd-toolbar__group">
          <button
            className="fd-toolbar__button"
            onClick={handleUndo}
            disabled={!core.canUndo()}
            type="button"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            className="fd-toolbar__button"
            onClick={handleRedo}
            disabled={!core.canRedo()}
            type="button"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          <div className="fd-toolbar__divider" />
          <button
            className="fd-toolbar__button"
            onClick={handleClearSelection}
            type="button"
          >
            Clear Selection
          </button>
          <div className="fd-toolbar__divider" />
          <button
            className="fd-toolbar__button fd-toolbar__button--success"
            onClick={handleSave}
            type="button"
          >
            Save
          </button>
          <button
            className="fd-toolbar__button"
            onClick={handleRestore}
            type="button"
          >
            Restore
          </button>
          <button
            className="fd-toolbar__button fd-toolbar__button--primary"
            onClick={handleExport}
            type="button"
          >
            Export JSON
          </button>
        </div>
        <div className="fd-toolbar__tabs">
          <button
            className={classNames('fd-toolbar__button', 'fd-toolbar__button--tab', activeTab === 'designer' && 'fd-toolbar__button--tab-active')}
            onClick={() => setActiveTab('designer')}
            type="button"
          >
            Designer
          </button>
          <button
            className={classNames('fd-toolbar__button', 'fd-toolbar__button--tab', activeTab === 'json' && 'fd-toolbar__button--tab-active')}
            onClick={() => setActiveTab('json')}
            type="button"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="flow-designer-example__body">
        {activeTab === 'designer' ? (
          <>
            <div className="fd-page__palette">
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
                                type="button"
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
            </div>

            <div className="flow-designer-example__canvas fd-page__canvas" onClick={handlePaneClick}>
              <div className="flow-designer-example__canvas-surface fd-canvas">
                <div className="fd-canvas__nodes">
                  {doc.nodes.map((node) => (
                    <div
                      key={node.id}
                      className={classNames(
                        'fd-node',
                        snapshot.selection.activeNodeId === node.id && 'fd-node--selected',
                        node.type && `fd-node--${node.type}`
                      )}
                      style={{
                        left: node.position.x,
                        top: node.position.y
                      }}
                      onClick={(e) => handleNodeClick(node.id, e)}
                    >
                      <div className="fd-node__header">
                        <span className="fd-node__icon">{getNodeIcon(node.type)}</span>
                        <div>
                          <div className="fd-node__title">{String(node.data.label ?? node.type)}</div>
                          <div className="fd-node__type">{node.type}</div>
                        </div>
                      </div>
                      {snapshot.selection.activeNodeId === node.id && (
                        <div className="fd-node__actions">
                          <button
                            className="fd-node__action fd-node__action--duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateNode(node.id);
                            }}
                            title="Duplicate"
                            type="button"
                          >
                            ⧉
                          </button>
                          <button
                            className="fd-node__action fd-node__action--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id);
                            }}
                            title="Delete"
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {getNodePorts(node.type).map((port) => (
                        <div
                          key={port.id}
                          className={classNames(
                            'fd-port',
                            `fd-port--${port.direction}`,
                            `fd-port--${port.position}`
                          )}
                          title={port.label ?? port.id}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <svg className="fd-canvas__edges">
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
                        className={classNames('fd-edge', snapshot.selection.activeEdgeId === edge.id && 'fd-edge--selected')}
                        onClick={(e) => handleEdgeClick(edge.id, e as unknown as React.MouseEvent)}
                      >
                        <path
                          className="fd-edge__path"
                          d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                          markerEnd="url(#flow-designer-example-arrowhead)"
                        />
                        {edgeLabel && (
                          <text
                            className="fd-edge__label"
                            x={midX}
                            y={(sourceY + targetY) / 2 - 10}
                            textAnchor="middle"
                          >
                            {edgeLabel}
                          </text>
                        )}
                        {snapshot.selection.activeEdgeId === edge.id && (
                          <g
                            className="fd-edge__action"
                            transform={`translate(${midX + 20}, ${(sourceY + targetY) / 2 + 5})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEdge(edge.id);
                            }}
                          >
                            <circle className="fd-edge__action-circle--delete" r={10} />
                            <text className="fd-edge__action-text" textAnchor="middle" dy={4} fontSize={14}>
                              ×
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                  <defs>
                    <marker
                      id="flow-designer-example-arrowhead"
                      markerWidth={10}
                      markerHeight={7}
                      refX={9}
                      refY={3.5}
                      orient="auto"
                    >
                      <polygon className="fd-edge__arrow" points="0 0, 10 3.5, 0 7" />
                    </marker>
                  </defs>
                </svg>
                <div className="fd-canvas__info">
                  Nodes: {doc.nodes.length} | Edges: {doc.edges.length}
                </div>
              </div>
            </div>

            <div className="fd-page__inspector">
              {snapshot.activeNode ? (
                <div className="fd-inspector">
                  <h3 className="fd-inspector__title">Node Properties</h3>
                  <div className="fd-inspector__section">
                    <label className="fd-inspector__label">Type</label>
                    <div className="fd-inspector__value">{snapshot.activeNode.type}</div>
                  </div>
                  <div className="fd-inspector__section">
                    <label className="fd-inspector__label">Label</label>
                    <input
                      type="text"
                      className="fd-inspector__input"
                      value={String(snapshot.activeNode.data.label ?? '')}
                      onChange={(e) => core.updateNode(snapshot.activeNode!.id, { label: e.target.value })}
                    />
                  </div>
                  {Object.entries(snapshot.activeNode.data).map(([key, value]) => {
                    if (key === 'label') return null;
                    return (
                      <div key={key} className="fd-inspector__section">
                        <label className="fd-inspector__label">{key}</label>
                        <input
                          type="text"
                          className="fd-inspector__input"
                          value={String(value ?? '')}
                          onChange={(e) => core.updateNode(snapshot.activeNode!.id, { [key]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                  <div className="fd-inspector__actions">
                    <button
                      className="fd-inspector__button fd-inspector__button--danger"
                      onClick={() => core.deleteNode(snapshot.activeNode!.id)}
                      type="button"
                    >
                      Delete Node
                    </button>
                  </div>
                </div>
              ) : snapshot.activeEdge ? (
                <div className="fd-inspector">
                  <h3 className="fd-inspector__title">Edge Properties</h3>
                  <div className="fd-inspector__section">
                    <label className="fd-inspector__label">Label</label>
                    <input
                      type="text"
                      className="fd-inspector__input"
                      value={String(snapshot.activeEdge.data.label ?? '')}
                      onChange={(e) => core.updateEdge(snapshot.activeEdge!.id, { label: e.target.value })}
                    />
                  </div>
                  {Object.entries(snapshot.activeEdge.data).map(([key, value]) => {
                    if (key === 'label') return null;
                    return (
                      <div key={key} className="fd-inspector__section">
                        <label className="fd-inspector__label">{key}</label>
                        <input
                          type="text"
                          className="fd-inspector__input"
                          value={String(value ?? '')}
                          onChange={(e) => core.updateEdge(snapshot.activeEdge!.id, { [key]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                  <div className="fd-inspector__actions">
                    <button
                      className="fd-inspector__button fd-inspector__button--danger"
                      onClick={() => core.deleteEdge(snapshot.activeEdge!.id)}
                      type="button"
                    >
                      Delete Edge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fd-inspector fd-inspector--empty">
                  <p className="fd-inspector__empty-text">Select a node or edge to edit its properties</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flow-designer-example__json">
            <pre className="flow-designer-example__json-pre">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="flow-designer-example__toast">
          {toastMessage}
        </div>
      )}
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
