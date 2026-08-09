# 01 Industrial HMI Component Audit — HCA4 Serialization Layer（JSON 契约管线 23 维包级深审 + 自动修复 + validate.ts 拆分裁决）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA4. Serialization 层审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA4；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；serialization 非复杂交互层，维度 21-23 可选触发）；行数治理基线 `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CG（validate 524 行超阈值）
> Related: HCA0（done，编排基线）、HCA3（done，binding 层；binding flushFrame 消费 validate/diff 结果，交叉核验接合面）、HCA2（done，engine 层；engine importConfig/reset 经 config-types/parse/validate 消费 config 契约）、`docs/plans/2026-08-06-0900-1-industrial-hmi-validator-equality-robustness.md`（completed，validator fail-closed 边界 + equality array/object 守卫 + 深度上限 + 子形状校验，**构成本 plan Current Baseline，不回退其语义**）、`docs/plans/2026-08-05-0653-4-hmi-config-build-equality-diagnostic-fidelity.md`（completed，引入共享 `serialization/equality.ts deepEqual`）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **serialization 层**（6 文件，~900 行）做一次完整的 23 维包级深审，把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，并对 **`validate.ts` 524 行超 500 阈值** 给出拆分 Decision（本 plan 落地拆分 / 移交 HCA-CG），产出审计记录文件。serialization 是 industrial 包的 JSON 契约管线（config 类型 / parse / validate / diff / equality / serialize），其正确性决定 SCADA 配置能否被忠实解析、校验、diff、往返保真——是 engine importConfig、binding 状态解析、editor undo-redo（diff/compute-inverse）全部上层的基础契约。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/serialization/` 6 源文件 + 5 测试文件，行号/`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览 一致）。

- **serialization 6 源文件 + 行数（`wc -l` 实测）**：
  - `config-types.ts`（131）— `ScadaConfig` / `ScadaSymbolNode` / `ScadaBinding` / `ScadaAnimation` / `ScadaStateDeclaration` / `ScadaConfigDiff` / `ScadaVariablesDiff` 等类型声明（config 契约的 single source of truth）。
  - `validate.ts`（**524**，超 500 WARN 阈值）— `validateScadaConfig` 主入口（`:406`，返回 `ScadaValidationResult`）+ 6 per-shape 校验器（`validateBinding`/`validateAnimation`/`validateStateDeclaration`/`validateSymbolEvent`/`validateSymbolNode`/`validatePointDeclaration`）+ `assertShape`/`checkNumberField`/`checkStringField` helper + 2 legacy 扫描器（`scanSymbolLegacy`/`scanLegacyAtSyntax`，`:469`/`:499`）+ `MAX_VALIDATE_DEPTH=100` 深度上限（`:84`）。**拆分缝清晰**：per-shape 校验器可抽 `validators/`，legacy 扫描可抽 `legacy-scan.ts`（与 HCA3 dirty-collector 拆分同型 Decision）。
  - `diff.ts`（138）— `computeConfigDiff`（结构 diff：added/removed/updated symbol + variables diff）。
  - `equality.ts`（56）— 共享 `deepEqual`（含 array/object 守卫 + 深度上限，0900-1 落地）。
  - `parse.ts`（25）— `parseScadaConfig`（JSON.parse + 类型窄化）。
  - `serialize.ts`（27）— `serializeScadaConfig`（结构化序列化 + 往返保真）。
- **5 colocated 测试文件（喂入 Phase 1/2 回归，不纳入审计对象）**：`serialization-validate.test.ts`（611）/ `serialization-diff.test.ts`（266）/ `expression-codemod.test.ts`（216，表达式一元化回归）/ `serialization-parse-serialize.test.ts`（95）/ `serialization-equality.test.ts`（56）。另 `serialization-fixtures.ts`（17）为 test fixture，out-of-scope。
- **已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）**：
  - validator fail-closed 边界 + 子形状校验 + `MAX_VALIDATE_DEPTH=100`（0900-1）。
  - equality `deepEqual` array/object 守卫 + 深度上限（0900-1，shared 经 config-build-equality 0653-4 引入）。
  - 表达式一元化（2129-1，`expression-codemod.test.ts` 回归）。
- **已知 governance 项（非 live defect，本 plan 内首次 Decision 裁定）**：`validate.ts` 524 行超 500 WARN 阈值——roadmap §HCA-CG 标注「拆分评估」。本 plan Phase 1 首次裁定：现在落地拆分（per-shape 校验器抽 `validators/` + legacy 扫描抽 `legacy-scan.ts`，各 ≤ 500 行）/ 移交 HCA-CG（写明 Why Not Blocking Closure）。
- **owner doc 现状**：**无独立 `design-serialization.md`**（`docs/components/industrial-hmi/` 实测：demo-visual-design / design-data-binding / design-engine / design-renderer / design-symbols / editor-initiation）。serialization 契约散见于 `design-renderer.md`（config lifecycle / validate 错误码）+ `design-data-binding.md`（config model / ScadaBinding）+ `design-engine.md`（importConfig 经 parse/validate）。Phase 3 核对这些散见章节与 live 一致性。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1307 tests / 97 test files）。

