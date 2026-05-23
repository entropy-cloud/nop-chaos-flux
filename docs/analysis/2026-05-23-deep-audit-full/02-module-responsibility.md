# 维度 02: 模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] `designer-page-shell.test.tsx` 同时承载 host status、生命周期失败、dialog submit、renderer 基础渲染四类契约，已从测试组织问题膨胀成硬门禁失败

- **文件**: `packages/flow-designer-renderers/src/designer-page-shell.test.tsx:25-279`, `packages/flow-designer-renderers/src/designer-page-shell.test.tsx:392-725`
- **证据片段**:
  ```tsx
  describe('designer-page status publication', () => {
    it('publishes designer host status through literal statusPath', async () => {
  ...
  describe('DesignerPageRenderer basic rendering', () => {
    it('passes root meta through designer-canvas and designer-palette wrappers', () => {
  ```
- **严重程度**: P2
- **现状**: 同一测试文件把 designer host status、lifecycle hook 失败、create dialog submitAction、基本 renderer marker/rendering 契约都堆在一个 `786` 行文件里，已命中 `pnpm check:oversized-code-files` 硬失败。
- **风险**: 任何 Flow Designer 壳层改动都会让 unrelated contract 断言一起抖动，定位失败原因和按 owner 维护测试都越来越困难。
- **建议**: 至少拆成 `designer-page-status.test.tsx`、`designer-page-failures.test.tsx`、`designer-page-rendering.test.tsx` 三类契约文件，保留共享 test support。
- **为什么值得现在做**: 这不是单纯“文件太长”；硬门禁已经失败，而且描述块已经明确跨越运行时 status、host failure 和渲染 DOM 契约三个 owner 面。
- **误报排除**: 命中 calibration pattern 1，但这里不是“单一 orchestrator 大文件”；测试文件已经出现两个顶层 `describe` 域，且各自覆盖不同 owner contract。
- **历史模式对应**: 对应仓库已拆分 `table-renderer.tsx`、`use-spreadsheet-interactions.ts` 的“先按职责切片，再收窄文件”模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 02；`docs/references/audit-tooling.md`；`AGENTS.md` 中“大文件应按职责拆分”。
- **复核状态**: 未复核

### [维度02-02] `page-renderer.test.tsx` 把 inspector shell、field source 初始化、status publication、selectionTarget 投影放在一个超大测试文件中，削弱了 report designer 的 owner 边界

- **文件**: `packages/report-designer-renderers/src/page-renderer.test.tsx:148-339`, `packages/report-designer-renderers/src/page-renderer.test.tsx:413-652`
- **证据片段**:
  ```tsx
  describe('ReportDesignerPageRenderer', { timeout: 15000 }, () => {
    it('prefers byProfile inspector schema over byTarget and body', async () => {
  ...
    it('reports refreshFieldSources failures through monitor in addition to notify', async () => {
  ...
    it('projects canonical selectionTarget into report designer host scope and keeps it reactive', async () => {
  ```
- **严重程度**: P2
- **现状**: `709` 行文件同时覆盖 workbench side shell、field-source async init、host statusPath 发布、selectionTarget 投影与 reactive cleanup，多条断言横跨 renderer、runtime-host、designer profile 三个语义面。
- **风险**: 报表设计器后续继续扩展 host projection 或 panel shell 时，会让 unrelated setup 和断言互相污染，增加 flaky 和 review 成本。
- **建议**: 按 `shell/layout`、`host-status-and-projection`、`field-source-init-and-failures` 三类契约拆分，保留 `renderReportDesignerPage()` 共享 helper。
- **为什么值得现在做**: 该文件也是现成硬失败，且切片边界已由现有 `it(...)` 分组自然暴露。
- **误报排除**: 不是单纯把行数当缺陷；真正的问题是同一 fixture 同时承载 UI shell 与 host projection owner 断言，职责已经混合。
- **历史模式对应**: 与仓库对 runtime/renderer 契约测试逐步按 owner 拆分的方向一致。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 02、14；`docs/architecture/report-designer/design.md`；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

### [维度02-03] `schema-compiler-shape-validation-analyze.test.ts` 把 action shape、source shape、deep region traversal、finite prop validation 全压在一个分析文件里，已形成二次膨胀

- **文件**: `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts:391-470`, `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts:572-649`
- **证据片段**:
  ```ts
  it('traverses value-or-region fields during validation', () => {
  ...
  it('preserves compile failure cause on owner-facing validation diagnostics', () => {
  ...
  it('reports renderer schemaValidator issues', () => {
  ...
  it('preserves union branch failure details in raw value-shape diagnostics', () => {
  ```
- **严重程度**: P2
- **现状**: 同一 `701` 行测试文件持续吸入 value-or-region、deep table region、schemaValidator、finite prop contract、union diagnostics 等多条 shape-validation 子系统断言。
- **风险**: 编译器 shape-validation 的回归定位会持续退化；未来新增一个子规则会要求维护者先理解整个“大杂烩”文件才能安全修改。
- **建议**: 以 `action/source-shape`、`region-traversal`、`finite-prop-and-value-shape` 为最小拆分单位，把共享 `makeCompiler()` 保留在 test utils。
- **为什么值得现在做**: 这里已经不是首轮集中测试；文件同时体现了“深区域提取”与“值形状诊断”两条 owner 线，符合二次膨胀定义。
- **误报排除**: 命中 calibration pattern 1，但已越过硬门禁且存在明确子域分层，不是可接受的大 orchestrator 测试文件。
- **历史模式对应**: 对应 `flux-compiler` 近期开启的 `schema-compiler/*` 子模块化方向。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`；`docs/skills/deep-audit-prompts.md` 维度 02；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度02-01]: 保留 (P2)。硬门禁只证明“超长”，而 live file 里的两个顶层 `describe` 域和多类 owner contract 说明它已是职责混合问题，不只是行数问题。
- [维度02-02]: 保留 (P2)。`page-renderer.test.tsx` 的测试主题跨越 shell / host projection / field-source init，拆分边界清晰，结论保留。
- [维度02-03]: 保留 (P2)。`shape-validation-analyze.test.ts` 已同时承载多条 shape-validation 子域，符合二次膨胀。

## 子项复核结论

- [维度02-01]: 子项复核通过。建议按 status/failure/rendering 切片。
- [维度02-02]: 子项复核通过。建议按 shell/projection/field-source 切片。
- [维度02-03]: 子项复核通过。建议按 action-source / region / finite-prop 切片。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                          | 一句话摘要                                                     |
| ----- | -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 02-01 | P2       | `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`           | Flow Designer page shell 测试已混合多个 owner contract         |
| 02-02 | P2       | `packages/report-designer-renderers/src/page-renderer.test.tsx`               | Report Designer page renderer 测试已混合 shell/projection/init |
| 02-03 | P2       | `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts` | Compiler shape-validation 分析测试已二次膨胀                   |
