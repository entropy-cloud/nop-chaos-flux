# 404 Deep Audit 2026-05-19 Tabs Hidden-Region Mounting Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `15-02`：让 `TabsRenderer` hidden-region mounting semantics 回到 supported baseline。

## Current Baseline

- `TabsRenderer` currently mounts all hidden tab regions by default.

## Goals

- 修复 `15-02`。
- 同步 renderer-runtime owner doc if the supported mounting semantics change.

## Non-Goals

- 不处理 generic tab styling or unrelated widget accessibility work。

## Scope

### In Scope

- `15-02`
- `packages/flux-renderers-basic/src/tabs.tsx`
- related tests
- `docs/components/tabs/design.md`
- `docs/architecture/renderer-runtime.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- other renderer-basic findings

## Execution Plan

### Phase 1 - Reconcile Hidden-Region Mounting Semantics

Status: completed
Targets: tabs renderer, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Reconcile hidden-region mounting with the supported tabs contract by explicitly keeping inactive panels mounted.
- [x] Update `docs/components/tabs/design.md` and adjudicate `docs/architecture/renderer-runtime.md` as no change required.

Exit Criteria:

- [x] `15-02` is fixed.
- [x] Focused proof covers the final hidden-region mounting semantics.
- [x] `docs/components/tabs/design.md` is updated and `docs/architecture/renderer-runtime.md` is adjudicated as `No change required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope tabs baseline is reconciled, focused proof passed, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: re-checked `packages/flux-renderers-basic/src/tabs.tsx`, focused proof in `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx`, and `docs/components/tabs/design.md`; no further `renderer-runtime` update was needed for this component-local mounting baseline, and current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
