import React from 'react';

export interface FlowDesignerToolbarProps {
  docName: string;
  canUndo: boolean;
  canRedo: boolean;
  activeTab: 'designer' | 'json';
  onUndo: () => void;
  onRedo: () => void;
  onClearSelection: () => void;
  onSave: () => void;
  onRestore: () => void;
  onExport: () => void;
  onTabChange: (tab: 'designer' | 'json') => void;
}

export function FlowDesignerToolbar({
  docName,
  canUndo,
  canRedo,
  activeTab,
  onUndo,
  onRedo,
  onClearSelection,
  onSave,
  onRestore,
  onExport,
  onTabChange
}: FlowDesignerToolbarProps) {
  return (
    <div data-slot="flow-designer-toolbar">
      <h2 data-slot="flow-designer-toolbar-title">{docName}</h2>
      <div data-slot="flow-designer-toolbar-spacer" />
      <div data-slot="flow-designer-toolbar-group">
        <button
          data-slot="flow-designer-toolbar-button"
          onClick={onUndo}
          disabled={!canUndo}
          type="button"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          data-slot="flow-designer-toolbar-button"
          onClick={onRedo}
          disabled={!canRedo}
          type="button"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <div data-slot="flow-designer-toolbar-divider" />
        <button
          data-slot="flow-designer-toolbar-button"
          onClick={onClearSelection}
          type="button"
        >
          Clear Selection
        </button>
        <div data-slot="flow-designer-toolbar-divider" />
        <button
          data-slot="flow-designer-toolbar-button"
          data-variant="success"
          onClick={onSave}
          type="button"
        >
          Save
        </button>
        <button
          data-slot="flow-designer-toolbar-button"
          onClick={onRestore}
          type="button"
        >
          Restore
        </button>
        <button
          data-slot="flow-designer-toolbar-button"
          data-variant="primary"
          onClick={onExport}
          type="button"
        >
          Export JSON
        </button>
      </div>
      <div data-slot="flow-designer-toolbar-tabs">
        <button
          data-slot="flow-designer-toolbar-tab"
          data-active={activeTab === 'designer' ? '' : undefined}
          onClick={() => onTabChange('designer')}
          type="button"
        >
          Designer
        </button>
        <button
          data-slot="flow-designer-toolbar-tab"
          data-active={activeTab === 'json' ? '' : undefined}
          onClick={() => onTabChange('json')}
          type="button"
        >
          JSON
        </button>
      </div>
    </div>
  );
}
