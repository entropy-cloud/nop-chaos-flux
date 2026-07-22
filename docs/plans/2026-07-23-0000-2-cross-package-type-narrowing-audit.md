# 2 Cross-Package Type Narrowing Audit

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: Deferred from `docs/plans/2026-07-22-0915-2-scheduling-package-remediation.md` — "Cross-package type narrowing verification" (watch-only residual, Successor Required: yes). Also `docs/analysis/2026-07-21-1920-open-audit-scheduling/round-01.md:259` and `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md:275`.
> Mission: scheduling
> Work Item: Type narrowing audit at flux-core → flux-react boundary
> Related: `docs/plans/2026-07-21-2100-1-scheduling-type-contract-remediation.md` (completed — type contract remediation for scheduling)

## Purpose

Investigate the type narrowing blind spot at the `flux-core` → `flux-react` package boundary that was identified but not confirmed during the scheduling open-ended audit. Design and execute focused verification to determine whether type narrowing issues cause incorrect generic inference, unsound type narrowing, or TypeScript compilation gaps in the scheduling renderers' usage of the cross-package API surface. Fix confirmed issues or document the boundary as verified clean.

## Current Baseline

- TypeScript strict mode is enabled across all packages (root `tsconfig.base.json`).
- `pnpm typecheck` passes (56 tasks, 0 errors) across the monorepo as of the latest scheduling plan closure.
- `docs/plans/2026-07-21-2100-1-scheduling-type-contract-remediation.md` completed type contract remediation for scheduling-specific types (renderer definitions, schema fields).
- The open-ended audit rounds identified the `flux-core` → `flux-react` boundary as a type narrowing blind spot. Round 01 (`docs/analysis/2026-07-21-1920-open-audit-scheduling/round-01.md:259`) explicitly notes: "Did not verify `RendererComponentProps<GanttSchema>` generic narrowing at the boundary between flux-core / flux-react / flux-renderers-scheduling." Round 04 (`docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md:275`) adds: "Did not verify `RendererComponentProps<GanttSchema>` type narrowing works at runtime." No confirmed defects — these are blind spots, not confirmed issues.
- Key boundary types: `RendererProps<T>`, `SchemaNode`, `ResolvedProps`, `RegionHandle`, `region` compile output types (cross-package).
- Key consumption patterns in scheduling: `useRendererRuntime()`, `useScopeSelector()`, `useRenderScope()`, `props.props` (resolved runtime values), `props.regions` (precompiled render handles).
- The boundary has no dedicated TypeScript-level negative tests (e.g., "this should be a type error") that verify narrowing correctness.

## Goals

- Design and execute verification of type narrowing at the `flux-core` → `flux-react` boundary as consumed by scheduling renderers.
- Identify any confirmed type narrowing defects (incorrect inference, unsound narrowing, type escapes).
- Fix all confirmed P0/P1 type narrowing defects.
- If no defects found, document the boundary as verified and close with evidence.
- Add focused type-level tests (TypeScript `@ts-expect-error` or assertion-level) that guard against regression.

## Non-Goals

- Not re-auditing scheduling-specific type contracts (already covered by `2026-07-21-2100-1`).
- Not changing the flux-core or flux-react public API surface — narrowing fixes are internal soundness corrections.
- Not auditing type narrowing at boundaries beyond `flux-core` → `flux-react` (e.g., `flux-compiler` → `flux-runtime`).
- Not migrating to a different type system or adding runtime type checking.

## Scope

### In Scope

- Type narrowing at the `flux-core` → `flux-react` boundary as consumed by scheduling renderers.
- Patterns to verify:
  - Generic inference of `RendererProps<T>` when consumed by `useRendererRuntime()` in scheduling components.
  - Union type narrowing on `props.props` — resolved props union discriminated by renderer type.
  - Type narrowing of region handles (`props.regions`) — typed by schema region declarations.
  - Narrowing of scope data returned by `useScopeSelector()`.
  - Cross-package type instantiation — do generics from flux-core resolve correctly in flux-react consuming code?
- Writing focused TypeScript type-level regression tests.
- Fixing confirmed narrowing issues.

### Out Of Scope

- Runtime behavior correctness (covered by existing tests and functional plans).
- Package dependency ordering or circular dependency detection.
- Other package boundaries (flux-formula → flux-compiler, flux-runtime → flux-react, etc.).
- Refactoring public type exports or changing generic constraints.

## Failure Paths

