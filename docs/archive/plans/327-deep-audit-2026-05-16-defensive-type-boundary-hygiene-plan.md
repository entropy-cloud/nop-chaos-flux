# 327 Deep Audit 2026-05-16 Defensive Type-Boundary Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{13-type-safety.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 defensive type-boundary hygiene：`render-nodes.tsx` 在 shape 检查失败后仍 fallback cast，`use-word-editor-save.ts` 用 `as any` 压过 `ActionContext` 边界。

## Current Baseline

- `13-02` 与 `13-03` 都是显式类型逃逸，而不是已证明的主路径 correctness break。
- 这两个条目共享“defensive type fence 被本地压过”的结果面。

## Goals

- Remove explicit fallback casts that bypass known-invalid boundaries.
- Keep action/provider call sites honest about the context shape they require.

## Non-Goals

- 不把所有 low-code dynamic boundary 全部收紧为强类型。
- 不接管 public facade type contract。

## Scope

### In Scope

- `13-02`
- `13-03`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts`
- focused tests/docs if needed

### Out Of Scope

- `13-01`
- `03-04`

## Execution Plan

### Phase 1 - Freeze Supported Defensive Boundary Baseline

Status: completed
Targets: touched runtime / word-editor files, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit both call sites and record the supported behavior when validation or interface requirements fail.
- [x] Add focused proof where needed so invalid boundary handling is explicit rather than inferred.

Exit Criteria:

- [x] The plan records one explicit baseline for invalid render-node input and save-provider context expectations.
- [x] Focused proof or explicit no-proof rationale exists for both in-scope residuals.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Defensive Boundary Cleanup

Status: completed
Targets: `packages/flux-react/src/render-nodes.tsx`, `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts`

- Item Types: `Fix | Proof`

- [x] Fix `13-02` so array shape validation failure does not immediately fall through to `TemplateNode[]` casts.
- [x] Fix `13-03` so the save hook no longer relies on `as any` over the action-context boundary.

Exit Criteria:

- [x] Invalid boundary handling no longer relies on explicit type escapes.
- [x] Focused proof is green where behavior or interface usage changes.

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
- [x] Independent closure audit confirms no remaining defensive type-boundary blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope residuals (`13-02`, `13-03`) are fixed or honestly adjudicated.
- [x] Defensive type-boundary hygiene converges to one supported baseline.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `327` is closure-ready with no remaining defensive type-boundary blocker.

Follow-up:

- None currently.
