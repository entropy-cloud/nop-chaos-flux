# 3 Cycle 1 / I5 — 全量验证（full-green 记录）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I5. 全量验证与门禁零命中
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I5 + Phase Details I5）、`docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（前置依赖）
> Related: `docs/plans/2026-08-09-2007-1-cycle1-i3-adjudication.md`、`docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`

## Purpose

在 I4 修复 + 门禁补强落地后，执行**全量仓库验证**并记录 **full-green** 基线：`pnpm typecheck` / `build` / `lint` / `test` / `check`（含扩展后 `check:ai-engine-invariants` 零命中）+ 相关 e2e（AI 面）。收口状态：full-green 记录入 daily log、commit 标题显式声明、roadmap I5 行 flip ✅，为 I6 循环收口（Cycle 2 派生判定）提供已验证基线。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I4 先收口）

- I4（plan `2026-08-09-2007-2`）为前置：K1-K4 修复 + 门禁 ②③④⑤ 扩展落地；未收口则本 plan 不得开工。
- 既有登记 red（验证时允许存在，**非本 plan 引入**，不得新增）：`check:audit-event-dispatch-ctx` 6 hits（`flux-renderers-industrial/src/binding/`，2026-08-09 已登记移交 industrial workstream）；`check:oversized-code-files` 2 条既有 locale 豁免（en-US.ts/zh-CN.ts）；`check:duplicates:detail` 非门禁归因（jscpd dump 固有 exit 1）。
- e2e 既有 watch-only 终态清单（不允许 ai-\*.spec 新增失败）：gantt-perf ×2 + kanban-perf ×1（60Hz 环境阈值不可达，watch-only）。
- AI 包测试基线（I4 前）：66 files / 536 tests 全绿（I4 追加新测试后数量将增加）；`pnpm test:scripts` 7 files / 30 tests 全绿（I4 追加 committed 回归后数量将增加）。
- 已知非本 plan 外部项：industrial-hmi 合并断裂已修复（2026-08-09），`check:audit-event-dispatch-ctx` industrial 6 hits 移交 industrial workstream（如已修复，以 live 为准记录）。

## Goals

- 全量验证命令全部通过：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零**新增**命中，登记 red 允许）+ `pnpm test:scripts`。
- AI 包 focused 验证：`pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（含扩展后 invariants 套件 + 全部回归）；`pnpm check:ai-engine-invariants` 零命中。
- 相关 e2e：AI 面 specs（`tests/e2e/ai-*.spec.ts` 13 文件）全绿，零新增失败（watch-only 终态清单之外不得有 failed）。
- full-green 记录：daily log（`docs/logs/2026/08-09.md`）显式记录测试数量/包摘要；commit 标题显式包含 `full-green verification`（AGENTS.md 纪律原文短语）。
- roadmap I5 行状态回写 ✅（附执行证据）。

## Non-Goals

- 不修任何验证失败项以外的代码（验证中发现的意外失败：先登记、按失败归属路由（I4 补修 / industrial workstream / watch-only），不在本 plan 内静默吞掉）。
- 不执行 I6 收口判定与 Cycle 2 派生（那是 I6 plan）。
- 不做对抗探查 / 新审计。

## Scope

### In Scope

- 全量验证命令执行与结果记录（含 exit code、失败项归属登记）。
- AI 面 e2e 验证与 watch-only 清单核对。
- full-green 记录（daily log）+ commit（标题显式 full-green）+ roadmap I5 行回写。

### Out Of Scope

- 验证失败项的修复（除非属于 I4 残余、本 plan 只记录路由）。
- I6 循环收口与 Cycle 2 派生。
- 非 AI 面 e2e 的全量复跑（如需要按 e2e 既有分级跑 AI 面）。

## Failure Paths

