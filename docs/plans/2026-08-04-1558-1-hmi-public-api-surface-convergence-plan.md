# 1 Public API Surface & Registration Convergence

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: P2 backlog — public surface & registration
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md` `## Follow-up Backlog`（Dependency & packaging / Public API surface 分组 + 对应 doc-drift 条目），源审计 `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md`（dim 01/03/16）
> Related: `docs/plans/2026-08-04-1235-1-hmi-diff-path-convergence-plan.md`、`docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md`（均为已收口 P1 remediation 轮）、`docs/plans/2026-08-04-1558-2-hmi-lifecycle-degradation-hardening-plan.md`、`docs/plans/2026-08-04-1558-3-hmi-display-geometry-test-effectiveness-plan.md`（同批 P2 backlog 轮，absent-config 行为归属与 e2e 断言衔接）

## Purpose

把 `@nop-chaos/flux-renderers-industrial` 的公共面收口到 design 文档授权面：注册语义（显式 `registerScadaSymbols()`、移除模块加载副作用、幂等保证）、导出面收敛（仅 register 函数 + 类型）、`renderer-definitions` 静态元数据（tooling 可发现 9 handles + 5 events）、author-less schema 体验（defaultSchema 含合法 config）、构建卫生（dist 无陈旧产物）。全部为 audit 登记的非阻断 P2/P3 + 对应 doc drift，无已确认 live defect 遗留。

## Current Baseline

- `src/index.ts:2,94`：模块加载副作用 `registerBuiltinScadaSymbols()`——任何运行时 import 该包入口即拖入 leafer-ui canvas 运行时（历史已造成一次 repo-wide test break，audit dim 01）。
- `registerBuiltinScadaSymbols()`（`src/symbols/register-builtin.ts:62-65`）本身已带 `hasScadaSymbol` 守卫、幂等；`registerScadaSymbol`（`src/symbols/symbol-registry.ts:18-22`）重复注册抛错（`override: true` 可替换）。
- 消费方：playground `App.tsx:12,110` + 4 个 `scada-*.tsx` demo 页 + `flux-guide/scripts/{validate.mjs,shared.mjs}` 全部经 `registerScadaRenderers(registry)` 接入；全仓（含 e2e）无外部直呼 `registerBuiltinScadaSymbols`——符号注册目前只经 index.ts 副作用生效。包内测试直接 import `../symbols/register-builtin.js`（如 `scada-engine.test.ts:3,31`、`config-adapter.test.ts:42`）。
- `src/index.ts:5-92`：94 个导出符号（audit 口径，实核以 Phase 2 Proof 为准——复核约 93 总符号、~90 零消费者），audit 时点仅 `registerScadaRenderers`/`ScadaConfig`/`ScadaSymbolNode` 有外部消费者（dim 03）。design 授权面：`design-renderer.md` §11 目录注释（:296 "index.ts # 导出 registerScadaRenderers/registerScadaSymbol/类型"）。
- `dist/` 残留 pre-I10 陈旧产物 `scada-canvas-placeholder.d.ts/.js/.map`（实查存在）；所有包 build 脚本均不清 dist（`tsc` 不清 outDir），`package.json` build = `tsc -p tsconfig.build.json && node ../../scripts/copy-build-assets.mjs ...`，无 clean 步骤、无共享 clean-dist 脚本。
- `src/renderer-definitions.ts:14-32`：`scada-canvas` 定义缺静态元数据（`rendererClass`/`propContracts`/`eventContracts`/`componentCapabilityContracts`）；sibling 范本 `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:174-176`（`rendererClass: 'instance-renderer'`、`propContracts`）、`:268`（`eventContracts`）、`:285`（`componentCapabilityContracts`）。`design-renderer.md §5` 字段分类表已定义 config/width/height/viewport/loading/empty/events 契约。
- `src/schemas.ts:12-27`：`config: string | (ScadaConfig & SchemaObject)` 为必填；`src/renderer-definitions.ts:20` `defaultSchema: { type: 'scada-canvas' }` 无 `config`；**`defaultSchema` 在平台运行时不被合入 props**（全仓核实：仅 `scripts/check-schema-prop-coverage.mjs` 静态解析与 `flux-compiler` shape-validation 消费），故 author-less schema 永久 loading 的根因在 renderer 侧 `parseAndValidateConfig`（`scada-canvas.tsx:25-46`：缺 config 返回 `{}` → parsedConfig undefined → status 滞留 loading）——本计划以 renderer 空场景兜底修复（P3）。
- `src/serialization/serialize.ts` `serializeScadaConfig` 无 live 消费者（design-renderer.md §4.3 序列化契约表列出的函数，仅测试用，P3）。
- Doc drift：`docs/components/index.md:341-357` 已注册领域 renderer 清单缺 `scada-canvas`；`design-symbols.md:85` 幂等措辞与 impl 抛错行为张力；`design-engine.md §8.3`（~:231-238 `ScadaTestHandle` 接口面）+ `design-symbols.md:80` `ScadaTestHandle`/`SymbolCreateContext.engine` 文档显强类型、代码为 `unknown`（`test-handle.ts:10`/`symbol-types.ts:64`，循环导入约束，需 doc 注记）。
- 基线质量：包级 483 tests / 35 files 全绿、workspace typecheck/build/lint/test 全绿（plan `{3}` 收口 2026-08-04 实测）。

