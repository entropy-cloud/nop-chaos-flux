import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GraphDocument,
  DesignerConfig,
  NodeTypeConfig,
  DesignerSnapshot
} from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { renderDesignerCanvasBridge } from '@nop-chaos/flow-designer-renderers';
import type { DesignerCanvasBridgeProps } from '@nop-chaos/flow-designer-renderers';

import {
  FlowDesignerToolbar,
  FlowDesignerPalette,
  FlowDesignerInspector,
  FlowDesignerToast,
  FlowDesignerHoverToolbar
} from './flow-designer';

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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

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

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
    setHoveredEdgeId(null);
  }, []);

  const handleEdgeHover = useCallback((edgeId: string | null) => {
    setHoveredEdgeId(edgeId);
    setHoveredNodeId(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl+Z: Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (core.canUndo()) core.undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((isMod && e.key === 'y') || (isMod && e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (core.canRedo()) core.redo();
        return;
      }

      // Ctrl+S: Save
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+C: Copy
      if (isMod && e.key === 'c') {
        e.preventDefault();
        const selectedNodeId = snapshot.selection.activeNodeId;
        if (selectedNodeId) {
          core.copySelection();
          showToast('Node copied');
        }
        return;
      }

      // Ctrl+V: Paste
      if (isMod && e.key === 'v') {
        e.preventDefault();
        core.pasteClipboard();
        showToast('Pasted');
        return;
      }

      // Ctrl+D: Duplicate selected node
      if (isMod && e.key === 'd') {
        e.preventDefault();
        const selectedNodeId = snapshot.selection.activeNodeId;
        if (selectedNodeId) {
          core.duplicateNode(selectedNodeId);
          showToast('Node duplicated');
        }
        return;
      }

      // Delete or Backspace: Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selectedNodeId = snapshot.selection.activeNodeId;
        const selectedEdgeId = snapshot.selection.activeEdgeId;
        if (selectedNodeId) {
          core.deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          core.deleteEdge(selectedEdgeId);
        }
        return;
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        core.clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [core, snapshot, handleSave, showToast]);

  // Leave guard for dirty state
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (core.isDirty()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [core]);

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

  // Connection state for xyflow adapter
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);

  const bridgeProps: DesignerCanvasBridgeProps = useMemo(
    () => ({
      snapshot,
      pendingConnectionSourceId,
      reconnectingEdgeId,
      showMinimap: true,
      showControls: true,
      onPaneClick: () => {
        core.clearSelection();
      },
      onNodeSelect: (nodeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        core.selectNode(nodeId);
      },
      onEdgeSelect: (edgeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        core.selectEdge(edgeId);
      },
      onStartConnection: (nodeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setPendingConnectionSourceId(nodeId);
      },
      onCancelConnection: () => {
        setPendingConnectionSourceId(null);
      },
      onCompleteConnection: (targetNodeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (pendingConnectionSourceId && pendingConnectionSourceId !== targetNodeId) {
          core.addEdge(pendingConnectionSourceId, targetNodeId, { label: '' });
        }
        setPendingConnectionSourceId(null);
      },
      onStartReconnect: (edgeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setReconnectingEdgeId(edgeId);
      },
      onCancelReconnect: () => {
        setReconnectingEdgeId(null);
      },
      onCompleteReconnect: (edgeId: string, sourceId: string, targetId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        core.reconnectEdge(edgeId, sourceId, targetId);
        setReconnectingEdgeId(null);
      },
      onDuplicateNode: (nodeId: string) => {
        core.duplicateNode(nodeId);
      },
      onDeleteNode: (nodeId: string) => {
        core.deleteNode(nodeId);
      },
      onDeleteEdge: (edgeId: string) => {
        core.deleteEdge(edgeId);
      },
      onMoveNode: (nodeId: string, _event: React.MouseEvent, position?: { x: number; y: number }) => {
        if (position) {
          core.moveNode(nodeId, position);
        }
      },
      onViewportChange: (viewport: { x: number; y: number; zoom: number }) => {
        core.setViewport(viewport);
      },
      onNodeDoubleClick: (nodeId: string) => {
        core.selectNode(nodeId);
      },
      onEdgeDoubleClick: (edgeId: string) => {
        core.selectEdge(edgeId);
      },
      onNodeHover: (nodeId: string | null) => {
        handleNodeHover(nodeId);
      },
      onEdgeHover: (edgeId: string | null) => {
        handleEdgeHover(edgeId);
      },
      onDrop: (nodeTypeId: string, position: { x: number; y: number }) => {
        core.addNode(nodeTypeId, position);
      }
    }),
    [snapshot, pendingConnectionSourceId, reconnectingEdgeId, core, handleNodeHover, handleEdgeHover]
  );

  return (
    <div className="flow-designer-example na-theme-root fd-theme-root">
      <FlowDesignerToolbar
        docName={doc.name}
        canUndo={core.canUndo()}
        canRedo={core.canRedo()}
        activeTab={activeTab}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearSelection={handleClearSelection}
        onSave={handleSave}
        onRestore={handleRestore}
        onExport={handleExport}
        onTabChange={setActiveTab}
      />

      <div className="flow-designer-example__body">
        {activeTab === 'designer' ? (
          <>
            <FlowDesignerPalette
              config={config}
              search={search}
              expandedGroups={expandedGroups}
              onSearchChange={setSearch}
              onToggleGroup={toggleGroup}
              onAddNode={handleAddNode}
            />

            <div className="flow-designer-example__canvas">
              {renderDesignerCanvasBridge('xyflow', bridgeProps)}
            </div>

            <FlowDesignerHoverToolbar
              nodeId={hoveredNodeId}
              edgeId={hoveredEdgeId}
              onEditNode={(nodeId) => {
                core.selectNode(nodeId);
              }}
              onDuplicateNode={handleDuplicateNode}
              onDeleteNode={handleDeleteNode}
              onEditEdge={(edgeId) => {
                core.selectEdge(edgeId);
              }}
              onDeleteEdge={handleDeleteEdge}
            />

            <FlowDesignerInspector
              snapshot={snapshot}
              onUpdateNode={core.updateNode.bind(core)}
              onDeleteNode={handleDeleteNode}
              onUpdateEdge={core.updateEdge.bind(core)}
              onDeleteEdge={handleDeleteEdge}
            />
          </>
        ) : (
          <div className="flow-designer-example__json">
            <pre className="flow-designer-example__json-pre">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {toastMessage && <FlowDesignerToast message={toastMessage} />}
    </div>
  );
}