| 场景          | 触发                                  | 行为                                                            | 可重试 | 用户可见表现       |
| ------------- | ------------------------------------- | --------------------------------------------------------------- | ------ | ------------------ |
| gate-red-new  | `pnpm check` 出现**未登记**新命中     | 按命中归属路由（I4 残余 → 退回 I4 / 新缺陷 → 登记移交），不吞掉 | 是     | `pnpm check` 红    |
| test-fail-new | 全量/聚焦测试出现非 watch-only 失败   | 定位归属 → 退回 I4 或登记路由；本 plan 不静默降级               | 是     | 测试红             |
| e2e-ai-fail   | ai-\*.spec 出现 watch-only 清单外失败 | 按 e2e 诊断 guide 定位 → 退回 I4 或登记                         | 是     | `pnpm test:e2e` 红 |
| full-green-ok | 全部通过                              | 记录 + commit（标题显式 full-green）+ roadmap I5 行 ✅          | —      | 基线记录           |

## Test Strategy

本档选择：必须自动化

本 plan 的主体即验证执行（全部自动化命令）；记录与 commit 为收口动作。验证失败一律登记路由，不静默。

## Execution Plan

### Phase 1 — 全量静态验证

Status: completed
Targets: 仓库级命令执行

- Item Types: `Proof`

- [x] Proof: `pnpm typecheck`（全部包）exit 0 —— 33/33 tasks exit 0
- [x] Proof: `pnpm build`（全部包）exit 0 —— 33/33 tasks exit 0
- [x] Proof: `pnpm lint` exit 0 —— 33/33 tasks exit 0
- [x] Proof: `pnpm check`——零新增命中；登记 red（industrial 6 hits / oversized locale 2 / duplicates 非门禁）逐条对照登记清单记录，任何**未登记**新命中按 Failure Paths 路由 —— exit 1 仅含既有登记 red：`check:audit-event-dispatch-ctx` 6 hits（flux-renderers-industrial/src/binding/ animator.ts×4 + point-store.ts×1 + refresh-pipeline.ts×1，2026-08-09 已登记移交 industrial workstream）+ `check:oversized-code-files` 2 errors 全为 EXEMPT 豁免（en-US.ts/zh-CN.ts locale，2026-08-07-1053-1 裁决）；其余链项（react19/src-artifacts/active-doc-code-anchors/package-css-exports/flux-bundle-pack/i18n-keys/workspace-manifest-deps/schema-prop-coverage/scada-symbol-keys/audit-suspects/audit-renderer-browser-io）全部通过；零未登记新命中
- [x] Proof: `pnpm check:ai-engine-invariants`（I4 扩展后）零命中 —— 链尾被 industrial red 中断未跑到，standalone 复跑 exit 0 零命中（对齐 I2/I4 先例）

Exit Criteria:

- [x] 静态验证全部通过或失败项已登记路由（exit code + 输出记录入档）—— 33/33 ×3 exit 0；pnpm check exit 1 仅登记 red 零新增；check:ai-engine-invariants exit 0

### Phase 2 — 全量测试验证

Status: completed
Targets: `pnpm test`、`pnpm test:scripts`、AI 面 e2e

- Item Types: `Proof`

