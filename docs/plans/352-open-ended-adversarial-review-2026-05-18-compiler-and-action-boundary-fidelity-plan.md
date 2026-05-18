# 352 Open-Ended Adversarial Review 2026-05-18 Compiler And Action Boundary Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md` (Findings 1, 2, 3), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-02.md` (Findings 4, 8), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/schema-file-validator.md`

## Purpose

收口 action boundary fidelity surface 的 4 个 defects：action runner 结果归一化不一致、built-in action 的 `invocation!` 潜在崩溃、`onSettled` shape validation 缺失、以及 action `when` 字段 shape validation 缺失。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix boundary gaps that this plan started from. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R1-2`, `R1-3`, `R2-4`, `R2-8` 共享一个 action boundary fidelity surface：runtime 已支持这些 action branches / fields / dispatch paths，但 compile-time validation 与 dispatch-time normalization coverage 不完整。
- 这组问题横跨 `packages/flux-compiler` 与 `packages/flux-action-core`，共享的结果面是：supported action boundary behavior 目前在 validation / normalization / invocation safety 上仍有缺口。
- 当前 live baseline 对 `then` / `onError` 有 shape validation，对 `onSettled` / `when` 没有；对 namespaced/named action runner 有 `normalizeActionResult`，对 component/built-in runner 没有。

## Goals

- Make compile-time action shape coverage match the runtime-supported action surface.
- Make all dispatch entry paths normalize adapter/built-in results consistently.
- Remove normalization and invocation-safety hazards that make supported action-boundary behavior latent-crash prone or validation-incomplete.

## Non-Goals

- 不接管 runtime scope lifecycle defects。
- 不接管 renderer button/type semantics 或 flow-designer transaction defects。
- 不做 generic compiler performance work；`R1-6` 由 Plan `357` owning。

## Scope

### In Scope

- `R1-2`
- `R1-3`
- `R2-4`
- `R2-8`
- `packages/flux-compiler/src/{schema-compiler.ts,action-compiler.ts,schema-compiler/target-enrichment.ts,schema-compiler/shape-validation-rules.ts}`
- `packages/flux-action-core/src/action-dispatcher/{action-runners.ts,built-in-actions.ts,action-execution.ts}`
- focused tests and relevant architecture docs
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/schema-file-validator.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R1-6`
- `R3-1`
- `R2-6`
- generic compiler refactoring not required by the four in-scope defects

## Execution Plan

### Phase 1 - Freeze Supported Compile/Dispatch Boundary Baseline

Status: completed
Targets: touched compiler/action-core files, focused tests, owner docs

- Item Types: `Decision | Proof`

- [x] Re-audit the four in-scope defects as one action-boundary fidelity family and record the supported baseline.
- [x] Add or update focused proof for `onSettled` / `when` validation coverage, runner normalization, and built-in action dispatch safety.
- [x] Decide whether owner-doc wording needs updates for the supported action/validation boundary.

Exit Criteria:

- [x] The plan records one explicit baseline for compile-time action shape coverage, dispatch normalization, and built-in invocation safety.
- [x] Focused proof exists for each in-scope defect family.
- [x] Affected owner-doc update needs are explicitly decided as `No owner-doc update required`; the current action-algebra and schema-validator docs already describe the supported surface that the code now matches.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Boundary Fidelity Fixes

Status: completed
Targets: compiler/action-core implementation files and focused tests

- Item Types: `Fix | Proof`

- [x] Fix `R1-2` so all supported action runner paths normalize returned `ActionResult` consistently before classification.
- [x] Fix `R1-3` so built-in action invocation no longer relies on a latent-crash `invocation!` path.
- [x] Fix `R2-4` so `onSettled` receives the same compile-time shape validation coverage as the already-supported action branches.
- [x] Fix `R2-8` so action `when` fields are validated against one supported baseline instead of only being double-cast at compile time.

Exit Criteria:

- [x] Compile-time and runtime-supported action surfaces are aligned for the in-scope branches/fields.
- [x] All supported action runner paths normalize results consistently before classification.
- [x] Supported action-boundary behavior for the touched surface no longer relies on incomplete validation, missing normalization, or latent invocation hazards.
- [x] Focused proof is green for all four in-scope defects.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification for all in-scope defects has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Affected owner docs are confirmed current, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records execution, verification, and doc-sync evidence.
- [x] Independent closure audit confirms no remaining plan-owned compiler/action boundary blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R1-2`, `R1-3`, `R2-4`, `R2-8`) are fixed.
- [x] Compiler and action boundary fidelity converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. Component and built-in action runners now normalize returned action results consistently, built-in dispatch no longer relies on `invocation!`, and schema validation now covers action `when` plus recursive `onSettled` branches.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/flux-action-core/src/action-dispatcher/{action-runners.ts,built-in-actions.ts}` and `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`, plus the linked focused tests and workspace verification, and reported `352` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
