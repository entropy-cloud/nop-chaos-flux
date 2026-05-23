# 18 跨包模式一致性

- 初审发现数: 2
- 维度复核: 完成
- 子项复核: 0
- 最终结果: 保留 1 / 降级 1 / 驳回 0

## 保留

### [维度18] `word-editor-renderers` 与 `flow-designer-renderers` 仍混用 i18n 与硬编码运行时文案

- **涉及包**: `@nop-chaos/word-editor-renderers`, `@nop-chaos/flow-designer-renderers`
- **文件**: `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx`, `packages/word-editor-renderers/src/toolbar/page-controls.tsx`, `packages/word-editor-renderers/src/toolbar/template-controls.tsx`, `packages/word-editor-renderers/src/toolbar/search-replace.tsx`, `packages/word-editor-renderers/src/toolbar/font-controls.tsx`, `packages/word-editor-renderers/src/panels/field-list.tsx`, `packages/flow-designer-renderers/src/designer-node-appearance.ts`
- **严重程度**: P2
- **不一致类别**: 文本
- **包 A 模式**: 同包内已有大量 `t('flux.*')` 使用与词条。
- **包 B 模式**: 仍有默认 toolbar label、dialog title、placeholder、ARIA 文案直接写死英文或中文。
- **统一建议**: 优先收敛真正面向用户或辅助功能层的运行时文案；协议词/内部标识可继续保留原样。
- **误报排除**: 复核已排除 `spreadsheet-renderers` 与 `report-designer-renderers` 这类证据不足的包，只保留 runtime 级硬编码证据明确的两个包。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-design-principles.md`
- **复核状态**: 维度复核通过

## 已降级

- domain host renderer metadata/`propContracts` 仅在 flow-designer 先行落地: **已降级**
  - 复核确认 debugger/authoring tooling 已因此出现信息不对称，但当前 owner doc 仍将其定义为 pilot metadata，不宜作为当前主缺陷直接保留。
