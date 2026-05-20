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

## 深挖第 4 轮追加

### [维度16-07] flow-designer runtime-snapshot 文档把已重新公开的 `doc.nodes/edges` 仍写成 removed

- **文档路径**: `docs/architecture/flow-designer/runtime-snapshot.md:35-52`
- **代码路径**: `packages/flow-designer-renderers/src/designer-host-projection.ts:76-93`, `packages/flow-designer-renderers/src/designer-host-projection.ts:189-226`, `apps/playground/src/taskflow-designer-lib/index.ts:26-73`
- **行号范围**: doc `35-52`, code `76-93`, `189-226`, `26-73`
- **证据片段**:
  ```md
  37: - retained canonical schema-visible fields:
  39: - `doc` as a narrowed summary DTO (`id`, `kind`, `name`, `version`, `viewport`, `nodeCount`, `edgeCount`)
  47: - removed from the supported region host scope boundary:
  50: - full graph document payload under `doc`
  ```
  ```ts
  76: export const DESIGNER_HOST_PROJECTION_FIELDS: HostProjectionContract['fields'] = {
  77:   doc: {
  80:       fields: {
  86:         nodeCount: { kind: 'number' },
  87:         edgeCount: { kind: 'number' },
  88:         nodes: nodesArrayShape,
  89:         edges: edgesArrayShape,
  92:     description: 'Current graph document summary with nodes/edges for domain export',
  ```
  ```ts
  201:   const nodes = snapshot.doc.nodes.map((n) => ({
  207:   const edges = snapshot.doc.edges.map((e) => ({
  215:   return {
  216:     doc: {
  222:       nodeCount: snapshot.doc.nodes.length,
  223:       edgeCount: snapshot.doc.edges.length,
  224:       nodes,
  225:       edges,
  ```
  ```ts
  26: interface DesignerProjection {
  27:   doc: {
  32:     nodes: Array<{ id: string; type: string; position: { x: number; y: number } }>;
  33:     edges: Array<{ id: string; source: string; target: string; sourcePort?: string; taskflowEdgeKind?: string }>;
  50: function buildGraphDocFromProjection(doc: DesignerProjection['doc']): GraphDocument {
  ```
- **严重程度**: P2
- **漂移类型**: active architecture doc / host-scope projection contract drift
- **当前状态**: `runtime-snapshot.md` 的 Current Projection Matrix 仍说 schema-visible `doc` 只是窄摘要，并把 “full graph document payload under `doc`” 列为 removed；但 live `DESIGNER_HOST_PROJECTION_FIELDS` 已把 `doc.nodes` / `doc.edges` 纳入 contract，`buildDesignerHostProjection()` 也实际投影 nodes/edges，TaskFlow playground 的 namespace export/save 路径依赖这些字段重建 `GraphDocument`。
- **风险**: 后续 Flow Designer、TaskFlow、domain export 维护者会按文档误删或避免使用 `doc.nodes/edges`，直接破坏当前 graph export/save/sync 路径；也会让 host projection manifest 与 owner doc 对同一 schema-visible contract 给出相反结论。
- **建议**: 将 `runtime-snapshot.md` 的 projection matrix 改为当前 baseline：`doc` 是 bounded graph summary including `nodes` / `edges` for domain export，而不是完整 `GraphDocument`；明确仍未公开的是 node `data` 全量、edge `data` 全量、core/adapter/config internals 等 imperative 或 heavyweight payload。
- **误报排除**: 这不是要求把完整 `GraphDocument` 暴露给所有全局 schema；代码只在 region host scope 中公开受限 node/edge summaries，并没有公开 core instance 或完整 node/edge data。问题是 active doc 把这些已纳入 manifest 的 summary arrays 仍归入 removed/full payload。
- **参考文档**: `docs/architecture/flow-designer/runtime-snapshot.md:260-284`, `docs/references/maintenance-checklist.md:13-20`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度16-08] `docs/index.md` 将 compiler 边界工作路由到 archived completed plan，而不是 active architecture baseline

