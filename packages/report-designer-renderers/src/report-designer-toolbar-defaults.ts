import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

export const DEFAULT_TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: 'title', type: 'title', text: '${documentName}' },
  { id: 'divider-title', type: 'divider' },
  {
    id: 'undo',
    type: 'button',
    label: 'Undo',
    icon: 'undo',
    action: 'report-designer:undo',
    disabled: '${!designer.canUndo}',
  },
  {
    id: 'redo',
    type: 'button',
    label: 'Redo',
    icon: 'redo',
    action: 'report-designer:redo',
    disabled: '${!designer.canRedo}',
  },
  { id: 'divider-edit', type: 'divider' },
  {
    id: 'preview',
    type: 'button',
    label: 'Preview',
    action: 'report-designer:preview',
    intent: 'primary',
  },
  {
    id: 'stopPreview',
    type: 'button',
    label: 'Stop',
    action: 'report-designer:stopPreview',
    visible: '${preview.running}',
  },
  { id: 'spacer-1', type: 'spacer' },
  { id: 'fieldCount', type: 'badge', text: '${fieldCount} fields', level: 'secondary' },
  { id: 'divider-info', type: 'divider' },
  { id: 'save', type: 'button', label: 'Save', action: 'report-designer:save' },
];