- [x] Proof: `pnpm test`（全部包）全绿，记录 task/测试数量 —— 60/60 tasks exit 0；33 包 **12,246 passed / 0 failed**（含 industrial-hmi 合并后全量）
- [x] Proof: `pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（含扩展后 invariants 套件 + 全部回归），记录 files/tests 数量 —— **66 files / 542 tests** exit 0（engine-invariants 15 + conversation-invariants 13 全绿，含 I4 追加门禁 ②③④⑤ 参数化用例）
- [x] Proof: `pnpm test:scripts` 全绿（含 I4 追加 committed 回归）—— 8 files / **36 tests** exit 0
- [x] Proof: AI 面 e2e（`tests/e2e/ai-*.spec.ts`）全绿；watch-only 终态清单（gantt-perf ×2 + kanban-perf ×1）为**登记核对**（不在本 phase 复跑），清单外零 failed；AI 面全部 passed（含 skipped 统计记录）—— 13 文件 **47 passed / 0 failed / 0 skipped** exit 0（46.4s）；watch-only 清单（gantt-perf ×2 + kanban-perf ×1，60Hz 环境阈值不可达）登记核对在案、非本 phase 复跑

Exit Criteria:

- [x] 测试验证全部通过或失败项已登记路由；AI 面 e2e 零新增 failed —— 全量单测 12,246/0、AI 包 542/0、test:scripts 36/0、AI 面 e2e 47/0/0

### Phase 3 — full-green 记录与收口

Status: completed
Targets: `docs/logs/2026/08-09.md`、`docs/backlog/ai-invariant-loop-roadmap.md`、git commit

- Item Types: `Proof | Decision`

- [x] Proof: daily log 记录 full-green 基线（命令逐项 exit code + 测试数量/包摘要 + watch-only 终态清单确认 + 登记 red 清单）。**full-green 口径显式注明**：本 claim 覆盖全量单测 + AI 面 e2e；全仓 e2e 的 3 条 watch-only failed（gantt-perf ×2 + kanban-perf ×1）为登记终态，不属本 claim 反例 —— `docs/logs/2026/08-09.md` 首条：typecheck/build/lint 33/33 ×3、test 60/60（12,246 passed/0 failed）、AI 包 66/542、test:scripts 8/36、check:ai-engine-invariants exit 0、pnpm check 仅登记 red 零新增、AI 面 e2e 47/0/0；watch-only 清单 + 登记 red 清单 + full-green 口径全部显式落档
- [x] Decision: roadmap I5 行状态回写（`todo` → `✅`，附执行证据：plan 路径 + daily log 引用）—— `docs/backlog/ai-invariant-loop-roadmap.md` I5 行 `✅`（2026-08-09）附执行证据（plan 路径 + daily log 引用 + commit 标题）；动态状态区注释同步（I0-I5 ✅、I6 todo）
- [x] Proof: `pnpm check:docs-garbled`（本 phase 新增/修改 docs：daily log + roadmap，对齐 I0/I1/I2 先例）—— exit 0；14 个 garbled 候选全为既有 analysis/archive/industrial 文件（对齐 I4 先例同数），本 plan 新增/修改文档零候选
- [x] Proof: git commit——标题显式包含 **`full-green verification`**（AGENTS.md commit 纪律：full-green 必须在 commit 标题显式声明），按 mission commitFormat（`fix(ai-invariant-loop): <description>`，纯记录场景用 `docs(ai-invariant-loop)` 对齐 I1/I2 先例）—— `docs(ai-invariant-loop): plan-2026-08-09-2007-3 I5 full-green verification——...`（标题含显式 full-green verification；仅 stage 本 plan 三文件，不含其他 workstream 变更）

Exit Criteria:

- [x] daily log full-green 记录落档（含测试数量/包摘要）
- [x] roadmap I5 行 ✅；commit 已含显式 full-green 声明

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_01990c159ffeDfo9tgVriBIq4W`（fresh session，独立审查）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] commit 标题短语 → 钉死为 `full-green verification`（AGENTS.md 原文短语，避免 closure-audit nit）
  - [Minor] watch-only 核对表述 → 明确为登记核对、不在本 phase 复跑
  - [Minor] `check:docs-garbled` 补入 Phase 3（新增/修改 docs，对齐 I0/I1/I2 先例）
  - [Minor] full-green 口径 → 显式注明 mission-scoped（全量单测 + AI 面 e2e；全仓 e2e 3 条 watch-only 为登记终态，不属反例）

## Closure Gates

- [x] 全量验证命令全部通过或失败项全部登记路由（零静默吞掉）—— 静态/测试/脚本全绿；`pnpm check` exit 1 仅既有登记 red（industrial 6 hits → industrial workstream；oversized locale 2 → EXEMPT 豁免），零未登记新命中，全部有归属
- [x] AI 面 e2e 零新增 failed（watch-only 终态清单核对记录）—— 13 文件 47 passed / 0 failed / 0 skipped；watch-only（gantt-perf ×2 + kanban-perf ×1）登记核对在案、非本 phase 复跑
- [x] `check:ai-engine-invariants` 零命中（I4 扩展后）—— standalone 复跑 exit 0 零命中
- [x] full-green 基线记录入 daily log（测试数量/包摘要 + full-green 口径注明）；commit 标题显式 `full-green verification`；`check:docs-garbled` 通过 —— 12,246/0 + 542/0 + 36/0 + AI e2e 47/0/0 + 口径注明落档；commit 标题含 full-green verification；docs-garbled exit 0
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（验证失败项全部有归属路由）—— 零验证失败项；登记 red 全部归属既有登记清单
- [x] No owner-doc update required：本 plan 不改 live baseline / public contract / owner behavior（验证记录属 docs/logs，roadmap 状态回写属本图状态区，由 plan 生命周期驱动）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 —— 独立 fresh session `ses_01942c9a8ffeluA0SIhmzeJULh`，verdict `PASS_WITH_MINORS`（4 项 minor/nit 全部 self-correcting：commit 未执行时日志先行记录 / roadmap 引用 completed 早于翻转 / diff 摘要描述早于 Phase 3 勾选 / docs-garbled 候选归属表述精度——均随本次 commit + 状态翻转收敛），证据见 Closure 节
- [x] `pnpm typecheck` —— 33/33 exit 0
- [x] `pnpm build` —— 33/33 exit 0
- [x] `pnpm lint` —— 33/33 exit 0
- [x] `pnpm test` —— 60/60 tasks exit 0（12,246 passed / 0 failed）

