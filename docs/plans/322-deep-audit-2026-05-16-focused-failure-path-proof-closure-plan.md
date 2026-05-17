# 322 Deep Audit 2026-05-16 Focused Failure-Path Proof Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{14-test-coverage.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/297-deep-audit-2026-05-15-test-isolation-and-source-resolver-proof-plan.md`

## Purpose

收口 proof family 的 retained drift：word-editor save hook 与 report field-panel failure-path proof 仍不完整，且 word-editor page action suite 仍偏厚。

## Current Baseline

- `14-01` / `14-02` 都是 focused proof 缺口，不应被 `297` 已关闭的 test-isolation/source-resolver surface 吞掉。
- `14-03` 是同 family 的 maintainability residual，适合在同一 proof owner 下决定拆分或 honest adjudication。
- `20-*` 已拆到独立 accessibility owner。

## Goals

- Add honest focused verification for the retained save-hook and report diagnostics failure paths.
- Reduce oversized cross-domain test coupling where it blocks maintainability.

## Non-Goals

- 不接管 composite/tree accessible naming；那部分由独立 successor owner 处理。
- 不把 every large test file 都纳入本 plan。

## Scope

### In Scope

- `14-01`
- `14-02`
- `14-03`
- `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx`
- relevant focused tests/docs

### Out Of Scope

- non-retained E2E cleanup beyond what touched files require
- `20-01`
- `20-02`
- `20-03`

## Execution Plan

### Phase 1 - Failure-Path Proof Closure

Status: completed
Targets: `use-word-editor-save.ts`, `field-panel-renderer.tsx`, related tests

- Item Types: `Fix | Proof | Decision`

- [x] Add focused proof for `14-01` covering `ok:false`, thrown error, and `AbortError` branches in `useWordEditorSave`.
- [x] Add focused proof for `14-02` asserting `reportRuntimeHostIssue(...)` alongside `notify` on field-panel insert failures.
- [x] Re-audit `14-03` and either split the oversized suite or honestly adjudicate the maintainability residual.

Exit Criteria:

- [x] Save-hook failure/abort branches have direct focused tests.
- [x] Field-panel diagnostics side effect is explicitly asserted in failure tests.
- [x] The `14-03` maintainability decision is explicit and evidence-backed.
- [x] `docs/logs/2026/05-17.md` records the test-baseline decision.

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phase 1.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining proof blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed proof gaps (`14-01`, `14-02`) are fixed, and `14-03` is fixed or honestly adjudicated.
- [x] Failure-path verification proof converges to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or proof gap is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- Finding: `14-03` oversized cross-domain suite in `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx`.
- Evidence: The file still mixes save, shortcut, dataset dialog, and navigation flows, but the newly landed focused save-hook proof in `use-word-editor-save.test.tsx` plus the direct page-action failure cases already isolate the correctness-critical branches that motivated this plan.
- Why Not Blocking Closure: `14-03` is maintainability-only after the proof gaps closed; no remaining correctness or observability contract depends on splitting the suite in this pass.
- Reopen Trigger: Reopen if the file grows materially again, starts absorbing new host/editor domains, or blocks focused regression additions without broad fixture coupling.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline. `14-01` and `14-02` have direct focused proof, and `14-03` is now explicitly adjudicated as a non-blocking maintainability residual rather than a correctness blocker.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: The prior closure gap is resolved because `14-03` now has an explicit adjudication record tied to the live focused proof baseline in `use-word-editor-save.test.tsx` and `field-panel-renderer.test.tsx`.

Follow-up:

- None currently.
