# False-Positive-Friendly UI Diagnostics

## Purpose

This rule captures recurring review failures where a UI appears correct because a fallback, default value, or one lucky sample masks the real bug.

Use it when reviewing UI regressions, renderer bindings, bridge projections, or tests whose first visible symptom may point at the wrong layer.

## Scope

Apply this rule when code changes touch any of the following:

- UI state that can fall back to defaults, coercions, or placeholder values
- bindings that read through bridges, selectors, or scope projections
- tests that assert one visible row, branch, or selected state
- bug reports where the rendered symptom may be downstream of the actual producer defect

## Required Pattern

### 1) Always verify a contrasting case that defeats the obvious fallback

- A single correct-looking row, branch, or default state is not enough when the same output could be produced by `undefined`, fallback coercion, or stale state.
- Reviewers should validate at least one contrasting case that would fail if the binding were broken.
- Tests should assert the correct result, not just the presence of a plausible-looking value.

Review checks:

- Look for fallback/coercion paths that could accidentally mimic the expected UI.
- Add a contrasting second case with the opposite boolean/value/selection state.
- Verify the assertion proves the intended data path, not just a coincidental default.

### 2) Trace symptoms back to the producer boundary before patching the consumer

- The first visible failing component is often downstream from the real defect.
- Do not patch the consumer until the producer boundary, bridge, selector, or snapshot path has been checked.
- Wrong-layer fixes often preserve the false positive while leaving the actual contract broken.

Review checks:

- Trace the full data path from producer to rendered symptom.
- Check bridge, selector, scope, and snapshot boundaries before editing consumer UI logic.
- Prefer assertions and debugging steps that distinguish producer drift from consumer rendering drift.

## Allowed Exceptions

- Simple purely local UI states with no fallback/coercion path do not require a contrasting-case audit.
- Consumer-local fixes are acceptable once the upstream producer path has been ruled out.

## Review Checklist

- A contrasting case was checked when defaults/fallbacks could mask the bug.
- Assertions prove the intended data path, not a coincidental default.
- Producer boundaries were checked before consumer-layer fixes were made.
- Regression tests cover the bug-revealing contrasting state when relevant.

## Evidence From This Repository

- `docs/bugs/35-performance-table-form-control-isolated-cell-scope-binding-fix.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/bugs/37-report-designer-demo-selection-bridge-inspector-stuck-on-sheet-fix.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
