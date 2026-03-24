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

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
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
    <div className="fd-toolbar">
      <h2 className="fd-toolbar__title">{docName}</h2>
      <div className="fd-toolbar__spacer" />
      <div className="fd-toolbar__group">
        <button
          className="fd-toolbar__button"
          onClick={onUndo}
          disabled={!canUndo}
          type="button"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          className="fd-toolbar__button"
          onClick={onRedo}
          disabled={!canRedo}
          type="button"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <div className="fd-toolbar__divider" />
        <button
          className="fd-toolbar__button"
          onClick={onClearSelection}
          type="button"
        >
          Clear Selection
        </button>
        <div className="fd-toolbar__divider" />
        <button
          className="fd-toolbar__button fd-toolbar__button--success"
          onClick={onSave}
          type="button"
        >
          Save
        </button>
        <button
          className="fd-toolbar__button"
          onClick={onRestore}
          type="button"
        >
          Restore
        </button>
        <button
          className="fd-toolbar__button fd-toolbar__button--primary"
          onClick={onExport}
          type="button"
        >
          Export JSON
        </button>
      </div>
      <div className="fd-toolbar__tabs">
        <button
          className={classNames(
            'fd-toolbar__button',
            'fd-toolbar__button--tab',
            activeTab === 'designer' && 'fd-toolbar__button--tab-active'
          )}
          onClick={() => onTabChange('designer')}
          type="button"
        >
          Designer
        </button>
        <button
          className={classNames(
            'fd-toolbar__button',
            'fd-toolbar__button--tab',
            activeTab === 'json' && 'fd-toolbar__button--tab-active'
          )}
          onClick={() => onTabChange('json')}
          type="button"
        >
          JSON
        </button>
      </div>
    </div>
  );
}
