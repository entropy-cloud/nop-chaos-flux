/* Adjudication 01-11: form-advanced imports createProjectedScopeStore from flux-runtime public API only (re-exported as local alias). Verified — uses public API surface, no internal flux-runtime modules reached. Accept-and-annotate: clean. */
export { createProjectedScopeStore as createProjectedScopeHelpers } from '@nop-chaos/flux-runtime';
