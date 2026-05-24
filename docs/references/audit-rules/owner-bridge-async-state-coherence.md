# Owner Bridge Async State Coherence

## Purpose

This rule captures recurring failure modes where owner-local state, host bridge projections, async invalidation, and persisted/autosaved data drift out of sync.

Use it when reviewing designer, editor, runtime-owned async flows, or any component that projects internal state into host scope/status summaries.

## Scope

Apply this rule when code changes touch any of the following:

- instance-owned async helpers such as layout, preview, autosave, refresh, or import flows
- host snapshot / bridge derivation such as `derive*HostSnapshot()` or `host-data.ts`
- status summaries that publish `dirty`, `ready`, `loading`, selection, or saved document data
- document replacement or import flows that also maintain derived caches
- save/autosave paths that write both local runtime state and external host-visible state

## Required Pattern

### 1) Async ownership must be instance-owned, not module-global

- Cancellation, stale-result guards, and request supersession must belong to one runtime/owner instance.
- Do not use module-global counters or invalidation state when multiple instances can coexist.
- Cleanup in one instance must not cancel or stale-drop work owned by a sibling instance.

Review checks:

- Search for module-scope request counters, generation ids, or invalidation helpers.
- Confirm async completion writes are gated by the current owner token or controller.
- Add at least one coexistence test when the helper can run in multiple mounted instances.

### 2) Bridge semantics must match owner semantics across every export path

- If an owner defines `dirty`, `ready`, `selection`, or similar summary fields, all outward projections must use the same meaning.
- `bridge.ts`, `host-data.ts`, page-level host scope publication, toolbar helpers, and tests must agree on the same contract.
- Do not let one projection publish designer-only state while another silently publishes aggregated runtime state under the same field name.

Review checks:

- Grep every read/write path for the affected summary field.
- Compare owner snapshot semantics against bridge output, host-scope publication, and UI helpers.
- Check tests for incorrectly frozen behavior that encodes the old wrong contract.

### 3) Primary-state replacement must refresh all derived state in the same transaction

- Any operation that replaces the primary document/model must refresh derived caches immediately.
- Imported documents must not leave field sources, inspector schemas, loading/error state, or selection-derived projections on the old baseline.
- If the subsystem already has a single derivation refresh entrypoint, use it consistently instead of duplicating partial invalidation logic.

Review checks:

- Search for document/model replacement paths and verify they call the shared refresh hook.
- Check whether selection, inspector, field-source, and status projections are recomputed immediately after replacement.
- Add a regression test that asserts the new derived result, not only the absence of an exception.

### 4) Persisted truth must not diverge from live runtime truth

- Save flows must only clear `dirty` after the final authoritative save succeeds.
- Autosave payloads must be assembled from live runtime state, not stale initialization props.
- Host-visible saved data, local persisted data, and in-memory runtime state must agree on attachment/extras priority.

Review checks:

- Verify the ordering of local save, host save, dirty clearing, and autosave callbacks.
- Trace every source used to assemble persisted payloads; reject stale `initial*` fallbacks once runtime state exists.
- Test host-save failure and autosave-after-mutation scenarios explicitly.

## Allowed Exceptions

- Module-global state is allowed only for process-wide singletons that are explicitly documented as singleton-only and are never mounted concurrently.
- Aggregated summary fields are allowed when they use a distinct field name and the owner doc explicitly defines the aggregation contract.
- Deferred refresh is allowed only when the owner doc explicitly says the projection is intentionally lagging and consumers are forbidden from treating it as live state.

## Review Checklist

- Async request invalidation is owner-local, not cross-instance.
- Completion writes are gated against stale ownership.
- Bridge, host scope, status summary, and UI helpers publish the same field semantics.
- Primary-state replacement refreshes every derived cache that depends on it.
- Save/autosave flows clear `dirty` only after authoritative success.
- Persisted payloads come from live runtime state once runtime state exists.
- Focused tests cover coexistence, stale-result, import-refresh, and save-failure/autosave regression paths where relevant.

## Evidence From This Repository

- `docs/archive/analysis/2026-05-02-adversarial-audit-review-4.md`
- `docs/archive/plans/146-domain-host-projection-and-vocabulary-convergence-plan.md`
- `docs/archive/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`
- `docs/archive/plans/170-field-interaction-reactivity-and-async-safety-successor-plan.md`
- `docs/archive/plans/180-report-preview-cancellation-and-stale-result-plan.md`
- `docs/bugs/37-report-designer-demo-selection-bridge-inspector-stuck-on-sheet-fix.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/bugs/38-report-designer-preview-cancellation-and-stale-result-fix.md`
- `docs/archive/plans/175-review-4-findings-remediation-plan.md`

## Primary Architecture Anchors

- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/word-editor/design.md`
- `docs/architecture/action-interaction-state.md`
- `docs/architecture/performance-design-requirements.md`
