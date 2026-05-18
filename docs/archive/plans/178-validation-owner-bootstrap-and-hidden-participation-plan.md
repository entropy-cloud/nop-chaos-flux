# 178 Validation Owner Bootstrap And Hidden Participation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full/summary.md`, live code verification of `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/types/validation.ts`
> Related: `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `docs/plans/168-validation-and-built-in-form-targeting-semantics-convergence-plan.md`, `docs/plans/176-deep-audit-residual-owner-assignment-plan.md`

## Purpose

Close the two still-live validation-owner residuals confirmed by the 2026-05-02 deep audit: dishonest page-root bootstrap publication and form-only hidden-field participation in non-form owners.

## Current Baseline

- `packages/flux-runtime/src/form-runtime.ts:154` initializes owner shared state with `lifecycleState: 'active'` even when `validation` is absent.
- `packages/flux-runtime/src/form-runtime-owner.ts:63-71` computes `ready` from `valid && !isValidating` without considering the absence of a compiled model.
- `packages/flux-runtime/src/runtime-owned-factories.ts:110-115` creates `page-root-validation` without a validation model, and `packages/flux-react/src/schema-renderer.tsx:105-107,228-240` publishes that owner before the compiled root later attaches the validation plan. This allows page-root owner publication as `active` and effectively ready while no compiled model is attached.
- `packages/flux-core/src/types/validation.ts:115` already models `bootstrapping` as a valid lifecycle state, so the live page-root path is bypassing an existing type-level state rather than lacking vocabulary.
- Hidden-field policy machinery already exists in the shared runtime substrate: `packages/flux-runtime/src/form-runtime-field-ops.ts:197-245` updates `hiddenFields`, and `packages/flux-runtime/src/form-runtime-validation.ts:391-392` consults hidden participation during validation.
- But the participation contract is still form-only. `packages/flux-core/src/types/runtime.ts:278-318` gives `ValidationScopeRuntime` no hidden-field participation API, `packages/flux-core/src/types/runtime.ts:329` adds `notifyFieldHidden()` only on `FormRuntime`, and `packages/flux-react/src/node-renderer.tsx:316-334` still casts the nearest owner to `FormRuntime` before publishing hidden notifications.
- `packages/flux-renderers-form/src/field-utils.tsx:485-500` still contains the same form-only hidden-field publication path in `useHiddenFieldPolicy()`, so the residual is not confined to `node-renderer.tsx`.
- Earlier plans already landed the first non-form owner family and the wider hidden-field policy semantics. This plan is only a successor for the two residual gaps above; it does not reopen the broader owner-family or submit/targeting surface.

## Goals

- Make page-root validation owners publish an honest bootstrap lifecycle until a compiled model is attached.
- Make non-form validation owners participate in hidden-field policy through a supported generic owner contract instead of a form-only cast.
- Add focused regression tests that prove both residuals in live behavior.

## Non-Goals

- Do not reopen the broader page/surface/form owner-family work from Plan 163.
- Do not reopen built-in form targeting or hidden-field submit policy semantics from Plan 168.
- Do not redesign validation-owner families beyond the two residuals above.

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`
- `packages/flux-runtime/src/runtime-owned-factories.ts`
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-renderers-form/src/field-utils.tsx`
- focused tests in `packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx`
- focused tests in `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts` and `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts`
- `docs/architecture/form-validation.md`
- `docs/references/form-validation-runtime-types.md` if exported types change
- `docs/logs/2026/05-02.md`

### Out Of Scope

- submit orchestration
- built-in form targeting
- managed surface owner lifecycle
- broader non-form owner family rollout

## Execution Plan

### Phase 1 - Honest Bootstrap Lifecycle

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx`, focused tests, `docs/architecture/form-validation.md`, `docs/logs/2026/05-02.md`

- [x] Introduce a truthful transitional lifecycle for owners created without an initial compiled model.
- [x] Ensure page-root owner publication stays transitional until the compiled root attaches the validation model.
- [x] Update focused tests to prove the page-root path does not publish `active` / ready semantics before model attachment.

Exit Criteria:

- [x] `getScopeState().lifecycleState` remains transitional and `ready === false` while the page-root owner has no compiled validation model attached.
- [x] `packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx` proves the root bootstrap path does not publish active/ready semantics before `refreshCompiledModel(...)` attaches the root validation plan.
- [x] Focused tests prove the root bootstrap sequence in live code.
- [x] `docs/architecture/form-validation.md` reflects the final bootstrap baseline.
- [x] `docs/logs/2026/05-02.md` records the bootstrap fix.

### Phase 2 - Generic Hidden Participation Contract

Status: completed
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts`, `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts`, focused tests, `docs/architecture/form-validation.md`, `docs/references/form-validation-runtime-types.md`, `docs/logs/2026/05-02.md`

- [x] Add a supported hidden-field participation contract for non-form validation owners.
- [x] Remove the remaining React-side `FormRuntime` cast in the nearest-owner hidden effect.
- [x] Remove the matching `FormRuntime` cast in `field-utils.tsx` hidden-field publication.
- [x] Add focused tests that prove non-form owners honor hidden-field participation updates.

Exit Criteria:

- [x] `ValidationScopeRuntime` exposes a hidden-field participation contract used by both `node-renderer.tsx` and `field-utils.tsx` without a `FormRuntime` cast.
- [x] `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts` proves non-form validation owners receive hidden participation updates.
- [x] `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts` covers the exported generic owner contract if the runtime/type surface changes.
- [x] `docs/architecture/form-validation.md` and `docs/references/form-validation-runtime-types.md` match the final exported baseline.
- [x] `docs/logs/2026/05-02.md` records the hidden-participation fix.

## Validation Checklist

- [x] page-root owners publish an honest bootstrap lifecycle before compiled model attachment
- [x] non-form owners participate in hidden-field policy through a supported generic contract
- [x] focused tests cover both residual behaviors
- [x] independent closure audit confirms no remaining plan-owned validation-owner residual in scope
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed after page-root validation owners now publish `bootstrapping` / `ready: false` until `refreshCompiledModel(...)` attaches the compiled root validation plan, while hidden-field participation now flows through `ValidationScopeRuntime` without `FormRuntime` casts. Focused regressions, documentation sync, the independent closure audit, and repo-wide `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all pass.

Closure Audit Evidence:

- Reviewer / Agent: fresh general subagent (`ses_217a287f7ffeAUbNGkuvYtjMFg`)
- Evidence: the independent audit reported no remaining in-scope residuals, confirmed both the page-root bootstrap lifecycle and the generic hidden-participation contract in live code/tests/docs, and explicitly concluded that Plan 178 can close from an in-scope behavior perspective; repo-wide verification is recorded in `docs/logs/2026/05-02.md`.

Follow-up:

- no remaining plan-owned code work
- broader owner-family or validation semantics changes should move through a separate successor plan rather than widening this one
