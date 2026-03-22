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
    <div className="flow-designer-example" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        className="fd-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{doc.name}</h2>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="fd-toolbar__button"
            onClick={handleUndo}
            disabled={!core.canUndo()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: core.canUndo() ? '#fff' : '#f1f5f9',
              color: core.canUndo() ? '#1e293b' : '#94a3b8',
              cursor: core.canUndo() ? 'pointer' : 'not-allowed',
              fontSize: 13
            }}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            className="fd-toolbar__button"
            onClick={handleRedo}
            disabled={!core.canRedo()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: core.canRedo() ? '#fff' : '#f1f5f9',
              color: core.canRedo() ? '#1e293b' : '#94a3b8',
              cursor: core.canRedo() ? 'pointer' : 'not-allowed',
              fontSize: 13
            }}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <button
            className="fd-toolbar__button"
            onClick={handleClearSelection}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#1e293b',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Clear Selection
          </button>
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <button
            className="fd-toolbar__button"
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #10b981',
              background: '#10b981',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Save
          </button>
          <button
            className="fd-toolbar__button"
            onClick={handleRestore}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#1e293b',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Restore
          </button>
          <button
            className="fd-toolbar__button"
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Export JSON
          </button>
        </div>
        <div style={{ display: 'flex', marginLeft: 16, gap: 0 }}>
          <button
            onClick={() => setActiveTab('designer')}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              background: activeTab === 'designer' ? '#3b82f6' : '#fff',
              color: activeTab === 'designer' ? '#fff' : '#1e293b',
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: '6px 0 0 6px',
              borderRight: 'none'
            }}
          >
            Designer
          </button>
          <button
            onClick={() => setActiveTab('json')}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              background: activeTab === 'json' ? '#3b82f6' : '#fff',
              color: activeTab === 'json' ? '#fff' : '#1e293b',
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: '0 6px 6px 0'
            }}
          >
            JSON
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'designer' ? (
          <>
            <div className="fd-page__palette" style={{ width: 240, borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
              <div className="fd-palette" style={{ padding: 12 }}>
                <div className="fd-palette__header">
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Node Palette</h3>
                  {config.palette?.searchable !== false && (
                    <input
                      type="text"
                      className="fd-palette__search"
                      placeholder="Search nodes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
                    />
                  )}
                </div>
                <div className="fd-palette__groups">
                  {filteredGroups.map((group) => (
                    <div key={group.id} className="fd-palette__group" style={{ marginBottom: 12 }}>
                      <div
                        className="fd-palette__group-header"
                        onClick={() => toggleGroup(group.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569', borderRadius: 4 }}
                      >
                        <span className="fd-palette__group-toggle" style={{ fontSize: 10, color: '#94a3b8' }}>{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                        <span className="fd-palette__group-label">{group.label}</span>
                      </div>
                      {expandedGroups.has(group.id) && (
                        <div className="fd-palette__group-items" style={{ padding: '4px 0 4px 16px' }}>
                          {group.nodeTypes.map((ntId) => {
                            const nt = nodeTypes.find((n) => n.id === ntId);
                            if (!nt) return null;
                            return (
                              <button
                                key={nt.id}
                                className="fd-palette__item"
                                onClick={() => handleAddNode(nt)}
                                title={nt.description ?? nt.label}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, marginBottom: 4, textAlign: 'left' }}
                              >
                                <span className="fd-palette__item-icon" style={{ fontSize: 16 }}>{nt.icon ?? '○'}</span>
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

            <div className="fd-page__canvas" style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#f8fafc' }} onClick={handlePaneClick}>
              <div className="fd-canvas" style={{ minWidth: 1200, minHeight: 600, position: 'relative' }}>
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
                        position: 'absolute',
                        left: node.position.x,
                        top: node.position.y,
                        minWidth: 160,
                        padding: '12px 16px',
                        background: '#fff',
                        borderRadius: 8,
                        border: snapshot.selection.activeNodeId === node.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
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
                      {snapshot.selection.activeNodeId === node.id && (
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
                          stroke={snapshot.selection.activeEdgeId === edge.id ? '#3b82f6' : '#94a3b8'}
                          strokeWidth={snapshot.selection.activeEdgeId === edge.id ? 3 : 2}
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
                        {snapshot.selection.activeEdgeId === edge.id && (
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
            </div>

            <div className="fd-page__inspector" style={{ width: 280, borderLeft: '1px solid #e2e8f0', overflowY: 'auto', background: '#fff' }}>
              {snapshot.activeNode ? (
                <div className="fd-inspector" style={{ padding: 16 }}>
                  <h3 className="fd-inspector__title" style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600 }}>Node Properties</h3>
                  <div className="fd-inspector__section" style={{ marginBottom: 12 }}>
                    <label className="fd-inspector__label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Type</label>
                    <div className="fd-inspector__value" style={{ fontSize: 13, color: '#1e293b', padding: '6px 0' }}>{snapshot.activeNode.type}</div>
                  </div>
                  <div className="fd-inspector__section" style={{ marginBottom: 12 }}>
                    <label className="fd-inspector__label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Label</label>
                    <input
                      type="text"
                      className="fd-inspector__input"
                      value={String(snapshot.activeNode.data.label ?? '')}
                      onChange={(e) => core.updateNode(snapshot.activeNode!.id, { label: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  {Object.entries(snapshot.activeNode.data).map(([key, value]) => {
                    if (key === 'label') return null;
                    return (
                      <div key={key} className="fd-inspector__section" style={{ marginBottom: 12 }}>
                        <label className="fd-inspector__label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>{key}</label>
                        <input
                          type="text"
                          className="fd-inspector__input"
                          value={String(value ?? '')}
                          onChange={(e) => core.updateNode(snapshot.activeNode!.id, { [key]: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  })}
                  <div className="fd-inspector__actions" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <button
                      className="fd-inspector__button fd-inspector__button--danger"
                      onClick={() => core.deleteNode(snapshot.activeNode!.id)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
                    >
                      Delete Node
                    </button>
                  </div>
                </div>
              ) : snapshot.activeEdge ? (
                <div className="fd-inspector" style={{ padding: 16 }}>
                  <h3 className="fd-inspector__title" style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600 }}>Edge Properties</h3>
                  <div className="fd-inspector__section" style={{ marginBottom: 12 }}>
                    <label className="fd-inspector__label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Label</label>
                    <input
                      type="text"
                      className="fd-inspector__input"
                      value={String(snapshot.activeEdge.data.label ?? '')}
                      onChange={(e) => core.updateEdge(snapshot.activeEdge!.id, { label: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  {Object.entries(snapshot.activeEdge.data).map(([key, value]) => {
                    if (key === 'label') return null;
                    return (
                      <div key={key} className="fd-inspector__section" style={{ marginBottom: 12 }}>
                        <label className="fd-inspector__label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>{key}</label>
                        <input
                          type="text"
                          className="fd-inspector__input"
                          value={String(value ?? '')}
                          onChange={(e) => core.updateEdge(snapshot.activeEdge!.id, { [key]: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  })}
                  <div className="fd-inspector__actions" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <button
                      className="fd-inspector__button fd-inspector__button--danger"
                      onClick={() => core.deleteEdge(snapshot.activeEdge!.id)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
                    >
                      Delete Edge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fd-inspector fd-inspector--empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, padding: 16 }}>
                  <p className="fd-inspector__empty-text" style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Select a node or edge to edit its properties</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, padding: 16, background: '#1e293b', overflow: 'auto' }}>
            <pre style={{ color: '#e2e8f0', fontSize: 13, margin: 0 }}>
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '12px 20px',
            background: '#1e293b',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
