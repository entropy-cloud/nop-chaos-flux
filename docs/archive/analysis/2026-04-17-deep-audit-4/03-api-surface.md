# 维度 03：API 表面积与契约一致性

## 初审概览

- 初审候选：3
- 维度复核：3 条保留

## 条目复核

### [保留] `report-designer-renderers` 根 barrel 泄露 toolbar/host wiring helper

- **关键文件**: `packages/report-designer-renderers/src/index.ts`, `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts`, `packages/report-designer-renderers/src/host-data.ts`
- **说明**: 根入口把明显偏内部接线的 helper 暴露成公共 API。

### [保留] `word-editor-renderers` 根 barrel 暴露页面内部组合件

- **关键文件**: `packages/word-editor-renderers/src/index.ts:11`, `packages/word-editor-renderers/src/WordEditorPage.tsx:18`, `packages/word-editor-renderers/package.json:9`
- **说明**: 包只导出根入口，等于把内部组合件整体升级为正式公共面。

### [保留] `PageStoreApi` 活跃文档仍提到 dialogs

- **关键文件**: `docs/architecture/flux-core.md:211`, `packages/flux-core/src/types/runtime.ts:201`, `docs/references/terminology.md:195`
- **说明**: live type 已不包含 dialogs，相关 owner 已转到 surface runtime。