- **文档路径**: `docs/index.md:61-62`; `docs/archive/plans/122-compiler-package-extraction-and-boundary-plan.md:14-24`
- **代码路径**: `packages/flux-compiler/src/index.ts:1-13`; `packages/flux-runtime/src/runtime-factory.ts:25,101-108`
- **行号范围**: doc `index.md:61-62`, archived plan `14-24`, code `flux-compiler/index.ts:1-13`, `runtime-factory.ts:25,101-108`
- **证据片段**:
  ```md
  61: | Draft, execute, or audit a plan under `docs/plans/` | `docs/plans/00-plan-authoring-and-execution-guide.md` | `docs/logs/00-log-writing-guide.md` |
  62: | Work on compiler package boundaries, schema compile/validate ownership, or action precompile placement | `docs/archive/plans/122-compiler-package-extraction-and-boundary-plan.md` | `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md` |
  ```
  ```md
  14: ## Current Baseline
  16: - `packages/flux-runtime/src/runtime-factory.ts` 当前默认直接创建 `expressionCompiler` and `schemaCompiler`...
  17: - `packages/flux-runtime/src/schema-compiler.ts` 当前同时拥有 `compile(...)` 与 `validate(...)`...
  18: - `packages/flux-runtime/src/schema-compiler/` 目录已经是一个独立子系统...
  24: - ... live repo 目前仍是 “schema + runtime compile” 主入口。
  ```
  ```ts
  1: export { createSchemaCompiler, validateSchema } from './schema-compiler.js';
  2: export { compileAction, compileActions, type ActionCompilerOptions } from './action-compiler.js';
  13: export { createCompileSymbolTable, createBaseCompileSymbolTable } from './compile-symbol-table.js';
  ```
  ```ts
  25: import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
  101:   const schemaCompiler =
  102:     input.schemaCompiler ??
  103:     createSchemaCompiler({
  104:       registry: input.registry,
  ```
- **严重程度**: P2
- **漂移类型**: active routing drift / archived historical plan routed as primary current baseline
- **当前状态**: `docs/index.md` 是 authoritative docs navigation baseline，但 compiler work 的第一入口仍指向 `docs/archive/plans/122...`。
- **文档状态**: 该 archived plan 已标 `Plan Status: completed`，且其 `Current Baseline` 描述的是迁移前 `flux-runtime/src/schema-compiler.ts` 持有 compiler 的旧状态。
- **代码状态**: live code 已有独立 `@nop-chaos/flux-compiler` package，`createSchemaCompiler` / `validateSchema` / action compiler / symbol table 均从 `flux-compiler` 导出；runtime 只装配并调用该 compiler。
- **风险**: 后续 contributor 按 docs/index 路由会先读历史迁移计划，把 completed archive 的旧 baseline 当作当前 owner contract，进而误判 compiler ownership、重复迁移或把新 schema validation/action precompile 工作放回 runtime。
- **建议**: 将 `docs/index.md:62` 的 first read 改为 active owner docs，例如 `docs/architecture/schema-file-validator.md` 或 `docs/architecture/flux-runtime-module-boundaries.md`；archived Plan 122 可作为 “historical extraction context” 放到 Then read 或 references，而不是 primary route。
- **误报排除**: 这不是否定 archived plan 的历史价值；问题是 authoritative routing 把历史 completed plan 放在当前任务第一入口，且该 plan 的 Current Baseline 明显不是 live baseline。
- **参考文档**: `docs/index.md:13-23`; `docs/plans/00-plan-authoring-and-execution-guide.md:50-51`; `docs/references/maintenance-checklist.md:167-180`
- **复核状态**: 未复核

### [维度16-09] `api-data-source.md` 仍称 action-backed data-source refresh 未进入 ActionRuntimeAdapter，但 live code 已通过 runtime.dispatch 执行

