# 329 Deep Audit 2026-05-16 Composite And Tree Accessible Naming Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{20-accessibility.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/300-deep-audit-2026-05-15-tree-renderer-accessibility-contract-plan.md`

## Purpose

收口 composite/tree accessible naming baseline：group widgets 缺少程序化名称，form-style tree roots 缺少 accessible name，data tree viewer root 也仍无名称。

## Current Baseline

- `20-01`、`20-02`、`20-03` 共享 Name/Role/Value 中的 accessible naming surface。
- Plan `300` 已 closure tree keyboard/navigation baseline，但没有覆盖本轮 naming residual。

## Goals

- Make in-scope group widgets expose a programmatic group name.
- Make tree roots expose an accessible name on the supported baseline.

## Non-Goals

- 不重写整个 accessibility strategy。
- 不接管 keyboard-model work already closed by Plan `300`。

## Scope

### In Scope

- `20-01`
- `20-02`
- `20-03`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- focused tests and relevant docs

### Out Of Scope

- non-retained focus-trap work
- keyboard navigation work already closed by Plan `300`

## Execution Plan

### Phase 1 - Freeze Accessible Naming Baseline

Status: completed
Targets: touched renderer files, focused a11y tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the naming path for group widgets and tree roots, and record one supported accessible naming baseline.
- [x] Add or update focused proof for programmatic naming on all in-scope widget roots.

Exit Criteria:

- [x] The plan records one explicit naming baseline for all in-scope widgets.
- [x] Focused proof exists for all in-scope widget roots.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Accessible Naming Fixes

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, `packages/flux-renderers-data/src/tree-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] Fix `20-01` so radio-group / checkbox-group widgets expose a programmatic group name.
- [x] Fix `20-02` so input-tree / tree-select `role="tree"` roots expose an accessible name.
- [x] Fix or honestly adjudicate `20-03` on the data-tree viewer baseline.

Exit Criteria:

- [x] In-scope form-widget roots expose a supported accessible naming relationship.
- [x] Data-tree naming baseline is fixed or explicitly adjudicated with evidence.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plan `300`, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining accessible naming blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope retained items (`20-01`, `20-02`) are fixed, and `20-03` is fixed or honestly adjudicated.
- [x] Composite/tree accessible naming converges to one supported baseline.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `329` is closure-ready with no remaining accessible naming blocker.

Follow-up:

- None currently.