## Goals

- 对 serialization 6 文件逐文件完成 23 维包级深审，产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 对 `validate.ts` 524 行超阈值给出 Decision（本 plan 落地拆分 / 移交 HCA-CG，写明理由 + 拆分缝）。
- serialization 散见 owner doc 章节与 live baseline 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca4-serialization.md`。

## Non-Goals

- 不审计 engine（HCA2 done）/ binding（HCA3 done）/ symbols（HCA5 active / HCA6 successor）/ renderer（HCA1 planned）/ editor（HCA7 planned, HCA8-HCA11 todo）。
- 不重做已收口的 validator/equality/expression 修复（仅 Phase 3 抽查回归；不回退 0900-1 / 0653-4 / 2129-1 语义）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改 serialization 公共 API 面（`validateScadaConfig`/`parseScadaConfig`/`serializeScadaConfig`/`computeConfigDiff`/`deepEqual`/config-types 导出），除非审计发现 contract drift；validate.ts 拆分须保持公共导出不变（re-export）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/` 6 源文件（见 Current Baseline 清单）。
- 审计记录 `docs/audits/2026-08-08-*-hca4-serialization.md`。
- serialization 散见 owner doc 章节（`design-renderer.md` / `design-data-binding.md` / `design-engine.md`，仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test；validate.ts 拆分（若 Decision = 本 plan 落地）的等价拆分 + 公共 re-export 保持。

### Out Of Scope

- `src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/symbols/`（HCA5/HCA6）、`src/renderer/`（HCA1）、`src/editor/`（HCA7-HCA11）。
- `serialization-fixtures.ts` + `*.test.ts`（测试基础设施，不纳入审计对象，仅作回归喂入）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Test Strategy

本档选择：**建议有测**

