# 319 Deep Audit 2026-05-16 Data Renderer Row Draft Preservation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{04-state-ownership.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/294-deep-audit-2026-05-15-data-renderer-row-action-and-tree-contract-plan.md`, `docs/plans/313-open-ended-adversarial-review-2026-05-15-s2-table-rendering-integrity-plan.md`

## Purpose

收口 data-renderer row draft preservation residual：whole-row custom-body draft 的 reset gate 仍只比较单字段快照，导致自定义 body / 多字段草稿会被过早回灌覆盖。

## Current Baseline

- Plan `294` 已收口“unsaved draft 不得发布到 shared `rowScope.record`”的大面问题；`04-02` 是更窄的 residual overwrite risk，不应伪装成 `294` 从未完成。
- Plan `313` 关闭了 table row-scope cache / duplicate-key / quick-edit draft churn family，但没有涵盖当前 whole-row custom-body 草稿保持语义。

## Goals

- Preserve custom-body / multi-field row drafts without relying on a single configured field snapshot as the reset gate.

## Non-Goals

- 不重开 `rowScope.record` shared draft publication defect；那条 surface 已由 Plan `294` 关闭。
- 不接管 CRUD query submit sequencing；那部分由独立 successor owner 处理。

## Scope

### In Scope

- `04-02`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`
- focused tests and relevant docs

### Out Of Scope

- `06-02`
- `04-03`

## Execution Plan

### Phase 1 - Re-audit Row Draft Residual Boundary

Status: completed
Targets: Plan `294`, Plan `313`, touched data-renderer sources/tests

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit `04-02` against Plans `294` and `313`, documenting exactly why the custom-body row-draft overwrite risk is a new residual rather than a reopened already-closed defect.
- [x] Add or update focused tests that prove whole-row custom-body draft preservation on the current live baseline.

Exit Criteria:

- [x] The plan records a clear residual-vs-closed-surface boundary for `04-02`.
- [x] Focused proof exists for row-draft preservation.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.

### Phase 2 - Land Row Draft Preservation Fix

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`

- Item Types: `Fix | Proof`

- [x] Fix `04-02` so whole-row custom-body drafts are not rehydrated from `record` based solely on a single configured-field equality check.

Exit Criteria:

- [x] Custom-body / multi-field row drafts survive benign parent rerenders until an honest reset condition occurs.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plans `294` / `313`, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for the in-scope residual has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining row-draft preservation blocker and no dishonest overlap with Plans `294` / `313`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defect (`04-02`) is fixed.
- [x] Data-renderer row draft preservation converges to one supported baseline.
- [x] Necessary focused verification exists for the touched defect family.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `319` is closure-ready with no remaining row-draft preservation blocker and no dishonest overlap with Plans `294` / `313`.

Follow-up:

- None currently.
