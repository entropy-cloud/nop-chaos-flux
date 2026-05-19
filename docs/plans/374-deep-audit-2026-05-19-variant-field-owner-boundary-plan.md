# 374 Deep Audit 2026-05-19 Variant-Field Owner Boundary Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-02`：拆分 `variant-field.tsx` 的混合 owner surface，使 action、validation、projection、UI 不再混装在一个 hard-gate file 中。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 曾超过 hard gate，且职责混杂。
- 当前 live split 已把 root renderer shell 降到 `116` 行，owner boundary 仍保持 parent-owned `inherit-owner` projected baseline；repo-level closure 仍被 out-of-scope workspace failures阻塞。

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

Status: completed
Targets: `variant-field.tsx`, extracted modules, owner docs

- Item Types: `Fix | Proof`
- [x] Split `variant-field` into owner-shaped modules so the root file no longer mixes all four concerns.
- [x] Update the owner docs named in Plan `371` if the supported owner boundary changes.

Exit Criteria:

- [x] `02-02` is fixed.
- [x] The touched file no longer violates the oversized hard gate.
- [x] `docs/architecture/form-validation.md` and `docs/architecture/renderer-runtime.md` are updated to the final boundary, or `No change required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: In-scope `variant-field` owner decomposition landed and cleared the local oversized hard gate, but full plan closure remains blocked by out-of-scope workspace verification failures and the missing independent closure audit, so the plan stays `partially completed`.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run

Verification Evidence:

- Focused tests: `pnpm exec vitest run src/variant-field/variant-field-owner-contract.test.tsx src/variant-field/variant-field-detection.test.tsx src/variant-field/variant-field-transform.test.tsx src/variant-field/variant-field-selector.test.tsx src/variant-field/variant-field-field-frame.test.tsx src/variant-field/variant-field-unmount.test.tsx src/variant-field/variant-field.test.tsx` passed (`7` files / `71` tests).
- Root-file line counts: `variant-field.tsx` `116`, `variant-field-controller.ts` `285`, `variant-field-owner.ts` `147`, `variant-field-view.tsx` `228`.
- Owner-doc adjudication: `No change required`; the supported boundary remains parent-owned `inherit-owner` projected validation/scope, already documented in `docs/architecture/variant-field.md` and consistent with `docs/architecture/form-validation.md` / `docs/architecture/renderer-runtime.md`.
- `pnpm build` in `packages/flux-renderers-form-advanced` passed.
- `pnpm lint` in `packages/flux-renderers-form-advanced` passed.
- `pnpm check:oversized-code-files` still fails at workspace level on out-of-scope files `packages/flux-react/src/__tests__/schema-renderer.test.tsx` (`741`) and `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` (`720`), but no longer reports `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`.
- `pnpm typecheck` in `packages/flux-renderers-form-advanced` is still blocked by pre-existing out-of-scope `packages/flux-renderers-data` errors in `src/table-renderer.tsx` and `src/table-renderer/use-table-pagination.ts`.