serialization 是契约管线层（parse / validate / diff / equality / serialize），非注册 renderer。审计前无已知 P0/P1 live defect（先验 validator/equality 修复已收口）。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（往返保真 / diff 正确性 / 校验失败路径）为主。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage + validate.ts 拆分 Decision

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/`（6 文件）、`docs/audits/2026-08-08-1051-hca4-serialization-layer.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（serialization 非复杂交互层，维度 21-23 可选触发），重点维度：校验完整性（子形状/malformed/未知字段处理）、`deepEqual` 数组/对象守卫与深度上限边界、`diffScadaConfig` 结构正确性（added/removed/updated 分类 + variables diff）、序列化往返保真（parse→serialize→parse 等价）、`MAX_VALIDATE_DEPTH` 超大嵌套守卫、null/NaN/Infinity/空 config 边界、legacy `@{}` 语法扫描覆盖。
- [x] 重点抽查边界值：空 config（`{version:1,variables:[],symbols:[]}`）/ 缺字段 / 重复 point id / 超深嵌套 symbol / NaN 几何值 / 非 plain-object symbol / malformed JSON（parse）、`diff(∅,X)` 与 `diff(X,∅)`、`deepEqual([],[])` / `deepEqual({a:1},{a:'1'})`。
- [x] 产出 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）。
- [x] 对 `validate.ts` 524 行超阈值给首次 Decision（**裁定：移交 HCA-CG**——单一职责内聚、WARN 桶低位 524/700、拆分须同时抽 helpers 致过度碎片化、owner 归 HCA-CG；拆分缝 + re-export 方案已记录于审计卡，供 HCA-CG 执行时采用）。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 6 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）——零 P0/P1、P2-BND-1（governance）、P3-1（align 校验遗漏）、P3-2（background.grid 校验遗漏）。
- [x] `validate.ts` 拆分 Decision 已记录（含理由 + 若落地则给出拆分缝 + 公共 re-export 方案）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）+ validate.ts 拆分落地（若 Decision=本 plan）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`；若 Decision=落地，`validate.ts` + 新拆分文件 + `validate.ts` re-export

> Phase 1 深审结论：零 P0/P1 live defect（先验 0900-1/0653-4/2129-1 三轮硬化已收口主路径）。validate.ts 拆分 Decision = 移交 HCA-CG（非本 plan 落地）。故本 Phase 无代码变更；P3-1/P3-2 归 HCA-CR backlog，P2-BND-1 归 HCA-CG。各 finding 状态已回写审计卡。

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。（零 P0/P1，无 fix 对象）
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。（P2-BND-1 = governance 项，经 Phase 1 Decision 移交 HCA-CG + 拆分缝；P3-1/P3-2 = P3 归 HCA-CR backlog——见审计卡 Finding Triage 汇总）
- [x] 若 Phase 1 Decision = 本 plan 落地拆分：按拆分缝执行（per-shape 校验器 → `validators/`，legacy 扫描 → `legacy-scan.ts`），`validate.ts` 仅保留主入口 + helper + re-export，各文件 ≤ 500 行 WARN 桶；公共导出面（`validateScadaConfig`/`ScadaValidationResult`）签名与导出位置不变；`serialization-validate.test.ts` 全量回归转绿。（Decision = 移交 HCA-CG，N/A；拆分缝已记录审计卡供 HCA-CG 采用）
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。（P2-BND-1 = deferred-to-HCA-CG w/ 拆分缝；P3-1/P3-2 = backlog-HCA-CR；已回写审计卡 Finding Triage 汇总）

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。（零 P0/P1，vacuously satisfied）
- [x] 若拆分落地：`validate.ts` 及新拆分文件均 ≤ 500 行（`wc -l` 实测），公共导出不变（`rg "^export" validate.ts` 含 `validateScadaConfig`/`ScadaValidationResult`），`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿。（Decision = 移交 HCA-CG，N/A；公共导出面不变已核对：`validateScadaConfig`/`ScadaValidationResult` 仍由 `validate.ts:406,3` 导出）
- [x] 审计记录 finding 状态已回写。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi/design-renderer.md`（+ `design-data-binding.md` / `design-engine.md` 散见章节）、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 serialization 散见 owner doc 章节（design-renderer.md config lifecycle / validate 错误码、design-data-binding.md config model / ScadaBinding、design-engine.md importConfig 经 parse/validate）与 live serialization 一致；仅当发现 drift 或拆分改变模块清单时同步（无 drift 不写）。（审计卡「散见 owner doc 一致性核对」表三章节经 rg/读核对待无 drift；拆分 Decision=移交 HCA-CG 不改模块清单 → 无需同步）
- [x] 抽查先验修复回归（validator fail-closed / equality 守卫 / 表达式一元化 行为仍成立）。（审计卡「Phase 3 先验修复回归抽查」表三项全 ✅：serialization-validate.test.ts / serialization-equality.test.ts / expression-codemod.test.ts 回归 + pnpm test 1307 green）
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。（审计卡「喂入 HCA-BL」节：本层无复杂/跨层 bug 候选——零 P0/P1，2 个 P3 为局部覆盖缺口无跨层影响）

Exit Criteria:

- [x] 散见 owner doc 章节经 rg/读核对待无 drift（或有同步 commit；若拆分改变模块清单，design-renderer.md §config-lifecycle 同步）。（无 drift；拆分 Decision=移交 HCA-CG 不改模块清单）
- [x] 先验修复回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`）。（明确「无复杂/跨层 bug 候选」+ 理由）

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_020b5a65fffeITIiS1W53zxL7V`（R1）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major，共识达成（连续一轮）。1 Minor 已处理：M-1（Current Baseline 称 "7 per-shape 校验器" 但实测为 6——`grep "^function validate" validate.ts` 返回 6：validateBinding/validateAnimation/validateStateDeclaration/validateSymbolEvent/validateSymbolNode/validatePointDeclaration）已改为 "6"。Live 核对全 PASS：6 源文件 + 行数（131/524/138/56/25/27）、validate.ts 524>500 阈值、`:406`/`:84`/`:469`/`:499` 行号、3 个 predecessor plan（0900-1/0653-4/2129-1）均 completed、HCA0=done/HCA4=todo、serialization 非复杂交互层（dims 21-23 可选）、无独立 design-serialization.md。Scope 边界正确（仅 HCA4，未侵入 HCA6/HCA8-11 blocked 项或重审 HCA2/HCA3 done 项）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。
>
> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18），不在 Phase Exit Criteria 重复。

- [x] serialization 6 文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。（零 P0/P1；先验 0900-1/0653-4/2129-1 三轮硬化已收口主路径，Phase 3 回归抽查 ✅）
- [x] `validate.ts` 524 行超阈值 Decision 已裁定并执行（落地拆分各 ≤ 500 行 / 或移交 HCA-CG 并记入 Deferred But Adjudicated）。（DA-1：移交 HCA-CG，拆分缝已记录审计卡）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。（2 个 P3 为真实低影响覆盖缺口，消费者 graceful fallback；closure-audit 独立复核确认 P3-1/P3-2 非 P0/P1 降级）
- [x] serialization 公共导出面（`validateScadaConfig`/`parseScadaConfig`/`serializeScadaConfig`/`computeConfigDiff`/`deepEqual`/config-types）签名不变（除非审计确认 contract drift 并已收敛）。（零代码变更；closure-audit 复核 `validateScadaConfig`/`ScadaValidationResult` 仍由 `validate.ts:406,3` 导出）
- [x] 受影响 owner doc 章节（design-renderer.md / design-data-binding.md / design-engine.md）与 live baseline 一致（或明确无 drift）。（审计卡「散见 owner doc 一致性核对」三章节无 drift）
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。（ses_020a453a9ffek94PcJx7hmGYA7 verdict=pass，零 blocking，逐条 file:line 复核证据见下）
- [x] `pnpm typecheck`（32/32 FULL TURBO cached）
- [x] `pnpm build`（32/32 cached）
- [x] `pnpm lint`（32/32 cached）
- [x] `pnpm test`（59/59 cached；industrial 97 files / 1307 tests green，closure-audit 独立复核确认）

## Deferred But Adjudicated

> 本 plan 起草时无已知可延期项。Phase 1 `validate.ts` 拆分 Decision 若裁定移交 HCA-CG，在此补条目（Classification: optimization candidate + Why Not Blocking Closure + Successor Path: HCA-CG）。

- **[DA-1] validate.ts 524 行超 500 WARN 阈值拆分**
  - Classification: optimization candidate（行数 governance，非 live defect）
  - Adjudication: 移交 HCA-CG（跨层行数治理集中批次）
  - Why Not Blocking Closure: (1) WARN 桶低位 524/700，距 ERROR 硬门禁 36% 余量，非 CI 阻塞；(2) validate.ts 单一职责内聚（config 校验），per-shape 校验器共享 helper → 拆分须同时抽 helpers/ 致 524 行拆 3+ 文件过度碎片化，边际收益低；(3) validate.ts 不在包公共 index 导出（仅 `serializeScadaConfig` 经 index），拆分不改变公共 API；(4) HCA-CG 是集中治理超阈值文件的指定批次，borderline 单文件宜聚合裁决。
  - Successor Path: HCA-CG（拆分缝 + re-export 方案已记录审计卡 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md`「validate.ts 拆分 Decision」节）
  - 公共导出不变契约：`validateScadaConfig` / `ScadaValidationResult` 仍由 `validate.ts` 导出（re-export 保持）

