import React, { useCallback, useEffect, useState } from 'react';
import { FlowCanvas } from './flow-designer/FlowCanvas';
import { useFlowCanvasStore } from './flow-designer/useFlowCanvasStore';
import { FlowDesignerToast } from './flow-designer';
import type { FlowCanvasDocument } from './flow-designer/useFlowCanvasStore';

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
      <div className="flow-designer-example__toolbar">
        <div className="flow-toolbar">
          <h3 className="flow-toolbar__title">Flow Designer</h3>
          {store.dirty && <span className="flow-toolbar__dirty">*</span>}
          <div className="flow-toolbar__spacer" />
          <div className="flow-toolbar__actions">
            <button
              className="flow-toolbar__button"
              onClick={store.undo}
              disabled={!store.canUndo}
              type="button"
            >
              Undo
            </button>
            <button
              className="flow-toolbar__button"
              onClick={store.redo}
              disabled={!store.canRedo}
              type="button"
            >
              Redo
            </button>
            <button className="flow-toolbar__button" onClick={handleSave} type="button">
              Save
            </button>
            <button className="flow-toolbar__button" onClick={handleExport} type="button">
              Export
            </button>
            <button className="flow-toolbar__button" onClick={store.reset} type="button">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flow-designer-example__body">
        <div className="flow-designer-example__palette">
          <div className="flow-palette">
            <div className="flow-palette__section">
              <div className="flow-palette__title">Nodes</div>
              <div className="flow-palette__items">
                {['start', 'end', 'task', 'condition', 'parallel', 'loop'].map((type) => (
                  <button
                    key={type}
                    className="flow-palette__item"
                    onClick={() => {
                      const position = { x: 180 + Math.random() * 400, y: 120 + Math.random() * 300 };
                      store.addNode(type, position, { label: type });
                      showToast(`Node added: ${type}`);
                    }}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flow-designer-example__canvas">
          <FlowCanvas store={store} showMinimap showControls showGrid />
        </div>

        <div className="flow-designer-example__inspector">
          <div className="flow-inspector">
            {store.selectedNodeId && (
              <div className="flow-inspector__section">
                <div className="flow-inspector__title">Selected Node</div>
                <div className="flow-inspector__content">
                  <div className="flow-inspector__field">
                    <label>ID:</label>
                    <span>{store.selectedNodeId}</span>
                  </div>
                  <button
                    className="flow-inspector__button flow-inspector__button--danger"
                    onClick={store.deleteSelected}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
            {store.selectedEdgeId && (
              <div className="flow-inspector__section">
                <div className="flow-inspector__title">Selected Edge</div>
                <div className="flow-inspector__content">
                  <div className="flow-inspector__field">
                    <label>ID:</label>
                    <span>{store.selectedEdgeId}</span>
                  </div>
                  <button
                    className="flow-inspector__button flow-inspector__button--danger"
                    onClick={store.deleteSelected}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
            {!store.selectedNodeId && !store.selectedEdgeId && (
              <div className="flow-inspector__empty">
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
