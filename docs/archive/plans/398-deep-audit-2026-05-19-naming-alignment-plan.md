# 398 Deep Audit 2026-05-19 Naming Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `17-01`：让 tests 回到 canonical `sourceType` naming baseline。

## Current Baseline

- test sample still uses non-canonical `sourceType` field naming.

## Goals

- 修复 `17-01`。

## Non-Goals

- 不扩展到 broader terminology sweep。

## Scope

### In Scope

- `17-01`
- relevant test file(s)
- `docs/logs/2026/05-19.md`

### Out Of Scope

- owner-doc changes

## Execution Plan

### Phase 1 - Restore Canonical Naming In Tests

Status: completed
Targets: test samples

- Item Types: `Fix | Proof`
- [x] Replace the non-canonical field naming in tests.

Exit Criteria:

- [x] `17-01` is fixed.
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

Status Note: Completed. Implementation and focused proof landed, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: Focused proof passed in `packages/flux-react` (`src/__tests__/node-source-prop-controller.test.ts`, `src/__tests__/use-node-source-props.test.tsx`, `src/__tests__/use-source-value.test.tsx`, `src/__tests__/compilation-and-boundaries.test.tsx` => `4` files / `35` tests); current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
