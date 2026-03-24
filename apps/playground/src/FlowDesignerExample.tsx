import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GraphDocument,
  DesignerConfig,
  NodeTypeConfig,
  DesignerSnapshot
} from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';

import {
  FlowDesignerToolbar,
  FlowDesignerPalette,
  FlowDesignerCanvas,
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

  const handleDrop = useCallback(
    (nodeTypeId: string, position: { x: number; y: number }) => {
      core.addNode(nodeTypeId, position);
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

            <FlowDesignerCanvas
              doc={doc}
              snapshot={snapshot}
              onPaneClick={handlePaneClick}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onDuplicateNode={handleDuplicateNode}
              onDeleteNode={handleDeleteNode}
              onDrop={handleDrop}
              onNodeHover={handleNodeHover}
              onEdgeHover={handleEdgeHover}
            />

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
