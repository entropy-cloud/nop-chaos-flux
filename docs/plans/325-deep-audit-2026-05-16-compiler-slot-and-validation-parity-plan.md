# 325 Deep Audit 2026-05-16 Compiler Slot And Validation Parity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{12-field-slot.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 compiler contract parity：slot param 保留命名空间 under-enforced，且 deep extracted region compile-aware 但 validation-blind。

## Current Baseline

- `12-01` 与 `12-02` 都是 compile-vs-validate contract 不一致，而不是 bundle facade 或 generic docs drift。

## Goals

- Enforce the documented reserved `$` slot-param namespace.
- Make deep extracted region validation match compile-time awareness.

## Non-Goals

- 不接管 bundle facade public type cleanup。
- 不重构整个 compiler architecture。

## Scope

### In Scope

- `12-01`
- `12-02`
- `packages/flux-compiler/src/schema-compiler/{regions.ts,shape-validation.ts}`
- focused tests and relevant docs

### Out Of Scope

- `03-04`
- `13-01`

## Execution Plan

### Phase 1 - Freeze Compile / Validate Parity Baseline

Status: completed
Targets: touched compiler files, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the slot-param and deep-region paths together and define one supported compile/validate parity baseline.
- [x] Add or update focused proof for `$` namespace rejection and deep extracted region validation.

Exit Criteria:

- [x] The plan records one explicit parity baseline for both in-scope findings.
- [x] Focused proof exists for both in-scope residuals.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Compiler Contract Fixes

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/{regions.ts,shape-validation.ts}`

- Item Types: `Fix | Proof`

- [x] Fix `12-01` so any `$`-prefixed slot param name is rejected on the supported baseline.
- [x] Fix `12-02` so deep extracted regions are validated with the same awareness as compile-time extraction.

Exit Criteria:

- [x] Reserved namespace enforcement matches the documented contract.
- [x] Deep extracted regions are compile-aware and validation-aware on the same baseline.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining compiler parity blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`12-01`, `12-02`) are fixed.
- [x] Compiler slot namespace and deep-region validation parity converge to one supported baseline.
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

Status Note: Completed on the 2026-05-17 live baseline after final workspace verification and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `325` is closure-ready with no remaining compiler parity blocker.

Follow-up:

- None currently.
