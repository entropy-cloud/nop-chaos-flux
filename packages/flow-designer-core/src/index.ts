export * from './types.js';
export { createDesignerCore, createTreeDesignerCore } from './core.js';
export type { CreateDesignerCoreOptions } from './core.js';
export type { DesignerCore } from './designer-core-types.js';
export { normalizeConfig } from './core/config.js';
export { migrateTreeConfig, normalizeConfigVersion, normalizeTreeDocumentVersion } from './core/config-migration.js';
export { createElkLayoutOwner, layoutWithElk } from './elk-layout.js';
export type { ElkLayoutOptions, ElkLayoutOwner } from './elk-layout.js';
export {
  projectAndLayoutTree,
  validateTreeDocument,
  canonicalizeTreeDocument,
  isJsonSafeTreePayload,
  resolveTreeNodeFootprint,
} from './tree-projection.js';
export type { TreeProjectionView } from './tree-projection.js';
export {
  MIN_CHAIN_GAP,
  MIN_SPLIT_GAP_TB,
  MIN_SPLIT_GAP_LR,
  MIN_MERGE_GAP,
  SPLIT_HALF_GAP_MIN_TB,
  SPLIT_HALF_GAP_MIN_LR,
  MERGE_HALF_GAP_MIN,
} from './tree-projection.js';
export {
  registerTreeDomainAdapter,
  getTreeDomainAdapter,
  listTreeDomainAdapters,
} from './tree-domain.js';
export { createDesignerStoreAdapter } from './adapters/designer-store-adapter.js';
export type { DesignerStoreAdapter } from './adapters/designer-store-adapter.js';
