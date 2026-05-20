# 维度 16: 文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] AGENTS 的 Report Designer 路由把 future draft 当作常规工作入口

- **文档路径**: `AGENTS.md:67-79`; `docs/architecture/report-designer/README.md:48-53`; `docs/architecture/report-designer/contracts.md:1-13`
- **代码路径（如有）**: 无
- **行号范围**: `AGENTS.md:67-79`, `report-designer/README.md:48-53`, `report-designer/contracts.md:1-13`
- **证据片段**:
  ```md
  AGENTS.md:72: | Work on Flow Designer canvas... |
  AGENTS.md:73: | Work on Report Designer or Spreadsheet Editor | `docs/architecture/report-designer/design.md` | `docs/architecture/report-designer/contracts.md` |
  ```
  ```md
  README.md:50: - `design.md` - overall architecture...
  README.md:51: - `contracts.md` - future contract draft for package/interface shaping, not a live renderer-contract mirror
  README.md:53: - `api.md` - future package/API contract reference...
  contracts.md:3: > Status: future contract draft
  contracts.md:7: 它不是当前代码镜像，而是 future contract draft。
  ```
- **严重程度**: P2
- **漂移类型**: AGENTS routing drift / draft doc routed as active baseline
- **文档描述**: AGENTS 的常用任务路由要求处理 Report Designer 或 Spreadsheet Editor 时先读 `design.md`，再读 `contracts.md`。
- **代码现状**: 无直接代码路径；当前文档体系中 `contracts.md` 明确是 future contract draft，不是 live renderer-contract mirror。
- **建议**: 将 AGENTS 的第二跳改为 `docs/architecture/report-designer/README.md`、`config-schema.md`、`inspector-design.md` 或相关 component owner docs；保留 `contracts.md` 仅作 future/reference 条件入口。
- **为什么值得现在做**: AGENTS 是 agent 高频入口；把 future draft 放在常规执行路径会让后续代码改动按非当前契约实现，制造 active docs 与 live code 的二次漂移。
- **误报排除**: 这不是依据 future doc 要求 live code 合规；相反，是 active AGENTS 路由把 future doc 提升为常规工作入口，命中 calibration pattern 7 的反向风险。
- **历史模式对应**: Calibration Pattern 7（Draft Docs Used As If They Were Current Contracts）；本例保留的原因是 active routing 本身制造了 draft/current 混淆。
- **参考文档**: `docs/index.md:13-23`, `docs/references/deep-audit-calibration-patterns.md:93-99`
- **复核状态**: 未复核

### [维度16-02] Plan 419 的 Current Baseline 已被 live schema validation 代码反超

- **文档路径**: `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md:12-18`
- **代码路径**: `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:68-94`, `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:339-347`, `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:205-224`
- **行号范围**: plan `12-18`, code `68-94`, `339-347`, `205-224`
- **证据片段**:
  ```md
  14: - lifecycle actions 会 compile/run，但不经过等价 shape validation。
  15: - `RendererPropContract.required` 公开为 authoring contract，却没有缺失字段校验。
  16: - `reaction` 仅校验 `actions`，不校验 `watch` 与 control fields。
  17: - built-in `ajax` action contract 声明 `args: ApiSchema`，但 validation 仍按 generic action object 处理。
  ```
  ```ts
  80:   for (const [key, contract] of Object.entries(propContracts)) {
  81:     if (!contract.required || schema[key] !== undefined) {
  85:     emitSchemaDiagnostic(
  90:         message: `Missing required property "${key}" for renderer type "${renderer.type}".`,
  ```
  ```ts
  339:   if (schema.type === 'reaction') {
  340:     validateReactionShape(schema, pointer, diagnostics, enabled, hostContext);
  343:   for (const lifecycleKey of ['onMount', 'onUnmount'] as const) {
  346:       validateActionShape(lifecycleValue, appendJsonPointer(pointer, lifecycleKey), diagnostics, enabled, hostContext);
  ```
  ```ts
  205:   if (value.action === 'ajax') {
  217:       validateApiSchemaShape(
  218:         value.args,
  222:         'invalid-action-shape',
  ```