- **文档路径**: `docs/architecture/api-data-source.md:281-290,308-315`
- **代码路径**: `packages/flux-runtime/src/async-data/source-registry.ts:138-145`; `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:47-63,278`; `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:81-95`
- **行号范围**: doc `281-290,308-315`, code `source-registry.ts:138-145`, `api-data-source-controller-runtime.ts:47-63,278`, `built-in-actions.ts:81-95`
- **证据片段**:
  ```md
  281: Current convergence baseline:
  283: - `ActionRuntimeAdapter` is now the unified runtime invocation boundary...
  285: - action-backed `type: 'source'` bodies already reuse that same boundary...
  286: - Architecture target: action-backed remote `data-source` producer requests should also enter the same ajax action / `ActionRuntimeAdapter` invocation boundary...
  288: Current implementation note:
  290: - live `api-data-source-controller-runtime.ts` still calls the shared request substrate (`executeApiSchema(...)` / `executeApiRequest(...)`) directly for producer refreshes.
  ```
  ```md
  308: 1. Already converged
  310: - built-in / component / namespaced actions
  311: - `reaction.actions`
  312: - action-backed remote `source` execution bodies
  313: - target-state action-backed remote `data-source` producer requests
  315: These should all reach runtime through `runtime.dispatch(...)` ... action-backed remote `data-source` refresh still needs the remaining adapter-entry cleanup...
  ```
  ```ts
  138:     const controller = isActionSource
  139:       ? createDataSourceController({
  140:           runtime: input.runtime,
  143:           action: compiled.action!,
  144:           dispatch: input.runtime.dispatch,
  145:           scope: args.scope,
  ```
  ```ts
  47: async function executeDataSourceAction(
  52:   const result = await input.dispatch(input.action, {
  53:     runtime: input.runtime,
  54:     scope,
  55:     signal,
  56:   });
  58:   if (!result.ok || result.cancelled || result.timedOut) {
  59:     throw toDispatchError(result);
  62:   return result;
  278:       const response = await executeDataSourceAction(input, requestScope, activeController.signal);
  ```
  ```ts
  81:     case 'ajax': {
  82:       const api = evaluateActionArgs(action, ctx, internals.evaluator);
  89:       invocation = {
  90:         action: 'ajax',
  91:         args: api,
  92:         targeting: action.targeting,
  93:         actionNode: action,
  94:         signal,
  ```
- **严重程度**: P2
- **漂移类型**: active architecture doc 行为状态失真 / remaining-gap 已收敛但仍写成未完成
- **当前状态**: 同一文档先把 “target-state action-backed remote data-source producer requests” 列入 Already converged，但仍保留 “still calls request substrate directly / still needs adapter-entry cleanup”。
- **文档状态**: `api-data-source.md` 继续把 data-source producer refresh 描述为没有进入 unified action adapter 的 remaining implementation gap。
- **代码状态**: runtime source registry 对 action-backed data-source 传入 `input.runtime.dispatch`；refresh 执行 `executeDataSourceAction()`，后者调用 `input.dispatch(input.action, ...)`；built-in `ajax` action 再经 action dispatcher 构造 adapter invocation。
- **风险**: data-source / action convergence 后续维护者会按文档寻找已不存在的 “direct executeApiSchema producer refresh” gap，可能重复改造或绕开现有 dispatch path；也会让 source refresh、cache identity、dependency collection 的真实边界被误读。
- **建议**: 更新 `api-data-source.md`：明确 action-backed data-source producer refresh 已进入 `runtime.dispatch(...)` / ajax action adapter path；保留 `prepareApiRequestForExecution` 仅用于 cache-key/dependency preflight 的说明；如果仍有 gap，应改写为更窄的 cache identity/dependency pre-evaluation 与 adapter execution split，而不是 “still calls request substrate directly”。
- **误报排除**: `api-data-source-controller-runtime.ts` 仍在 `204-214` 调用 `prepareApiRequestForExecution(...)`，但该路径用于 prepared request/cache key 与 dependency extraction；实际 producer response 在 `278` 通过 `executeDataSourceAction(...)` dispatch 获得，不是直接 fetch/request substrate 执行。
- **参考文档**: `docs/references/maintenance-checklist.md:95-118,281-295`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度16-10] `api-data-source.md` 声称 `mergeToScope` 非对象发布会诊断失败，但运行时静默跳过 merge

