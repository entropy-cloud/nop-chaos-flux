# 276 Deep Audit 2026-05-13 Reactive Owner Boundary Execution Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/plans/265-deep-audit-2026-05-13-reactive-owner-boundary-successor-plan.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live reactive-precision and owner-boundary defects left after Plan 265 completed its baseline re-audit and split the surviving runtime/renderer issues into an explicit execution successor.

## Current Baseline

- Plan 265 already closed the fixed/no-longer-live subset (`05-02`, `05-03`, `05-04`, `07-03`, `07-06`).
- `09-02` is fixed: tree node region renders now propagate deterministic repeated `instancePath` ownership for tree-node recursion.
- `05-08` is fixed: scope-owned axis reads now pass `enabled` and precise `paths` into `useScopeSelector`, so non-scope ownership no longer creates broad scope subscriptions.
- `05-05` is fixed: `useScopeSelector` now normalizes `paths` into a stable content key before memoizing subscriptions, so inline `paths: [...]` callers no longer churn scope subscriptions on every rerender.
- `05-06` is fixed: deep-path dependency matching no longer treats sibling leaves under the same root as overlapping; only exact, ancestor, or descendant path relationships invalidate deep-path subscriptions.
- `05-01` is fixed: `useScopeSelector` hook subscriptions now preserve normalized full dependency paths instead of collapsing them to root keys, so deep-path subscriptions can actually benefit from precise changed-path filtering.
- `02-14` is fixed: stable renderer consumers no longer write `StructuralLoopContext` through `@nop-chaos/flux-react/unstable`; `flux-react` now exposes a stable `StructuralLoopProvider` used by both `loop` and `recurse` renderers.
- `02-16` is fixed: form publication hooks now live on the stable `flux-react` surface, so `flux-renderers-form` no longer carries a renderer-local hook that directly composes runtime publication helpers.
- `04-04` is fixed: `variant-field` now registers `recurse-submit` child contracts only when the compiled `validationOwnerPlan` explicitly says `create-owner` plus `recurse-submit`, so default `inherit-owner` projected editors no longer masquerade as independent child owners.
- `07-01` and `07-02` are fixed: `statusPath` / `valuesPath` publication now attaches inside `createManagedFormRuntime(...)`, so first publish, incremental updates, and cleanup all follow the form runtime lifecycle instead of renderer-owned React effects.

## Goals

- Land the smallest safe reactive-precision and owner-boundary fixes.
- Separate path-aware subscription correctness from broader architectural reshapes.
- Add focused proof for each behavior-changing fix.

## Non-Goals

- Re-open the already adjudicated fixed/no-longer-live subset closed in Plan 265.

## Scope

### In Scope

- `02-14`, `02-16`, `04-04`, `05-01`, `05-05`, `05-06`, `05-08`, `07-01`, `07-02`, `09-02`

### Out Of Scope

- `05-02`, `05-03`, `05-04`, `07-03`, `07-06`

## Execution Plan

### Phase 1 - Fix Reactive Precision And Owner Drift

Status: completed
Targets: `packages/flux-react/src/hook-subscriptions.ts`, `packages/flux-runtime/src/scope-change.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-basic/src/interaction-owner.ts`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-basic/src/loop.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit each in-scope retained ID against the live repo.
- [x] Land the first closure-ready reactive/owner-boundary fixes.
- [x] Land the path-subscription churn fix for retained item `05-05`.
- [x] Land the deep-path sibling-overlap fix for retained item `05-06`.
- [x] Land the deep-path subscription precision fix for retained item `05-01`.
- [x] Land the stable structural loop provider seam for retained item `02-14`.
- [x] Land the stable form publication hook seam for retained item `02-16`.
- [x] Land the projected-owner child-contract gating fix for retained item `04-04`.
- [x] Land the runtime-owned external publication fix for retained items `07-01` and `07-02`.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit execution decision.
- [x] Any landed fix has focused proof.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed live reactive/owner-boundary defect is silently deferred.
- [x] Remaining work has explicit successor ownership or landed fixes.

## Closure

Status Note: completed. All in-scope retained reactive/owner-boundary items are now landed in code with focused proof, and the runtime-owned external publication boundary has been synced into the owner docs.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit recorded in `docs/logs/2026/05-13.md`
- Evidence: the 2026-05-13 closure entry records that Plan `276` was closed after the final retained IDs were adjudicated, with landed fixes for `09-02`, `05-05`, `05-06`, `05-01`, `02-14`, `02-16`, `04-04`, `07-01`, and `07-02`, focused proof in the package test suites, and owner-doc sync in `docs/architecture/form-external-publication-and-reserved-bindings.md` and `docs/architecture/template-instantiation-and-node-identity.md`.

Follow-up:

- no remaining plan-owned work

## Closure Evidence

- `07-01` / `07-02` now land in `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-types.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, and `packages/flux-core/src/types/renderer-core.ts`: `statusPath` / `valuesPath` move into form runtime creation inputs and are published/cleared by the runtime-owned form lifecycle instead of renderer-owned React effects.
- `packages/flux-renderers-form/src/renderers/form.tsx` now passes explicit publication paths into `runtime.createFormRuntime(...)` and no longer attaches publication effects in the renderer.
- Focused proof: `packages/flux-runtime/src/__tests__/form-runtime-publication.test.ts`, `packages/flux-runtime/src/__tests__/runtime-audit-fixes.test.ts`, and `packages/flux-renderers-form/src/__tests__/form-renderer-lifecycle.test.tsx`.
- Owner-doc sync: `docs/architecture/form-external-publication-and-reserved-bindings.md` now states that `statusPath` / `valuesPath` publication is runtime-owned and cleared on form disposal.
- Verification: `pnpm --filter @nop-chaos/flux-runtime test -- form-runtime-publication.test.ts runtime-audit-fixes.test.ts`, `pnpm --filter @nop-chaos/flux-renderers-form test -- form-renderer-lifecycle.test.tsx`, `pnpm --filter @nop-chaos/flux-renderers-form lint`, followed by final workspace verification.

## Non-Blocking Follow-ups

None yet.
