# 347 Deep Audit 2026-05-17 Test Harness Isolation Plan

> Plan Status: planned
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-full/{14-test-coverage.md,summary.md}`, live code verification of `packages/flux-renderers-form-advanced/src/test-support.tsx`, `packages/flux-renderers-form/src/test-dom-polyfills.ts`, `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/167-test-quality-and-reliability-improvement-plan.md`, `docs/plans/297-deep-audit-2026-05-15-test-isolation-and-source-resolver-proof-plan.md`

## Purpose

收口 `2026-05-17/14-01` / `2026-05-17/14-02`：`flux-renderers-form` 与 `flux-renderers-form-advanced` 测试基础设施仍通过模块级可变 harness 状态和 module-top DOM polyfill 安装污染跨文件测试隔离。计划只 owning这两个 renderer-form harness surface，不扩大为全仓测试治理。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/test-support.tsx:89-115` 仍导出 singleton `formTestHarness`、`submitCalls`、`notifyCalls` 等共享可变状态。
- `packages/flux-renderers-form/src/test-support.tsx:62-99,101-112` 也仍导出 singleton `formTestHarness` / `submitCalls` / `notifyCalls` 等共享可变状态。
- `grep` 结果显示 `packages/flux-renderers-form-advanced/src/__tests__/` 下仍有大量测试手动执行 `submitCalls.length = 0`，说明 suite 之间的隔离依赖调用者自律而不是 harness 自带 reset contract。
- `packages/flux-renderers-form/src/__tests__/form-submit-actions.semantic.test.tsx:18-21` 与 `form-field-handlers.test.tsx:17-20` 仍通过调用者手动 `formTestHarness.reset()` 维持隔离，说明 form 包也共享同一 harness-pattern residual。
- `packages/flux-renderers-form/src/test-dom-polyfills.ts:1-16` 与 `packages/flux-renderers-form-advanced/src/test-support.tsx:27-45` 仍在模块顶层 patch `scrollIntoView` / `PointerEvent`，没有 restore 路径。
- Plan `167` 已完成更广泛的 test-quality owner work，但没有关闭这组 renderer-form harness residual；Plan `297` 已关闭 `word-editor` confirm patch 和 code-editor resolver proof，也不 owning 当前 form harness surface。

## Goals

- Eliminate shared mutable test harness state as the supported baseline for `flux-renderers-form-advanced` tests.
- Move the touched DOM polyfills to an isolation-safe install/restore path.
- Add focused proof that the touched test infrastructure no longer relies on cross-file mutable state or un-restored global patches.

## Non-Goals

- 不把所有测试文件的治理问题都并入本计划。
- 不重开 mega test split、coverage threshold、或 generic `as any` reduction。
- 不接管 unrelated global patch surfaces already closed by Plan `297`。

## Scope

### In Scope

- `2026-05-17/14-01`
- `2026-05-17/14-02`
- `packages/flux-renderers-form/src/test-support.tsx`
- `packages/flux-renderers-form-advanced/src/test-support.tsx`
- `packages/flux-renderers-form/src/test-dom-polyfills.ts`
- tests importing the touched `test-support` / `test-dom-polyfills` helpers under `packages/flux-renderers-form/src/__tests__/` and `packages/flux-renderers-form-advanced/src/__tests__/`
- `docs/logs/2026/05-17.md`

### Out Of Scope

- `14-03`
- `14-04`
- `14-05` through `14-16`
- unrelated package test isolation work

## Execution Plan

### Phase 1 - Freeze Test Harness Isolation Baseline

Status: planned
Targets: touched harness files, affected tests

- Item Types: `Decision | Proof`

- [ ] Re-audit the shared mutable harness exports and global DOM patch sites in both renderer-form packages, then record one supported isolation baseline for the touched test families.
- [ ] Identify the smallest focused proof set that demonstrates harness state isolation and DOM patch restore semantics.

Exit Criteria:

- [ ] The plan records a clean boundary against Plans `167` and `297`.
- [ ] The in-scope shared-state and global-patch surfaces are explicitly enumerated.
- [ ] `No owner-doc update required` is explicit unless a repository test-guide doc truly needs updating.
- [ ] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Test Harness Isolation Fixes

Status: planned
Targets: touched harness files and affected tests

- Item Types: `Fix | Proof`

- [ ] Replace the singleton mutable harness pattern with an isolation-safe setup/reset path for the touched suites in both renderer-form packages.
- [ ] Move the in-scope DOM polyfills to an install/restore pattern that does not leak global mutations across files.
- [ ] Update affected tests to use the supported harness baseline instead of manual `submitCalls.length = 0` resets.

Exit Criteria:

- [ ] The in-scope test suites no longer depend on shared module-level mutable state across files.
- [ ] The in-scope DOM polyfills have a supported restore path.
- [ ] Focused proof is green for both harness reset semantics and global patch cleanup.
- [ ] `No owner-doc update required` remains explicit unless a test-guide update becomes necessary.
- [ ] `docs/logs/2026/05-17.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched tests, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fixes land.
- [ ] Record execution, verification, and evidence in `docs/logs/2026/05-17.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, Plans `167` / `297`, linked analysis, live code/tests, and verification output.

Exit Criteria:

- [ ] Focused verification for `2026-05-17/14-01` / `2026-05-17/14-02` has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining test-harness isolation blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] The in-scope confirmed live defects (`2026-05-17/14-01`, `2026-05-17/14-02`) are fixed.
- [ ] Renderer-form test harness isolation converges to one supported baseline.
- [ ] Necessary focused verification exists for the touched shared-state and global-patch paths.
- [ ] No in-scope live defect is silently downgraded to deferred/follow-up.
- [ ] `No owner-doc update required` is explicit, or affected owner docs are synced to the live baseline.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: <<fill when completed>>

Closure Audit Evidence:

- Reviewer / Agent: <<fill when completed>>
- Evidence: <<fill when completed>>

Follow-up:

- <<fill when completed if needed>>
