// Unstable subpath: only re-exports symbols that are NOT yet part of the stable
// barrel (`./index.tsx`). Keeping this set disjoint from the stable surface
// prevents callers from accidentally rooting on the unstable path for symbols
// they could import from the stable barrel. See AUDIT-05 / Plan
// 2026-06-27-0850-1 Phase 2.
export { mergeActionContext, createHelpers, EMPTY_SCOPE_DATA } from './helpers.js';
export { rendererHooks } from './hooks.js';
export {
  RenderInstancePathContext,
  StructuralLoopContext,
  useRequiredContext,
} from './contexts.js';
export {
  publishOwnerStatus,
  executeApiObject,
  createProjectedScopeStore as createProjectedScopeHelpers,
  createProjectedScopeStore,
} from '@nop-chaos/flux-runtime';
