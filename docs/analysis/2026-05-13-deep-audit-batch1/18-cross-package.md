# 维度 18：跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] report-designer 根 marker 的 owner doc 与 live 实现漂移

- **涉及包**: `report-designer-renderers` vs report-designer owner docs
- **文件**: `docs/components/report-designer-page/design.md`; `packages/report-designer-renderers/src/page-renderer.tsx`; `packages/report-designer-renderers/src/field-panel-renderer.tsx`; `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- **严重程度**: P2
- **不一致类别**: 分层
- **包 A 模式**: owner doc 说 page root marker 是 `nop-report-designer-page`
- **包 B 模式**: live code 统一使用 `nop-report-designer`
- **统一建议**: 选定唯一 canonical root marker，并同步更新 owner docs/tests/CSS references

### [维度18-02] 跨包 renderer 注册 API 文档被描述成对称，但 live 包并不对称

- **涉及包**: `flow-designer-renderers` / `report-designer-renderers` / `spreadsheet-renderers` / `flux-code-editor`
- **文件**: `docs/references/integrating-third-party-components.md`; `docs/architecture/report-designer/design.md`; `packages/flow-designer-renderers/src/index.tsx`; `packages/report-designer-renderers/src/renderers.tsx`; `packages/spreadsheet-renderers/src/renderers.tsx`; `packages/flux-code-editor/src/index.ts`
- **严重程度**: P3
- **不一致类别**: 注册模式
- **包 A 模式**: integration guide 推导统一的 `register*Renderers(...)` 约定
- **包 B 模式**: active architecture docs 仍暗示 spreadsheet/report 存在对称 `create*Registry()` helper，而 live code 实际只有 flow-designer 提供该 helper，`flux-code-editor` 还手写注册
- **统一建议**: 选定一套 canonical public registration shape，并把 docs 和 helper surface 一起收敛

## 深挖第 2 轮追加

### [维度18-03] `report-designer-renderers` 的 package-owned CSS 装配路径与同类包不一致，导致注册路径下字段面板样式失联

- **涉及包**: `report-designer-renderers` / `spreadsheet-renderers` / `flow-designer-renderers` / `word-editor-renderers` / `flux-code-editor`
- **文件**: `docs/architecture/theme-compatibility.md`; `docs/architecture/report-designer/spreadsheet-canvas-css.md`; `packages/report-designer-renderers/src/index.ts`; `packages/report-designer-renderers/src/renderers.tsx`; `packages/report-designer-renderers/src/field-panel-renderer.tsx`; `packages/report-designer-renderers/src/report-field-panel.tsx`; `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`; `packages/spreadsheet-renderers/src/renderers.tsx`; `packages/flow-designer-renderers/src/index.tsx`; `packages/word-editor-renderers/src/index.ts`; `packages/flux-code-editor/src/index.ts`; `packages/flux-code-editor/src/code-editor-renderer.tsx`
- **严重程度**: P2
- **不一致类别**: 样式装配
- **包 A 模式**: 同类 renderer 包都会把 package-owned CSS 挂在正常消费路径上
- **包 B 模式**: `report-designer-renderers` 的根入口和 `registerReportDesignerRenderers()` 路径都不导入 `report-field-panel.css`；该 CSS 只在 standalone `ReportFieldPanel` 组件路径与测试里被手动导入
- **统一建议**: 选定唯一 canonical 规则，并先把 `report-designer-renderers` 收敛到与同类包一致的 live 装配路径

## 维度复核结论

- [维度18-01]: 降级为 P3。report-designer 根 marker 的 doc/code 漂移真实存在，但更像局部 doc/styling cleanup。
- [维度18-02]: 驳回。现有文档与 live register API 并未形成可证明的当前公共契约破坏。
- [维度18-03]: 保留 (P2)。`report-designer-renderers` package-owned CSS 装配路径与同类包不一致，导致注册消费路径下字段面板样式失联。

## 子项复核结论

- [维度18-03]: 成立 (P2)。同类 domain/widget renderer 包都在正常消费路径带上 package-owned CSS，而 `report-designer-renderers` 仍只在 standalone/test 路径显式导入字段面板样式。

## 最终保留项

| 编号  | 严重程度 | 文件                                                   | 一句话摘要                                                |
| ----- | -------- | ------------------------------------------------------ | --------------------------------------------------------- |
| 18-01 | P3       | `docs/components/report-designer-page/design.md`       | report-designer 根 marker 的 owner doc 与 live 实现仍漂移 |
| 18-03 | P2       | `packages/report-designer-renderers/src/renderers.tsx` | package-owned 字段面板 CSS 仍未接到正常注册消费路径       |
