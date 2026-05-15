# Open-Ended Adversarial Review — 2026-05-15 (Session 2) — Summary

**Execution date**: 2026-05-15 (second session)
**Result directory**: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/`
**Total finding rounds written**: 3
**Total findings**: 14

## Findings

### Round 1: Ownership Boundary Implementation Gaps

1. **`createAdaptorScopeView.ownKeys()` isolation breach** — Proxy trap walks parent chain ignoring `isolate`; enumeration leaks parent keys in isolated contexts
2. **`validateForm` parallel race with concurrent validation** — `Promise.allSettled` can race with blur/change handlers, returning `ok: true` while store has errors
3. **Source prop subscriptions leak on `hasSourceProps` transition** — `useEffect` early-returns without cleanup; controller subscriptions survive after source props disappear
4. **Shared `existingStore` has no owner isolation** — Field states keyed by path only, not `{ownerId, path}`; overlapping paths between shared stores corrupt each other

### Round 2: Defensive Perimeter Gaps

5. **`__xui_actions__` namespace hijackable through import race window** — Collision check misses unregistered namespace; malicious import can temporarily intercept named actions
6. **Import alias `$` prefix overrides built-in expression bindings** — `as: "form"` creates `$form` binding that shadows built-in `$form.valid`, `$form.dirty`, etc.
7. **`String(Symbol())` crashes error boundary fallback** — `renderErrorMessage` throws on Symbol errors, cascading a node error to entire tree crash
8. **Runtime `dispose()` does not abort in-flight actions** — No root AbortSignal; event handlers pass no signal; in-flight actions execute against dead resources
9. **`hasSourceProps` BFS infinite-loops on circular references** — Stack-based traversal without cycle detection; freezes render phase

### Round 3: Table and Compilation Safety Gaps

10. **Duplicate `rowKey` causes silent scope aliasing** — `Map.set()` overwrites first row's scope; data corruption with no production safeguard
11. **Single version counter causes full-table re-render on every keystroke** — No per-row dirty tracking; `new Map(rowScopeCache)` copies all entries per change
12. **`CompiledCidState.duplicateIds` declared but never wired** — Planned schema `id` collision detection is dead code; duplicate IDs go undetected
13. **Row scopes evicted without disposal** — Scope stores accumulate on pagination/filter; no disposal path
14. **Quick-edit draft destroyed by record reference change** — `useEffect` resets all local state when `record` identity changes (triggered by refresh, poll, parent re-render)

## Overall Assessment

This session's 14 findings cluster into three themes:

### 1. Implementation-level ownership/isolation breaks (Findings 1, 4, 5, 6, 8, 10, 13)

Seven findings share a common root: the code declares a boundary (isolated scope, namespaced import, form owner, table row), then fails to enforce it at the implementation level. The `ownKeys()` trap walks past isolate markers. The import namespace collision check fires too early. The shared form store doesn't disambiguate by owner. The `duplicateIds` detection plane was wired in type system but never connected to execution. The table row scope cache evicts without disposal. These are not design-level ambiguities — they are concrete places where the boundary exists in concept but not in code.

### 2. Semantic terminality failures (Findings 2, 3, 8, 14)

Four findings involve an API that promises completeness but leaves a back door: `validateForm` can return `ok: true` while errors exist, source prop subscriptions persist after their inputs vanish, `dispose()` skips in-flight actions, and `useEffect` can destroy user state on reference identity change. These are harder to spot than null-pointer crashes because the code "works" most of the time — the failure requires specific timing, state transitions, or race conditions.

### 3. Cascading failure amplification (Findings 7, 9)

Two findings show how a local failure propagates beyond its natural containment: `String(Symbol())` in the error boundary fallback converts a single-node error into a root-tree crash, and the absence of cycle detection in the source-prop BFS can freeze the entire React render phase. These are not common failure modes, but when they trigger, the containment mechanisms (error boundary, render-phase isolation) are defeated by the defensive code itself.

### De-duplication note

All 14 findings were checked against today's earlier session (`2026-05-15-open-ended-adversarial-review-01/`), the reopened-design-adjudication file, and recent (2026-05-13/14) adversarial reviews. None duplicate already-reported issues at the item level, though Finding 8 (no root AbortSignal) is related to the earlier Finding 1 about unsettled dispatch promises — it's a different root cause with broader impact.

## Blind-Spot Self-Assessment

This session covered scope isolation, form validation race conditions, lifecycle cleanup, import security, error boundaries, action disposal, table performance/integrity, and compilation safety. Areas explicitly not covered:

- **CSS/styling system** — Whether the styling architecture doc matches actual CSS output; class generation correctness
- **Debugger runtime** — Whether debugger state reflects real runtime state
- **Expression evaluation (`flux-formula`)** — Whether all expression paths handle edge cases (division by zero, type coercion, prototype access)
- **Test quality/coverage** — Whether high-value areas have adequate test coverage
- **Build/packaging** — Whether monorepo tooling creates hidden dependency issues
- **Performance benchmarks** — Whether the documented hot-path rules hold under realistic load

These would be good starting points for a future session.
