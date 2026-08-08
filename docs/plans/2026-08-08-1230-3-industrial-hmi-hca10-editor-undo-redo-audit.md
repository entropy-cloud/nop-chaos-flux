# 01 Industrial HMI Component Audit — HCA10 Editor Undo-Redo（diff 命令栈 23 维包级深审 + 自动修复）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA10. Editor undo-redo 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA10；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；undo-redo 为复杂交互层，维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发）；逆计算载荷基线 `src/serialization/diff.ts` `ScadaConfigDiff`（HCA4 done）
> Related: HCA7（planned，editor renderer 层基线，本 plan 前置依赖）、HCA4（done，serialization diff 载荷基线，undo-redo 的天然载荷）、HCA0（done，编排基线）、HCA-BL（successor，bug 归档）、HCA-CR（successor，跨层集中修复）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **editor undo-redo 层**（`undo-redo/` 子目录 4 源文件，~750 行）做一次完整的 23 维包级深审（复杂交互层，维度 21/22/23 必选触发），把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，产出审计记录文件。editor undo-redo 是 SCADA 编辑器的 diff 命令栈——逆计算正确性（added→removed / updated→reverse）、事务边界、合并窗口（500ms）、内存上限守护直接决定 undo/redo 的可逆正确性与大场景（10 万图元）下的内存安全（不采用全量快照，`docs/components/industrial-hmi/design-renderer.md` §12.3）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/editor/undo-redo/`，行号/`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览一致）。

### 审计对象：4 源文件（`wc -l` 实测）

- `undo-redo/undo-redo-adapter.ts`（257）— undo-redo 适配器：编辑操作 → `ScadaConfigDiff` → `engine.applyDiff` 应用 + 逆 diff 撤销；与 editor session 桥接；canUndo/canRedo 状态派生；commitPolicy（manual/auto）分流。本层最大文件。
- `undo-redo/undo-stack.ts`（161）— 命令栈：undo/redo 双栈管理；pointer 游标；内存上限守护（最大条目数/字节）；栈满淘汰策略。
- `undo-redo/compute-inverse.ts`（218）— 逆计算：`ScadaConfigDiff` → 逆 diff（added→removed / removed→added(需原值) / updated→reverse(需前值)）；事务边界（multi-diff 原子性）。
- `undo-redo/operation-coalesce.ts`（114）— 合并窗口：同类操作在 500ms 窗口内合并（如连续拖拽合并为单条）；合并判定 + 时间戳比较。

### 4 colocated 测试文件（喂入 Phase 1/2 回归，不纳入审计对象 / ~805 行）

`undo-redo/compute-inverse.test.ts`（252）/ `undo-redo/operation-coalesce.test.ts`（219）/ `undo-redo/undo-redo-adapter.test.ts`（199）/ `undo-redo/undo-stack.test.ts`（135）。

### 载荷基线（构成依赖，本 plan 不重做，仅 Phase 3 抽查回归）

- **HCA4（done）**：`src/serialization/diff.ts` `ScadaConfigDiff`（added/removed/updated）是 undo-redo 的天然载荷；`engine.applyDiff` 增量应用（`scada-engine.ts:314`）。本 plan 消费此载荷基线。
- **`docs/components/industrial-hmi/design-renderer.md` §12.3**：10 万图元组态可达 MB 级 → 不采用全量快照，采用 diff 命令栈逆 diff 撤销（内存安全设计约束）。

### owner doc 现状

- `docs/components/industrial-hmi-editor/design-undo-redo.md`（undo-redo 设计：diff 命令栈 / 逆计算 / 合并 / 内存守护）。
- `docs/components/industrial-hmi/editor-initiation.md` §2.1（M2 undo-redo diff 命令栈）+ R4 风险（undo-redo 内存 10 万图元）。
  Phase 3 核对这些章节与 live undo-redo 一致性。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1,300+ tests / 97 test files）。

## Goals

