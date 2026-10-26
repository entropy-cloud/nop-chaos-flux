# 765 B1 计划状态机修复：active 滞留头部翻转与矛盾清理（深度审计 B 组 remediation）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/analysis/2026-10-27-deep-audit-report.md` B1–B5；plan `625`（状态机维护，已 completed 但一周内回潮）
> Related: plan `764`（A 组，先执行——762 的处置影响 active 集合）

## Purpose

把「Exit Criteria 全勾 + closure 证据已在文内，但 header 仍 `active`」的计划状态漂移一次性清零，并为三份矛盾 plan（730/748/651）补齐诚实状态。收口后 header 级 `grep '^> Plan Status: active'` 的命中集 = 真实 in-flight（628/707/737，另加执行期新 plan）。

## Current Baseline

- 14 份 plan 全勾（`[ ]` 计数 = 0）+ closure note 已写但 header `active`：638/639/643/648/649/652/704/705/706/712/713/714/719/763。抽查证明工作已落地（712 `showStrength` 于 input.tsx；639 `syncScroll` 于 use-gantt-scroll.ts:27）。
- 730：closure 项同时存在 `[x]`（:116）与 `[ ]`（:118），header active。
- 748：声称实现与门禁全绿，但全文 0 勾选框、无 closure-audit 节。
- 651：唯一未勾项锚定 gitignored `_tmp/fm7-sweep.md`，在仓内不可验证（其中「per-package typecheck+suite 验证」子项已由已勾 Exit Criterion + auditor `agent_0580eee5` 证据承载，Deferred 只针对 `_tmp` 锚定面）。
- 741（审计复检补入）：header `active`、0 未勾项、仅 31 行、**无 closure-audit 节**——与 748 同一漂移类，同处置（独立补审后据实翻转）。
- 同前缀歧义：`643-`（目标 `643-cross-roadmap-ur18-19-20-wave-e-plan.md`，另一份 `643-final-maturity-fm2-code-quality-audit-plan.md` 有 1 未勾项）；`719-`（目标 `719-arc-g4i-code-block-implement.md`，另一份 `719-audit-r2-r1.1-owner-doc-drift-fix-plan.md` 有 2 未勾项）——均按全文件名处置。
- 编号歧义：`713` 有两份文件——`713-arc-g2d-inline-edit-design.md` 已 `completed`，本 plan 目标是 `713-audit-r2-mr2-code-tests-expander-plan.md`（active）。
- 628（backlog track，0/84）、707（13/16）、737（1/14）为真实 in-flight；762 归 plan 764 处置。
- Minimum Rule 21 允许对「未 completed」的活跃计划修正状态文本（这不是回写历史 completed 计划）。

## Goals

- 14 份全勾 plan：逐份核验文内 closure-audit 证据存在后，header 翻转为 `completed`、Last Reviewed 更新。
- 730 去矛盾（保留 `[x]`、删除重复 `[ ]` 行）→ `completed`。
- 748：补齐勾选状态须以独立子代理补审为前提——执行独立 closure audit，据实结果处置（通过 → 补勾 + completed；不通过 → 保持 active 并登记缺口）。
- 651：将 `_tmp` 锚定项改判为 `Deferred But Adjudicated`（watch-only residual / 证据已随 plan 文本入库的等价声明），随后按其实际勾选状态处置。
- daily log 记录本次状态机维护；在 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 Lessons 或维护建议中补一条「closure 提交同 commit 必须含 header 翻转」防回潮条款（Rule 9 的执行侧强化，不改既有规则语义）。

## Non-Goals

- 不重开任何已收口工作的实现；不为 628/707/737 推进任何执行项。
- 不按新模板重写历史 plan 正文（Rule 21）。
- 762 的处置归 plan 764。

## Scope

### In Scope

- 上列 14+3 份 plan 文件的状态文本修正
- guide 防回潮条款（一处追加）
- daily log

### Out Of Scope

- 任何代码、测试、门禁脚本改动
- 628/707/737/762 的执行

## Test Strategy

本档选择：`不适用：纯文档状态修正，无行为变更`。

## Execution Plan

### Phase 1 - 逐份核验与翻转

Status: completed
Targets: `docs/plans/{638,639,643,648,649,652,704,705,706,712,713-audit-r2-mr2-code-tests-expander,714,719,763,730,748,741,651}` 对应 `*.md` 全文件名

- Item Types: `Fix`

- [x] 14 份全勾 plan 逐份核验（Review 子代理 R1/R2 已核 auditor id 存在；执行期脚本复核 `[ ]`=0 + Auditor 字段存在）→ 全部翻转 completed + Last Reviewed 2026-10-27
- [x] 730：删重复未勾行（superseded 预执行清单行），header→`completed`
- [x] 748、741：fresh 子代理独立 closure audit（`agent_2d8cd1a6`）——741 `issues` 仅 R3.4 行漏翻转 → 已修并 completed；748 `issues`（MA8.3-002 未落地 + 双回写缺失）→ 保持 active，缺口移交 Plan D（见 Deferred）

