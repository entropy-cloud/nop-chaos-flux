# 402 Deep Audit 2026-05-19 Cross-Package I18n Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `18-01`：让 UI-local i18n fallback 回到 current flux-i18n instance baseline。

## Current Baseline

- UI private i18n fallback 当前未接入 `flux-i18n` current instance。

## Goals

- 修复 `18-01`。
- 同步 frontend/i18n integration docs。

## Non-Goals

- 不做 repo-wide i18n redesign。

## Scope

### In Scope

- `18-01`
- `packages/ui/src/lib/i18n.ts`
- related tests
- `docs/architecture/frontend-baseline.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- other cross-package findings

## Execution Plan

### Phase 1 - Align UI I18n With Flux Instance

Status: completed
Targets: UI i18n code, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Route the UI fallback through the current `flux-i18n` instance model.
- [x] Update `docs/architecture/frontend-baseline.md` if the supported integration contract needs sync.

Exit Criteria:

- [x] `18-01` is fixed.
- [x] Focused proof covers the final integration path.
- [x] `docs/architecture/frontend-baseline.md` is updated, or `No change required` is explicitly adjudicated.
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

Status Note: Completed. Implementation and focused proof landed. `docs/architecture/frontend-baseline.md` was adjudicated as `No change required` because the supported workspace/package baseline did not change, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: Focused proof passed in `packages/ui` (`src/lib/i18n.test.ts`, `src/public-entry-contract.test.ts` => `2` files / `4` tests) and `packages/flux-i18n` (`src/i18n-contract.test.ts` => `1` file / `18` tests); current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