- 对 4 源文件逐文件完成 23 维包级深审（维度 21/22/23 必选触发），产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- owner doc（design-undo-redo.md、editor-initiation.md R4）与 live undo-redo 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca10-editor-undo-redo.md`。

## Non-Goals

- 不审计 editor renderer（HCA7）/ panels（HCA8）/ connection（HCA9）/ infra（HCA11）。
- 不审计 serialization diff 载荷本体（HCA4 done，仅 Phase 3 抽查回归）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改 undo-redo 公共面或 ScadaConfigDiff 载荷契约（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/undo-redo/undo-redo-adapter.ts`。
- `packages/flux-renderers-industrial/src/editor/undo-redo/undo-stack.ts`。
- `packages/flux-renderers-industrial/src/editor/undo-redo/compute-inverse.ts`。
- `packages/flux-renderers-industrial/src/editor/undo-redo/operation-coalesce.ts`。
- 审计记录 `docs/audits/2026-08-08-*-hca10-editor-undo-redo.md`。
- owner doc `docs/components/industrial-hmi-editor/design-undo-redo.md` + `docs/components/industrial-hmi/editor-initiation.md`（R4 节，仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/serialization/diff.ts`（HCA4 done，仅作载荷依赖抽查）。
- `src/editor/renderer/`（HCA7）、`src/editor/{palette,inspector,toolbox}/`（HCA8）、`src/editor/connection/`（HCA9）、`src/editor/` 顶层 infra（HCA11）。
- `*.test.ts` / `*-fixtures.ts` / `index.ts` barrel（测试基础设施 / 聚合导出，不纳入审计对象，仅作回归喂入）。
- `src/renderer/`（HCA1）、`src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/symbols/`（HCA5/HCA6）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Failure Paths

> editor undo-redo 是 diff 命令栈层，无外部 IO / 鉴权 / API 契约。失败路径关注点是逆计算正确性、事务原子性与内存安全。

| 可测场景编号               | 触发                                                         | 行为                                               | 可重试 | 用户可见表现                   |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------- | ------ | ------------------------------ |
| undo-updated-no-prev       | compute-inverse 收到 updated diff 但无前值（prevValue 缺失） | 守卫：跳过该 entry 或标 corrupt，不产出错误逆 diff | 否     | 该操作不可撤销或显式提示       |
| undo-coalesce-cross-window | 两个同类操作时间戳间隔 > 500ms                               | 不合并，分别入栈为独立命令                         | 否     | 两次独立 undo 步骤             |
| undo-stack-overflow        | 命令数超过内存上限                                           | 淘汰最旧条目（FIFO），保留近期；canUndo 仍可用     | 否     | 远期操作不可 undo，近期可 undo |
| redo-after-new-commit      | undo 后用户执行新编辑操作                                    | 清空 redo 栈（分支丢弃），新操作入 undo 栈         | 否     | Redo 按钮禁用                  |
| undo-empty-stack           | undo() 于空 undo 栈调用                                      | no-op（不 throw、不 mutate），canUndo=false        | 否     | 无变化，无控制台异常           |
| undo-multi-diff-atomic     | 事务含多个 diff，中途一个逆计算失败                          | 整事务回滚（原子性），不部分应用                   | 否     | 操作整体不生效或整体可逆       |

## Test Strategy

本档选择：**建议有测**

editor undo-redo 是复杂交互层（逆计算 + 事务 + 合并 + 内存守护），非注册 renderer。审计前无已知 P0/P1 live defect。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（added→removed / updated→reverse 逆计算 / 500ms 合并窗口 / 内存上限淘汰 / redo-after-commit 清栈 / 空栈守卫 / 事务原子性）为主。交互闭环变更追加 e2e（`scada-editor-interaction-correctness.spec.ts` undo-redo 路径）。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/undo-redo/`（4 源文件）、`docs/audits/2026-08-08-*-hca10-editor-undo-redo.md`

- Item Types: `Proof | Decision`

