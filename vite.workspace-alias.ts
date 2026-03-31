import { fileURLToPath, URL } from 'node:url';

export const workspacePackageAliases = {
  '@nop-chaos/flux-core': fileURLToPath(new URL('./packages/flux-core/src/index.ts', import.meta.url)),
  '@nop-chaos/flux-formula': fileURLToPath(new URL('./packages/flux-formula/src/index.ts', import.meta.url)),
  '@nop-chaos/nop-debugger': fileURLToPath(new URL('./packages/nop-debugger/src/index.tsx', import.meta.url)),
  '@nop-chaos/flux-runtime': fileURLToPath(new URL('./packages/flux-runtime/src/index.ts', import.meta.url)),
  '@nop-chaos/flux-react': fileURLToPath(new URL('./packages/flux-react/src/index.tsx', import.meta.url)),
  '@nop-chaos/flux-renderers-basic': fileURLToPath(new URL('./packages/flux-renderers-basic/src/index.tsx', import.meta.url)),
  '@nop-chaos/flux-renderers-form': fileURLToPath(new URL('./packages/flux-renderers-form/src/index.tsx', import.meta.url)),
  '@nop-chaos/flux-renderers-data': fileURLToPath(new URL('./packages/flux-renderers-data/src/index.tsx', import.meta.url)),
  '@nop-chaos/flux-code-editor': fileURLToPath(new URL('./packages/flux-code-editor/src/index.ts', import.meta.url)),
  '@nop-chaos/ui/styles.css': fileURLToPath(new URL('./packages/ui/src/styles/index.css', import.meta.url)),
  '@nop-chaos/ui/base.css': fileURLToPath(new URL('./packages/ui/src/styles/base.css', import.meta.url)),
  '@nop-chaos/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
  '@nop-chaos/spreadsheet-core': fileURLToPath(new URL('./packages/spreadsheet-core/src/index.ts', import.meta.url)),
  '@nop-chaos/spreadsheet-renderers': fileURLToPath(new URL('./packages/spreadsheet-renderers/src/index.ts', import.meta.url)),
  '@nop-chaos/report-designer-core': fileURLToPath(new URL('./packages/report-designer-core/src/index.ts', import.meta.url)),
  '@nop-chaos/report-designer-renderers': fileURLToPath(new URL('./packages/report-designer-renderers/src/index.ts', import.meta.url)),
  '@nop-chaos/flow-designer-core': fileURLToPath(new URL('./packages/flow-designer-core/src/index.ts', import.meta.url)),
  '@nop-chaos/flow-designer-renderers': fileURLToPath(new URL('./packages/flow-designer-renderers/src/index.tsx', import.meta.url)),
  '@nop-chaos/word-editor-core': fileURLToPath(new URL('./packages/word-editor-core/src/index.ts', import.meta.url)),
  '@nop-chaos/word-editor-renderers': fileURLToPath(new URL('./packages/word-editor-renderers/src/index.ts', import.meta.url))
};
