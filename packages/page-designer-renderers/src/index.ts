/**
 * @nop-chaos/page-designer-renderers —— 标准页面设计器 React 壳（L6 S2 Phase 2）。
 *
 * 三栏壳（palette / canvas / inspector / toolbar）+ JSON 源码视图 + 自持 registry。
 * 契约权威 = docs/components/page-designer/design-architecture.md（S1）；
 * 纯逻辑归 @nop-chaos/page-designer-core，本包不产生任何文档变更（命令通道唯一）。
 */

export { PageDesigner } from './page-designer-page.js';
export type { PageDesignerProps } from './page-designer-page.js';

export {
  createPageDesignerRegistry,
  buildMvpPaletteItems,
  resolvePaletteScaffold,
  MVP_PALETTE_TYPES,
} from './designer-registry.js';

export { useDesignerSession } from './use-designer-session.js';
export type { UseDesignerSessionResult } from './use-designer-session.js';

export { PageDesignerCanvas, syncAnchorAttributes } from './canvas-bridge.js';
export { createEditAssemblyPlugin, projectSessionIdsToTestids } from './edit-assembly.js';

export { CanvasOverlay } from './canvas-overlay.js';
export type { CanvasOverlayProps } from './canvas-overlay.js';

export { PalettePanel } from './palette-panel.js';
export type { PalettePanelProps } from './palette-panel.js';

export { InspectorPanel } from './inspector-panel.js';
export type { InspectorPanelProps } from './inspector-panel.js';

export { StructureTree } from './structure-tree.js';
export type { StructureTreeProps } from './structure-tree.js';

export { JsonSourceView } from './json-source-view.js';
export type { JsonSourceViewProps } from './json-source-view.js';

export {
  buildCanvasLayoutModel,
  buildRootDropHint,
  computeDropHintAt,
  containsPoint,
  hitTestLayout,
} from './canvas-layout.js';
export type {
  AnchorLookup,
  AnchorNodeModel,
  CanvasLayoutModel,
  PixelRect,
  RectResolver,
} from './canvas-layout.js';

export { buildInspectorPanelModel, buildRawJsonText } from './inspector-field-model.js';
export type {
  InspectorEventInfo,
  InspectorFieldModel,
  InspectorPanelModel,
} from './inspector-field-model.js';

export type {
  DesignerDropHint,
  DesignerDragPayload,
  PageCanvasBridgeProps,
} from './types.js';

export {
  ANCHOR_TESTID_PREFIX,
  NODE_ANCHOR_ATTRIBUTE,
  PAGE_DESIGNER_CANVAS_CLASS,
  PAGE_DESIGNER_DRAG_MIME,
} from './constants.js';
