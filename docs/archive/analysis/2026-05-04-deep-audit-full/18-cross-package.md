# 维度 18：跨包模式一致性

- 初审发现：2
- 维度复核：完成
- 子项复核：1

## 保留

1. [子项复核通过] 多个 workbench package 仍存在用户可见的 mixed-language shell/tooling text，i18n 抽取程度明显不一致。
   代表文件：`packages/word-editor-renderers/src/toolbar/page-controls.tsx:118-161,174-217`、`packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx:100-231`、`packages/flow-designer-renderers/src/designer-palette.tsx:48-49,59,129`、`packages/flux-code-editor/src/code-editor-renderer/code-editor-toolbar.tsx:87-88`、`packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:7-40`
   对照：`AGENTS.md` 中 `flux-i18n` 基线、`docs/architecture/word-editor/design.md:151-152`
   严重程度：P2

## 降级

1. [已降级] spreadsheet/report-designer host action provider 的 `listMethods()` 自省面与 flow/word 不一致，但当前影响仍主要落在 debugger/runtime introspection，而非派发正确性。

## 复核摘要

- 该维度最终只保留已经造成真实 mixed-language UI 的 i18n 一致性缺口。
