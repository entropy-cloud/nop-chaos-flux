# 01 Industrial HMI Component Audit — HCA5 Symbols Core（符号框架 23 维包级深审 + 自动修复）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA5. Symbols core 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA5；审计卡模板 `docs/audits/component-audit-checklist.md`；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；symbols core 非复杂交互层，维度 21-23 可选触发）
> Related: HCA0（done，编排基线）、HCA6（successor，symbol shapes 23 图元审计，依赖本 plan 收口后的 symbols core 基线）、`docs/plans/2026-08-06-0900-2-industrial-hmi-symbol-geometry-property-consistency.md`（completed，symbols 几何/属性 P2 已收口，构成本 plan Current Baseline）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **symbols core 框架层**（8 文件，~750 行）做一次完整的 23 维包级深审，把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，产出审计记录文件，并为 successor HCA6（23 个图元定义审计）提供已校准的符号框架基线。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/symbols/` 顶层 8 文件，行号对齐 HEAD）。

- **symbols core 8 文件 + 行数（`wc -l` 实测，与 roadmap §审计对象总览 一致）**：
  - `symbol-types.ts`（157）— `ScadaSymbolDefinition` / `ScadaSymbolProps` / `ScadaSymbolStylePatch` / `SymbolCreateContext` 等类型声明。
  - `symbol-registry.ts`（44）— `registerScadaSymbol` / `unregisterScadaSymbol` / `getScadaSymbolDefinition` / `hasScadaSymbol` / `listScadaSymbols` / `clearScadaSymbolRegistry`（全局 Map 注册表）。
  - `symbol-factory.ts`（106）— `createSymbolNode` / `instantiateSymbol` / `toNodePatch`（props→node attrs）/ `fromNodeAttrs`（node attrs→props；0900-2 Phase 3 P2-10 读写对称已落地）。
  - `style-resolver.ts`（14）— 样式 resolve helper（极小）。
  - `visual-state.ts`（118）— `StateVisualApplier` 类（视觉状态 apply/revert；2129-3 open P1-1 `STYLE_RESET_DEFAULTS` 穷尽 + shadow reset + `applied.delete` hoist 已修，`visual-state.ts:18,30,109`）。
  - `composite.ts`（135）— 复合装配（`EXTENT_FIELDS` 分支 + `parts.resize?` 路由；0900-2 Phase 1 P2-4 已修，`composite.ts:27,72-77`）。
  - `compound.ts`（98）— 组合（compound symbol 装配 + 子符号 props 传播）。
  - `register-builtin.ts`（75）— 内置符号注册入口（调用各 shape 定义 + registry）。
- **已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）**：visual-state STYLE_RESET_DEFAULTS 穷尽（2129-3 open P1-1）；factory `fromNodeAttrs` 读写对称（0900-2 P2-10）；composite `parts.resize?` 路由（0900-2 P2-4）。
- **已知 governance 项（非 live defect，本 plan 内首次 Decision 裁定）**：`SYMBOL_KEYS` 派生 lint 守卫——`docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md:250,266` 建议（断言 `SYMBOL_KEYS ∪ {id,type} === keyof ScadaSymbolNode`，机械防 P1-1 类 `flow` 漏键复发），plan `2026-08-05-0653-2` Deferred 为 `optimization candidate`（Successor Required: no，记入 Non-Blocking Follow-ups）。**该脚本 `scripts/check-scada-symbol-keys.mjs` 至今未实现**（`find` 实测仓库内不存在）。本 plan Phase 1 首次裁定：现在落地 / 继续 watch-only。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1302 tests / 97 test files）。

## Goals

- 对 symbols core 8 文件逐文件完成 23 维包级深审，产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 对 `check-scada-symbol-keys.mjs` governance 项给出 Decision（落地 / 继续 watch-only，写明理由）。
- owner doc `docs/components/industrial-hmi/design-symbols.md` 与 live baseline 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca5-symbols-core.md`。

## Non-Goals

