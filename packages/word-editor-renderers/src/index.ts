import './styles.css';

export { WordEditorPage } from './word-editor-page.js';
export {
  registerWordEditorRenderers,
  wordEditorRendererDefinitions,
  defineWordEditorPageSchema,
} from './renderers.js';
export type { WordEditorPageSchema, WordEditorPageSchemaInput } from './types.js';
export {
  WORD_EDITOR_MANIFEST_V1,
  resolveWordEditorManifest,
  wordEditorHostContract,
  WORD_EDITOR_CAPABILITY_PUBLICATION,
} from './word-editor-manifest.js';
export { createWordEditorActionProvider } from './word-editor-action-provider.js';
