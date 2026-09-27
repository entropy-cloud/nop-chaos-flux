/**
 * @nop-chaos/page-designer-core —— 标准页面设计器纯逻辑包（L6 S2 Phase 1）。
 *
 * 零 React / node-only：会话组装、树命令、xui:sid round-trip、节点分类、
 * inspector schema 生成、palette 过滤。契约权威 =
 * docs/components/page-designer/design-architecture.md（S1）。
 */

export type {
  SessionNodeId,
  DesignerDocument,
  JsonTreePatch,
  DesignerTreeCommand,
  DesignerCommandResult,
  PageDesignerDomainAdapter,
  PageDesignerSession,
  PageDesignerSessionOptions,
} from './types.js';

export {
  SESSION_ID_KEY,
  createSeededRandom,
  createSessionNodeId,
  getSessionId,
  injectSessionIds,
  stripSessionIds,
  collectSessionIds,
  walkSchemaNodes,
  escapeJsonPointerToken,
} from './round-trip.js';
export type { SidRandom, SchemaNodeEntry } from './round-trip.js';

export { diffSchemaInput, applyTreePatches, deepEqual } from './tree-patch.js';

export {
  classifyNode,
  isOpaqueLeaf,
  DOMAIN_SOURCE_PACKAGE_PREFIXES,
} from './classify.js';
export type { PageNodeClass } from './classify.js';

export {
  createPageDesignerDomainAdapter,
  createPageDesignerSession,
  createEmptyPageDocument,
} from './session.js';

export { applyDesignerCommand } from './commands.js';
export type { DesignerCommandContext } from './commands.js';

export {
  serializeCommand,
  deserializeCommand,
} from './command-serialization.js';
export type { SerializedDesignerCommand, DeserializedCommand } from './command-serialization.js';

export {
  collectDataSourceNames,
  buildDataBindingExpression,
  parseDataBindingExpression,
  isSchemaNode,
} from './data-binding.js';
export type { DataBindingExpression } from './data-binding.js';

export {
  buildKeyboardNavRows,
  resolveKeyboardMove,
} from './keyboard-navigation.js';
export type { KeyboardNavRow, KeyboardNavKey } from './keyboard-navigation.js';

export {
  getDropRegionKeys,
  getContainerKeys,
  isContainerDefinition,
  getChildContainerKeys,
  locateNode,
  findNodeById,
  rebuildAtLocation,
  removeAtLocation,
  getRegionChildren,
  getRegionForm,
} from './tree-navigation.js';
export type { NodeFrame, NodeLocation } from './tree-navigation.js';

export {
  buildInspectorSchema,
  deriveControlFromShape,
  resolveInspectorRoutedKeys,
  INSPECTOR_EVENTS_KEY,
  INSPECTOR_EDITOR_TYPE_KEY,
  INSPECTOR_ADAPTER_KEY,
  INSPECTOR_READONLY_KEY,
  INSPECTOR_RAW_JSON_FIELD,
} from './inspector-schema.js';
export type { InspectorBuildOptions, InspectorControlAdapter } from './inspector-schema.js';

export {
  evaluatePaletteEntry,
  buildPaletteItems,
} from './palette-filter.js';
export type {
  PaletteStage,
  PaletteVerdict,
  PaletteExcludeReason,
  PaletteItem,
  PaletteBuildOptions,
} from './palette-filter.js';
