# 372 Deep Audit 2026-05-19 Workspace Manifest Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`
> Related: `docs/plans/333-deep-audit-2026-05-16-workspace-manifest-dependency-gate-plan.md`

## Purpose

收口 `01-01`：让 `flux-react` manifest 与其 live test dependency graph 对齐，恢复 workspace manifest hard gate。

## Current Baseline

- `packages/flux-react` test support previously depended on renderer-package imports that were not honestly declared in the manifest graph.
- The supported baseline is now to keep `flux-react` test support self-contained so `pnpm check:workspace-manifest-deps` passes without introducing a workspace cycle.

## Goals

- 修复 `01-01`。
- 让 `pnpm check:workspace-manifest-deps` 对该 surface 重新通过。

## Non-Goals

- 不处理其它 package dependency hygiene residual。
- 不重构 `flux-react` tests beyond the manifest fix.

## Scope

### In Scope

- `01-01`
- `packages/flux-react/package.json`
- `packages/flux-react/src/test-support-core.tsx`
- `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx`
- focused proof and `docs/logs/2026/05-19.md`

### Out Of Scope

- any other retained finding from Plan `371`

## Execution Plan

### Phase 1 - Land Manifest Fix

Status: completed
Targets: `packages/flux-react/package.json`, local test-support surface, workspace gate evidence

- Item Types: `Fix | Proof`
- [x] Align `flux-react` manifest and local test-support surface so the test no longer relies on an undeclared renderer-package import.
- [x] Re-run `pnpm check:workspace-manifest-deps` and record the result.

Exit Criteria:

- [x] `01-01` is fixed.
- [x] `pnpm check:workspace-manifest-deps` passes.
- [x] `No owner-doc update required` remains true.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] No in-scope defect is downgraded to follow-up.
- [x] `No owner-doc update required`.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. In-scope manifest drift is fixed by removing the undeclared cross-package test dependency instead of making the cycle permanent. `flux-react` now uses local test support for the StrictMode schema renderer path, `pnpm check:workspace-manifest-deps` passes, and the current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: `packages/flux-react/src/test-support-core.tsx` now provides the local fragment renderer support used by `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx`; `packages/flux-react/package.json` no longer carries the cycle-inducing renderer-package devDependency; `pnpm check:workspace-manifest-deps`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all pass.