## Goals

- 移除 index.ts 模块加载副作用；`registerScadaRenderers()` 保证内置图元已注册（显式 `registerScadaSymbols()` 入口，幂等）。
- 导出面收敛到 design-renderer.md §11 授权面（register 函数 + 类型），零消费者内部符号不再经包入口泄漏；内部实现保持模块内可达（测试走 internal path）。
- `renderer-definitions` 静态元数据补齐（`propContracts`/`eventContracts`/`componentCapabilityContracts`（9 handles）/`rendererClass`），工具链可发现。
- author-less schema 不再永久 loading：renderer 侧缺 config 空场景兜底（最小合法空场景 → ready），defaultSchema 元数据与之一致。
- `pnpm build` 后 `dist/` 无陈旧产物。
- 相关 doc drift 同步（design-renderer.md §11/§10 无变化面、design-symbols.md、design-engine.md、docs/components/index.md）。

## Non-Goals

- 不改变 `scada-canvas` 的 fields/events/handles 运行时契约语义（本计划只补声明元数据与注册行为，不新增/删除 handle 或 event）。
- 不做空态/错误态 UI 行为（错误态 empty region、loading region 语义维持，属 plan `{2}` Phase 4；本计划仅把「缺 config 的永久 loading」修正为「空场景 ready」这一最小 renderer 行为变更）。
- 不引入新的包导出工具链/发布流程；不动其他包的 build 脚本（dist 清理仅本包）。
- 不把 `serializeScadaConfig` 改成内部私有后移除测试（函数保留，归属见 Phase 3 Decision）。

## Scope

### In Scope

- `src/index.ts` 注册副作用移除 + 导出面收敛；`src/symbols/register-builtin.ts` 显式入口。
- `src/renderer-definitions.ts` 静态元数据 + defaultSchema；`src/schemas.ts` 无改动（类型已齐）。
- `package.json` build 脚本 dist 清理。
- `design-symbols.md`/`design-engine.md`/`docs/components/index.md` 对应条目同步。

### Out Of Scope

- `serializeScadaConfig` 行为修改（仅归属裁定 + doc 注记）。
- 其他包公共面（audit 只覆盖 industrial 包）。
- 空态/错误态 UI 行为（plan `{2}`）。

## Failure Paths

| 场景                     | 触发                                             | 行为                                                                              | 可重试 | 用户可见表现               |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------- | ------ | -------------------------- |
| registration-not-applied | 消费者只调 `registerScadaRenderers` 未调符号注册 | `registerScadaRenderers` 内部幂等调用 `registerScadaSymbols()`，24 内置图元可解析 | 否     | 场景树正常构建，无白屏     |
| duplicate-registration   | 重复注册同 type（无 override）                   | `registerScadaSymbol` 抛错（既有语义，doc 措辞对齐）                              | 否     | 开发期错误（设计契约行为） |
| stale-dist-artifact      | 旧产物残留 dist                                  | build 先清 dist，产物只剩本次构建                                                 | 否     | 无                         |