- **严重程度**: P2
- **漂移类型**: 计划状态/Current Baseline 失真
- **文档描述**: Plan 419 仍把 lifecycle action shape validation、required prop validation、reaction watch/control validation、ajax args ApiSchema validation 作为未修复 baseline。
- **代码现状**: live compiler validation 已包含 required prop diagnostic、reaction shape validation、lifecycle action validation，以及 ajax action args 的 ApiSchema shape validation。
- **建议**: 重新审计 Plan 419：若 focused proof/docs/closure gates 仍未完成，应把 Current Baseline 改为“code paths landed, closure/proof/doc sync pending”；若全项已完成，则按 plan guide 做独立 closure audit 后更新状态。
- **为什么值得现在做**: active plan 是执行队列来源；错误 baseline 会导致后续 agent 重复实现已落地代码，或误判 schema validation 仍缺主路径。
- **误报排除**: 本发现不声称 Plan 419 可以直接 completed；只指出 Current Baseline 与 live code 明显不一致，closure proof 是否完成需另行复核。
- **历史模式对应**: Plan authoring guide 的“接口/方法名已出现不等于语义完成”反例；这里需要诚实区分 code landed 与 closure pending，而不是保留已失真的缺口描述。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md:30-51`, `docs/references/maintenance-checklist.md:60-76`
- **复核状态**: 未复核

### [维度16-03] form-validation 的 Implementation Phases 仍把已落地 child submit contracts 写成 future

- **文档路径**: `docs/architecture/form-validation.md:1116-1145`
- **代码路径**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:250-286`
- **行号范围**: doc `1116-1145`, code `250-286`
- **证据片段**:
  ```md
  1133: ### Phase 3 — In Progress
  1135: 1. common validation scope runtime beneath form
  1136: 2. non-form validation scopes...
  1140: ### Phase 4 — Future
  1144: 3. richer child-scope gating contracts (`summary-gate`, `recurse-submit` fully functional)
  ```
  ```ts
  258:     for (const contract of childContractsSnapshot) {
  259:       if (contract.mode === 'recurse-submit') {
  260:         childValidationPromises.push(awaitWithAbort(contract.triggerValidation(), options?.signal));
  261:       } else if (contract.mode === 'summary-gate') {
  262:         const childState = contract.getState();
  263:         if (!childState.ready || childState.validating || !childState.valid) {
  264:           summaryGateBlockers.push(contract.childOwnerId);
  ```
