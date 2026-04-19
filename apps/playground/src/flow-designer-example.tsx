import React, { useCallback, useEffect, useState } from 'react';
import { FlowCanvas } from './flow-designer/flow-canvas';
import { useFlowCanvasStore } from './flow-designer/use-flow-canvas-store';
import { FlowDesignerToast } from './flow-designer';
import type { FlowCanvasDocument } from './flow-designer/use-flow-canvas-store';
import { Button, Label } from '@nop-chaos/ui';

interface FlowDesignerProps {
  document?: FlowCanvasDocument;
  onSave?: (document: FlowCanvasDocument) => void;
}

export function FlowDesignerExample({ document: initialDoc, onSave }: FlowDesignerProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const store = useFlowCanvasStore(initialDoc);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handleSave = useCallback(() => {
    const doc = store.save();
    onSave?.(doc);
    showToast('Document saved');
  }, [store, onSave, showToast]);

  const handleExport = useCallback(() => {
    const json = store.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Document exported');
  }, [store, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (store.canUndo) store.undo();
        return;
      }

      if ((isMod && e.key === 'y') || (isMod && e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (store.canRedo) store.redo();
        return;
      }

      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        store.deleteSelected();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        store.selectNode(null);
        store.selectEdge(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (store.dirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [store.dirty]);

  return (
    <div className="flow-designer-example nop-theme-root fd-theme-root">
      <div data-slot="flow-designer-example-toolbar-shell">
        <div data-slot="flow-designer-example-toolbar">
          <h3 data-slot="flow-designer-example-toolbar-title">Flow Designer</h3>
          {store.dirty && <span data-slot="flow-designer-example-toolbar-dirty">*</span>}
          <div data-slot="flow-designer-example-toolbar-spacer" />
          <div data-slot="flow-designer-example-toolbar-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={store.undo}
              disabled={!store.canUndo}
            >
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={store.redo}
              disabled={!store.canRedo}
            >
              Redo
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={store.reset}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div data-slot="flow-designer-example-body">
        <div data-slot="flow-designer-example-palette-shell">
          <div data-slot="flow-designer-example-palette">
            <div data-slot="flow-designer-example-palette-section">
              <div data-slot="flow-designer-example-palette-title">Nodes</div>
              <div data-slot="flow-designer-example-palette-items">
                {['start', 'end', 'task', 'condition', 'parallel', 'loop'].map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const position = { x: 180 + Math.random() * 400, y: 120 + Math.random() * 300 };
                      store.addNode(type, position, { label: type });
                      showToast(`Node added: ${type}`);
                    }}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div data-slot="flow-designer-example-canvas">
          <FlowCanvas store={store} showMinimap showControls showGrid />
        </div>

        <div data-slot="flow-designer-example-inspector-shell">
          <div data-slot="flow-designer-example-inspector">
            {store.selectedNodeId && (
              <div data-slot="flow-designer-example-inspector-section">
                <div data-slot="flow-designer-example-inspector-title">Selected Node</div>
                <div data-slot="flow-designer-example-inspector-content">
                  <div data-slot="flow-designer-example-inspector-field">
                    <Label>ID:</Label>
                    <span>{store.selectedNodeId}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={store.deleteSelected}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
            {store.selectedEdgeId && (
              <div data-slot="flow-designer-example-inspector-section">
                <div data-slot="flow-designer-example-inspector-title">Selected Edge</div>
                <div data-slot="flow-designer-example-inspector-content">
                  <div data-slot="flow-designer-example-inspector-field">
                    <Label>ID:</Label>
                    <span>{store.selectedEdgeId}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={store.deleteSelected}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
            {!store.selectedNodeId && !store.selectedEdgeId && (
              <div data-slot="flow-designer-example-inspector-empty">
                Select a node or edge to inspect
              </div>
            )}
          </div>
        </div>
      </div>

      {toastMessage && <FlowDesignerToast message={toastMessage} />}
    </div>
  );
}