Exit Criteria:

- [x] 两份 plan 据实处置：741 修一行后 completed；748 保持 active + Deferred 登记
- [x] 651：`_tmp` 锚定面移入 Deferred But Adjudicated（验证实质由已勾核验 + auditor `agent_0580eee5` 承载）→ completed

Exit Criteria:

- [x] `grep -l '^> Plan Status: active' docs/plans/*.md`（header 锚定）命中集 = {628, 707, 737, 748} ∪ 执行期新 plan（765 等）——748 为补审未通过而显式登记的 plan，符合 exit criterion 分支

### Phase 2 - 防回潮与记录

Status: completed
Targets: `docs/plans/00-plan-authoring-and-execution-guide.md`、daily log

- Item Types: `Follow-up`

- [x] 审计报告 B5 行 741 就地勘误落文（2026-10-27 已落）
- [x] guide「When Closing The Plan」Rule 9 的回写枚举就地扩一行：「…Deferred 补录、`Plan Status` header 翻转与 slice `Status` 同步」（Rule 9 显式化，不另立平行条款；引用本次回潮实例）
- [x] daily log 记录本次维护（翻转清单 + 748 audit 结论）

Exit Criteria:

- [x] guide 条款落文；daily log 落文

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_db4b196c`（R1）+ `agent_e5ccef6e`（R2，因 R1 审阅会话恢复失败改派 fresh）
- Verdict: `pass-with-minors`（R1 fail：1 Major / 4 Minor 全部修正；R2 0B/0M/4m）
- Rounds: 2
- Findings addressed: R1 Major = 741 遗漏（补入三处 + 审计报告勘误）；Minors = header 锚定 grep、651 deferral 拆分、Rule 9 就地扩行、713 全文件名。R2 4 Minors 落文：643/719 全文件名、exit criterion 补「补审未通过」分支、本 plan 自身 closure-audit gate 项、审计报告 B5 勘误（已落）。

## Closure Gates

- [x] Phase 1 命中集断言成立（audit 独立复验：active 集 = {628,707,737,748,765}）
- [x] 由独立子 agent（fresh session）执行的本 plan closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] 748 独立 closure audit 完成且处置诚实（`agent_2d8cd1a6` issues → 保持 active + Deferred 登记，audit 独立复核 748 各项缺口声称全部属实）
- [x] guide 防回潮条款与 daily log 落文
- [x] 无被静默降级的 in-scope live defect（748 的 MA8.3-002 缺口显式 Deferred → Plan D，非静默）
- [ ] 纯文档 plan：`pnpm typecheck`/`build`/`lint`/`test` 按 guide 可删——保留 `pnpm check` 一项
- [x] `pnpm check` exit 0（2026-10-27 实测，audit 复跑确认）

## Deferred But Adjudicated

### 748（P1-MA8.3-002 未落地 + arm2-index/roadmap 回写缺失）

- Classification: `out-of-scope improvement`（对 765 而言——765 是状态机修复，不实现门禁）；对 Plan D 为 in-scope Fix
- Why Not Blocking Closure: 765 的交付面是「状态与仓库实况一致」——748 保持 active 且缺口显式登记正是该交付的诚实态；MA8.3-002 的实现属门禁治理工作，归 Plan D
- Successor Required: `yes`
- Successor Path: Plan D 落地 MA8.3-002（audit:deps 基线化 + 入链或显式豁免）并回写 arm2-index 三行 + roadmap R3.11/R3.12 后，回 748 补 closure audit 收口

### 证据缺失不翻转的 plan（如有）

- Classification: `watch-only residual`（执行时据实登记）
- Why Not Blocking Closure: 缺独立 audit 证据的计划保持 active 是状态机的诚实态，不阻塞本 plan 对其余计划的收口
- Successor Required: `yes`（补审后单独翻转）
- Successor Path: 执行期登记或并入后续审计轮

## Non-Blocking Follow-ups

- 628/707/737 的执行推进归各自 plan。

## Closure

Status Note: 2026-10-27 收口。19 份 plan 状态翻转（14 全勾 + 730 去矛盾 + 651 改判 + 741 补一行回写 + 748 据实保持 active）；active 集从 21 份收敛为 {628, 707, 737, 748} + 执行期新 plan；guide Rule 9 扩「header 翻转与 slice Status 同步」防回潮。748 的实质缺口（MA8.3-002 + 双回写）显式移交 Plan D。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_3607bdba`（2026-10-27）
- Evidence: verdict `approved`（0B/0M/2m）；独立复验 active 集、14 份抽样 + 730/651 证据、741 代码修复（kanban-board.tsx / use-kanban-dnd.ts）与 R3.4 行、748 各缺口声称全部属实、`pnpm check` 复跑 exit 0。2 Minor 当场处置：①Phase 2 勾选随本 closure 同 commit 翻转；②651 Deferred 具名节补录（已在本次提交）。

Follow-up:

- 748 收口（MA8.3-002 落地 + 回写）→ Plan D；628/707/737 推进归各自 plan。
