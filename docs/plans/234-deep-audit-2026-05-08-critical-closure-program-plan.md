# 234 Deep Audit 2026-05-08 Critical Closure Program Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-deep-audit-full/summary.md`, `docs/analysis/2026-05-08-deep-audit-full/{02-module-responsibility.md,04-state-ownership.md,06-async-safety.md,07-lifecycle.md,08-validation.md,14-test-coverage.md,19-error-fidelity.md}`
> Related: `docs/plans/{223-reactive-and-async-follow-up-closure-plan.md,224-validation-subtree-follow-up-plan.md,225-test-hardening-follow-up-plan.md,229-async-lifecycle-and-error-integrity-plan.md,231-source-substrate-and-code-editor-convergence-plan.md,232-open-ended-adversarial-review-2026-05-08-remediation-plan.md,235-workspace-test-hard-gate-closure-plan.md,236-validation-owner-critical-closure-plan.md,237-lifecycle-and-error-integrity-critical-closure-plan.md,238-spreadsheet-canonical-state-owner-closure-plan.md}`

## Purpose

把 `2026-05-08` 深度审核里已经过独立复核、且确实需要进入后续修改队列的 critical set 冻结下来，并拆成诚实的 owner-scoped successor plans。

这份计划本身不直接落代码修复。它的完成态是：本轮审计中确认的 P0/P1 与硬门禁项都有唯一 successor owner，且不存在 silent scope drop、把 confirmed defect 伪装成 non-blocking follow-up、或把明显过宽的修复集合硬塞进单一执行计划的情况。

## Current Baseline

- `docs/analysis/2026-05-08-deep-audit-full/summary.md` 已完成 20 个维度的深挖、维度复核与必要子项复核；最终统计为 deep findings 165，进入最终汇总 91 项，其中 P0 为 4 项、P1 为 14 项。
- 当前 confirmed P0/P1 横跨至少四类 owner surface：workspace test hard-gate、spreadsheet canonical state owner、validation owner、以及 lifecycle/error integrity。
- P0/P1 明细如下：`14-01`~`14-04`、`02-01`、`04-01`、`06-01`、`07-05`、`08-01`、`08-02`、`08-03`、`08-06`、`08-09`、`08-11`、`08-12`、`08-13`、`19-01`、`19-11`。
- 若直接把这些问题写进一个单文件直接执行计划，会同时混入 test boundary split、spreadsheet canonical owner、action retry cancellation、generic validation owner、detail/object-field non-form lifecycle、Flow Designer transaction safety 与 quick-edit result integrity，owner 面过宽，容易重演历史上的 over-broad plan 与 silent scope drop。
- 已完成计划 `223`、`224`、`225`、`229`、`231`、`232` 只用于 owner boundary comparison，不承接本轮新的 critical ownership；本轮 critical set 必须通过新的 successor plans 获得 repo-observable owner path。
- 根据 `docs/plans/00-plan-authoring-and-execution-guide.md`，已确认的 live defect、public-contract drift、owner-doc drift，以及已经进入固定检查脚本或 CI fail-fast 的规则，都不能在计划中被降级为 advisory 或“有时间再做”。

## Goals

- 冻结 `2026-05-08` 深度审核中已经通过复核的 critical correction set。
- 将这批 critical items 拆成可执行、可 closure-audit 的 successor plans，并给每条 critical item 指定唯一 owner path。
- 明确哪些 retained P2/P3 仅为 follow-up / optimization / watch-only residual，防止它们污染 critical closure queue。
- 为后续真正的代码修复计划建立一个诚实、可审计的 program baseline。

## Non-Goals

- 不在本计划中直接执行代码修复。
- 不把全部 91 个 retained items 再次包装成一个“总闭环执行计划”。
- 不重开已经 `completed` 的旧计划来假装承接本轮新增 confirmed critical items。
- 不把已在本轮 summary 中降级为低优先级/观察项的 01-10、02-04、06-06、10-11、14-13、17-01 重新提升成本计划 blocker。

## Scope

### In Scope

- `docs/analysis/2026-05-08-deep-audit-full/summary.md`
- `docs/analysis/2026-05-08-deep-audit-full/{02-module-responsibility.md,04-state-ownership.md,06-async-safety.md,07-lifecycle.md,08-validation.md,14-test-coverage.md,19-error-fidelity.md}`
- 本计划文件本身
- 本计划已创建并继续审阅的 successor plans `235`~`238`

### Out Of Scope

- 直接修改 `packages/**` 源码
- 直接修改 `docs/architecture/**` 与 component docs
- 本轮 retained P2/P3 的全部收口
- 再次重跑或重写本次 deep audit

## Critical Owner Matrix

