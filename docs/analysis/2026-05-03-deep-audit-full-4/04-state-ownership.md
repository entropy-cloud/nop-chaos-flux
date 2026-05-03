# 维度04 状态所有权与单一事实来源

- 初审发现数: 2
- 复核结果: 保留 0 / 降级 2 / 驳回 0

### [维度04] Report Designer 的 spreadsheet document 形成双事实源

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:105-126,166-168`, `packages/report-designer-core/src/core.ts:335-356`, `packages/report-designer-core/src/core-dispatch.ts:200-205,268-275,324-326`
- **证据片段**:

```ts
const spreadsheetCore = createSpreadsheetCore({ document: resolvedDocument.spreadsheet });
const core = createReportDesignerCore({ document: resolvedDocument, ... });
useEffect(() => {
  core.syncSpreadsheetDocument(spreadsheetSnapshot.document);
}, [core, spreadsheetSnapshot.document]);
```

- **严重程度**: P2
- **现状**: `spreadsheetCore` 和 `reportDesignerCore.document.spreadsheet` 同时持有 workbook，靠 React effect 回填。
- **风险**: 保存/导出/预览可能读到落后的 spreadsheet；undo/redo 与 dirty/history 语义分裂。
- **建议**: 让 workbook 只由一个 owner 维护，另一侧改为只读派生或显式查询。
- **为什么值得现在做**: 当前已经需要 `host-data.ts` 再做一次手工 merge，说明双源问题已在渲染层外溢。
- **误报排除**: 这不是合理派生缓存；它被直接用于 save/export/preview 真值路径。
- **历史模式对应**: effect 缝合双 store。
- **参考文档**: `docs/architecture/report-designer/design.md`, `docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: `已降级`

### [维度04] Report Designer 的 selection/inspector target 存在重叠状态

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:81-135`, `packages/report-designer-core/src/core.ts:235-250`
- **证据片段**:

```ts
useEffect(() => {
  void core.setSelectionTarget({ kind: 'cell', ... });
}, [core, sheetId, ssSnapshot.selection]);
```

- **严重程度**: P3
- **现状**: spreadsheet selection 被镜像为 report-designer 的 `selectionTarget`。
- **风险**: inspector target 与画布选区可能暂时不一致；但它更偏语义映射而非完全同一事实双 owner。
- **建议**: 明确哪个是 canonical selection，另一个改为语义派生层。
- **为什么值得现在做**: 已经出现 selection 与 inspector 概念边界不清的迹象。
- **误报排除**: `selectionTarget` 支持 workbook/cell/column 等更高层语义，不等同于原始 grid selection。
- **历史模式对应**: UI target 镜像。
- **参考文档**: `docs/architecture/report-designer/design.md`
- **复核状态**: `已降级`
