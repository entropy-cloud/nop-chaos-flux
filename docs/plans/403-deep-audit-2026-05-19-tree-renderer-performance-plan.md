# 403 Deep Audit 2026-05-19 Tree-Renderer Performance Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
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
- `docs/logs/2026/05-19.md`

### Out Of Scope

- non-performance tree widget work

## Execution Plan

### Phase 1 - Bound Expanded-Subtree Cost

Status: planned
Targets: tree renderer code and proof

- Item Types: `Fix | Proof`
- [ ] Add a bounded rendering strategy for large expanded subtrees.
- [ ] Add focused proof for the preserved supported result.

Exit Criteria:

- [ ] `15-01` is fixed.
- [ ] Focused proof covers the bounded expanded-subtree path.
- [ ] `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] `No owner-doc update required`.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