- 不审计 symbol shapes 定义（base-shapes/device/instrument/sensor-control/pipe-junction 共 27 文件）—— 归 successor HCA6。
- 不审计 renderer / editor renderer 层（HCA1 / HCA7，已 planned）。
- 不重做已收口的 visual-state / factory / composite 修复（仅 Phase 3 抽查回归）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改 symbol 注册 API 公共面（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/symbols/` 顶层 8 文件（见 Current Baseline 清单）。
- 审计记录 `docs/audits/2026-08-08-*-hca5-symbols-core.md`。
- owner doc `docs/components/industrial-hmi/design-symbols.md`（仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/symbols/base-shapes/`、`device/`、`instrument/`、`sensor-control/`、`pipe*`（HCA6）。
- `src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）。
- HCA-BL bug 卡片正式归档（本 plan finding 喂入，正式归档动作在 HCA-BL）。

## Test Strategy

本档选择：**建议有测**

symbols core 是框架层（注册 / 工厂 / 视觉状态 / 复合装配），非注册 renderer。审计前无已知 P0/P1 live defect（先验 P1 已收口）。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查为主。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/`（8 文件）、`docs/audits/2026-08-08-*-hca5-symbols-core.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（symbols core 非复杂交互层，维度 21-23 可选触发），重点维度：注册并发安全（registry Map 写入 / 清除时序）、工厂 deep-merge 正确性（`instantiateSymbol` 默认值与 override 合并）、视觉状态 revert 完整性（`StateVisualApplier` enter/exit 对称）、复合装配 applyProps 路由（composite `EXTENT_FIELDS` vs `resize` 分支）、compound 装配子符号 props 传播、register-builtin 注册顺序与幂等。
- [x] 重点抽查边界值：空 props / undefined style patch / 重复注册同 type / unregister 不存在 type / clear 后 instantiate / 深嵌套 compound / NaN 几何值。
- [x] 产出 `docs/audits/2026-08-08-*-hca5-symbols-core.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）。
- [x] 对 `SYMBOL_KEYS` 派生 lint 守卫 governance 项给首次 Decision（现在落地 `scripts/check-scada-symbol-keys.mjs` / 继续 watch-only，写明理由；基线见 Current Baseline——脚本至今未实现）。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 8 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。
- [x] `check-scada-symbol-keys.mjs` Decision 已记录（含理由）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [x] 审计记录 finding 状态已回写。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi/design-symbols.md`、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 `design-symbols.md` 与 live symbols core 一致（注册 API 面、factory 读写对称契约、visual-state 契约、composite 装配契约）；仅当发现 drift 时同步（无 drift 不写）。
- [x] 抽查先验修复回归（visual-state / factory / composite 行为仍成立）。
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。

Exit Criteria:

- [x] `design-symbols.md` 经 rg/读核对待无 drift（或有同步 commit）。
- [x] 先验修复回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_02158c7eaffeRf7gMXrfd8r6Z2`（R1）→ `ses_02151916fffeu3U968zSdrE6LE`（R2）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: R1 B-1（Current Baseline 的 `SYMBOL_KEYS` 派生 lint 守卫条目同时捏造了脚本已存在 + 错误归属到 0900-2 plan；违反 Minimum Rule 1）——已修正为：脚本 `scripts/check-scada-symbol-keys.mjs` 至今未实现（`find` 实测），建议出自 `docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md:250,266`，Deferred 在 plan `2026-08-05-0653-2`（line 178-182，optimization candidate，Successor: no），Phase 1 首次裁定。R2 确认 B-1 已解决、零 Blocker/Major/Minor，live repo 全量复核通过。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18），不在 Phase Exit Criteria 重复。

- [x] symbols core 8 文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] `check-scada-symbol-keys.mjs` Decision 已裁定并记录。
- [x] owner doc `design-symbols.md` 与 live baseline 一致（或明确无 drift）。
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 起草时无已知可延期项。Phase 1 Decision 若裁定 `check-scada-symbol-keys.mjs` 继续 watch-only，在此补条目（Classification: optimization candidate + Why Not Blocking Closure）。

## Non-Blocking Follow-ups

- HCA6（symbol shapes 审计）依赖本 plan 收口后的 symbols core 基线。
- 本层 P2 高成本项归 HCA-CR 跨层集中修复。

## Closure

Status Note: <<收口时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里；或明确写 no remaining plan-owned work>>