- **严重程度**: P2
- **漂移类型**: 行为落地状态过时 / active architecture doc 保留 phase-history
- **文档描述**: `form-validation.md` 的 Implementation Phases 仍把 `summary-gate` / `recurse-submit` fully functional 放入 Phase 4 Future。
- **代码现状**: `executeFormSubmit` 当前已经 snapshot active child contracts，并对 `recurse-submit` 触发 child validation，对 `summary-gate` 检查 ready/validating/valid 阻塞提交。
- **建议**: 删除或重写 Implementation Phases 为当前 baseline；将 child-contract 当前支持面写入 live baseline，并把真正未落地的 lifecycle-aware waiting / broader families 单独标为 out-of-scope 或 future note。
- **为什么值得现在做**: 表单验证是本轮重点；active architecture doc 同时描述 current live baseline 和 phase future，会误导后续 validation owner 改动的范围判断。
- **误报排除**: 文档前文 `1053-1081` 已部分承认当前 child-contract enforcement，因此这不是要求 future 功能落地，而是同一 active doc 尾部状态段过时。
- **历史模式对应**: Calibration Pattern 5 在 v1 override 下不能用“仍在 phase 中”豁免主路径；plan guide 也要求 architecture docs 只描述当前最新设计状态。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md:43-50`, `docs/architecture/form-validation.md:1053-1081`
- **复核状态**: 未复核

### [维度16-04] styling-system 的 shadcn 集成图仍把 schema compilation 归到 flux-runtime

- **文档路径**: `docs/architecture/styling-system.md:50-55`
- **代码路径**: `packages/flux-runtime/src/runtime-factory.ts:25-108`; `packages/flux-compiler/src/index.ts:1-2`
- **行号范围**: doc `50-55`, code `25-108`, `1-2`
- **证据片段**:
  ```md
  50: ┌─────────────────────────────────────────────────────────────┐
  51: │ flux-runtime (stateless) │
  52: │ - Compile schema → props │
  53: │ - Resolve expressions │
  54: │ - Map schema props to component props │
  55: └─────────────────────────┬───────────────────────────────────┘
  ```
  ```ts
  25: import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
  101:   const schemaCompiler =
  102:     input.schemaCompiler ??
  103:     createSchemaCompiler({
  104:       registry: input.registry,
  ```
  ```ts
  1: export { createSchemaCompiler, validateSchema } from './schema-compiler.js';
  2: export { compileAction, compileActions, type ActionCompilerOptions } from './action-compiler.js';
  ```
- **严重程度**: P2
- **漂移类型**: owner漂移 / 包边界描述过时
- **文档描述**: styling-system 的架构图把 “Compile schema → props” 放在 `flux-runtime` 层，并称该层 stateless。
- **代码现状**: schema compiler 的实现与公开导出在 `@nop-chaos/flux-compiler`；`flux-runtime` 只在 runtime assembly 中注入或创建 compiler，并作为 `RendererRuntime.compile()` 的组合入口。
- **建议**: 将图改为 `flux-compiler` 负责 schema classification/compilation，`flux-runtime` 负责 runtime value resolution / node prop-meta resolution，`flux-react/renderers` 负责 React component prop handoff。
- **为什么值得现在做**: styling-system 是 renderer/styling 任务入口；错误包边界会让后续样式或 semantic prop 改动误放到 runtime，而不是 compiler field classification 或 renderer handoff。
- **误报排除**: `RendererRuntime` 暴露 `compile()` 不代表 compilation owner 属于 runtime；`flux-runtime-module-boundaries.md` 也将 schema-shape normalization 和 field classification 放在 `flux-compiler`。
- **历史模式对应**: Public renderer/runtime boundary drift；不是单纯图示措辞问题，因为它直接描述 package ownership。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:65-109`, `docs/references/maintenance-checklist.md:60-76`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度16-05] flow-designer tree-mode 的 Implementation Phases 未同步已落地的 tree contract

- **文档路径**: `docs/architecture/flow-designer/tree-mode.md:456-480`
- **代码路径**: `packages/flow-designer-core/src/types.ts:336-388`, `packages/flow-designer-core/src/index.ts:7-10`, `packages/flow-designer-renderers/src/schemas.ts:14-17`, `packages/flow-designer-renderers/src/designer-tree-mode.tsx:17-59`
- **行号范围**: doc `456-480`, code `types.ts:336-388`, `index.ts:7-10`, `schemas.ts:14-17`, `designer-tree-mode.tsx:17-59`
- **证据片段**:
  ```md
  456: ## Implementation Phases
  458: ### Phase 1: TreeDocument 类型 + TreeProjection
  460: - 定义 `TreeDocument`、`TreeNode`、`TreeNodeBranch` 类型
  461: - 实现 `tree-projection.ts`：tree → flat nodes + edges
  464: ### Phase 2: Tree-mode command surface
  470: ### Phase 3: designer-page 支持 tree 模式
  476: ### Phase 4: Domain adapters
  ```
  ```ts
  336: export interface TreeDocument {
  345: export interface TreeNode {
  353: export interface TreeNodeBranch {
  384: export interface TreeDomainAdapter {
  386:   importToTree(external: Record<string, unknown>): TreeDocument;
  387:   exportFromTree(tree: TreeDocument): Record<string, unknown>;
  ```
  ```ts
  // packages/flow-designer-renderers/src/schemas.ts
  14:   config: DesignerConfig;
  15:   document?: GraphDocument;
  16:   treeDocument?: TreeDocument;
  17:   statusPath?: string;
  ```
  ```ts
  17: export function TreeModeLayoutWrapper(
  21:   const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  41:       core.replaceDocument(computeTreeModeDocument(inputTreeDocument, config), inputTreeDocument);
  50:     <DesignerPageInner
  54:       treeDocument={effectiveTreeDocument}
  55:       setTreeDocument={(next) => {
  ```
- **严重程度**: P2
- **漂移类型**: active architecture doc phase 状态失真 / current-vs-target 混写
- **文档描述**: `tree-mode.md` 尾部仍以未标状态的 Phase 1-4 描述 TreeDocument、TreeProjection、designer-page treeDocument 支持、domain adapters，读者无法区分哪些是当前契约、哪些仍是待办。
- **代码现状**: live code 已公开 `TreeDocument` / `TreeNode` / `TreeNodeBranch` / `TreeDomainAdapter`，导出 `projectTree` 与 tree domain adapter registry；`DesignerPageSchema` 已接受 `treeDocument`，`TreeModeLayoutWrapper` 已把 treeDocument 投影并接入 `DesignerPageInner` / core tree owner。真正未落地的是具体 DingTalk FlowLong 双向 adapter 和 Action flow lowering，而不是 Phase 1/3 的基础 contract。
- **风险**: Flow Designer / TaskFlow 后续开发会把已成为主路径的 tree-mode contract 当作“待实现建议”，重复实现或绕开现有 schema/core/renderer 接线；同时也可能反向误以为 Phase 4 的具体 domain lowering 已全部可用，造成 TaskFlow 保存闭环判断失真。
- **建议**: 将 `Implementation Phases` 改写为 current baseline + remaining gaps：明确 TreeDocument/TreeProjection、designer-page `treeDocument`、core tree owner、generic adapter registry 已落地；单独列出 DingTalk FlowLong adapter、ActionSchema lowering、TaskFlow-specific save/export surface 等仍未落地项。
- **为什么值得现在做**: `docs/index.md` 和 AGENTS 均把 Flow Designer 工作路由到 `flow-designer/tree-mode.md`；该文档直接影响 TaskFlow、DingTalk flow、Action flow 这类新 domain 的实现入口。
- **误报排除**: 这不是用 future doc 要求代码补齐全部 Phase 4；相反，是 active owner doc 没有同步 live code 已经落地的 Phase 1/3 与 generic adapter registry，并把剩余具体 domain lowering 与已落地主路径混在同一个 phase 列表里。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md:43-50`, `docs/references/maintenance-checklist.md:13-20`, `docs/architecture/taskflow-visual-designer.md:42-49`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度16-06] performance-diagnostics 文档仍否认已落地的 supported locality gates

- **文档路径**: `docs/architecture/performance-diagnostics-and-e2e-design.md:106-118`
- **代码路径**: `tests/e2e/performance-table.spec.ts:349-378`
- **行号范围**: doc `106-118`, test `349-378`
- **证据片段**:
  ```md
  106: `tests/e2e/performance-table.spec.ts` 当前已覆盖：
  113: - supported table single-row locality diagnostics gate
  114: - supported array item visible locality diagnostics gate
  116: `tests/e2e/exploratory/performance-table-deep-state.spec.ts` 仍额外检查...
  118: These tests are correctness and stability tests with diagnostic value. They are not yet local-refresh performance gates.
  ```
  ```ts
  349:   test('records a supported table single-row locality diagnostic session', async ({ page }) => {
  357:     await page.getByRole('button', { name: 'Run Single Row Locality Diagnostic' }).click();
  372:     expect(session.id).toBeTruthy();
  373:     expect(session.changedRowKeys).toEqual(['user-25']);
  374:     expect(session.targetProbeDelta?.render).toBeGreaterThan(0);
  375:     expect(session.siblingProbeDelta?.render).toBe(0);
  378:     expect(session.unchangedRowUnmountDelta).toBe(0);
  ```
- **严重程度**: P2
- **漂移类型**: active architecture doc 行为状态失真 / 已落地测试门禁被旧描述否认
- **当前状态**: 同一文档先列出 `performance-table.spec.ts` 已包含 supported table/array locality diagnostics gates，但紧接着仍说这些测试 “not yet local-refresh performance gates”。live supported E2E 已断言 changed keys、target/sibling probe delta、unmount delta 与 debugger error/failure 为零。
- **风险**: 后续性能/表格/array 局部刷新改动会误以为 supported E2E 只具备诊断价值而非回归门禁，可能绕开或弱化已落地的 count-based locality gate；也会让 Plan 414 的 closure baseline 与当前 owner doc 互相冲突。
- **建议**: 将 line 118 改为区分“已支持的 count-based local-refresh regression gates”与“仍不支持 absolute timing benchmark”；明确 exploratory spec 只是 deep-state 补充，不是 locality truth source。
- **误报排除**: 这不是要求把 React Profiler 耗时变成 hard threshold；文档 line 30 已正确说明 E2E 可做 count-based locality diagnostics/regression gates、不能做绝对耗时 benchmark。问题仅在 line 118 继续否认已进入 supported spec 的 local-refresh locality gate。
- **参考文档**: `docs/plans/414-playground-performance-diagnostics-e2e-plan.md:195-210`, `docs/references/maintenance-checklist.md:13-20`
- **复核状态**: 未复核
