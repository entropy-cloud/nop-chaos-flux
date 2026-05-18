# 357 Open-Ended Adversarial Review 2026-05-18 Compiler Validation Hot-Path Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md` (Finding 6), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/form-validation.md`

## Purpose

收口 compiler validation hot-path performance surface 的单一 finding：`collectValidationModel()` 目前用 `queue.shift()` / `queue.unshift(...)` 做 BFS，形成 O(n^2) 行为。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix hot-path baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R1-6` 是单一 performance hotspot finding，但在 `2026-05-18` summary 中被列为 High-severity structural risk；因此本计划不能把它机械降级成“以后再说”的优化项。
- 该问题属于 compile-time validation-model traversal，不属于 generic runtime perf、expression evaluation、或 validation semantics contract drift。
- 当前 live baseline 还没有关于大 schema compile latency 的显式 owner-doc promise；本计划需要先判断这是必须立即修复的 supported-baseline blocker，还是可以在有证据前提下被诚实裁定为 non-blocking residual。

## Goals

- Re-audit `R1-6` against the supported baseline instead of inheriting the severity label blindly.
- Either remove the O(n^2) traversal from the hot path or honestly adjudicate it with evidence and explicit non-blocking rationale.

## Non-Goals

- 不接管 compiler/action shape-validation fidelity defects；那部分由 Plan `352` owning。
- 不做 generic compiler performance program。
- 不用 vague optimization wording 隐藏 in-scope hotspot。

## Scope

### In Scope

- `R1-6`
- `packages/flux-compiler/src/schema-compiler/validation-collection.ts`
- any minimal focused benchmark/test/proof needed to justify fix vs adjudication
- `docs/architecture/form-validation.md` if the supported compile-time validation-performance baseline changes owner-doc-visible guidance
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R1-1`
- runtime validation execution performance
- unrelated compiler traversal cleanup

## Execution Plan

### Phase 1 - Re-Audit Supported Performance Baseline

Status: completed
Targets: `validation-collection.ts`, focused proof/measurement, this plan

- Item Types: `Decision | Proof`

- [x] Re-audit the O(n^2) traversal against one explicit benchmark/proof surface: named workload shape, node-count scale, and compile-time behavior observable in-repo.
- [x] Decide whether `R1-6` is a must-fix supported-baseline blocker or an honestly non-blocking optimization residual.
- [x] Add the named proof/measurement artifact sufficient to support that decision.

Exit Criteria:

- [x] The plan records one explicit decision for `R1-6`: fix now or adjudicate with evidence.
- [x] The decision is backed by repo-observable proof or measurement with explicit workload shape and decision rule, not severity-label inertia.
- [x] Owner-doc impact is explicitly decided: `No owner-doc update required` is explicit because the form-validation owner doc did not promise the broken queue implementation or a separate compile-time performance contract.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Fix Or Honest Adjudication

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/validation-collection.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Fix `R1-6`, or populate `Deferred But Adjudicated` with explicit evidence that it remains non-blocking on the supported baseline.

Exit Criteria:

- [x] `R1-6` is fixed or explicitly adjudicated with evidence and non-blocking rationale.
- [x] Any chosen code change has focused proof, and any no-code adjudication has explicit supporting evidence.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed decision.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests or proof artifacts added or modified in Phases 1-2.
- [x] If code changes land, run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`; if closure remains docs/proof-only with no repo changes beyond docs, explicitly remove the non-applicable gates before marking the plan completed.
- [x] Record execution and verification evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/proof, and verification results.

Exit Criteria:

- [x] Focused verification has passed.
- [x] If code changes land, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass; if closure is docs/proof-only with no repo changes beyond docs, those hard gates are explicitly removed before the plan is marked completed.
- [x] Independent closure audit confirms no dishonest downgrade or scope inflation around `R1-6`.
- [x] Closure audit explicitly re-checks the named proof/measurement artifact used to classify `R1-6`.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] `R1-6` is fixed or honestly adjudicated.
- [x] The plan does not overstate a single hot-path performance residual into a broader compiler rewrite.
- [x] Necessary proof or adjudication evidence exists.
- [x] No in-scope residual is silently dropped.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] If code changes land, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are run and recorded; if closure is docs/proof-only with no repo changes beyond docs, those hard gates are explicitly removed before closure.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. `collectValidationModel()` no longer uses `queue.shift()` / `queue.unshift(...)` on the root traversal hot path, and `packages/flux-compiler/src/validation-collection.test.ts` now contains a named large-root regression proof that fails if those queue operations return.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent closure audit `ses_1c63fd605ffeJCKRcr7zDfq3aD`.
- Evidence: focused proof `pnpm vitest run --environment happy-dom "packages/flux-compiler/src/validation-collection.test.ts" --exclude ".stryker-tmp/**"` passed with `21 passed`, including the large-root shift/unshift regression guard, and the fresh reviewer re-checked `packages/flux-compiler/src/schema-compiler/validation-collection.ts` plus that proof artifact and found no remaining plan-owned blocker.

Follow-up:

- None.
