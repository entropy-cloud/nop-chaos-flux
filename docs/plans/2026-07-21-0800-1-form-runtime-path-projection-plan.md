# F1 — Form Runtime Architecture: Cross-Field Addressing, Submit Projection, Path Resolution

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-06-26-2100-1-b7-p2p3-signal-triage-residual-adjudication-plan.md` (V6, C10, T2), `docs/plans/2026-06-26-0520-2-b32-array-combo-nested-isolation-validation-addressing-plan.md` (C10), `docs/plans/2026-06-26-0520-1-b31-table-row-identity-pagination-clamp-sort-selection-plan.md` (T2), `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`
> Related: `docs/plans/2026-07-21-0800-2-table-data-component-enhancement-plan.md`

## Purpose

Implement three deferred form-runtime architecture features that enable cross-field addressing in composite rows, proper submit-payload hidden-field projection, and bracket-key path resolution for literal/dotted field names. These are genuine feature gaps (not bugs) that were deferred from the B3/B7 work as `out-of-scope improvement`.

## Current Baseline

- **V6 (cross-field addressing in arrays):** Flux array rows use absolute index-addressed paths (`items/0/field`, `items/1/field`). The `getChildFieldPathPrefix` intentionally returns `false`, meaning item child validation is registered through projected form runtime. There is no mechanism for row-local relative references (e.g., `../siblingField`). This is documented as a deliberate contract in the B3.2 closure.
- **C10 (submit-payload projection):** Hidden field values are currently included in form submission payloads unless `clearValueWhenHidden` is set (which clears the value but still includes the key in the payload). The "exclude hidden fields from submit projection" half is a distinct feature not yet implemented. `form-runtime.ts` has no concept of a "projection filter" during submit.
- **T2 (bracket-key path resolution):** The path binder resolves dotted paths as nested traversal (`"a.b"` → `{a: {b: ...}}`). Fields with literal dots in their name (e.g., `"my.field"` as a single key) cannot be addressed because bracket syntax (`["my.field"]`) is not supported. T6 (dotted-nested-path) is already locked.

## Goals

- Implement row-local relative cross-field addressing in array/combo children (e.g., `../fieldName` relative to current item scope)
- Implement submit-payload projection that excludes hidden fields from serialized output (the "hidden exclusion" half of C10)
- Implement bracket-key path resolution for literal dots/symbols in field names (`obj["a.b"]` syntax support)
- All features covered by focused unit tests and integration tests

## Non-Goals

- No changes to validation-collection internals beyond what V6 requires
- No general-purpose path-binding rearchitecture — T2 is additive to existing path binder
- No `clearValueWhenHidden` behavior change — that's a separate existing contract
- No compile-time auto-dependency collection (requires `dependency-tracking.md` revision first)
- No reactive i18n wiring (I1/I4) — separate product decision needed

## Scope

### In Scope

- V6: `flux-runtime` + `flux-compiler` — relative path prefix normalization in array item scope creation, validation registration for relative references
- C10: `flux-runtime` — `submitPayloadFilter` or equivalent mechanism in form submit path to exclude hidden fields
- T2: `flux-runtime` or `flux-core` — bracket-key path parsing in `getIn`/`setIn`/path resolution utilities
- All three: unit tests, integration tests with array/combo forms

### Out Of Scope

- Other deferred items from B7 (T11, T28, S4, A10, I10, D10, TR7, U5/U6, DD7, DD9, MP2) — separate plans
- `derived-state-in-effect` cleanup (plan 415 successor) — separate plan
- `compile-time auto-dependency collection` — needs `dependency-tracking.md` revision first

## Test Strategy

档位选择：`必须自动化`

本档选择：必须自动化 — these are form-runtime architecture features affecting public contract (submit projection, path resolution, cross-field addressing). Proof items precede Fix items.

## Execution Plan

### Phase 1 — Bracket-Key Path Resolution (T2)

Status: completed
Targets: `packages/flux-core/src/` (path utils), `packages/flux-runtime/src/` (path binding)

- Item Types: `Fix | Proof`

- [x] Add bracket-key parsing to the path resolution utility (`getIn`/`setIn`/path tokenizer): treat `["..."]` segments as literal keys, not nested traversal
- [x] Update scope `get`/`set`/`delete` paths to pass through bracket-key tokens
- [x] Write focused unit tests covering: `a.b` (nested), `a["b"]` (bracket literal), `["a.b"]` (dot-literal), `a[0].b` (array index + bracket mix)
- [x] Verify existing dotted path tests still pass (T6 backward compatibility)

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core test` passes with new T2 tests
- [x] Existing path resolution tests (T6) unchanged and still pass

