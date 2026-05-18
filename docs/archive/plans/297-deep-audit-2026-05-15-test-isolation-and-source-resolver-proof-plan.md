# 297 Deep Audit 2026-05-15 Test Isolation And Source Resolver Proof Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/14-test-coverage.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/284-deep-audit-2026-05-14-test-hard-gate-and-coverage-closure-plan.md`

## Purpose

收口 retained test-quality defects：`word-editor` 测试的全局补丁泄漏，以及 `flux-code-editor` public source resolver hooks 缺少直接 proof。

## Current Baseline

- `14-01` 仍 live：`word-editor-page-actions.test.tsx` 新装 `window.confirm` 后未完整恢复。
- `14-04` 仍 live as P2：`packages/flux-code-editor/src/source-resolvers.ts` 的 public resolver hooks 缺少直接 focused tests。

## Goals

- Close retained `14-01` and `14-04` on one supported test-quality baseline.
- Restore strict test isolation for the touched global-patch path.
- Add direct proof for the exported source resolver contract instead of relying only on integration coverage.

## Non-Goals

- 不扩大为全仓 UI/source hook 覆盖治理。
- 不接管 unrelated hard-gate file-size work；那部分已由 Plan `284` 收口。

## Scope

### In Scope

- `14-01`
- `14-04`
- `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx`
- `packages/flux-code-editor/src/source-resolvers.ts`
- new focused tests and `docs/logs/2026/05-15.md`

### Out Of Scope

- `14-02`
- `14-03`
- any retained ID not listed above

## Execution Plan

### Phase 1 - Global Patch Isolation Fix

Status: completed
Targets: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] Fix `14-01` so newly installed `window.confirm` is fully restored and deleted when the environment did not provide it originally.
- [x] Add or update focused proof that the touched suite leaves global `window.confirm` in its original state after each test.
- [x] Record any test-baseline doc decision, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `14-01` is fixed in live tests, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers global patch cleanup semantics.
- [x] Affected docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx` now restores the original `window.confirm` when it exists and deletes the injected property when it does not, so the touched suite no longer leaks a global patch between tests.
- No owner-doc update required beyond this plan and `docs/logs/2026/05-15.md`; the change is pure test-isolation hardening.

### Phase 2 - Direct Resolver Contract Proof

Status: completed
Targets: `packages/flux-code-editor/src/source-resolvers.ts`, focused tests

- Item Types: `Fix | Proof | Decision`

- [x] Close `14-04` by adding direct focused tests for the exported source resolver hook surface on supported branches and empty-data boundaries.
- [x] Keep the new proof owner-aligned instead of reusing unrelated integration suites as the only regression guard.
- [x] Record any test-baseline doc decision, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `14-04` is fixed in live tests, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof exists and passes for the exported source resolver contract.
- [x] Affected docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

Phase Notes:

- `packages/flux-code-editor/src/source-resolvers.test.tsx` now directly proves the exported source resolver hooks across static arrays, scope-backed branches, nested `scopePath + path` resolution, and empty-branch fallbacks.
- No owner-doc update required beyond the execution log because this phase adds focused regression proof without changing a supported runtime or design contract.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched tests, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live tests/docs, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

Phase Notes:

- Focused verification passed via the reruns recorded in `docs/logs/2026/05-15.md`, and fresh workspace hard gates are green with the latest `pnpm test` output saved at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2b4ca192001NVjp6fzrHZFpoI`.
- Independent closure audit passed via `ses_1d4a5a831ffeh5bxBMn4kOrvUW`.

## Closure Gates

- [x] All in-scope confirmed live defects (`14-01`, `14-04`) are fixed.
- [x] Test isolation and direct resolver proof now match the supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or test-quality gap is silently downgraded to deferred/follow-up.
- [x] Affected docs are synced to the live baseline, or `No owner-doc update required` is explicit.
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

Status Note: Completed. The touched word-editor suite now restores `window.confirm` to its original state, the public source resolver hooks now have direct focused proof, hard gates are green, and independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4a5a831ffeh5bxBMn4kOrvUW`
- Evidence: Re-read this plan, `docs/analysis/2026-05-15-deep-audit-full/14-test-coverage.md`, `docs/logs/2026/05-15.md`, `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx`, `packages/flux-code-editor/src/source-resolvers.ts`, and `packages/flux-code-editor/src/source-resolvers.test.tsx`. Confirmed the global confirm patch is fully restored/deleted, direct resolver proof exists for the exported hook contract, no owner-doc update is required, and fresh workspace verification is green.

Follow-up:

- None currently.
