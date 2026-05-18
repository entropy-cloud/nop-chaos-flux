# 284 Deep Audit 2026-05-14 Test Hard-Gate And Coverage Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,02-module-responsibility.md,14-test-coverage.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中仍成立的 `>700` test hard-gate hotspots、false-green assertions、以及 cross-domain omnibus test ownership drift。

## Current Baseline

- 当前 `>700` 行 hard-gate failure 已清零：split 后的 touched hotspots 不再触发 `pnpm check:oversized-code-files` error，当前只剩 `>500` warning-sized files。
- `14-01` 已修复：`tests/e2e/component-lab/simple-form.spec.ts` 不再把 confirm-password validator-not-firing 误当成支持契约。
- 大部分 retained omnibus hotspots 已完成 owner-aligned split，包括 `packages/flux-react/src/__tests__/`, `packages/flow-designer-renderers/src/`, `packages/flux-runtime/src/__tests__/`, `packages/word-editor-renderers/src/__tests__/`, `packages/nop-debugger/src/`, `packages/report-designer-core/src/__tests__/`。
- 独立 closure audit 重新核对后确认仍有 owner-alignment remainder：`packages/report-designer-renderers/src/renderers.integration.test.tsx` 仍混合 provider/unit-contract assertions，`packages/report-designer-core/src/__tests__/designer-core.test.ts` 仍是 multi-domain sink，因此本计划还不能关闭。
- 本计划只 owning test hard-gate and test-quality closure，不接管 warning-sized source structural hotspot adjudication；那部分由 Plan `287` 单独处理。
- 本计划拥有 retained hotspot omnibus test assets 的拆分与迁移；其它执行计划如需新增 proof，必须落到新的 owner-aligned test files 中，不能继续把 proof 堆回这批 hotspot files。

## Goals

- Eliminate the current-batch `>700` hard-gate test hotspots.
- Replace current-batch false-green or cross-domain omnibus tests with owner-aligned focused suites.

## Non-Goals

- 不接管 source-file structural hotspot routing或refactor candidate adjudication。
- 不接管 runtime/public/styling/UI/a11y/plan-baseline defects。

## Scope

### In Scope

- `02-01/02/02/03/04/05/06`
- `14-01/02/03/04/05`
- `pnpm check:oversized-code-files`, focused package tests, `docs/logs/2026/05-14.md`

### Out Of Scope

- `02-07/09/10/11/12/13/14`
- Any retained ID not listed in `In Scope`

## Execution Plan

### Phase 1 - Hard-Gate Test File Split

Status: completed
Targets: the six retained `>700` test files, related package suites

- Item Types: `Fix | Proof | Decision`

- [x] Split `word-editor-page-host-scope.test.tsx` into narrower owner-aligned suites.
- [x] Split `hook-surface-lifecycle-contracts.test.tsx` into narrower owner-aligned suites.
- [x] Split `request-runtime.test.ts` into narrower owner-aligned suites.
- [x] Split `designer-page.tree.test.tsx` into narrower owner-aligned suites.
- [x] Split `controller-inspect-advanced.test.ts` into narrower owner-aligned suites.
- [x] Split `designer-core.test.ts` into narrower owner-aligned suites.
- [x] Run focused package tests and `pnpm check:oversized-code-files` to prove the hard-gate failures are closed.
- [x] Ensure adjacent execution plans add new proof only in new owner-aligned files after the split, not by expanding the retired hotspot omnibus assets.

Exit Criteria:

- [x] No retained `>700` hard-gate test hotspot remains in scope.
- [x] Focused package tests and `pnpm check:oversized-code-files` pass for the touched hotspots.
- [x] Adjacent execution plans are no longer relying on the retired hotspot omnibus assets as their proof sink.
- [x] No owner-doc update required, or any changed owner-doc is explicitly updated.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Test Quality And False-Green Closure

Status: completed
Targets: touched test suites under `packages/**` and `tests/e2e/**`

- Item Types: `Fix | Proof | Decision`

