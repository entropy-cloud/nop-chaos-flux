# 3 Cycle 2 / I5 — 全量验证（full-green 记录）（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I5. 全量验证与门禁零命中
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I5 + Phase Details I5）、`docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`（前置依赖）
> Related: `docs/plans/2026-08-10-0925-1-cycle2-i3-adjudication.md`、`docs/plans/2026-08-09-2007-3-cycle1-i5-verification.md`（Cycle 1 同步骤先例）

## Purpose

在 Cycle 2 / I4 修复 + 门禁补强落地后，执行**全量仓库验证**并记录 **full-green** 基线：`pnpm typecheck` / `build` / `lint` / `test` / `check`（含扩展后 `check:ai-engine-invariants` **零命中——注册红 ⑥×3 + ⑧×1 清零确认**）+ 相关 e2e（AI 面）。收口状态：full-green 记录入 daily log、commit 标题显式声明、roadmap Cycle 2 / I5 行 flip ✅，为 I6-Cycle2 循环收口（稳态判定）提供已验证基线。

## Current Baseline

（live repo 核对，2026-08-10；依赖 Cycle 2 / I4 先收口）

- Cycle 2 / I4（plan `2026-08-10-0925-2`）为前置：13 条 K finding 修复 + 门禁 ⑥⑦⑨⑩②④ 扩展 + 注册红清零；未收口则本 plan 不得开工。
- 既有登记 red（验证时允许存在，**非本 plan 引入**，不得新增）：`check:audit-event-dispatch-ctx` 6 hits（`flux-renderers-industrial/src/binding/`，2026-08-09 已登记移交 industrial workstream）；`check:oversized-code-files` 2 条既有 locale 豁免（en-US.ts/zh-CN.ts）；`check:duplicates:detail` 非门禁归因（jscpd dump 固有 exit 1）。
- **Cycle 2 门禁注册红（I4 修复后预期清零）**：⑥×3 + ⑧×1（`check:ai-engine-invariants` 注册命中）——本 plan 的核心验证点之一：修复后零命中、`it.fails` 12 处全量翻转全绿。
- e2e 既有 watch-only 终态清单（不允许 ai-\*.spec 新增失败）：gantt-perf ×2 + kanban-perf ×1（60Hz 环境阈值不可达，watch-only）。
- AI 包测试基线（I4 前）：67 files / 544 passed + 12 expected fail；`pnpm test:scripts` 基线（含 committed 回归追加后数量，以 live 为准记录）。
- Cycle 1 / I5 先例：`2026-08-09-2007-3-cycle1-i5-verification.md`（full-green 口径 = 全量单测 + AI 面 e2e；全仓 e2e watch-only 终态为登记核对）。
- **roadmap 行来源注**：live repo 的 Work Item Status 表当前止于 Cycle 2 / I3（`todo`）；**Cycle 2 / I4 + I5 两行由 I3 plan（`2026-08-10-0925-1` Phase 3）按 Loop Rule 追加**——I3 收口为本 plan 的传递前置（I3 → I4 → I5 依赖链），执行时若核对 roadmap 找不到 I5 行，先核 I3 是否已追加。
- **非 watch-only 登记的前置 e2e 失败注**：`docs/logs/2026/08-10.md` 记录 HEAD 另存 pre-existing 非 AI 面 e2e 失败（scada-edge-cases ×2、route-coverage ×1 等，归属其他 workstream 缺断言），属其他 workstream 基线、不在本 claim 面；本 plan 的 full-green 口径（全量单测 + AI 面 e2e）不受影响。

## Goals

