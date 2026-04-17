import React from 'react';
import { Button } from '@nop-chaos/ui';

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
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </Button>
        <div data-slot="flow-designer-toolbar-divider" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
        <div data-slot="flow-designer-toolbar-divider" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
        >
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
        >
          Export JSON
        </Button>
      </div>
      <div data-slot="flow-designer-toolbar-tabs">
        <Button
          variant="ghost"
          size="sm"
          data-active={activeTab === 'designer' ? '' : undefined}
          onClick={() => onTabChange('designer')}
        >
          Designer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-active={activeTab === 'json' ? '' : undefined}
          onClick={() => onTabChange('json')}
        >
          JSON
        </Button>
      </div>
    </div>
  );
}
