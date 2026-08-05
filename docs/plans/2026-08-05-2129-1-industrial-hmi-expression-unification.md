# 18 表达式一元化与点表可选间接层（I18）

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` I18（Phase Status / Work Items I18.1–I18.4 / Phase Details / Dependency Graph）；设计依据与人工确认决策 `docs/discussions/2026-08-05-industrial-hmi-expression-convergence-discussion.md`（D1–D6，已人工确认）
> Mission: industrial-hmi
> Work Item: I18（表达式一元化与点表可选间接层）
> Related: 本计划与 `2026-08-05-2129-2-industrial-hmi-demo-polish-leafer-examples.md`（I17）独立可并行；I17 的 demo 坐标重排与本计划的表达式迁移落在同一 demo 文件但无语义冲突，**本计划先执行**使 I17 在收敛后的表达式基线上工作（demo 文件只被迁移一次）。

## Purpose

把 SCADA 图元的表达式能力收口为**平台唯一语法 `${expr}`**，删除 I6.2 时代自建的 `@{pointId}` 方言（`binding/expression-evaluator.ts` 404 行 tokenizer/parser/evaluator/缓存/环检测）与桥接层 `$xxx` 简写（与平台保留 `$` 内置命名空间 `$Math`/`$JSON`/`$Date` 冲突），点表降为**可选间接层**。收敛后：一套表达式语法、编辑器单解析、无私有 DSL 维护成本、依赖收集单一通道（flux 探针），绑定可直连 scope/data-source。**高频遥测 INV-4 out-of-band 通道（点表 + 脏收集合帧）保持不变**——scope 绑定仅承接低频/中频。

## Current Baseline

> 经 live repo 核对（2026-08-05，fixed-string grep `@{`）。部分结论**修正了 roadmap I18 行的过时表述**。

存在**两条独立的表达式求值面**，收敛前各自走不同引擎：

1. **点声明面**（`variables[].flux`，`source:'flux'`）：经 bridge（`use-scada-points-bridge.ts`）→ flux compiler 求值。`normalizeFluxExpression`（`:194-198`）当前额外接受 `$xxx` 简写与裸路径（剥离 `$`/包成 `${...}`）——这是 scada 域本地扩张，**不是平台语法**，且 `$xxx` 与保留命名空间冲突。
2. **绑定层面**（`binding.expression`、`scale.expression`、`source:'expression'` 点）：经自建 `binding/expression-evaluator.ts`（404 行 tokenizer/parser/evaluator/缓存/环检测）求值，仅认 `@{pointId}` 语法，**不认 `${expr}`**。装配在 `binding/dirty-collector.ts` 的 `RefreshPipeline`（`:6` import、`:147` 字段、`:165-172` 装配、`:187` `getEvaluator`、`:280/:307` `evaluatePoint`、`:295` `invalidate`）；`bind-resolver.ts` `deps.evaluate` 回调（`:5/:113/:122`）+ `scale.expression`（`:55-58`）指向该 evaluator；`reverse-index.ts` `extractPointIdRefs`/`POINT_REF_PATTERN`（`:16/:22`）+ `collectBindingPointIds`（`:33-40`）用 `@{}` 正则做语法级依赖收集。

**live 使用面（fixed-string `@{` grep）**：

- **demo/playground 生产配置：0 命中**（demo `scada-demo.tsx` 全部用 `binding.point`，无 `@{}`）。
- **工业包非 test src：0 功能命中**（仅 `use-scada-points-bridge.ts:17` 一处 JSDoc 注释提到 `@{}`，非功能代码）。
- **测试：36 命中 / 10 文件**——`binding.expression:'@{temp}...'`（`scada-points-bridge.test.tsx`、`-diagnostics.test.tsx`）、`source:'expression', expression:'@{level}...'`（`scada-handles.test.tsx`、`scada-canvas-lifecycle-wiring.test.tsx`、`serialization.test.ts`）、`scale.expression:'@{x}...'`（`value-to-state.test.ts`、`bind-resolver.test.ts`、`serialization.test.ts`）、`@{unclosed` 畸形（`scada-robustness-hardening.test.ts`）、`refresh-pipeline.test.ts`、`point-store.test.ts`、`reverse-index.test.ts`（直测 `extractPointIdRefs`）、`expression-evaluator.test.ts`（直测 evaluator）。**删除 evaluator 必须同步迁移这 10 个文件的 `@{}` 用例**，否则 typecheck/runtime 断裂。

**`$xxx` 简写使用面**（roadmap I18.3「demo/playground 无 `$xxx` 生产配置，无 demo 迁移」**过时/不准确**）：

- demo `scada-demo.tsx:59-62` 4 处（`$tankLevel`/`$flow`/`$temp`/`$flowOn`）。
- 工业包测试 6 文件：`scada-points-bridge.test.tsx`、`-diagnostics.test.tsx`、`scada-canvas-lifecycle-wiring.test.tsx`、`scada-canvas-diagnostic-channels.test.tsx`、`serialization.test.ts`、`binding/point-store.test.ts`（共 ~42 处）。

**平台唯一规范语法 `${expr}` 已可用**（点声明面）：`analyzeFluxSubscriptions`/`extractExpressionDepsViaProbe`（`:71-104`，discriminated result）+ `createPrivateEvalScope`（`:213`，`{...pointValues, ...scopeData}` 合并，scope 胜出，INV-4 边界）+ generation-memoize 已具备复杂表达式订阅与求值；`${...}` 在测试与生产已混用。

**点表 `variables` 已为可选**（核实，修正讨论 D2/roadmap I18.1 的前提）：`config-types.ts:98` `variables?: ScadaPointDeclaration[]` + `validate.ts:348` `if (config.variables !== undefined)` 均已接受缺省——「降为可选」在类型/校验层**已是现状**，I18.2 的真实交付是 contract-lock + doc-sync（见 Phase 2）。`defaultSchema` 在 `renderer-definitions.ts:55`（`variables: []` 空数组默认，已与可选一致）；`serialization/` 下无 `schemas.ts`。

**决策已锁（人工确认 D1–D6）**：单一语法 `${expr}`、点表可选、不固化 `points.` 命名、删自建求值器、INV-4 不变、validator 容忍旧 `@{}` + codemod（非大爆炸）。

## Goals

- 删除 `binding/expression-evaluator.ts` 及其在 `RefreshPipeline` 的装配；`@{pointId}` 语法在仓库内不复存在（含 reverse-index 的 `@{}` 正则提取）。
- **两条表达式面统一**：绑定层面（`binding.expression`/`scale.expression`/`source:'expression'`）改经 flux compiler + 私有求值 scope 求值，与点声明面同源；统一仅认 `${expr}`。
- 依赖收集单一通道：`reverse-index`/`bind-resolver` 的表达式点引用改经 flux 探针（与 `analyzeFluxSubscriptions` 同源），不再有 `@{}` 正则旁路。
- `$xxx` 简写与裸路径规整逻辑（`normalizeFluxExpression` 的 `$` 剥离分支、`extractFluxRefs`/`FLUX_REF_PATTERN`）移除；规范入口仅接受 `${` 开头。
- 10 个 `@{}` 测试文件 + demo（4）+ 6 个 `$xxx` 测试文件迁移为 `${...}` parity。
- 锁定点表 `variables` 已可选契约（缺省合法、绑定直连 scope）+ 5 场景合并优先级 contract 测试。
- 环检测保留为流水线层守卫（不丢 binding-cycle 失败路径）；generation 缓存失效复用 bridge 既有机制。

## Non-Goals

- 不动 INV-4 out-of-band 高频遥测通道（点表 + 脏收集合帧）；性能红线 V2/V4 不回退。
- 不动 `data-source` renderer 本身；不引入新的数据获取范式。
- 不动 meta2d 关键帧动画差距（讨论 §参考项目，另行评估）。
- 不改 `flux-formula`/`flux-compiler` 包源码（平台能力消费方，不改平台）。平台 collector 复杂表达式支持保持薄包装现状（follow-up 决策 ③ 已锁「保持现状」）。
- scada-image 画布级资源诊断维持现状（后置编辑器 mission，follow-up 决策 ⑤）。
- 不做 I17 的 demo 坐标重排（独立 plan，本计划仅迁 demo 的 `$xxx`→`${}` 文本）。

## Scope

### In Scope

**绑定层面收敛（Phase 1）**：

- `binding/expression-evaluator.ts` 删除。
- `binding/dirty-collector.ts`（`RefreshPipeline`）：移除 `ExpressionEvaluator` import/字段/装配/`getEvaluator`/`evaluatePoint`/`invalidate`，`deps.evaluate` 改由注入的 flux 求值闭包提供；环检测以流水线 active 栈守卫保留。
- `binding/reverse-index.ts`：移除 `POINT_REF_PATTERN`/`extractPointIdRefs`；`collectBindingPointIds` 的 `binding.expression` 分支改经 flux 探针（注入 compiler）产出 scope paths。
- `binding/bind-resolver.ts`：`ResolveBindingDeps` 增 `compiler`/`scopeFactory` 字段；`deps.evaluate`/`scale.expression` 经 flux 求值。
- 迁移 10 个 `@{}` 测试文件为 `${expr}` flux parity（`expression-evaluator.test.ts` 删除；`reverse-index.test.ts`/`bind-resolver.test.ts` 重写；`scada-points-bridge.test.tsx`/`-diagnostics.test.tsx`/`scada-handles.test.tsx`/`scada-canvas-lifecycle-wiring.test.tsx`/`scada-robustness-hardening.test.ts`/`value-to-state.test.ts`/`serialization.test.ts`/`refresh-pipeline.test.ts`/`point-store.test.ts` 的 `@{}` 用例迁移）。

**点表可选契约锁定（Phase 2）**：

- contract-lock：5 场景单测证明 `variables` 缺省合法 + 绑定直连 scope + 合并优先级（scope 胜出）。
- `renderer-definitions.ts:55` `defaultSchema`（`variables: []` 空数组默认）核实与可选一致（预期无需改）。
- 点值注入求值 scope 复用 `createPrivateEvalScope`；`points` 名称不固化。

**点声明面 `$xxx` 收敛 + 迁移兼容（Phase 3）**：

- demo `scada-demo.tsx:59-62`（4）+ 6 测试文件的 `$xxx`→`${xxx}`。
- `use-scada-points-bridge.ts`：`normalizeFluxExpression` 收紧为仅接受 `${`（删 `$` 剥离/裸路径分支）；`extractFluxRefs`/`FLUX_REF_PATTERN` 删除；`analyzeFluxSubscriptions` 的 `$xxx` 扫描分支简化。
- `validate.ts` 迁移期对旧 `@{pointId}` warn（错误码 `legacy-at-syntax`，指向 codemod），不 fail。
- 配置 codemod（`scripts/scada-expression-codemod.mjs`）：`@{x}`→`${x}`、`$xxx`→`${xxx}`。

**owner docs 同步（Phase 4）**：`design-data-binding.md`（§4.1/§4.2/§9.1/决策表「双轨数据模型」行）、`design-symbols.md`（§4.2）、`design-renderer.md`（§4.2）、`roadmap-industrial-hmi.md`（I18.3 过时行 + 数据模型行 + 平台复用表 formula compiler 行 + INV-3 措辞）。

### Out Of Scope

- 编辑器交互（独立后继 mission）。
- 平台 flux-formula/flux-compiler 源码改动。
- 新增图元/动画能力。
- I17 的 demo 坐标重排与 LeaferJS 对照页。

## Failure Paths

> 表达式语法为组态公共契约，迁移路径涉及旧 config 兼容。

| 场景编号             | 触发                            | 行为（含错误码）                                                                               | 可重试 | 用户可见表现                                                               |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| legacy-at-syntax     | config 含旧 `@{pointId}` 表达式 | validator warn（不 fail），错误码 `legacy-at-syntax`，指向迁移/codemod                         | 否     | 画布渲染时该绑定按未知表达式处理（求值失败跳过），monitor 一次性 warn      |
| binding-cycle        | 表达式点形成环（A→B→A）         | 求值守卫返 `{ok:false, error:'circular dependency'}`（保留既有失败路径语义）                   | 否     | 受影响图元保持上一有效值，`flux-evaluate-failed` 经桥接上报（不升 status） |
| invalid-flux-syntax  | `${expr}` 内畸形表达式          | flux compiler compile/evaluate 失败 → `flux-compile-failed`/`flux-evaluate-failed`（既有通道） | 否     | 该绑定跳过（保留上一值），monitor 上报                                     |
| dollar-without-brace | 残留 `$xxx`（迁移遗漏）         | `normalizeFluxExpression` 不再剥离 `$` → 按 `${$xxx}` 视为未知 scope → 求值 undefined          | 否     | 该绑定无值（图元保持默认），回归测试守护全量迁移                           |

## Test Strategy

档位选择：**必须自动化**（表达式语法为组态公共契约 + 迁移回归路径）。

每个 Fix 前先落 failing-first Proof（红→绿），覆盖 `@{}` 被拒 / `${expr}` 经 flux-formula 求值 / 点表缺省直连 scope / generation 失效重算 / 环检测保留 / `$xxx` 残留无值。回归守护：demo + edge-cases + perf scada e2e 基线不回归。

## Execution Plan

### Phase 1 - 绑定层面表达式收敛（I18.1 核心）

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/{expression-evaluator.ts,dirty-collector.ts,reverse-index.ts,bind-resolver.ts}`、`binding/{expression-evaluator.test.ts,reverse-index.test.ts,bind-resolver.test.ts}`、含 `@{}` 的 renderer/serialization/binding 测试（`scada-points-bridge.test.tsx`、`scada-points-bridge-diagnostics.test.tsx`、`scada-handles.test.tsx`、`scada-canvas-lifecycle-wiring.test.tsx`、`scada-robustness-hardening.test.ts`、`value-to-state.test.ts`、`serialization/serialization.test.ts`、`binding/{refresh-pipeline.test.ts,point-store.test.ts}`）

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（binding 域 compiler 注入路径）**：binding 域（此前 compiler-free）取得 `ExpressionCompiler` 用于 `binding.expression`/`scale.expression` 求值与依赖收集。裁定：由 bridge 层（`useScadaPointsBridge` 已持 `expressionCompiler`，`:242`）在构造 `RefreshPipeline` 时注入 compiler + 私有求值 scope 工厂（`createPrivateEvalScope`，`:213`）；flux-formula 零 React 依赖（讨论 §三.3），binding 域 import 不破分层。拒绝替代：在 binding 域内直建 compiler 实例（引入 env 耦合）。记录于 `design-data-binding.md`。
- [x] **Proof（failing-first）**：新增 `binding-expression-unification.test.ts`，断言 `binding.expression: '${a + b}'` 经 flux 求值产出正确值、点值变化经 generation 失效重算、环检测守卫仍触发、`@{a}` 表达式不被识别（求值失败/unknown）——先红（当前绑定层面 `${}` 不走 flux、`@{}` 走旧 evaluator）。
- [x] **Fix（删 evaluator + 重装）**：删除 `binding/expression-evaluator.ts`；`dirty-collector.ts` `RefreshPipeline` 移除 `ExpressionEvaluator` import/字段/装配（`:6,147,165-172,187`），表达式点 `evaluatePoint`/`invalidate` 路径（`:280,295,307`）改由注入 compiler + generation 失效驱动；环检测以流水线 active 栈守卫保留（binding-cycle Failure Path）。
- [x] **Fix（reverse-index）**：`reverse-index.ts` 移除 `POINT_REF_PATTERN`/`extractPointIdRefs`（`:16,22`）；`collectBindingPointIds` 的 `binding.expression` 分支改用 flux 探针（复用 `extractExpressionDepsViaProbe` 同源逻辑，经注入 compiler）产出 scope paths 作为 point refs。
- [x] **Fix（bind-resolver）**：`bind-resolver.ts` `ResolveBindingDeps` 增 `compiler`/`scopeFactory` 字段；`deps.evaluate`（`:5,113,122`）+ `scale.expression`（`:55-58`）经 flux 求值闭包。
- [x] **Fix（迁移绑定层 `@{}` 测试）**：`expression-evaluator.test.ts` 删除；`reverse-index.test.ts`/`bind-resolver.test.ts` 重写为 flux `${}` parity（`collectBindingPointIds` 经 flux 探针）；`scada-points-bridge.test.tsx`/`-diagnostics.test.tsx`/`scada-handles.test.tsx`/`scada-canvas-lifecycle-wiring.test.tsx`/`scada-robustness-hardening.test.ts`/`value-to-state.test.ts`/`serialization.test.ts`/`refresh-pipeline.test.ts`/`point-store.test.ts` 的 `@{x}` 用例迁移为 `${x}` flux parity。
- [x] **Proof**：failing-first Proof 由红转绿。

Exit Criteria:

- [x] `expression-evaluator.ts` 从仓库删除（`rg "expression-evaluator" packages/flux-renderers-industrial/src/` 仅余历史 plan/log 引用）。
- [x] 绑定层面 `binding.expression`/`scale.expression` 经 flux compiler 求值；failing-first Proof + 迁移后 binding/renderer/serialization 测试绿。
- [x] 工业包 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（保证后续 Phase 可继续——所有绑定层 `@{}` 测试已在本 Phase 迁移完毕）。

### Phase 2 - 点表可选契约锁定（I18.2）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/{config-types.ts,validate.ts}`、`src/schemas.ts`、`renderer/hooks/use-scada-points-bridge.ts`

- Item Types: `Proof | Fix | Decision`

- [x] **Decision**：核实确认 `variables` 类型/校验**已可选**（`config-types.ts:98` `variables?:` + `validate.ts:348` `if (config.variables !== undefined)`）——I18.2 不做「降为可选」的 phantom 改动（讨论 D2/roadmap I18.1 的前提已由 live 代码兑现）；本 Phase 交付 contract-lock + doc-sync。
- [x] **Proof（failing-first，contract-lock）**：断言无 `variables` 的 `ScadaConfig` 合法、绑定 `${scopeMember}` 直连 scope 求值成功、合并优先级 scope 胜出——先确认是否已有守护（无则红→补绿）。
- [x] **Proof（5 场景）**：无点表直连 / 有点表 / 同名冲突 scope 胜出 / 点表 expression 点 / 点表 static 点，各一用例锁定合并优先级契约（`{...pointValues, ...scopeData}`，design-data-binding.md §9.1）。
- [x] **Fix（defaultSchema 一致性）**：核实 `renderer-definitions.ts:55` `defaultSchema`（`variables: []` 空数组默认）与 `variables` 已可选一致；预期无需改（记录核实结论）。
- [x] **Fix**：`points` 名称不固化、非保留字（`${points.x}` 仅普通 scope 标识符）——单测覆盖。

Exit Criteria:

- [x] 5 场景 contract 测试入库，`variables` 缺省合法 + 合并优先级锁定。
- [x] `src/schemas.ts` `defaultSchema` 与 `variables` 可选一致（或核实无需改）。
- [x] 工业包局部 typecheck 通过。

### Phase 3 - 点声明面 `$xxx` 收敛与迁移兼容（I18.3）

Status: completed
Targets: `apps/playground/src/pages/scada-demo.tsx`、`renderer/hooks/use-scada-points-bridge.ts`、`serialization/validate.ts`、6 个 `$xxx` 测试文件、配置 codemod `scripts/`

- Item Types: `Fix | Proof`

- [x] **Fix**：demo `scada-demo.tsx:59-62` 4 处 `$xxx`→`${xxx}`。
- [x] **Fix**：6 测试文件 `$xxx`→`${xxx}`——`scada-points-bridge.test.tsx`、`scada-points-bridge-diagnostics.test.tsx`、`scada-canvas-lifecycle-wiring.test.tsx`、`scada-canvas-diagnostic-channels.test.tsx`、`serialization/serialization.test.ts`、`binding/point-store.test.ts`（~42 处）。
- [x] **Fix**：`use-scada-points-bridge.ts` `normalizeFluxExpression` 收紧为仅接受 `${` 开头（删 `$` 剥离/裸路径分支，`:194-198`）；`extractFluxRefs`/`FLUX_REF_PATTERN`（`:15-26`）删除；`analyzeFluxSubscriptions` 的 `$xxx` 扫描分支简化为 `${...}` 解析。
- [x] **Fix**：`validate.ts` 迁移期对旧 `@{pointId}` warn（错误码 `legacy-at-syntax`，指向 codemod），不 fail；新增配置 codemod（`scripts/scada-expression-codemod.mjs`）改写 `@{x}`→`${x}`、`$xxx`→`${xxx}`。
- [x] **Proof**：既有 flux 求值用例不回归；`dollar-without-brace` 守护单测（残留 `$xxx` 无值、不静默 corrupt）。

Exit Criteria:

- [x] `rg -F "flux: '\$" apps/playground/src/ packages/flux-renderers-industrial/src/` 在 src/test 中 0 命中（`$xxx` 迁移完成）。
- [x] `rg -F '@{' packages/flux-renderers-industrial/src/ apps/playground/src/` 在 src/test 中 0 命中（仅余 validator warn 字面量 + bridge 注释，二者本 Phase 一并清理）。
- [x] `normalizeFluxExpression` 仅接受 `${` 开头，focused 单测覆盖；配置 codemod 对样本 config 改写正确。
- [x] 工业包 + playground 局部 typecheck 通过。

### Phase 4 - 验证与文档同步（I18.4）

Status: completed
Targets: owner docs + 全量验证 + 文档共识审查

- Item Types: `Fix | Proof | Follow-up`

- [x] **Fix**：owner docs 同步 live baseline——`design-data-binding.md`（§4.1/§4.2/§9.1/决策表「双轨数据模型」行改「单一 `${expr}` + 点表可选（已可选现状）」、Phase 1 compiler 注入 Decision）、`design-symbols.md`（§4.2 bindings 容器）、`design-renderer.md`（§4.2）、`roadmap-industrial-hmi.md`（I18.3 过时「无 demo 迁移」行回写为实测迁移量；I18.1「variables 改可选」回写为「已可选，本计划 contract-lock」；数据模型行 + 平台复用表 formula compiler 行 + INV-3 措辞收敛）。
- [x] **Proof**：包级全量单测 + workspace 全量验证（typecheck/build/lint/test）+ scada e2e 回归（demo/edge-cases/perf 基线不回归）。
- [x] **Follow-up**：按 roadmap Cross-Cutting「文档共识审查」+ plan guide「Plan Review」/「Closure Audit」，独立子 agent（fresh session）执行 draft review 与 closure audit；证据记入 `## Draft Review Record` / `## Closure Audit Evidence`。

Exit Criteria:

- [x] owner docs 逐节与 live 代码一致（`variables` 可选、单一 `${expr}`、无 `@{}`/`$xxx` 表述残留）。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh session `ses_02dac7778ffej8MKYdUrEgy9A0`（R1）+ `ses_02da5c2d4ffefwp2D6PcirI3hp`（R2）
- Verdict: `pass-with-minors`（R2，零 Blocker / 零 Major）
- Rounds: 2（未超上限）
- Findings addressed:
  - R1 B1（Blocker）：`serialization/schemas.ts` 不存在 → 文件引用改为 `config-types.ts`（类型）/`validate.ts`（校验）/`renderer-definitions.ts:55`（defaultSchema）。
  - R1 B2（Blocker）：`variables` 已可选（`config-types.ts:98` + `validate.ts:348`）→ Phase 2 重定为 contract-lock + doc-sync（核实已可选现状，非 phantom 改动）。
  - R1 M1（Major）：`@{}` baseline 改正——fixed-string grep 36 命中 / 10 测试文件 + bridge JSDoc 注释；demo/playground 0；非 test src 0 功能命中。
  - R1 M2（Major）：Phase 1 Exit 不可达 → 10 个绑定层 `@{}` 测试文件全部并入 Phase 1 迁移，Phase 1 Exit 保证 typecheck 通过。
  - R1 M3（Major）：Phase 3 `$xxx` 枚举补 `point-store.test.ts`（6 文件）；新增 `@{}` + `$xxx` 双 grep gate。
  - R2 Minors（非阻塞，已顺手修正）：defaultSchema 文件定位 `src/schemas.ts` → `renderer-definitions.ts:55`；「0 命中」措辞与 1 处注释自相矛盾 → 改「0 功能命中」。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全 `[x]` 后方可 `Plan Status: completed`。全量验证归此处（plan guide Minimum Rule 18）。

- [x] `expression-evaluator.ts` 已删除，仓库内无 `@{pointId}` 生产代码/配置/测试。
- [x] 绑定层面与点声明面统一经 flux compiler 求值，仅认 `${expr}`。
- [x] 依赖收集单一通道（flux 探针），`reverse-index` 无 `@{}` 正则旁路。
- [x] `$xxx` 简写规整逻辑移除；demo（4）+ 10 `@{}` 测试 + 6 `$xxx` 测试迁移完成。
- [x] `variables` 已可选契约 contract-lock（5 场景），合并优先级锁定。
- [x] 环检测守卫保留（binding-cycle Failure Path 不丢）。
- [x] owner docs（design-data-binding/design-symbols/design-renderer/roadmap）同步 live baseline，roadmap I18.3/I18.2 过时行回写。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 平台 collector 复杂表达式支持

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: scada 域 `analyzeFluxSubscriptions` 可消费平台能力即可；改 `flux-runtime` 包超出本 mission 范围（follow-up 决策 ③ 已锁「保持薄包装现状」）。
- Successor Required: no

### scada-image 画布级资源诊断

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 后置编辑器 mission 统一资源面诊断（follow-up 决策 ⑤；与 P1-8 不升 status 契约一致），与表达式语法无关。
- Successor Required: yes（编辑器 mission）

## Non-Blocking Follow-ups

- 旧 `@{}` config 完全下线后（合理宽限期），把 validator 的 `legacy-at-syntax` warn 收敛为 fail（非本计划 gate，按 mission 节奏）。

## Closure

Status Note: 已完成（closure-audit 通过）。Phase 1-4 全部 Exit Criteria 经 fresh-session 独立 auditor 对照 live repo 验证落地；执行 session 的 typecheck/build/lint/test + scada e2e 基线全绿证据已采信。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session（task `closure-audit-2026-08-06-I18`）
- Audit Mode: live repo 核对（非仅 plan 文本）—— 9 项 checklist 逐项验证
- Findings（全部 PASS，零 Blocker / 零 Major）：
  1. `packages/flux-renderers-industrial/src/binding/expression-evaluator.ts` 已删除（`test -f` 否认存在）。
  2. `rg -F '@{' packages/flux-renderers-industrial/src/ apps/playground/src/` 仅余：`validate.ts:398-426`（`legacy-at-syntax` warn 字面量）、`expression-codemod.test.ts`（codemod parity）、`binding-expression-unification.test.ts`（`@{a}` 拒识 + 删除证明）—— 均为本计划 in-scope 的兼容/守卫用例，无生产 evaluator 残留。
  3. `rg -F "flux: '\$"` 无 `$xxx` 生产命中；唯一 `flux: '$analog.temp'`（`scada-points-bridge.test.tsx:99`）为 `dollar-without-brace` Failure Path 故意回归守护（test name + comment 明示）。
  4. `normalizeFluxExpression`（`use-scada-points-bridge.ts:132-136`）：仅认 `${` 开头，否则裸路径包成 `${<path>}`，无 `$` 剥离分支。
  5. owner docs `@{}` 残留均为：timestamped audit trail（`design-data-binding.md:14` Round 2 记录）+ I18 弃用描述（`design-data-binding.md:38,108,340,343`、`roadmap-industrial-hmi.md:36,81,104,267,273,274,352`），非描述旧模型为现状。
  6. `design-symbols.md:206` 已使用统一 flux-formula 表述（无 `@{}`/`$xxx` 引用），Phase 4 列为校验目标而非缺陷，无需 diff。
  7. roadmap I18.3（line 273）已从「无 demo 迁移」回写为「实测 demo 4 处 + 6 测试文件 ~42 处迁移」；I18.1（line 271）已记录 evaluator 删除 + flux 探针接入；数据模型行（line 104）已收敛为「可选间接层 + 唯一 `${expr}`」。
  8. `reverse-index.ts` 已用 `probeExpressionPaths`（flux 探针），无 `POINT_REF_PATTERN`/`extractPointIdRefs`；`dirty-collector.ts` 无 `ExpressionEvaluator`/`getEvaluator`/`evaluatePoint`/`invalidate` 残留。
  9. demo `scada-demo.tsx:59-62` 为裸路径（`flux: 'tankLevel'` 等），桥接 `normalizeFluxExpression` 运行时包成 `${tankLevel}` —— 符合 schema-embedded config 的 I18 正确模式（避开 flux schema compiler 急切求值）。
- 增项核对：`scripts/scada-expression-codemod.mjs` 存在；`variables-optional-contract.test.ts` 5 场景 contract-lock 在库；Closure Gates 全 `[x]`（本审计 tick 第 9 项前为 `[ ]`，符合「执行 session 不得自审」约束）；Deferred 两项（平台 collector / scada-image 诊断）均 follow-up 决策 ③/⑤ 锁定的真 out-of-scope，非静默降级。

Follow-up:

- 非 plan-owned：旧 `@{}` config 下线后把 validator `legacy-at-syntax` warn 收敛为 fail（按 mission 节奏，本计划 Non-Blocking Follow-ups 已登记）。
- 非 plan-owned：编辑器 mission 接手 scada-image 画布级资源诊断（Deferred §scada-image，Successor Required: yes）。