- [ ] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（**维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发**）。重点维度：
  - **逆计算正确性**（compute-inverse.ts，**维度 21**）：`ScadaConfigDiff` → 逆 diff 的对称性——added→removed / removed→added（需原值恢复）/ updated→reverse（需前值）；字段穷尽性（symbols/connections/variables 等子形状）；缺失前值的守卫；嵌套结构（group children）逆计算。
  - **事务边界与原子性**（compute-inverse.ts + undo-redo-adapter.ts）：multi-diff 事务的原子应用/回滚；中途失败不部分应用；事务标记传递。
  - **命令栈正确性**（undo-stack.ts）：undo/redo 双栈 + pointer 游标一致性；canUndo/canRedo 边界（空栈、满栈、单条）；redo-after-new-commit 清空 redo 栈；内存上限守护（最大条目数/字节）+ FIFO 淘汰。
  - **合并窗口**（operation-coalesce.ts）：500ms 窗口判定（时间戳比较的时钟源 + 单调性）；同类操作合并判定（操作类型 + target 一致性）；合并后逆 diff 的代表性；跨窗口不合并。
  - **commitPolicy 分流**（undo-redo-adapter.ts）：manual vs auto commit 的栈行为差异；manual 模式事务累积；auto 模式即时入栈。
  - **载荷契约**：与 `serialization/diff.ts` `ScadaConfigDiff` 形状一致（HCA4 基线）；`engine.applyDiff` 增量应用路径正确。
  - **错误处理**：空 diff / 缺失前值 / 超大 diff（10 万图元）/ NaN 数值的降级。
  - **类型安全**：diff entry cast、prevValue/nextValue 窄化、unknown 操作类型守卫。
- [ ] 重点抽查边界值：空 undo 栈 / 空 redo 栈 / 单条命令 / 栈满淘汰 / 500ms 边界（恰等于）/ 缺失前值 updated diff / redo-after-commit / 事务中途失败 / 10 万图元超大 diff / group 子结构逆计算。
- [ ] 产出 `docs/audits/2026-08-08-*-hca10-editor-undo-redo.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [ ] 审计记录文件存在，含 4 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [ ] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: planned
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Fix | Proof`

- [ ] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。
- [ ] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [ ] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [ ] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [ ] 审计记录 finding 状态已回写。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-undo-redo.md`、`docs/components/industrial-hmi/editor-initiation.md`（R4 节）、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [ ] 核对 `design-undo-redo.md`（diff 命令栈 / 逆计算 / 合并 / 内存守护）+ `editor-initiation.md` R4（undo-redo 内存 10 万图元）与 live undo-redo 一致；仅当发现 drift 时同步（无 drift 不写）。
- [ ] 抽查载荷基线回归（`serialization/diff.ts` `ScadaConfigDiff` 形状与 undo-redo 消费一致——HCA4 基线）。
- [ ] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。

Exit Criteria:

- [ ] design-undo-redo.md + editor-initiation.md R4 经 rg/读核对待无 drift（或有同步 commit）。
- [ ] 载荷基线回归抽查通过。
- [ ] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`，或明确「无复杂/跨层 bug 候选」+ 理由）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_0207895eaffeoRywdO7AmX34ma`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。2 Minor 已落地：m-1（`scada-engine.ts` applyDiff 行号 :297 误，实测 :314）——已修正为 `:314`；m-2（`design-renderer.md §12.3` 路径歧义，runtime 与 editor 两文件同名）——已消歧义为 `docs/components/industrial-hmi/design-renderer.md §12.3`（runtime 文件，§12.3 风险与取舍 line 353）。Live repo 全量复核通过：4 源文件行数精确（257/161/218/114，Σ=750）、4 测试文件行数精确（Σ~805）、owner-doc 路径存在（design-undo-redo + editor-initiation R4）、HCA4 diff 载荷基线依赖准确、roadmap HCA10=todo、23-dim + dim 21-23 适用性匹配、与 HCA7/HCA8/HCA9/HCA11 无 scope 重叠。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [ ] 4 源文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [ ] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] 受影响 owner doc 与 live baseline 一致（或明确无 drift）。
- [ ] 必要 focused verification 已完成。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> 起草时无已知可延期项。

## Non-Blocking Follow-ups

- 本层 P2 高成本项 / P3 归 HCA-CR 跨层集中修复。
- 本层 bug 候选喂入 HCA-BL 正式归档。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
