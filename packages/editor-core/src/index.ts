export type {
  EditorMode,
  EditorCommitPolicy,
  EditorDiffEntry,
  EditorSessionState,
  EditorDomainAdapter,
  EditorCoreOptions,
  EditorCommitResult,
  EditorCore,
} from './types.js';

export { UndoCommandStack, MAX_UNDO_STACK_DEPTH } from './undo-command-stack.js';
export { createEditorCore, cloneDocument } from './editor-core.js';
export {
  registerEditorDomain,
  getEditorDomain,
  listEditorDomains,
  clearEditorDomains,
} from './domain-registry.js';
