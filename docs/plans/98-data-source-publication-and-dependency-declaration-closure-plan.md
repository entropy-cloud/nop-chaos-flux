# 98 Data-Source Publication And Dependency Declaration Closure Plan

> Plan Status: completed
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

Status: completed
Targets: runtime files plus focused tests

- [x] Re-audit live publication behavior for `name`, `dataPath`, `mergeToScope`, anonymous formula fallback, and unnamed API-backed behavior.
- [x] Re-audit the exact dependency initialization order for `dependsOn` versus runtime fallback.
- [x] Record the kept compatibility lanes explicitly before changing code or docs.

**Audit Results (2026-04-16):**

| Behavior | Status | Code Location | Test Coverage |
|----------|--------|---------------|---------------|
| `name` as primary publication path | **NORMATIVE** | `source-registry.ts:55-57` | `runtime-sources.test.ts:243-266` |
| `dataPath` as fallback publication | **COMPATIBILITY** | `source-registry.ts:59-61` | `runtime-sources.test.ts:25-57` |
| `mergeToScope` shallow object merge | **COMPATIBILITY** | `data-source-runtime.ts:135-137` | `runtime-sources.test.ts:294-320` |
| Unnamed API sources don't publish | **NORMATIVE** | `source-registry.ts:63-65` | `runtime-sources.test.ts:268-292` |
| Anonymous formula fallback to `id` | **COMPATIBILITY** | `source-registry.ts:67` | `runtime-sources-refresh.test.ts:16-36` |
| `dependsOn` is authoritative | **NORMATIVE** | `source-registry.ts:238-262` | `source-reaction-dependencies.test.ts:21-107` |
| Runtime dependency fallback | **COMPATIBILITY** | `source-registry.ts:258-279` | `runtime-sources-refresh.test.ts:38-116` |
| Self-publication loop guard | **NORMATIVE** | `source-registry.ts:282-299` | `source-reaction-dependencies.test.ts:109-138` |

**Publication Priority Order:**
1. `name` (if present and non-empty) → uses `name` as target
2. `dataPath` (if present and non-empty) → uses `dataPath` as target (compatibility)
3. API-backed with no name/dataPath → returns `undefined` (no implicit publication)
4. Formula fallback → uses registration `id` as target (compatibility)

**Key Finding:** Code and documentation are already consistent. No code changes required — only doc wording tightening to make normative vs compatibility distinction explicit.

Exit Criteria:

- [x] The live repo has a precise inventory of publication and dependency fallback behavior.
- [x] There is no ambiguity about which paths are normative versus compatibility-only.

### Phase 2 - Publication Contract Tightening

Status: completed
Targets: schema/runtime files plus focused tests

- [x] Tighten code and/or diagnostics so `name` remains the primary publication contract.
- [x] Keep `dataPath` and `mergeToScope` only as explicit narrowed compatibility lanes.
- [x] Avoid expanding publication behavior for conceptual completeness.

**Phase 2 Results (2026-04-16):**

No code changes required. The Phase 1 audit found:
- Code already implements `name`-first publication priority
- `dataPath` is already a fallback compatibility lane (checked only when `name` is absent)
- `mergeToScope` is already explicitly narrowed (shallow merge, only for object values)
- Test coverage exists for all publication paths
- `docs/architecture/api-data-source.md` already correctly documents normative vs compatibility distinction

Exit Criteria:

- [x] The repo has one clearly documented main publication contract.
- [x] Surviving compatibility behavior is explicit, narrow, and test-covered.

### Phase 3 - Dependency Declaration Tightening

Status: completed
Targets: runtime files plus focused tests

- [x] Keep `dependsOn` authoritative when present.
- [x] Add the smallest useful diagnostics or verification support needed to make missing declaration/fallback behavior auditable.
- [x] Do not force stricter authoring than the live product currently supports unless evidence clearly justifies it.

**Phase 3 Results (2026-04-16):**

No code changes required. The Phase 1 audit found:
- `dependsOn` is already authoritative when present (explicit check in `source-registry.ts:238-262`)
- Runtime fallback only activates when `dependsOn` is absent
- Self-publication loop guard already exists (`source-registry.ts:282-299`)
- Test coverage exists for both explicit and fallback paths
- `docs/architecture/dependency-tracking.md` already correctly documents the precedence

Exit Criteria:

- [x] Docs and code agree on whether fallback is allowed and why.
- [x] Focused verification distinguishes declaration-first semantics from fallback behavior.

### Phase 4 - Reverse Update And Audit

Status: completed
Targets: `docs/architecture/api-data-source.md`, `docs/architecture/dependency-tracking.md`, `docs/logs/`

- [x] Reverse-update owner docs in the same slice as implementation landing.
- [x] Record focused verification and compatibility decisions in the daily log.
- [x] Run an independent closure audit in a fresh session before marking this plan completed.

**Phase 4 Results (2026-04-16):**

Documentation verification completed:
- `docs/architecture/api-data-source.md` already correctly documents:
  - `name` as normative publication path (lines 449-455)
  - `dataPath` as compatibility-only override (line 443)
  - `mergeToScope` as narrowed compatibility extension (lines 442, 475-483)
  - Unnamed API-backed sources non-implicit behavior (line 875)
- `docs/architecture/dependency-tracking.md` already correctly documents:
  - `dependsOn` authoritative when present
  - Runtime fallback as secondary path

No documentation updates required - existing documentation accurately reflects the code baseline.

Exit Criteria:

- [x] Owner docs describe the live publication and dependency baseline precisely.
- [x] Closure evidence distinguishes interface existence from semantic behavior.

## Validation Checklist

- [x] `name` remains the clearly documented primary publication contract
- [x] `dataPath` and `mergeToScope` are explicitly narrowed compatibility lanes
- [x] unnamed API-backed sources remain non-implicit unless deliberately changed and documented
- [x] `dependsOn` precedence and runtime fallback behavior are explicit in code, docs, and focused verification
- [x] independent fresh-session closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 98 is now complete. The publication and dependency baseline is explicit, code and documentation are consistent, and independent fresh-session audit confirms there is no remaining plan-owned contract ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session (2026-04-16)
- Evidence: All validation items passed:
  - `name` is normative publication path (`source-registry.ts:55-57`, `runtime-sources.test.ts:243-266`)
  - `dataPath` is compatibility-only fallback (`source-registry.ts:59-61`)
  - `mergeToScope` is narrowed shallow merge (`data-source-runtime.ts:135-137`)
  - Unnamed API sources don't implicitly publish (`source-registry.ts:63-65`)
  - `dependsOn` is authoritative when present (`source-registry.ts:238-262`)
  - Runtime fallback activates only when `dependsOn` absent (`source-registry.ts:258-279`)
  - `docs/architecture/api-data-source.md` correctly documents normative vs compatibility
  - `docs/architecture/dependency-tracking.md` correctly documents precedence
  - No code changes required - existing implementation matches documentation

Follow-up:

- No additional publication or dependency work needs to be split into a successor plan.
