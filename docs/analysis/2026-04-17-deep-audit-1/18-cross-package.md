# 维度18：跨包模式一致性

- 审核日期：2026-04-17
- 初审发现：3
- 维度复核结论：保留 3，补充 1

## 已通过独立复核

### [维度18-01] `flux-code-editor` 缺少统一的包级 renderer 注册面

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flux-code-editor/src/index.ts`, `code-editor-renderer.tsx`, `apps/playground/src/pages/CodeEditorPage.tsx`

### [维度18-02] `code-editor` 字段绑定绕过共享 `useFormFieldController`

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `docs/references/integrating-third-party-components.md`

### [维度18-03] `code-editor` / `word-editor` 已部分接入 i18n，但仍残留多处英文硬编码

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-code-editor/src/variable-panel.tsx`, `sql-result-panel.tsx`, `code-editor-renderer/CodeEditorToolbar.tsx`, `packages/word-editor-renderers/src/toolbar/SearchReplace.tsx`, `PageControls.tsx`, `InsertControls.tsx`, `dialogs/ChartDialog.tsx`, `dialogs/CodeDialog.tsx`, `word-editor-action-provider.ts`, `packages/flux-i18n/src/locales/en-US.ts`, `zh-CN.ts`

### [维度18-04] `code-editor` 的 `label` 契约未与共享字段模式对齐

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/components/code-editor/design.md`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`
