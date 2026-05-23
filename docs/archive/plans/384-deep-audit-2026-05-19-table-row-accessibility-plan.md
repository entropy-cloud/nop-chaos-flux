# 384 Deep Audit 2026-05-19 Table Row Accessibility Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `20-04`：让 focusable table rows 具备正确的 interaction role/name semantics。

## Current Baseline

- focusable table rows 当前缺少完整 accessible role/name contract。

## Goals

- 修复 `20-04`。
- 补 focused accessibility proof。

## Non-Goals

- 不做 broader table accessibility sweep。

## Scope

### In Scope

- `20-04`
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`
- related focused tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- other table findings owned by Plans `382`, `383`, `385`

## Execution Plan

### Phase 1 - Fix Table Row Interaction Semantics

Status: completed
Targets: table row rendering and focused tests

- Item Types: `Fix | Proof`
- [x] Remove fake keyboard/button semantics from interactive table rows and keep state on the real expand control.
- [x] Add focused proof covering the supported path.

Exit Criteria:

- [x] `20-04` is fixed.
- [x] Focused accessibility proof passes.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope row accessibility fix is landed, focused proof passed, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: re-checked live code/tests after landing `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` and focused proofs in `packages/flux-renderers-data/src/__tests__/table-internal-components.test.tsx`; current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
