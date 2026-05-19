# 374 Deep Audit 2026-05-19 Variant-Field Owner Boundary Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-02`：拆分 `variant-field.tsx` 的混合 owner surface，使 action、validation、projection、UI 不再混装在一个 hard-gate file 中。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 超过 hard gate，且职责混杂。

## Goals

- 修复 `02-02`。
- 收敛 `variant-field` 的 owner boundary，并同步必要 owner docs。

## Non-Goals

- 不顺带重写 unrelated advanced form widgets。

## Scope

### In Scope

- `02-02`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- any extracted variant-field modules
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- other form-validation retained findings owned by Plan `386`

## Execution Plan

### Phase 1 - Split Variant-Field Owners

Status: planned
Targets: `variant-field.tsx`, extracted modules, owner docs

- Item Types: `Fix | Proof`
- [ ] Split `variant-field` into owner-shaped modules so the root file no longer mixes all four concerns.
- [ ] Update the owner docs named in Plan `371` if the supported owner boundary changes.

Exit Criteria:

- [ ] `02-02` is fixed.
- [ ] The touched file no longer violates the oversized hard gate.
- [ ] `docs/architecture/form-validation.md` and `docs/architecture/renderer-runtime.md` are updated to the final boundary, or `No change required` is explicitly adjudicated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] Required owner-doc updates are landed.
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
