# 394 Deep Audit 2026-05-19 Flow-Designer Type Boundary Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `13-02`：让 flow-designer domain page schema helper 回到诚实的 type boundary。

## Current Baseline

- domain page schema helper 使用多重断言，混合 opaque host config 与 `BaseSchema`。

## Goals

- 修复 `13-02`。
- 同步 flow-designer type-boundary doc。

## Non-Goals

- 不处理 flow-designer error fidelity or a11y findings。

## Scope

### In Scope

- `13-02`
- relevant flow-designer schema helper/tests
- `docs/architecture/flow-designer/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- flow-designer runtime behavior changes outside the type boundary

## Execution Plan

### Phase 1 - Restore Flow-Designer Type Boundary

Status: completed
Targets: flow-designer type helper, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Remove the unsafe assertion mix at the domain-page schema helper boundary.
- [x] Update the owner doc named in Plan `371` if the supported boundary changes.

Exit Criteria:

- [x] `13-02` is fixed.
- [x] Focused proof covers the final type boundary.
- [x] `docs/architecture/flow-designer/design.md` is updated, or `No change required` is explicitly adjudicated.
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

Status Note: Completed. The unsafe `as unknown as` helper boundary is removed. `defineDesignerPageSchema()` now returns the caller-constrained input type directly, focused proof covers both runtime shape and preserved host-only typing, and the current workspace verification baseline is green. Owner-doc adjudication remains `No change required`.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/public-surface.test.ts` passed; package-level `typecheck` and `build` passed; current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` also pass.
