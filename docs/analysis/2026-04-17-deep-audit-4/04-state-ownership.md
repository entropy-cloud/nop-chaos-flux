# 维度 04：状态所有权与单一事实来源

## 初审概览

- 初审候选：3
- 维度复核：3 条保留

## 条目复核

### [保留] Word Editor 自动保存对 `charts/codes` 存在第二事实源

- **关键文件**: `packages/word-editor-renderers/src/EditorCanvas.tsx:34-41`, `packages/word-editor-renderers/src/WordEditorPage.tsx:38-45,89-100,193-200`
- **说明**: 自动保存仍回读 `initialDocument`，会把当前会话新增元数据覆盖回旧值。

### [保留] `CrudRenderer` 自维护 `selectedRowKeys`，与 table 真实选区脱节

- **关键文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:115-145`, `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts:75-194`
- **说明**: `$crud` 和 `statusPath` 基于假的本地选区摘要，真实选区在 table owner 中。

### [保留] `PageControls` 的 margins dialog 与 editor store 页边距脱节

- **关键文件**: `packages/word-editor-renderers/src/toolbar/PageControls.tsx:40-49,88-90,148-155`, `packages/word-editor-core/src/editor-store.ts:46-50`
- **说明**: dialog 输入不从 owner 同步，确认后也不直接回写 store。