| Scenario                     | Trigger                                                            | Behavior                                                           | Retry | User Impact                                        |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----- | -------------------------------------------------- |
| No defects found             | TypeScript strict mode already catches all narrowing               | Document as verified; add type-level guard tests                   | N/A   | None                                               |
| Incorrect `as` cast found    | `as SomeType` assertion where narrowing is unsound                 | Replace with proper discriminated union narrowing or branded types | Yes   | Subtle runtime incorrectness in edge cases         |
| Generic constraint violation | Generic parameter used outside its constraint                      | Fix constraint or use intersection                                 | Yes   | TypeScript compile error in consuming code         |
| Region handle type escape    | Region typed as `RenderRegionHandle` but narrowed to wrong variant | Add discriminant check or type guard                               | Yes   | Runtime region render may receive wrong data shape |

## Test Strategy

本档选择：`必须自动化`

Each narrowing pattern must have a TypeScript-level regression test. At minimum: one `expect-type` or `@ts-expect-error` test per confirmed narrowing path. Plan closure requires `pnpm typecheck` green.

## Execution Plan

### Phase 1 — Boundary Analysis & Test Harness Setup

Status: planned
Targets: `packages/flux-core/src/` (exports consumed by flux-react), `packages/flux-react/src/` (hooks/types consumed by scheduling)

- Item Types: `Proof | Decision`

- [ ] (Proof) Map the exact type narrowing paths at the `flux-core` → `flux-react` boundary used by scheduling renderers. Trace: which flux-core types flow through which flux-react hooks into which scheduling components.
- [ ] (Proof) Identify all `as` type assertions, type predicates, and `is` / `asserts` guards used at this boundary.
- [ ] (Decision) Categorize each narrowing path by risk level — sound (type-safe by construction), unverifiable (blind spot), or unsafe (confirmed or suspected unsoundness).
- [ ] (Decision) Design focused TypeScript type-level tests for each "unverifiable" or "unsafe" path.

Exit Criteria:

- [ ] Complete narrowing path map documented (findings can be inline in plan or a brief analysis doc).
- [ ] All paths categorized by risk level.
- [ ] Test plans drafted for each unverifiable/unsafe path.

### Phase 2 — Verification & Fix

Status: planned
Targets: Paths identified in Phase 1

- Item Types: `Proof | Fix`

- [ ] (Proof) For each unverifiable path: write a TypeScript type-level test that confirms correct narrowing (or catches a bug).
- [ ] (Fix) For each confirmed defect: fix the narrowing — replace `as` casts with discriminated unions, add type predicates, add branded types, or adjust generic constraints.
- [ ] (Proof) For each fixed defect: add a `@ts-expect-error` / `expect-type` regression test.
- [ ] (Proof) Run `pnpm typecheck` — verify zero regressions from type-level test additions.
- [ ] (Decision) If no confirmed defects: document all paths as verified and add baseline type-level tests for regression prevention only.

Exit Criteria:

- [ ] All unverifiable/unsafe narrowing paths have type-level tests.
- [ ] All confirmed defects fixed with regression tests.
- [ ] `pnpm typecheck` passes.

## Draft Review Record

> - Reviewer / Agent: fresh sub-agent session (ses_073c3f923ffetzdKEYU8lordSU)
> - Verdict: pass
> - Rounds: 2 (initial review → revise → re-review)
> - Findings addressed:
>   - Major: analysis document reference corrected from wrong display/operability analysis to correct open-audit round files (round-01.md:259, round-04.md:275)

## Closure Gates

- [ ] All narrowing paths at the `flux-core` → `flux-react` boundary (as consumed by scheduling) are verified or fixed.
- [ ] All confirmed narrowing defects fixed with focused type-level regression tests.
- [ ] No in-scope narrowing issue downgraded to deferred/follow-up without explicit adjudication.
- [ ] No owner-doc update required — type narrowing fixes are internal soundness corrections, not public API or behavior changes. If a fix changes a public type signature or generic constraint, `docs/architecture/flux-core.md` or `docs/architecture/renderer-runtime.md` must be updated.
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and recorded; execution session may not self-audit this item.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Other package-boundary type narrowing (flux-compiler → flux-runtime, etc.)

- Classification: `watch-only residual`
- Why Not Blocking Closure: Only one boundary (flux-core → flux-react) was flagged by the open-ended audit for scheduling. Other boundaries were not identified as blind spots and are out of scope for this plan.
- Successor Required: `no`

## Non-Blocking Follow-ups

- If Phase 1 reveals systemic type narrowing patterns that apply beyond scheduling (e.g., all renderers share the same narrowing path), file a follow-up for a broader cross-package audit.

## Closure

Status Note: (to be filled on completion)

Closure Audit Evidence:

- Auditor / Agent: (independent sub-agent, fresh session)
- Evidence:

Follow-up:
