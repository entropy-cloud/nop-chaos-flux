# 333 Deep Audit 2026-05-16 Workspace Manifest Dependency Gate Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{01-dependency-graph.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 workspace manifest dependency hard gate：`flux-renderers-basic` 测试导入了未声明的 `@nop-chaos/flux-compiler`。

## Current Baseline

- `01-01` 是独立的 workspace hard-gate failure，不应继续和 bundle facade public contract 混装。

## Goals

- Make the touched package manifest honestly match its live test dependency graph.

## Non-Goals

- 不接管 bundle facade public contract。
- 不重构 package dependency graph beyond the hard-gate fix。

## Scope

### In Scope

- `01-01`
- `packages/flux-renderers-basic/package.json`
- focused proof/docs if needed

### Out Of Scope

- `03-04`
- `13-01`

## Execution Plan

### Phase 1 - Freeze Manifest Baseline

Status: completed
Targets: `packages/flux-renderers-basic/package.json`, workspace gate evidence

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the touched package dependency graph and record the honest manifest baseline required by the workspace hard gate.

Exit Criteria:

- [x] The plan records one explicit manifest-dependency baseline for the touched package.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Manifest Fix

Status: completed
Targets: `packages/flux-renderers-basic/package.json`

- Item Types: `Fix | Proof`

- [x] Fix `01-01` by aligning `flux-renderers-basic` manifest with its live test dependency graph.

Exit Criteria:

- [x] The workspace manifest hard gate no longer fails for the touched package.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run the relevant manifest dependency gate plus `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] The relevant manifest dependency gate and workspace verification pass.
- [x] Independent closure audit confirms no remaining manifest dependency blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defect (`01-01`) is fixed.
- [x] Workspace manifest dependency baseline converges to one supported state.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `333` is closure-ready with no remaining workspace manifest dependency blocker.

Follow-up:

- None currently.
