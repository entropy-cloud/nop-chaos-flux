# 维度 18：跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] `report-designer-page` 顶层配置字段仍用 `designer`，而同类 workbench root renderer 已统一使用 `config`

- **文件**: `packages/report-designer-renderers/src/types.ts`, `packages/flow-designer-renderers/src/index.tsx`, `packages/spreadsheet-renderers/src/types.ts`, `packages/word-editor-renderers/src/types.ts`
- **证据片段**:
  ```ts
  document: ReportTemplateDocument;
  designer: ReportDesignerConfig;
  ```
  ```ts
  config: { ... required: true }
  // spreadsheet-page: config?: SpreadsheetConfig;
  // word-editor-page: config?: WordEditorConfig;
  ```
- **严重程度**: P2
- **现状**: 四个同属 domain-host/workbench-shell family 的页面级 renderer 中，只有 report designer 继续把主配置面命名为 `designer`。
- **风险**: 通用 schema tooling、renderer docs、family-level authoring 心智与 host-page generator 难以抽象复用；“页面配置”与“designer runtime snapshot” vocabulary 容易混淆。
- **建议**: 收敛为统一 `config` surface；若 report designer 确有独立语义必须保留 `designer`，则应在 family 文档中明确解释该例外，并把运行期 `designer` projection 与 schema 输入 `designer` 做清晰区分。
- **误报排除**: 不是把无关组件做字面强行统一；这里比较的是同类 page-level host renderers。
- **复核状态**: 未复核

## 维度复核结论

- [维度18-01]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                              | 一句话摘要                                                                               |
| ----- | -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 18-01 | P2       | `packages/report-designer-renderers/src/types.ts` | `report-designer-page` 仍以 `designer` 承载顶层配置，而同类页面 renderer 已使用 `config` |