- **文档路径**: `docs/architecture/api-data-source.md:643-651`
- **代码路径**: `packages/flux-runtime/src/async-data/data-source-runtime-utils.ts:122-138`; `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:84-101`; `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:161-168`
- **行号范围**: doc `643-651`, code `122-138`, `84-101`, `161-168`
- **证据片段**:
  ```md
  643: `mergeToScope: true` rules:
  645: 1. `name` remains the authoritative identity and default publication path
  646: 2. if `resultMapping` is present, runtime applies `resultMapping` first and uses the mapped object as the published value
  647: 3. if the published value is a plain object, runtime additionally shallow-merges its top-level fields into the current lexical scope
  650: 6. collisions with reserved projection names, active `Resource` targets, or ordinary scope data in the same owning lexical scope are invalid
  651: 7. if the published value is not object-like, `mergeToScope: true` is invalid and publication fails diagnostically
  ```
  ```ts
  122:   const { scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data } = input;
  123:   if (targetPath) {
  124:     const currentValue = scope.get(targetPath);
  125:     scope.update(
  126:       targetPath,
  127:       applyMergeStrategy({
  136:   if (mergeToScope && isRecord(data)) {
  137:     scope.merge(data);
  138:   }
  ```
  ```ts
  84:     writeDataToScope({
  85:       scope: input.scope,
  86:       targetPath: input.targetPath,
  87:       mergeToScope: input.mergeToScope,
  88:       mergeStrategy: input.mergeStrategy,
  89:       mergeKey: input.mergeKey,
  90:       data: effectiveData,
  91:     });
  ```
- **严重程度**: P2
- **漂移类型**: active architecture doc / runtime behavior contract drift
- **当前状态**: 文档把 `mergeToScope: true` 的非对象发布定义为 invalid，并要求 diagnostically fail；live runtime 只在 `mergeToScope && isRecord(data)` 时执行 `scope.merge(data)`，否则静默不 merge，且仍会按 `targetPath` 正常发布数据。
- **文档状态**: 当前架构文档承诺了错误语义与诊断语义。
- **代码状态**: action-backed 与 formula-backed data-source 都调用同一个 `writeDataToScope()`，该 helper 对非对象 `mergeToScope` 没有 throw、没有 `reportRuntimeHostIssue(...)`、没有 `env.notify(...)`，也没有 collision/reserved-name 诊断。
- **风险**: schema 作者和后续维护者会以为错误配置会被显式拦截，但实际会得到“命名路径已更新、current scope 未 merge、无任何错误”的半成功状态，调试时难以判断是结果形状错误还是依赖/刷新未触发。
- **建议**: 二选一收敛：若文档语义正确，在 `writeDataToScope()` 或调用层对 `mergeToScope && !isRecord(data)` 以及同 scope collision 发出结构化 host diagnostic，并按约定失败；若代码语义才是当前支持面，则把文档改为“非对象值只跳过 shallow merge，不视为发布失败”，并移除 invalid/fails diagnostically 表述。
- **误报排除**: 这不是只缺少测试的推测；当前唯一 merge 分支由 `isRecord(data)` 守卫，非对象路径没有其他错误分支。`formula-data-source-controller` 的 publish failure catch 只能捕获 thrown error，但 `writeDataToScope()` 在非对象 merge 时不会抛错。
- **参考文档**: `docs/references/maintenance-checklist.md:13-20`, `docs/references/maintenance-checklist.md:281-295`
- **复核状态**: 未复核