- 全量验证命令全部通过：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零**新增**命中，登记 red 允许）+ `pnpm test:scripts`。
- AI 包 focused 验证：`pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（含扩展后 invariants 套件 + 12 处 `it.fails` 翻转 + 全部回归）；`pnpm check:ai-engine-invariants` **零命中**（注册红 ⑥×3 + ⑧×1 清零确认）。
- 相关 e2e：AI 面 specs（`tests/e2e/ai-*.spec.ts` 13 文件）全绿，零新增失败（watch-only 终态清单之外不得有 failed）。
- full-green 记录：daily log（`docs/logs/2026/08-10.md`）显式记录测试数量/包摘要；commit 标题显式包含 `full-green verification`（AGENTS.md 纪律原文短语）。
- roadmap Cycle 2 / I5 行状态回写 ✅（附执行证据）。

## Non-Goals

- 不修任何验证失败项以外的代码（验证中发现的意外失败：先登记、按失败归属路由（I4 补修 / industrial workstream / watch-only），不在本 plan 内静默吞掉）。
- 不执行 I6-Cycle2 收口判定与 Cycle 3 派生（那是 I6 的职责）。
- 不做对抗探查 / 新审计。

## Scope

### In Scope

- 全量验证命令执行与结果记录（含 exit code、失败项归属登记）。
- AI 面 e2e 验证与 watch-only 清单核对。
- full-green 记录（daily log）+ commit（标题显式 full-green）+ roadmap Cycle 2 / I5 行回写。

### Out Of Scope

- 验证失败项的修复（除非属于 I4 残余、本 plan 只记录路由）。
- I6-Cycle2 循环收口与 Cycle 3 派生。
- 非 AI 面 e2e 的全量复跑（如需要按 e2e 既有分级跑 AI 面）。

## Failure Paths

| 场景              | 触发                                                                        | 行为                                                             | 可重试 | 用户可见表现       |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ | ------------------ |
| gate-red-new      | `pnpm check` 出现**未登记**新命中                                           | 按命中归属路由（I4 残余 → 退回 I4 / 新缺陷 → 登记移交），不吞掉  | 是     | `pnpm check` 红    |
| gate-red-residual | `check:ai-engine-invariants` 仍有命中（注册红未清零或 I4 引入未注册新命中） | 退回 I4 复核注册红清零契约，不标 full-green                      | 是     | 门禁红             |
| test-fail-new     | 全量/聚焦测试出现非 watch-only 失败                                         | 定位归属 → 退回 I4 或登记路由；本 plan 不静默降级                | 是     | 测试红             |
| e2e-ai-fail       | ai-\*.spec 出现 watch-only 清单外失败                                       | 按 e2e 诊断 guide 定位 → 退回 I4 或登记                          | 是     | `pnpm test:e2e` 红 |
| full-green-ok     | 全部通过                                                                    | 记录 + commit（标题显式 full-green）+ roadmap Cycle 2 / I5 行 ✅ | —      | 基线记录           |

## Test Strategy

本档选择：必须自动化

本 plan 的主体即验证执行（全部自动化命令）；记录与 commit 为收口动作。验证失败一律登记路由，不静默。

## Execution Plan

### Phase 1 — 全量静态验证

Status: planned
Targets: 仓库级命令执行

- Item Types: `Proof`

- [ ] Proof: `pnpm typecheck`（全部包）exit 0 —— 以 live 为准记录 tasks 数
- [ ] Proof: `pnpm build`（全部包）exit 0 —— 以 live 为准记录 tasks 数
- [ ] Proof: `pnpm lint` exit 0 —— 以 live 为准记录 tasks 数
- [ ] Proof: `pnpm check`——零新增命中；登记 red（industrial 6 hits / oversized locale 2 / duplicates 非门禁）逐条对照登记清单记录，任何**未登记**新命中按 Failure Paths 路由
- [ ] Proof: `pnpm check:ai-engine-invariants`（I4 扩展后）零命中 —— **注册红 ⑥×3 + ⑧×1 清零确认**（standalone 复跑，链尾被登记 red 中断时对齐先例）

Exit Criteria:

- [ ] 静态验证全部通过或失败项已登记路由（exit code + 输出记录入档）；`check:ai-engine-invariants` exit 0 零命中（注册红清零）

### Phase 2 — 全量测试验证

Status: planned
Targets: `pnpm test`、`pnpm test:scripts`、AI 面 e2e

- Item Types: `Proof`

- [ ] Proof: `pnpm test`（全部包）全绿，记录 task/测试数量 —— 以 live 为准记录（含 AI 包新用例）
- [ ] Proof: `pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（含扩展后 invariants 套件 + 12 处 `it.fails` 翻转 + 全部回归），记录 files/tests 数量 —— 零 expected fail 残留、零 unexpected pass
- [ ] Proof: `pnpm test:scripts` 全绿（含 I4 追加 committed 回归）
- [ ] Proof: AI 面 e2e（`tests/e2e/ai-*.spec.ts`）全绿；watch-only 终态清单（gantt-perf ×2 + kanban-perf ×1）为**登记核对**（不在本 phase 复跑），清单外零 failed

