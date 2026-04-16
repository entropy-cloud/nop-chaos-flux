# 98 Data-Source Publication And Dependency Declaration Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/architecture/api-data-source.md`, `docs/architecture/dependency-tracking.md`
> Related: `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md`, `docs/plans/96-final-architecture-doc-code-closure-plan.md`

## Purpose

Close the remaining `data-source` contract ambiguity by keeping `name` as the primary publication model, narrowing the surviving compatibility lanes, and making the explicit-first / runtime-fallback dependency baseline visible and auditable without overengineering a new analysis subsystem.

## Current Baseline

- `data-source` already uses a `name`-first authoring baseline.
- `dataPath` and `mergeToScope` still exist as narrowed compatibility-style lanes.
- anonymous formula-backed compatibility fallback still exists; unnamed API-backed sources do not implicitly publish when `name` and `dataPath` are absent.
- dependency tracking is already root-normalized.
- `dependsOn` is authoritative when present, and runtime fallback still exists when it is absent.

## Goals

- Keep one clearly documented main publication contract for `data-source`.
- Narrow compatibility behavior and diagnostics so it is no longer described with equal contract weight to `name`.
- Make the declaration-first dependency baseline explicit in docs, code, and focused verification.

## Non-Goals

- Do not remove compatibility behavior blindly if live schemas/tests still require it.
- Do not build a static dependency extraction system.
- Do not turn `mergeToScope` into a richer parallel publication abstraction.

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`
- touched focused tests
- `docs/architecture/api-data-source.md`
- `docs/architecture/dependency-tracking.md`
- `docs/logs/`

### Out Of Scope

- unrelated request-runtime redesign
- any product-wide mandatory ban on all compatibility authoring in one step

## Execution Plan

### Phase 1 - Publication Boundary Audit

Status: planned
Targets: runtime files plus focused tests

- [ ] Re-audit live publication behavior for `name`, `dataPath`, `mergeToScope`, anonymous formula fallback, and unnamed API-backed behavior.
- [ ] Re-audit the exact dependency initialization order for `dependsOn` versus runtime fallback.
- [ ] Record the kept compatibility lanes explicitly before changing code or docs.

Exit Criteria:

- [ ] The live repo has a precise inventory of publication and dependency fallback behavior.
- [ ] There is no ambiguity about which paths are normative versus compatibility-only.

### Phase 2 - Publication Contract Tightening

Status: planned
Targets: schema/runtime files plus focused tests

- [ ] Tighten code and/or diagnostics so `name` remains the primary publication contract.
- [ ] Keep `dataPath` and `mergeToScope` only as explicit narrowed compatibility lanes.
- [ ] Avoid expanding publication behavior for conceptual completeness.

Exit Criteria:

- [ ] The repo has one clearly documented main publication contract.
- [ ] Surviving compatibility behavior is explicit, narrow, and test-covered.

### Phase 3 - Dependency Declaration Tightening

Status: planned
Targets: runtime files plus focused tests

- [ ] Keep `dependsOn` authoritative when present.
- [ ] Add the smallest useful diagnostics or verification support needed to make missing declaration/fallback behavior auditable.
- [ ] Do not force stricter authoring than the live product currently supports unless evidence clearly justifies it.

Exit Criteria:

- [ ] Docs and code agree on whether fallback is allowed and why.
- [ ] Focused verification distinguishes declaration-first semantics from fallback behavior.

### Phase 4 - Reverse Update And Audit

Status: planned
Targets: `docs/architecture/api-data-source.md`, `docs/architecture/dependency-tracking.md`, `docs/logs/`

- [ ] Reverse-update owner docs in the same slice as implementation landing.
- [ ] Record focused verification and compatibility decisions in the daily log.
- [ ] Run an independent closure audit in a fresh session before marking this plan completed.

Exit Criteria:

- [ ] Owner docs describe the live publication and dependency baseline precisely.
- [ ] Closure evidence distinguishes interface existence from semantic behavior.

## Validation Checklist

- [ ] `name` remains the clearly documented primary publication contract
- [ ] `dataPath` and `mergeToScope` are explicitly narrowed compatibility lanes
- [ ] unnamed API-backed sources remain non-implicit unless deliberately changed and documented
- [ ] `dependsOn` precedence and runtime fallback behavior are explicit in code, docs, and focused verification
- [ ] independent fresh-session closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after the live publication and dependency behaviors are re-audited, reverse docs are updated, and an independent fresh-session audit confirms there is no remaining plan-owned contract ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- If diagnostics or compatibility removal need to be split further, move the remainder into a narrower successor plan instead of broadening this plan.
