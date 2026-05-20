# 403 Deep Audit 2026-05-19 Tree-Renderer Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `15-01`：让 `TreeRenderer` 的 expanded-subtree path 回到 bounded performance baseline。

## Current Baseline

- expanded subtree path currently lacks thresholded virtualization or lazy rendering.

## Goals

- 修复 `15-01`。
- 保持 supported behavior while bounding the hotspot.

## Non-Goals

- 不做 generic tree widget accessibility work；那由 Plan `388` owning。

## Scope

### In Scope

- `15-01`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- related performance proof/tests
- `docs/logs/2026/05-20.md`

### Out Of Scope

- non-performance tree widget work

## Execution Plan

### Phase 1 - Bound Expanded-Subtree Cost

Status: completed
Targets: tree renderer code and proof

- Item Types: `Fix | Proof`
- [x] Add a bounded rendering strategy for large expanded subtrees.
- [x] Add focused proof for the preserved supported result.

Implemented:

- `packages/flux-renderers-data/src/tree-renderer.tsx` now uses a bounded expanded-child render window for large subtrees: expanded nodes render an initial batch immediately, then complete the remaining child subtree asynchronously in a follow-up tick, keeping the final supported result while avoiding one large eager recursive commit.
- The bounded path preserves existing tree semantics, keyboard navigation, slot rendering, and final expanded content.
- Focused proof now lives in `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx` and covers both the bounded initial slice and eventual full expanded subtree result.

Exit Criteria:

- [x] `15-01` is fixed.
- [x] Focused proof covers the bounded expanded-subtree path.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-20.md` is updated.

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

Status Note: Completed. The bounded expanded-subtree strategy is landed, final subtree content remains intact, no owner-doc update was required, and the current workspace verification baseline is green.

Focused Verification Evidence:

- `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/data-tree-and-chart.test.tsx`
- `pnpm --filter @nop-chaos/flux-renderers-data typecheck`

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bcc6054dffeJ7Thc94w3aoR03`)
- Evidence: confirmed bounded staged expansion in `tree-renderer.tsx`, focused proof in `data-tree-and-chart.test.tsx`, and repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` green status on the current tree.