## Test Strategy

本档选择：**必须自动化**。公共注册契约 + 工具链可发现性属核心回归路径（Proof 先行）：注册语义/导出面改动必须带 focused 单测；defaultSchema/元数据有既有 `renderer-definitions.test.ts` 与工具链检查（`check-renderer-definition-fields-only`/`check-schema-prop-coverage`）可复用。

## Execution Plan

### Phase 1 — 注册语义与幂等（Registration Semantics）

Status: completed
Targets: `src/index.ts`、`src/symbols/register-builtin.ts`、`src/symbols/symbol-registry.ts`、`design-symbols.md`

- Item Types: `Proof | Fix`

- [x] `Proof` — 全仓消费方审计：grep `registerScadaRenderers`/`registerBuiltinScadaSymbols`/`registerScadaSymbol`（apps/flux-guide/其他 packages/tests/e2e，排除本包 src 与 docs），固化「外部消费方全部经 registerScadaRenderers」清单；确认移除 index.ts 副作用不破坏 playground/flux-guide 接入。
- [x] `Fix` — `register-builtin.ts` 新增公开 `registerScadaSymbols(): void`（幂等包装 `registerBuiltinScadaSymbols`）；`registerScadaRenderers`（index.ts）内部先调 `registerScadaSymbols()`；移除 index.ts:94 模块加载副作用。`registerBuiltinScadaSymbols` 保留为内部实现（测试仍走 internal path）。
- [x] `Fix` — `design-symbols.md:85` 幂等措辞与 impl 对齐：写明「同 type 重复注册抛错，`override: true` 显式替换」；`design-engine.md §8.3`（~:231-238 `ScadaTestHandle` 强类型接口面）+ `design-symbols.md:80` 补 `unknown` 强类型缺失注记（循环导入约束）。
- [x] `Proof` — 回归验证：包内既有 24 图元解析测试全绿；`registerScadaRenderers` 后 `hasScadaSymbol('scada-rect')` 为 true；playground demo 页 e2e 场景树断言不回归（属 plan `{3}` Phase 2 e2e 全量兜底）。

Exit Criteria:

- [x] `src/index.ts` 无模块加载副作用调用（顶层仅 import/export/函数定义）；`registerScadaRenderers` 调用后 24 内置图元已注册（focused 单测断言 `hasScadaSymbol` 覆盖内置 type 抽样 + 全量清单）。
- [x] 外部消费方清单（Proof 产物）逐项核对：playground/flux-guide 接入不变即通过。
- [x] `design-symbols.md:85`、`design-engine.md §8.3`（~:231-238）、`design-symbols.md:80` 措辞与 live 行为一致。

### Phase 2 — 导出面收敛与构建卫生（Export Surface & Build Hygiene）

Status: completed
Targets: `src/index.ts`、`package.json`、`design-renderer.md`

- Item Types: `Proof | Fix | Decision`

- [x] `Proof` — 零消费者导出确认：对 `src/index.ts:5-92` 全部符号逐一 grep 全仓（apps/other packages/tests/e2e/flux-guide），固化「仅 register 函数 + 类型被消费」清单；保留清单内项目，其余移出导出面。
- [x] `Fix` — 收敛 index.ts 导出面：保留 `registerScadaRenderers`/`registerScadaSymbols` + 类型面（`ScadaCanvasSchema`/`ScadaCanvasEvents`/`ScadaConfig`/`ScadaSymbolNode`/`ScadaPointDeclaration`/`ScadaSymbolDefinition`/`ScadaSymbolProps` 等被消费或属 §11 授权面者）；零消费者内部类（engine/binding/symbols 内部实现）不再导出。`design-renderer.md §11` 目录注释同步实际导出面。
- [x] `Decision` — dist 清理实现方式：build 脚本前置 `rm -rf dist`（行内，POSIX shell，与现有 pnpm script 兼容）或新增共享 `scripts/clean-dist.mjs` 供后续包复用；选定一种并在本包落地。不做全仓 build 脚本批量改造（Out Of Scope）。
- [x] `Fix` — 验证 `pnpm --filter @nop-chaos/flux-renderers-industrial build` 后 `dist/` 无 `scada-canvas-placeholder.*`、无 src 删除文件残留（`ls dist` 与 src 映射核对）。

