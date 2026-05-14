# 284 Deep Audit 2026-05-14 Test Hard-Gate And Coverage Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,02-module-responsibility.md,14-test-coverage.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中仍成立的 `>700` test hard-gate hotspots、false-green assertions、以及 cross-domain omnibus test ownership drift。

## Current Baseline

- 当前批次仍保留 6 个 `>700` 行硬门禁测试文件：`word-editor-page-host-scope.test.tsx`, `hook-surface-lifecycle-contracts.test.tsx`, `request-runtime.test.ts`, `designer-page.tree.test.tsx`, `controller-inspect-advanced.test.ts`, `designer-core.test.ts`。
- `14-01/02/03/04/05` 仍显示 false-green assertion、cross-domain omnibus tests、以及 blurred integration/unit ownership。
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

Status: planned
Targets: the six retained `>700` test files, related package suites

- Item Types: `Fix | Proof | Decision`

- [ ] Split `word-editor-page-host-scope.test.tsx` into narrower owner-aligned suites.
- [ ] Split `hook-surface-lifecycle-contracts.test.tsx` into narrower owner-aligned suites.
- [ ] Split `request-runtime.test.ts` into narrower owner-aligned suites.
- [ ] Split `designer-page.tree.test.tsx` into narrower owner-aligned suites.
- [ ] Split `controller-inspect-advanced.test.ts` into narrower owner-aligned suites.
- [ ] Split `designer-core.test.ts` into narrower owner-aligned suites.
- [ ] Run focused package tests and `pnpm check:oversized-code-files` to prove the hard-gate failures are closed.
- [ ] Ensure adjacent execution plans add new proof only in new owner-aligned files after the split, not by expanding the retired hotspot omnibus assets.

Exit Criteria:

- [ ] No retained `>700` hard-gate test hotspot remains in scope.
- [ ] Focused package tests and `pnpm check:oversized-code-files` pass for the touched hotspots.
- [ ] Adjacent execution plans are no longer relying on the retired hotspot omnibus assets as their proof sink.
- [ ] No owner-doc update required, or any changed owner-doc is explicitly updated.
- [ ] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Test Quality And False-Green Closure

Status: planned
Targets: touched test suites under `packages/**` and `tests/e2e/**`

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `14-01` so the retained input-password false-green assertion no longer treats validator-not-firing as a passing contract.
- [ ] Fix `14-02/03/04/05` so cross-domain omnibus suites are replaced by owner-aligned focused tests after the Phase 1 splits.
- [ ] Run focused package/E2E tests proving the repaired test contracts.
- [ ] Record any test-baseline doc update if required; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `14-01/02/03/04/05` are fixed in live tests, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests proving the repaired test contracts exist and pass.
- [ ] Affected docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched test suites, this plan, `docs/logs/2026/05-14.md`

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm check:oversized-code-files`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution and verification evidence in `docs/logs/2026/05-14.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all touched hard-gate and test-quality defects has passed.
- [ ] `pnpm check:oversized-code-files`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [ ] All in-scope retained test hard-gate and test-quality defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [ ] No in-scope confirmed defect is silently deferred.
- [ ] Required focused verification exists for every changed test family.
- [ ] Affected docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm check:oversized-code-files`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- None currently; fill at closure if needed.
