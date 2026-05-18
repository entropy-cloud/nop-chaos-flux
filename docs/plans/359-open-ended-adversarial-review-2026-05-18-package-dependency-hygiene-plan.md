# 359 Open-Ended Adversarial Review 2026-05-18 Package Dependency Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-03.md` (Finding 5), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/frontend-baseline.md`

## Purpose

收口单一 package hygiene defect：`flux-renderers-form` 声明了未使用的 production dependency `@nop-chaos/flux-runtime`。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix manifest baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R3-5` 是窄 scope 的 package manifest hygiene residual，不带 live runtime correctness drift。
- 当前 evidence 指向 `packages/flux-renderers-form/package.json` 声明了 `@nop-chaos/flux-runtime`，但 `packages/flux-renderers-form/src/` 没有实际 import。
- 该问题需要一个 honest owner，但不应该被夸大成 broader package-boundary rewrite。

## Goals

- Remove or honestly justify the unused production dependency on the supported package baseline.
- Keep the package manifest aligned with actual production imports.

## Non-Goals

- 不接管 `R3-4` helper semantic convergence。
- 不做 generic monorepo dependency cleanup campaign。
- 不扩展成 package public API redesign。

## Scope

### In Scope

- `R3-5`
- `packages/flux-renderers-form/package.json`
- `packages/flux-renderers-form/src/**`
- focused proof if needed
- `docs/architecture/frontend-baseline.md` if needed
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R3-4`
- any dependency cleanup outside `flux-renderers-form`

## Execution Plan

### Phase 1 - Freeze Package-Dependency Baseline

Status: completed
Targets: touched manifest/source files, proof if needed

- Item Types: `Decision | Proof`

- [x] Re-audit whether `@nop-chaos/flux-runtime` is truly unused as a production dependency on the live baseline.
- [x] Decide whether the correct outcome is removal, dependency-class change, or explicit supported retention with rationale.

Exit Criteria:

- [x] The plan records one explicit package-dependency baseline for `R3-5`.
- [x] The decision is backed by repo-observable evidence from manifest/import usage.
- [x] Owner-doc impact is explicitly decided: `No owner-doc update required` is explicit because this was a narrow manifest cleanup, not a package-boundary design change.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Manifest Hygiene Fix Or Honest Retention

Status: completed
Targets: `packages/flux-renderers-form/package.json`

- Item Types: `Fix | Decision | Proof`

- [x] Resolve `R3-5` with one explicit outcome: remove the dependency, reclassify it, or record that the original finding was disproved by live evidence on the supported baseline.

Exit Criteria:

- [x] `R3-5` is fixed or explicitly adjudicated with evidence.
- [x] Any chosen manifest change has appropriate verification, and any no-change outcome has explicit supporting rationale.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed decision.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run the manifest/import proof required to show the supported package boundary after the chosen outcome.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` if manifest changes land; if closure remains docs/proof-only with no repo changes beyond docs, explicitly remove the non-applicable gates before marking the plan completed.
- [x] Record execution and verification evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live manifest/source, and verification results.

Exit Criteria:

- [x] Focused manifest/import verification has passed.
- [x] If manifest changes land, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass; if closure is docs/proof-only with no repo changes beyond docs, those hard gates are explicitly removed before the plan is marked completed.
- [x] Independent closure audit confirms no remaining plan-owned package-dependency hygiene blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] `R3-5` is fixed or honestly adjudicated.
- [x] The plan does not overstate a narrow manifest hygiene residual into a broader package-boundary rewrite.
- [x] Necessary proof or adjudication evidence exists.
- [x] No in-scope residual is silently dropped.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] If manifest changes land, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are run and recorded; if closure is docs/proof-only with no repo changes beyond docs, those hard gates are explicitly removed before closure.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. `packages/flux-renderers-form/package.json` no longer declares the unused production dependency `@nop-chaos/flux-runtime`, and the closure evidence stays intentionally narrow to manifest/import hygiene.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked the package manifest against the package source imports and confirmed `359` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