Exit Criteria:

- [ ] 测试验证全部通过或失败项已登记路由；AI 面 e2e 零新增 failed

### Phase 3 — full-green 记录与收口

Status: planned
Targets: `docs/logs/2026/08-10.md`、`docs/backlog/ai-invariant-loop-roadmap.md`、git commit

- Item Types: `Proof | Decision`

- [ ] Proof: daily log 记录 full-green 基线（命令逐项 exit code + 测试数量/包摘要 + watch-only 终态清单确认 + 登记 red 清单）。**full-green 口径显式注明**：本 claim 覆盖全量单测 + AI 面 e2e；全仓 e2e 的 3 条 watch-only failed（gantt-perf ×2 + kanban-perf ×1）为登记终态，不属本 claim 反例
- [ ] Decision: roadmap Cycle 2 / I5 行状态回写（`todo` → `✅`，附执行证据：plan 路径 + daily log 引用）；动态状态区注释同步
- [ ] Proof: `pnpm check:docs-garbled`（本 phase 新增/修改 docs：daily log + roadmap，对齐 Cycle 1 先例）
- [ ] Proof: git commit——标题显式包含 **`full-green verification`**（AGENTS.md commit 纪律），按 mission commitFormat（`fix(ai-invariant-loop): <description>`，纯记录场景用 `docs(ai-invariant-loop)` 对齐先例）；**仅 stage 本 plan 相关文件（daily log + roadmap + plan 自身），不含其他 workstream 变更**

Exit Criteria:

- [ ] daily log full-green 记录落档（含测试数量/包摘要）
- [ ] roadmap Cycle 2 / I5 行 ✅；commit 已含显式 full-green 声明

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_016b46674ffegzasnu2JrpRIqA`（fresh session，独立审查）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] roadmap Cycle 2 / I5 行在 live repo 尚不存在（由 I3 Phase 3 追加）→ Current Baseline 补「roadmap 行来源注」（I3 → I4 → I5 传递依赖链）
  - [Minor] 非 watch-only 登记的前置 e2e 失败（scada-edge-cases ×2 / route-coverage ×1）→ Current Baseline 补注（属其他 workstream 基线，不在本 claim 面）
  - [Minor] gate-red-residual 触发措辞 → 扩为「仍有命中（注册红未清零或 I4 引入未注册新命中）」
  - [Minor] commit staging 范围 → 补「仅 stage 本 plan 相关文件」

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 全量验证命令全部通过或失败项全部登记路由（零静默吞掉）
- [ ] `check:ai-engine-invariants` 零命中（I4 扩展后；注册红 ⑥×3 + ⑧×1 清零确认）
- [ ] AI 面 e2e 零新增 failed（watch-only 终态清单核对记录）
- [ ] full-green 基线记录入 daily log（测试数量/包摘要 + full-green 口径注明）；commit 标题显式 `full-green verification`；`check:docs-garbled` 通过
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect（验证失败项全部有归属路由）
- [ ] No owner-doc update required：本 plan 不改 live baseline / public contract / owner behavior（验证记录属 docs/logs，roadmap 状态回写属本图状态区，由 plan 生命周期驱动）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 非 AI 面 e2e 全量复跑

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 只验证 AI 面 e2e（mission scope = AI engine 不变式闭环）；非 AI 面（gantt/kanban perf 等）既有 watch-only 终态清单登记于项目基线，不属本图验证面；全量 e2e 复跑归属 I6-Cycle2 或既有 DV 基线流程（对齐 Cycle 1 / I5 先例）
- Successor Required: `no`

## Non-Blocking Follow-ups

- I6-Cycle2 收口时引用本 plan full-green 基线作为稳态判定（零新族 + 零违背 → 稳态暂停登记）的事实输入。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
