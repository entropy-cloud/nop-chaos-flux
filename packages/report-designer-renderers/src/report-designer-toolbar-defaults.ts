import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

// Single source for the field-count badge id shared between the default items
// and the renderer's count-localization special case. Hosts overriding the
// toolbar via itemsOverride opt out of that localization by design (defaults-
// driven surface).
export const TOOLBAR_FIELD_COUNT_ID = 'fieldCount';

export const DEFAULT_TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: 'title', type: 'title', text: '${documentName}' },
  { id: 'divider-title', type: 'divider' },
  {
    id: 'undo',
    type: 'button',
    label: 'flux.reportDesigner.undo',
    icon: 'undo',
    action: 'report-designer:undo',
    disabled: '${!designer.canUndo}',
  },
  {
    id: 'redo',
    type: 'button',
    label: 'flux.reportDesigner.redo',
    icon: 'redo',
    action: 'report-designer:redo',
    disabled: '${!designer.canRedo}',
  },
  { id: 'divider-edit', type: 'divider' },
  {
    id: 'preview',
    type: 'button',
    label: 'flux.reportDesigner.preview',
    action: 'report-designer:preview',
    intent: 'primary',
  },
  {
    id: 'stopPreview',
    type: 'button',
    label: 'flux.reportDesigner.stop',
    action: 'report-designer:stopPreview',
    visible: '${preview.running}',
  },
  { id: 'spacer-1', type: 'spacer' },
  { id: TOOLBAR_FIELD_COUNT_ID, type: 'badge', text: '${fieldCount}', level: 'secondary' },
  { id: 'divider-info', type: 'divider' },
  {
    id: 'save',
    type: 'button',
    label: 'flux.reportDesigner.save',
    action: 'report-designer:save',
    then: [{ action: 'showToast', args: { message: '已保存', level: 'success' } }],
  },
];