| Item  | Successor Plan                                               | Owner Surface                      |
| ----- | ------------------------------------------------------------ | ---------------------------------- |
| 14-01 | `235-workspace-test-hard-gate-closure-plan.md`               | workspace test hard-gate           |
| 14-02 | `235-workspace-test-hard-gate-closure-plan.md`               | workspace test hard-gate           |
| 14-03 | `235-workspace-test-hard-gate-closure-plan.md`               | workspace test hard-gate           |
| 14-04 | `235-workspace-test-hard-gate-closure-plan.md`               | workspace test hard-gate           |
| 02-01 | `235-workspace-test-hard-gate-closure-plan.md`               | workspace test hard-gate           |
| 04-01 | `238-spreadsheet-canonical-state-owner-closure-plan.md`      | spreadsheet canonical state owner  |
| 08-01 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-02 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-03 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-06 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-09 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-11 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-12 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 08-13 | `236-validation-owner-critical-closure-plan.md`              | validation owner                   |
| 06-01 | `237-lifecycle-and-error-integrity-critical-closure-plan.md` | cancellation / lifecycle integrity |
| 07-05 | `237-lifecycle-and-error-integrity-critical-closure-plan.md` | lifecycle rollback integrity       |
| 19-01 | `237-lifecycle-and-error-integrity-critical-closure-plan.md` | transaction rollback integrity     |
| 19-11 | `237-lifecycle-and-error-integrity-critical-closure-plan.md` | non-throw ActionResult integrity   |

## Execution Plan

### Phase 1 - Freeze The Critical Correction Set

Status: completed
Targets: `docs/analysis/2026-05-08-deep-audit-full/summary.md`, relevant retained-dimension files listed in Scope

- Item Types: `Decision | Proof`

- [x] [Decision] Build one frozen matrix of all confirmed P0/P1 items from the 2026-05-08 audit and record the exact successor owner bucket for each item.
- [x] [Decision] Explicitly separate retained-but-non-critical items from this plan's blocking scope, with a recorded reason for why they do not block critical closure planning.
- [x] [Proof] Reconfirm that each `summary.md` P0/P1 item still has matching evidence in the per-dimension file after subitem review, and that no P1 item is missing a successor owner candidate.

Exit Criteria:

- [x] A frozen P0/P1 correction-set matrix exists and covers all 18 critical items.
- [x] No confirmed P0/P1 item remains in an ambiguous or ownerless bucket.
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Create The Workspace Test Hard-Gate Successor Plan

Status: completed
Targets: `docs/plans/235-workspace-test-hard-gate-closure-plan.md`

- Item Types: `Decision | Proof`

- [x] [Decision] Draft plan `235` to own `14-01`~`14-04` and `02-01`, treating the >700 test-file failures and `pnpm check:oversized-code-files` redline as non-degradable hard constraints.
- [x] [Decision] Keep plan `235` focused on test-boundary splitting, guard restoration, and focused verification only; do not silently absorb unrelated runtime correctness items.
- [x] [Proof] Record explicit closure gates in `235` requiring the oversized check to pass, the split files to retain the same behavior coverage surface, and owner-doc adjudication to remain explicit as `No owner-doc update required`.

Exit Criteria:

- [x] Plan `235` exists with explicit status, baseline, goals/non-goals, slice status, closure gates, and no silent scope drop.
- [x] All current P0 items and `02-01` are fully assigned to `235`.
- [x] `235` treats the `>700` guard as a hard gate, not as a follow-up or advisory item.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Create The Validation Owner Successor Plan

Status: completed
Targets: `docs/plans/236-validation-owner-critical-closure-plan.md`

- Item Types: `Decision | Proof`

- [x] [Decision] Draft plan `236` to own only validation-owner critical items `08-01`, `08-02`, `08-03`, `08-06`, `08-09`, `08-11`, `08-12`, `08-13`.
- [x] [Decision] Keep `236` focused on projected/generic validation owner semantics and non-form commit/revalidation correctness; do not expand it into spreadsheet state ownership, async cancellation, styling, or docs cleanup.
- [x] [Proof] Attach explicit owner-doc expectations for `form-validation.md` and any affected runtime docs, plus focused regression requirements for non-form/generic owner paths.

Exit Criteria:

- [x] Plan `236` exists with explicit ownership and closure criteria.
- [x] All listed `08-*` critical items are assigned to `236` with no owner overlap ambiguity.
- [x] `236` records focused proof requirements for generic/non-form owner and projected validation runtime semantics.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Create The Lifecycle And Error Integrity Successor Plan

Status: completed
Targets: `docs/plans/237-lifecycle-and-error-integrity-critical-closure-plan.md`

- Item Types: `Decision | Proof`

- [x] [Decision] Draft plan `237` to own `06-01`, `07-05`, `19-01`, and `19-11`, covering cancellation propagation, import rollback, transaction rollback/finally, and non-throw `ActionResult` save integrity.
- [x] [Decision] Keep `237` focused on lifecycle rollback and error/result integrity semantics; do not silently absorb lower-priority P2/P3 error-fidelity items unless they are required to prove the critical fix set.
- [x] [Proof] Require focused regression tests proving parent cancellation stops retry, failure paths do not leave hanging imports/transactions, and `ok:false` does not enter success UI state.

Exit Criteria:

