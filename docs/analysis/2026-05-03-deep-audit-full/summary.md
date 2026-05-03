# 深度审核汇总报告

## 审核范围

- 执行的维度：01-18
- 覆盖的主要包：`packages/*` 与 `apps/playground`
- 审核日期：2026-05-03
- 执行方式：18 个初审子 agent + 18 个维度复核子 agent + 4 个子项复核子 agent（维度 04 一项、维度 08 三项）

## 复核统计

- 初审发现总数：74
- 已独立复核条目数：74
- 维度级复核完成数：18
- 子项逐条复核数：4
- 批量复核覆盖条目数：0
- 纳入本汇总的已复核结论数：14
- 保留：10
- 降级：4
- 驳回或未纳入汇总：其余条目

## P0 清单（按文件分组）

- 无

## P1 清单（按文件分组）

- 无

## 已纳入汇总的结论

### `packages/flux-runtime/src/form-runtime-field-ops.ts`

- 维度 08：runtime field registration 缺少 path containment 校验，foreign path 可污染当前 owner 的参与集。

### `packages/flux-runtime/src/form-runtime-validation.ts`

- 维度 08：普通 validation 缺少 bootstrapping 生命周期门控。
- 维度 08：debounce 已调度但未启动时未计入 owner `validating/ready` 语义。

### `packages/flux-runtime/src/form-runtime-submit-flow.ts`

- 维度 08：submit 缺少 bootstrapping 生命周期门控。

### `packages/word-editor-renderers/src/toolbar/page-controls.tsx`

- 维度 04：页边距编辑使用脱离 owner 的本地 draft，打开时不 hydrate，提交后不回写 owner。

### `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts`

- 维度 02：测试文件超过 700 行且混装多个独立 contract 主题，应按主题拆分。

### `packages/flow-designer-renderers/src/index.tsx`

- 维度 02：root barrel 公开 `DesignerXyflow*` 符号，扩大实现细节可依赖面。

### `packages/flux-renderers-form/package.json`

- 维度 01：测试源码依赖 `@nop-chaos/flux-compiler` 但 manifest 未声明。

### `packages/flux-renderers-data/package.json`

- 维度 01：同类测试依赖声明缺口再次出现。

### `packages/flux-renderers-data/src/crud-renderer-state.ts`

- 维度 07：CRUD `statusPath` 发布 effect 缺少卸载 cleanup。

### `packages/flux-renderers-data/src/tree-renderer.tsx`

- 维度 07：Tree `statusPath` 发布 effect 缺少卸载 cleanup。

### `packages/flow-designer-renderers/src/designer-page.tsx`

- 维度 07：Flow Designer host `statusPath` 发布 effect 缺少卸载 cleanup。

### `packages/spreadsheet-renderers/src/page-renderer.tsx`

- 维度 07：Spreadsheet host `statusPath` 发布 effect 缺少卸载 cleanup。

### `packages/report-designer-renderers/src/page-renderer.tsx`

- 维度 07：Report Designer host `statusPath` 发布 effect 缺少卸载 cleanup。

### `packages/word-editor-renderers/src/word-editor-page.tsx`

- 维度 07：Word Editor host `statusPath` 发布 effect 缺少卸载 cleanup。

## 高频问题文件

- `packages/word-editor-renderers/src/word-editor-page.tsx`
  维度 07 已纳入 summary；维度 04/06/09/18 另有已复核但未完成子项复核的线索。
- `packages/report-designer-renderers/src/page-renderer.tsx`
  维度 07 已纳入 summary；维度 05/06/09/18 还有待子项复核的线索。

## 跨维度模式

- Host/workbench renderer 的 `statusPath` publication 仍以各包本地 effect 为主，cleanup 与依赖粒度不一致。
- Validation owner lifecycle 基线已成文，但 runtime 入口门控与 pending semantics 仍未完全收口。
- 多个低风险 facade / duplicated export / duplicated helper 问题说明收口工作主要剩在公共面整洁性，而非主架构崩坏。

## 已自动化的检查项

- `pnpm check:oversized-code-files` 已覆盖 `>500`/`>700` 行阈值。
- ESLint `max-lines` 已作为第二道大文件防线。
- 核心包（如 `flux-runtime`、`flux-react`、`flux-compiler`）已启用 coverage thresholds。

## 建议新增的自动化检查

- 检查测试源码导入的 workspace 包是否已在对应 `package.json` 声明。
- 检查 `statusPath` publication effect 是否包含 cleanup。
- 为 validation owner lifecycle 增加 bootstrapping / pending debounce contract tests。
- 增加对非法 `ValidationError.rule` 字面量的静态检查。

## 可暂缓项

- `flux-runtime`/`flux-react`/`flux-action-core` 的低风险 facade 重复入口。
- flow-designer root barrel 的实现细节导出收窄。
- playground 与 domain host 的若干 UI / i18n / styling 一致性收尾。

## 误报排除清单

- `apps/playground/src/flow-designer/flow-designer-canvas.tsx` 的 O(E×N) 边渲染问题不在当前 live canvas 路径，不纳入红线结论。
- `word-editor` 中 `document` 与 live `charts/codes` 属于 persisted snapshot 与实时 state 的不同语义面，不计为双 owner。
- `flux-react` 的 `RendererDefinition` augmentation 与当前文档一致，不计为 API 漂移。