### Phase 2 — Row-Local Relative Cross-Field Addressing (V6)

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/validation/`

- Item Types: `Fix | Proof`

- [x] Design and implement relative path normalization in item scope creation: `../fieldName` resolves to sibling field in the same array/combo row
- [x] Update validation registration in projected form runtime to support relative target paths
- [x] Write focused tests: array item `../target` validation, combo nested `../../field` two-level relative, edge cases (root-relative, out-of-bounds)
- [x] Write integration test: form with combo containing cross-field validation rule using relative addressing

Exit Criteria:

- [x] Relative `../path` validation rules work in array/combo item scopes
- [x] Existing absolute-index path validation unchanged and still passes
- [x] `pnpm typecheck` passes

### Phase 3 — Submit-Payload Hidden Field Projection (C10)

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts` (form submit path)

- Item Types: `Fix | Proof`

- [x] Design and implement a "projection filter" concept in form submit: exclude fields whose `hidden`/`visible:false` meta is active at submit time
- [x] Ensure `clearValueWhenHidden` path is unaffected (separate contract — user explicitly opted to clear but not exclude)
- [x] Wire the filter into the `getSubmitData` or equivalent serialization path
- [x] Write focused tests: form with hidden fields excluded from payload, form with `clearValueWhenHidden` keeping the key (value cleared but still present), form with dynamic hidden toggle
- [x] Write integration test: combo with hidden sub-fields, array with conditional hidden items

Exit Criteria:

- [x] Hidden fields (by `visible: false`) do not appear in submit payload by default
- [x] `clearValueWhenHidden: true` still clears values but does not exclude keys (existing contract preserved)
- [x] `pnpm typecheck && pnpm build` passes

### Phase 4 — Owner-Doc Sync

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/logs/`

- Item Types: `Follow-up`

- [x] Update `docs/architecture/form-validation.md`: document row-local relative path resolution, submit projection filter, bracket-key path syntax
- [x] Update `docs/architecture/flux-runtime-module-boundaries.md` if runtime ownership changes
- [x] Update `docs/logs/2026/07-21.md`

Exit Criteria:

- [x] Owner docs reflect current live baseline for all three features
- [x] Daily log written

## Draft Review Record

- Reviewer / Agent: independent sub-agent (ses_07ef9c01cffew4Idlq58lBf9rj)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker, 0 Major, 2 Minor (not blocking). Minor 1: Phase 1 `getIn`/`setIn` clarify during execution. Minor 2: Phase 2 target directory precision acceptable for plan level.

## Closure Gates

- [x] V6 cross-field addressing implemented and tested in array/combo item scopes
- [x] C10 hidden-field submit projection implemented with backward-compatible `clearValueWhenHidden` path
- [x] T2 bracket-key path resolution implemented with backward-compatible dotted-path behavior
- [x] All focused tests pass; existing tests not regressed
- [x] No deferred live defects or contract drifts
- [x] Affected owner docs synced (form-validation.md, flux-runtime-module-boundaries.md)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None — scope is self-contained with three tightly related features.

## Non-Blocking Follow-ups

- `dependency-tracking.md` normative decision revision (needed before compile-time auto-dependency collection can proceed) — separate successor plan, not part of this scope.

## Closure

Status Note: Completed — all 4 phases executed, tests green, docs updated. Closure audit gate left open for independent sub-agent per Collaboration Discipline.

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session ses_07ef9c01cffew4Idlq58lBf9rj)
- Evidence: Verified Phase 1 (T2) — `parsePath` in `packages/flux-core/src/utils/path.ts` with bracket-key tokenizer, 12 tests in `path.contract.test.ts` and `edge-cases.contract.test.ts`, all pass. Verified Phase 2 (V6) — `resolveRelativePath` in `packages/flux-core/src/utils/path.ts`, wired into 4 validators in `packages/flux-runtime/src/validation/validators.ts` and `buildCompiledValidationDependentMap` in `packages/flux-core/src/validation-model.ts`, 8 unit tests + 1 integration test in `validation-rule-semantics-and-lifecycle.test.ts`. Verified Phase 3 (C10) — `excludeHiddenFieldPaths` and `computeExcludedHiddenPaths` in `packages/flux-runtime/src/form-runtime-submit-flow.ts`, 5 dedicated tests in `hidden-field-policy.test.ts`. Verified Phase 4 — `docs/architecture/form-validation.md` (V6 at line 786, C10 at line 888), `docs/architecture/flux-core.md` (T2 at line 459), `docs/logs/2026/07-21.md` written. All closure gates ticked, no deferred defects.

Follow-up:

- No remaining plan-owned work.
