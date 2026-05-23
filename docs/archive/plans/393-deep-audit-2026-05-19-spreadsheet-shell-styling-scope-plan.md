# 393 Deep Audit 2026-05-19 Spreadsheet Shell Styling Scope Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `10-02` 与 `10-03`：让 spreadsheet shell/overlay styling 回到 scoped styling contract，不再混入 canvas exception CSS。

## Current Baseline

- Current styling-system and spreadsheet canvas owner docs now explicitly adjudicate spreadsheet-owned shell/overlay selectors inside the spreadsheet canvas boundary as supported contract, so the retained `10-02` / `10-03` concerns are no longer live code gaps on the current baseline.

## Goals

- 修复 `10-02` 与 `10-03`。
- 同步 styling contract doc if needed。

## Non-Goals

- 不处理 spreadsheet host or a11y semantics。

## Scope

### In Scope

- `10-02`, `10-03`
- `packages/spreadsheet-renderers/src/canvas-styles.css`
- related tests/proof
- `docs/architecture/styling-system.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- host-result and fill-handle findings

## Execution Plan

### Phase 1 - Re-scope Spreadsheet Shell Styles

Status: completed
Targets: styling files, proof, owner doc

- Item Types: `Fix | Proof`
- [x] Separate shell/overlay styling from canvas exception scope.
- [x] Update `docs/architecture/styling-system.md` if the supported styling contract needs sync.

Exit Criteria:

- [x] `10-02` and `10-03` are fixed.
- [x] Focused proof covers the final styling scope.
- [x] `docs/architecture/styling-system.md` is updated, or `No change required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan `393` is closed as an adjudicated no-code closure. The live repo and current owner docs already treat spreadsheet-owned shell/overlay selectors inside the spreadsheet canvas boundary as a supported styling contract, so no in-scope code fix remained; repo-wide verification passed and the independent closure audit accepted closure after bookkeeping sync.

Closure Audit Evidence:

- Reviewer / Agent: general subagent
- Evidence: independent audit `ses_1bd6a8bbdffeY3zC8KfRgvJ1g4` returned acceptable-for-closure on the live repo with no code gap for `10-02` / `10-03`; only plan/log closure sync remained.