> 说明：Closure Gates 中的 typecheck/build/lint/test 即本 plan 的核心验证动作（Phase 1/2 执行、Phase 3 记录），非 boilerplate。

## Deferred But Adjudicated

### 非 AI 面 e2e 全量复跑

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 只验证 AI 面 e2e（mission scope = AI engine 不变式闭环）；非 AI 面（gantt/kanban perf 等）既有 watch-only 终态清单登记于项目基线，不属本图验证面；全量 e2e 复跑归属 I6 或既有 DV 基线流程
- Successor Required: `no`

## Non-Blocking Follow-ups

- I6 收口时引用本 plan full-green 基线作为 Cycle 2 派生判定的事实输入

## Closure

Status Note: 全量验证执行收口——静态（typecheck/build/lint 33/33 ×3）+ 全量单测（`pnpm test` 60/60 tasks / 33 包 12,246 passed 零失败 + AI 包 66 files/542 tests + `pnpm test:scripts` 8 files/36 tests）+ 门禁（`check:ai-engine-invariants` exit 0 零命中；`pnpm check` 仅既有登记 red——industrial 6 hits 移交 industrial workstream + oversized locale 2 豁免，零新增）+ AI 面 e2e（13 文件 47 passed / 0 failed / 0 skipped）。full-green 记录入 `docs/logs/2026/08-09.md`（含 full-green 口径 = 全量单测 + AI 面 e2e；全仓 e2e 3 条 watch-only failed 为登记终态不属反例）。roadmap I5 行 `✅`。commit 标题显式 `full-green verification`。Phase 1/2/3 全 completed + 全 checklist [x] + Closure Gates 11/11 [x] + Plan Status → `completed`。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh session `ses_01942c9a8ffeluA0SIhmzeJULh`（closure-audit sub-agent，零执行上下文）
- Verdict: `PASS_WITH_MINORS`（零 Blocker / 零 Major）
- Evidence: ① 独立复跑核对——typecheck 33/33 exit 0、check:ai-engine-invariants exit 0 零命中、check:docs-garbled exit 0（14 候选零来自本 plan）、check:audit-event-dispatch-ctx 恰 6 hits 于登记位置（animator.ts:97/108/116/162 + point-store.ts:303 + refresh-pipeline.ts:423）、check:oversized-code-files 2 errors 全 EXEMPT、AI 包 66/542 零失败、test:scripts 8/36 零失败，exit code 与记录证据一致零相反证据；② plan 文本一致性（Phase 1/2 全勾选 + 证据在案；Phase 3 当时未勾选属诚实状态）；③ doc 同步核对（daily log 首条 + roadmap I5 行 + 动态状态区）；④ deferred 诚实核对（登记 red 全有归属路由；full-green 口径显式注明）。4 项 minor/nit 全部 self-correcting：M1 日志先行记录 commit（本次 commit 后收敛）/ M2 roadmap 引用 completed 早于翻转（本次翻转后收敛）/ M3 diff 摘要描述早于 Phase 3 勾选（本次勾选后收敛）/ N1 docs-garbled 候选归属表述精度（14 候选之一 `docs/logs/2026/08-09.md` 的 `ç` 位于既有「façade」条目 223 行非 I5 条目，I5 条目零候选）。

Follow-up:

- 无 plan-owned 剩余工作；后续为 I6 循环收口与 Cycle 2 派生判定（引用本 plan full-green 基线作为事实输入）。