Exit Criteria:

- [x] index.ts 导出面 == Proof 清单（授权函数 + 消费类型）；`design-renderer.md §11` 目录注释一致。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial build` 产物干净（无 placeholder/stale 文件），build 通过。
- [x] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（内部类测试走 internal path 不受影响）。

### Phase 3 — 静态元数据与 author-less schema（Static Metadata & Default Schema）

Status: completed
Targets: `src/renderer-definitions.ts`、`src/serialization/serialize.ts`、`docs/components/index.md`

- Item Types: `Fix | Decision | Proof`

- [x] `Proof` — 前置 focused 测试（TDD，Proof 先行）：缺 config（undefined/null/''）渲染最小空场景、状态 ready（红 → 绿）；`renderer-definitions.test.ts:27` defaultSchema 断言随变更更新（`expect(def.defaultSchema).toEqual({ type: 'scada-canvas', config: <空场景> })` 或等价）。
- [x] `Fix` — `renderer-definitions.ts` 补齐静态元数据（范本 `basic-renderer-definitions.ts:174-176`（rendererClass/propContracts）、`:268`（eventContracts）、`:285`（componentCapabilityContracts））：`rendererClass: 'instance-renderer'`、`propContracts`（config/width/height/viewport/events）、`eventContracts`（onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError 共 5 个）、`componentCapabilityContracts`（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy 共 9 个，对齐 `use-scada-handles.ts:10-20` SCADA_HANDLE_METHODS 与 design-renderer.md §8.5 表）。**注**：补 `propContracts` 后 `hasClosedPropModel`（flux-compiler shape-validation-utils.ts:27-32）对 scada-canvas 从 open 翻转为 closed 模型——所有授权 key 已在 `fields` 声明，无实际影响，但需在验证轮确认无 shape-validation 回归。
- [x] `Fix` — author-less schema 收口（P3，M1 修正版）：`parseAndValidateConfig`（`scada-canvas.tsx:25-46`）对缺 config（undefined/null/''）返回最小合法空场景 `{ version: 1, variables: [], symbols: [] }`（`validateScadaConfig` 通过）→ 渲染空画布、状态 ready（不再永久 loading）；`renderer-definitions.ts` `defaultSchema` 同步补 `config`（最小空场景，**工具链元数据一致，平台不 merge defaultSchema 到 props**——行为修复在 renderer 侧兜底）。
- [x] `Proof` — 工具链可发现性验证：`check-renderer-definition-fields-only`（覆盖全包）对本包无新增违规（该检查在本变更前即运行、变更后复跑）；`check-schema-prop-coverage` 固定文件清单**不含** industrial 包（其结论对本包 vacuous，不采信）；`hasClosedPropModel` 翻转后 shape-validation 无回归。
- [x] `Decision` — `serializeScadaConfig` 归属：保持导出（host 侧序列化契约函数，design-renderer.md §4.3 表）+ doc 注记「design-contract 函数，运行期经 exportConfig/importConfig 句柄使用」；或收敛为内部导出。推荐前者，选后则同步 §4.3 表。
- [x] `Fix` — `docs/components/index.md:341-357` 已注册领域 renderer 清单补 `scada-canvas`（新增工业小节或并入清单）。

Exit Criteria:

- [x] `renderer-definitions.ts` 元数据齐全（rendererClass/propContracts/eventContracts/componentCapabilityContracts 对照范本与 §8.5 表逐项）；9 handles + 5 events 在定义中可枚举。
- [x] author-less schema 渲染场景：focused 单测断言缺 config 时 renderer 构建最小空场景、状态为 ready（非 loading）；`renderer-definitions.test.ts` defaultSchema 断言已随变更更新。
- [x] `docs/components/index.md` 含 `scada-canvas`；`serializeScadaConfig` 归属裁定落地（doc 或导出面体现）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×3（R1 `ses_0342a1a5effeV71Jtgd6kzE4YK`、R2 确认轮 `ses_034234e91ffemBsdZmioWmXowA`、R3 终验 `ses_03416b345ffeAKy77zKf21tHFV`）
- Verdict: `pass`（R2 起 0 Blocker/0 Major；R3 终验 0 新增）
- Rounds: 2
- Findings addressed: R1-M1（defaultSchema 平台不 merge 到 props → Phase 3 改为 renderer 空场景兜底 `parseAndValidateConfig` + Non-Goal 放宽 + defaultSchema 仅元数据一致）；R1-m1 register-builtin 行号 :62-65；R1-m2 导出计数措辞改「以 Phase 2 Proof 实核为准」；R1-m3 design-engine §8.3（~:231-238）；R1-m4 工具链验证换 `check-renderer-definition-fields-only`（check-schema-prop-coverage 不含本包）+ `renderer-definitions.test.ts:27` 同步更新；R1-m5 sibling 元数据引用拆分（:174-176/:268/:285）；R1-m6 Deferred 条目移除。R2 5 Minor 全部落地（Phase 1 引用 :231-238、Phase 3 Proof 先行重排、Related 补 1558-2/1558-3、Draft Review Record 回填、`hasClosedPropModel` 翻转注记）。R3 终验 0 新增。

## Closure Gates

> 关闭条件：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选后，才能将 `Plan Status` 改为 `completed`。

- [x] 注册语义收口：index.ts 无模块加载副作用；`registerScadaRenderers` 自足注册内置图元；外部消费方（playground/flux-guide）无感知。
- [x] 导出面收敛到 design-renderer.md §11 授权面；零消费者内部符号不再导出。
- [x] renderer-definitions 静态元数据 + author-less schema 收口（renderer 空场景兜底），工具链可发现 9 handles + 5 events。
- [x] build 产物干净（无 stale dist 文件）。
- [x] 必要 focused verification 已完成（Phase 1-3 Exit Criteria 全勾）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline（design-renderer.md §11/design-symbols.md/design-engine.md/docs/components/index.md），或明确写明 No owner-doc update required。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- 无。本 Plan 无 in-scope 项被延期；`scada-canvas-placeholder` 源文件删除为 I10 历史完成项（残留仅 build 产物，Phase 2 收口）。

## Non-Blocking Follow-ups

- 全仓 build 脚本统一 dist 清理（其他包同样存在 stale 风险）→ 治理项，非本包 closure 必需。
- `check:workspace-manifest-deps` 残留 5 条 pre-existing（form/scheduling）→ 与本计划无关，归各 owner。

## Closure

Status Note: 收口完成。Phase 1（注册语义 + 幂等）+ Phase 2（导出面收敛 + dist 清理）+ Phase 3（静态元数据 9 handles/5 events + author-less schema 空场景兜底）全部落地，workspace typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent（closure audit `ses_03369165affeuVbmcCvNb4fJ7R`）
- Evidence: 5 项 checklist（Phase 1 注册语义 / Phase 2 导出面 + 构建卫生 / Phase 3 元数据 + author-less schema / doc sync / 全量 test）全部 PASS，verdict `pass`。live 核证：index.ts 无副作用、导出面收敛到 §11 授权面、renderer-definitions 元数据齐全、parseAndValidateConfig 空场景兜底、design-symbols/engine/index.md doc 同步、industrial 489/35 + playground 141/22 全绿、dist 无 placeholder。

Follow-up:

- 无 confirmed live defect。
- `serializeScadaConfig` 保留导出（design-contract 函数，Phase 3 Decision 落地）。
- 全仓 build 脚本统一 dist 清理属治理 follow-up（Non-Blocking Follow-ups 已登记），非本 plan closure 必需。
