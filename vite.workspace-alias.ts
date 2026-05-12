import { fileURLToPath, URL } from 'node:url';

export const workspacePackageAliases = {
  '@nop-chaos/flux-core': fileURLToPath(
    new URL('./packages/flux-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-action-core': fileURLToPath(
    new URL('./packages/flux-action-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-compiler': fileURLToPath(
    new URL('./packages/flux-compiler/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-formula': fileURLToPath(
    new URL('./packages/flux-formula/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-i18n': fileURLToPath(
    new URL('./packages/flux-i18n/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-i18n/locales/zh-CN': fileURLToPath(
    new URL('./packages/flux-i18n/src/locales/zh-CN.ts', import.meta.url),
  ),
  '@nop-chaos/flux-i18n/locales/en-US': fileURLToPath(
    new URL('./packages/flux-i18n/src/locales/en-US.ts', import.meta.url),
  ),
  '@nop-chaos/nop-debugger': fileURLToPath(
    new URL('./packages/nop-debugger/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-runtime': fileURLToPath(
    new URL('./packages/flux-runtime/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-react/default-spacing.css': fileURLToPath(
    new URL('./packages/flux-react/src/default-spacing.css', import.meta.url),
  ),
  '@nop-chaos/flux-react/unstable': fileURLToPath(
    new URL('./packages/flux-react/src/unstable.ts', import.meta.url),
  ),
  '@nop-chaos/flux-react': fileURLToPath(
    new URL('./packages/flux-react/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux/style.css': fileURLToPath(
    new URL('./packages/flux-bundle/src/style.css', import.meta.url),
  ),
  '@nop-chaos/flux': fileURLToPath(
    new URL('./packages/flux-bundle/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-basic': fileURLToPath(
    new URL('./packages/flux-renderers-basic/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form/definitions': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/definitions.ts', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form/test-support': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/test-support.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form/form-renderers.css': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/form-renderers.css', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form-advanced': fileURLToPath(
    new URL('./packages/flux-renderers-form-advanced/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-data': fileURLToPath(
    new URL('./packages/flux-renderers-data/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/theme-tokens/styles.css': fileURLToPath(
    new URL('./packages/theme-tokens/src/styles.css', import.meta.url),
  ),
  '@nop-chaos/theme-tokens': fileURLToPath(
    new URL('./packages/theme-tokens/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-code-editor': fileURLToPath(
    new URL('./packages/flux-code-editor/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flux-code-editor/code-editor-styles.css': fileURLToPath(
    new URL('./packages/flux-code-editor/src/code-editor-styles.css', import.meta.url),
  ),
  '@nop-chaos/ui/styles.css': fileURLToPath(
    new URL('./packages/ui/src/styles/index.css', import.meta.url),
  ),
  '@nop-chaos/ui/base.css': fileURLToPath(
    new URL('./packages/ui/src/styles/base.css', import.meta.url),
  ),
  '@nop-chaos/ui/chart': fileURLToPath(
    new URL('./packages/ui/src/components/ui/chart.tsx', import.meta.url),
  ),
  '@nop-chaos/ui/lib/utils': fileURLToPath(
    new URL('./packages/ui/src/lib/utils.ts', import.meta.url),
  ),
  '@nop-chaos/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
  '@nop-chaos/spreadsheet-core': fileURLToPath(
    new URL('./packages/spreadsheet-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/spreadsheet-renderers/canvas-styles.css': fileURLToPath(
    new URL('./packages/spreadsheet-renderers/src/canvas-styles.css', import.meta.url),
  ),
  '@nop-chaos/spreadsheet-renderers': fileURLToPath(
    new URL('./packages/spreadsheet-renderers/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/report-designer-core': fileURLToPath(
    new URL('./packages/report-designer-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/report-designer-renderers/report-field-panel.css': fileURLToPath(
    new URL('./packages/report-designer-renderers/src/report-field-panel.css', import.meta.url),
  ),
  '@nop-chaos/report-designer-renderers': fileURLToPath(
    new URL('./packages/report-designer-renderers/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flow-designer-core': fileURLToPath(
    new URL('./packages/flow-designer-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/flow-designer-renderers/unstable': fileURLToPath(
    new URL('./packages/flow-designer-renderers/src/unstable.ts', import.meta.url),
  ),
  '@nop-chaos/flow-designer-renderers/designer-theme.css': fileURLToPath(
    new URL('./packages/flow-designer-renderers/src/designer-theme.css', import.meta.url),
  ),
  '@nop-chaos/flow-designer-renderers': fileURLToPath(
    new URL('./packages/flow-designer-renderers/src/index.tsx', import.meta.url),
  ),
  '@nop-chaos/word-editor-core': fileURLToPath(
    new URL('./packages/word-editor-core/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/word-editor-renderers': fileURLToPath(
    new URL('./packages/word-editor-renderers/src/index.ts', import.meta.url),
  ),
  '@nop-chaos/word-editor-renderers/styles.css': fileURLToPath(
    new URL('./packages/word-editor-renderers/src/styles.css', import.meta.url),
  ),
};