- [x] Fix `14-01` so the retained input-password false-green assertion no longer treats validator-not-firing as a passing contract.
- [x] Fix `14-02/03/04/05` so cross-domain omnibus suites are replaced by owner-aligned focused tests after the Phase 1 splits.
- [x] Run focused package/E2E tests proving the repaired test contracts.
- [x] Record any test-baseline doc update if required; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `14-01/02/03/04/05` are fixed in live tests, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests proving the repaired test contracts exist and pass.
- [x] Affected docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched test suites, this plan, `docs/logs/2026/05-14.md`

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm check:oversized-code-files`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution and verification evidence in `docs/logs/2026/05-14.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/tests, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all touched hard-gate and test-quality defects has passed.
- [x] `pnpm check:oversized-code-files`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [x] All in-scope retained test hard-gate and test-quality defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [x] No in-scope confirmed defect is silently deferred.
- [x] Required focused verification exists for every changed test family.
- [x] Affected docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm check:oversized-code-files`
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The `>700` hard-gate hotspot failures are closed, retained false-green assertions are repaired, and the residual Report Designer omnibus ownership drift is resolved through focused owner-aligned suites in `packages/report-designer-renderers/src/{host-action-provider.test.ts,page-renderer.test.tsx,renderers.integration.test.tsx}` and `packages/report-designer-core/src/__tests__/{designer-core.test.ts,designer-core.async.test.ts,designer-core-codec-and-selection.test.ts,designer-core-profile.test.ts}`.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d8f7224dffen1zS1a0bDLlidY`
- Evidence: Independent closure audit confirmed the hard-gate/file-size objective is complete and the false-green `14-01` assertion is fixed, but it still found residual mixed-suite ownership in `packages/report-designer-renderers/src/renderers.integration.test.tsx` and `packages/report-designer-core/src/__tests__/designer-core.test.ts`.
- Reviewer / Agent: `ses_1d8bc6d6dffeMwD2MeS48hGsMP`
- Evidence: Fresh independent closure audit after the split found one remaining false-green gap in `packages/report-designer-renderers/src/page-renderer.test.tsx` unmount cleanup proof.
- Reviewer / Agent: `ses_1d8b56ba4ffe91DRKYafhXGRFU`
- Evidence: Final independent closure audit confirmed no remaining Plan `284` blocker in the live Report Designer test scope and cleared the plan for closure once repo-level verification gates were satisfied.

Phase 2 Update:

- `tests/e2e/component-lab/simple-form.spec.ts` owns the repaired `14-01` false-green contract.
- `packages/report-designer-renderers/src/host-action-provider.test.ts` now owns host action provider proof.
- `packages/report-designer-renderers/src/page-renderer.test.tsx` now owns page-level workbench/status/host-scope/error contracts.
- `packages/report-designer-renderers/src/renderers.integration.test.tsx` is reduced to namespace wiring / end-to-end host integration proof.
- `packages/report-designer-core/src/__tests__/designer-core-codec-and-selection.test.ts` now owns codec/selection/undo history proof, leaving `designer-core.test.ts` focused on core state/metadata behavior.
- `packages/report-designer-renderers/src/page-renderer.test.tsx` now also proves real `statusPath` cleanup by rerendering a parent page without the report-designer child and asserting the parent-scoped status probe clears, rather than relying on whole-tree unmount.
- Focused verification passed: `pnpm exec vitest run src/page-renderer.test.tsx src/renderers.integration.test.tsx src/host-action-provider.test.ts` in `packages/report-designer-renderers` (`3` files, `18` tests) and `pnpm exec vitest run src/__tests__/designer-core.test.ts src/__tests__/designer-core.async.test.ts src/__tests__/designer-core-codec-and-selection.test.ts src/__tests__/designer-core-profile.test.ts` in `packages/report-designer-core` (`4` files, `39` tests).
- Owner-doc decision: No owner-doc update required beyond `docs/logs/2026/05-14.md` because this slice narrows test ownership without changing package/runtime architecture contracts.

Phase 3 Update:

- Repo-level closure gates passed on the live baseline: `pnpm check:oversized-code-files` (`0` errors, `70` warnings), `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` (`49 successful, 49 total`).
- The one post-split repo-level regression was a lint-only unused-code residue in `packages/report-designer-renderers/src/renderers.integration.test.tsx`; removing the dead imports/probe restored the final green baseline without widening scope.

Follow-up:

- None.