## Non-Blocking Follow-ups

- 本层 P2 高成本项归 HCA-CR 跨层集中修复。
- serialization 契约若后续被 editor undo-redo（HCA10 diff/compute-inverse）或 binding（HCA3 状态解析）二次消费发现接合面问题，归 HCA-CR 裁决。
- **[Follow-up-1]** P3-1（validate.ts:287 align 字段校验遗漏）+ P3-2（validate.ts:448-451 background.grid 子形状校验遗漏）归 HCA-CR backlog；低成本（各 <10 行，补 checkStringField/checkUnion + assertShape），可在 HCA-CR 或 validate.ts 拆分（HCA-CG）时一并修复。

## Closure

Status Note: serialization 层（6 文件 ~900 行）23 维包级深审完成，审计记录 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md` 含逐文件 finding 表 + 全 triage。**零 P0/P1 live defect**——先验 0900-1（validator fail-closed + 子形状 + MAX_VALIDATE_DEPTH）/ 0653-4（共享 deepEqual）/ 2129-1（表达式一元化）三轮硬化已收口主路径，Phase 3 回归抽查 ✅。2 个 P3（align / background.grid 校验覆盖缺口，消费者 graceful fallback 无数据丢失）归 HCA-CR backlog。validate.ts 524 行超阈值 Decision = 移交 HCA-CG（DA-1：WARN 桶低位 + 单一职责内聚 + 拆分致过度碎片化，拆分缝已记录供 HCA-CG 采用）。公共导出面不变（零代码变更）。散见 owner doc 三章节无 drift。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_020a453a9ffek94PcJx7hmGYA7`
- Verdict: `pass`（零 blocking issue）
- Evidence: 逐条 file:line 复核——6 源文件行数（131/524/138/56/25/27）实测对齐；P3-1（validate.ts:287 align 遗漏 vs config-types.ts:91）/ P3-2（validate.ts:450 background.grid 遗漏 vs config-types.ts:105）真实且为 P3（graceful fallback）；validate.ts 不在包 index 公共导出（仅 serializeScadaConfig 经 index.ts:54）；reordered 由 editor/toolbox-runtime.ts:152-157 产出非 diffScadaConfig（by-design 非缺陷）；deepEqual 经 equality.ts:28 单一事实源（diff.ts:2 + compound.ts:3 共享）；tests 独立复核 97 files / 1307 passed green。Phase 2 vacuous satisfaction 合法（零 P0/P1 + Decision=defer 确证）。

Follow-up:

- DA-1：validate.ts 拆分 → HCA-CG（拆分缝已记录审计卡）。
- Follow-up-1：P3-1（align 校验遗漏）+ P3-2（background.grid 校验遗漏）→ HCA-CR backlog。
- 无剩余 plan-owned work。
