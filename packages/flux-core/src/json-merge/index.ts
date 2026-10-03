export { mergeJson } from './merge-json.js';
export { diffToDelta } from './diff-delta.js';
export { classifyList, readIdentity } from './identity.js';
export { planListMerge } from './list-order.js';
export type { ListMergeSlot } from './list-order.js';
export {
  DEFAULT_IDENTITY_KEYS,
  DEFAULT_OVERRIDE_KEY,
  DEFAULT_UNIQUE_ATTR_KEY,
  DEFAULT_VIRTUAL_KEY,
} from './types.js';
export type {
  DeltaResult,
  IdentityRef,
  JsonMergeOptions,
  ListIdentityKind,
  MergeDiagnostic,
  MergeDiagnosticCode,
  MergeMarkers,
  MergeResult,
} from './types.js';