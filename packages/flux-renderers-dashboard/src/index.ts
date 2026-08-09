import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { dashboardRendererDefinition } from './dashboard-definitions.js';
import { dashboardEditorRendererDefinition } from './editor/dashboard-editor-definitions.js';

export type {
  DashboardLayoutSchema,
  DashboardPanelSchema,
} from './schemas.js';
export { DashboardRenderer } from './dashboard-renderer.js';
export { dashboardRendererDefinition } from './dashboard-definitions.js';
export { DashboardEditorRenderer } from './editor/dashboard-editor-renderer.js';
export { dashboardEditorRendererDefinition } from './editor/dashboard-editor-definitions.js';
export {
  panelToPixels,
  snapToGrid,
  clampPanelPosition,
  clampPanelSize,
  dragPanel,
  resizePanel,
  findOverlappingPanels,
  sanitizePanels,
  resolveCanvasHeight,
  DEFAULT_COLS,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_GAP,
  type ResizeHandle,
} from './layout-math.js';

export function registerDashboardRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, [
    dashboardRendererDefinition,
    dashboardEditorRendererDefinition,
  ]);
}