- [x] Plan `237` exists with explicit ownership and closure criteria.
- [x] `06-01`, `07-05`, `19-01`, and `19-11` are fully assigned to `237`.
- [x] `237` requires focused verification for cancellation, rollback/finally coverage, and `ActionResult.ok` handling.
- [x] `237` explicitly records either affected owner-doc updates or `No owner-doc update required` for each slice that changes live lifecycle/error semantics.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Create The Spreadsheet Canonical State Owner Successor Plan

Status: completed
Targets: `docs/plans/238-spreadsheet-canonical-state-owner-closure-plan.md`

- Item Types: `Decision | Proof`

- [x] [Decision] Draft plan `238` to own `04-01` only, covering spreadsheet row/column size canonical ownership and removal of renderer-local persistent sizing state.
- [x] [Decision] Keep `238` focused on spreadsheet canonical owner semantics and proof of command/document convergence; do not silently absorb unrelated spreadsheet accessibility or performance cleanup.
- [x] [Proof] Require explicit owner-doc adjudication in `238`: update affected spreadsheet/report-designer design docs or record `No owner-doc update required` with evidence.

Exit Criteria:

- [x] Plan `238` exists with explicit ownership and closure criteria.
- [x] `04-01` is fully assigned to `238` with no overlap ambiguity.
- [x] `238` requires focused verification for canonical state-owner behavior and explicit owner-doc adjudication.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 6 - Independent Plan Review And Consensus Closure

Status: completed
Targets: this plan, successor plans `235`-`238`

- Item Types: `Proof | Decision`

- [x] [Proof] Run independent plan-review subagents against this program plan and every newly drafted successor plan.
- [x] [Decision] Revise this program plan until plan reviewers agree there is no over-broad scope, no hard-constraint leakage, and no missing critical owner path.
- [x] [Decision] Record the final review evidence and explicit approval outcome in this plan's closure section before marking it completed.

Exit Criteria:

- [x] Independent plan review returns explicit approval / consensus for this plan and all successor plans.
- [x] No confirmed P0/P1 item is silently deferred, downgraded, or left ownerless.
- [x] All newly created plans preserve necessary focused verification as closure-blocking, not advisory, for the defects they own.
- [x] All newly created plans explicitly encode owner-doc update obligations or `No owner-doc update required` where a slice changes live baseline, public contract, or owner behavior.
- [x] This file and all newly created plans pass the text-consistency check between Plan Status, slice status, exit criteria, closure gates, and `docs/logs/` status.
- [x] No owner-doc update required in this program plan itself.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope confirmed P0/P1 defects have a unique successor owner path.
- [x] All in-scope hard-gate issues remain classified as hard constraints in successor plans.
- [x] No in-scope confirmed live defect or contract drift is silently moved to vague follow-up.
- [x] Every successor plan contains explicit `Plan Status`, `Current Baseline`, `Goals` / `Non-Goals`, slice statuses, exit criteria, and closure gates.
- [x] Every successor plan preserves necessary focused verification as a closure blocker.
- [x] Every successor plan records owner-doc update obligations or explicit `No owner-doc update required` adjudication.
- [x] This plan itself passes the final text-consistency review before closure.
- [x] Independent subagent plan review has reached explicit approval / consensus and the evidence is recorded.

## Deferred But Adjudicated

### Retained Non-Critical Items Outside This Program

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this program plan only freezes and assigns the confirmed P0/P1 and hard-gate set; retained P2/P3 items remain tracked in `docs/analysis/2026-05-08-deep-audit-full/summary.md` and must be scheduled by separate owner plans rather than silently bundled here.
- Successor Required: yes
- Successor Path: `docs/analysis/2026-05-08-deep-audit-full/summary.md` plus future owner-scoped plans not yet drafted

## Closure

Status Note: Completed. The owner matrix remained stable through successor execution, all four successor plans are now closure-ready on the live repo, and independent plan review plus refreshed closure audit found no ownerless critical item, silent scope drop, or text-consistency drift.

Closure Audit Evidence:

- Reviewer / Agent: independent plan-review subagents
- Evidence:
- task `ses_1f48c4a68ffep4sbn08BQo8POl` first flagged over-broad `236`, missing owner split for `04-01`/`06-01`, and later converged to `APPROVE` after successor split and scope fixes.
- task `ses_1f48c4985ffe8JJa39Jcm4AvHB` first flagged missing closure/text-consistency gates and later converged to `APPROVE` after docs adjudication / focused verification gates were made explicit.
- task `ses_1f48c485cffe6I2GYFRPyaqM1B` first flagged successor ownership ambiguity and stale pre-successor wording, and later converged to `APPROVE` after `235`-`238` were created and `234` was rewritten as an owner-matrix/index plan.
- task `ses_1f3d7d6fcffeN1812fS1mT7gvS` re-checked the live repo after successor execution and confirmed `234`-`238` are closure-ready once stale docs are synchronized, with no remaining real blocker beyond doc/status sync and final verification recording.

Follow-up:

- no remaining plan-owned work.
