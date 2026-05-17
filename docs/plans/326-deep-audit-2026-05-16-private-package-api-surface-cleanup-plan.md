# 326 Deep Audit 2026-05-16 Private Package API Surface Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{03-api-surface.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 private package root export surface cleanup：`flow-designer-core` 根入口暴露重置/清空型全局 helper，`flux-code-editor` 根入口额外暴露 `codeEditorFieldRules`。

## Current Baseline

- `03-01` 与 `03-02` 都属于 private package root barrel over-exposure。
- 这两个问题真实，但不应继续和 public facade contract 或 compiler parity 混装。

## Goals

- Minimize private-package root export surfaces to supported entry points.
- Remove or demote reset/helper exports that expose internal implementation details.

## Non-Goals

- 不接管 public facade contract fixes。
- 不把 private packages 重写成新的 package structure。

## Scope

### In Scope

- `03-01`
- `03-02`
- `packages/flow-designer-core/src/index.ts`
- `packages/flux-code-editor/src/index.ts`
- focused tests/docs if needed

### Out Of Scope

- `03-04`
- `13-01`

## Execution Plan

### Phase 1 - Freeze Supported Root Export Baseline

Status: completed
Targets: touched package root entries, docs/tests if needed

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit both root barrels and record which exports remain supported, move to `unstable`, or leave root.
- [x] Add focused proof or entry-surface assertions if the cleanup changes supported import paths.

Exit Criteria:

- [x] The plan records one honest root-export baseline for both packages.
- [x] Any public-facing entry-surface change has proof or an explicit no-proof rationale.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Root Export Cleanup

Status: completed
Targets: `packages/flow-designer-core/src/index.ts`, `packages/flux-code-editor/src/index.ts`

- Item Types: `Fix | Proof`

- [x] Fix `03-01` so reset/clear global-state helpers are not exported as default root API unless explicitly supported.
- [x] Fix `03-02` so `codeEditorFieldRules` is not exposed on the root entry unless explicitly supported.

Exit Criteria:

- [x] Internal reset/helper exports no longer widen the root API surface beyond the supported baseline.
- [x] Focused proof is green where import paths or entry surfaces change.

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
- [x] Independent closure audit confirms no remaining private-package API surface blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`03-01`, `03-02`) are fixed or honestly adjudicated.
- [x] Private package root API surfaces converge to one supported baseline.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `326` is closure-ready with no remaining private-package API surface blocker.

Follow-up:

- None currently.
