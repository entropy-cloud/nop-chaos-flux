# 04 State Ownership

- 深挖轮次: 3
- 深挖发现数: 3
- 维度复核: 2 保留 / 1 降级 / 0 驳回
- 子项复核: 已完成 2 项高风险条目复核

## 第 1 轮初审

- `word-editor-page.tsx` 中 `savedDocument.data` 与实时 `charts/codes` 语义分叉

## 深挖第 2 轮追加

- `report-designer` 同时用 `reportDesignerCore` 与 `spreadsheetCore` 管理同一 spreadsheet 子树

## 深挖第 3 轮追加

- `word-editor` datasets 初始化时 persisted datasets 与 schema datasets 顺序覆盖同一 store

## 维度复核结论

保留:

- `report-designer` 双 owner spreadsheet 事实
- `word-editor` datasets 初始化 precedence 冲突

降级:

- `word-editor` `document` vs 实时 `charts/codes` 更像 live/saved 投影语义不够清晰

## 子项复核结论

成立:

- `report-designer` 双 owner spreadsheet 事实
- `word-editor` datasets 初始化 precedence 冲突

## 最终保留项

### [维度04] Report Designer 运行时仍存在 `spreadsheetCore` 与 `reportDesignerCore` 双 owner 管理同一 spreadsheet 事实

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-renderers/src/host-data.ts`
- **严重程度**: P1
- **现状**: page 层同时创建两个 core，同一 spreadsheet subtree 靠 `syncSpreadsheetDocument(...)` 单向同步维持
- **风险**: import/undo/redo/save/export/host projection 可能读到不同版本的 spreadsheet 状态
- **建议**: 明确单一 canonical owner，并停止通过 host scope 投影掩盖 split-brain
- **复核状态**: 子项复核通过

### [维度04] Word Editor 的 datasets 初始化仍由 persisted local data 与 schema seed 争夺同一 owner

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/word-editor-core/src/dataset-store.ts`
- **严重程度**: P1
- **现状**: 挂载时先 `loadDatasets()`，随后又无条件用 `props.props.datasets` 覆盖同一 `datasetStore`
- **风险**: 本地恢复值、schema seed、后续保存语义互相覆盖，难以判断哪个来源才是权威
- **建议**: 明确 precedence，仅允许一个初始化源作为 authoritative owner
- **复核状态**: 子项复核通过
