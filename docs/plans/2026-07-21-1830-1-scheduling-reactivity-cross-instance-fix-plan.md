# {1} Scheduling Reactivity Model & Cross-Instance Safety

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-20-2157-open-audit-scheduling.md` (Round 4 findings F-31, F-32, F-33, F-37), `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md`
> Related: `docs/plans/2026-07-21-0800-1-scheduling-functional-correctness-plan.md` (completed), `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` (completed)

## Purpose

Fix the Gantt store reactivity model where key mutation paths bypass revision counters (making schema data changes and zoom invisible to the UI), remove the dead EventEmitter infrastructure that duplicates Zustand's built-in subscription system, and eliminate cross-instance state leaks via global DOM `id` attributes and module-level singletons. These are the highest-impact remaining defects in the scheduling package after Plans {1}/{2}/{3} landed.

## Current Baseline

- **F-31 (P0)**: `GanttStore.parse()`, `setZoom()`, and `recalcLayout()` update Zustand state but never increment `revision`, `taskRevision`, or `layoutRevision`. `useSyncExternalStore` subscribers see no change — schema data re-parse (API response, dialog open, tab switch) produces a visually stale Gantt; zoom changes leave bars/timeline at old pixel coordinates; a `updateTask()` workaround (which DOES bump revision) creates the illusion the feature works. Affects all non-interactive data flow into the Gantt.

- **F-32 (P2)**: `GanttStore` carries a manual `EventEmitter` (`Map<string, Set<EventHandler>>`, `on`/`off`/`emit`) dispatching 8 event types (`dataChange`, `taskChange`, `linkChange`, `treeChange`, `layoutChange`, `linkAdd`, `linkDelete`, `taskDelete`). Zero runtime subscribers outside tests — the `gantt-context.tsx` uses Zustand's built-in `store.subscribe`. The `emit()` calls execute on every store mutation with no effect, adding misleading code that suggests external listeners exist.

- **F-33 (P1)**: `GanttEditor` uses hardcoded DOM `id` attributes (`"edit-text"`, `"edit-start"`, etc.) paired with `<Label htmlFor={id}>`. Two Gantt instances on the same page produce duplicate `id` values — `<Label>` clicks in instance B incorrectly focus/highlight inputs in instance A. Input values are read via React refs (not `document.getElementById`), but duplicate IDs violate HTML spec and create fragility for any utility that queries by `id`.

- **F-37 (P2)**: `prepareWasm()` caches its result in a module-level `wasmPromise` singleton. The `wasmUrl` parameter is only read on the very first invocation. Two barcode-input instances with different WASM endpoints silently share the first instance's URL. `resetWasmPromise()` exists but is never called from any component lifecycle. Cached promise persists across test runs.

## Goals

- GanttStore `parse()`, `setZoom()`, and `recalcLayout()` each increment the appropriate revision counter(s) so `useSyncExternalStore` subscribers re-render.
- Remove the dead EventEmitter infrastructure (8 `emit` call sites, `on`/`off` storage, event type strings) from GanttStore.
- GanttEditor form inputs use instance-unique `id` values or ref-based access — no `document.getElementById` for internal form fields.
- `prepareWasm` either supports per-instance isolation or is documented as a shared resource with a lifecycle-aware reset mechanism.

## Non-Goals

- Not rewriting GanttStore as pure Zustand (strategy deferred per completed Plan {3} Non-Goals).
- Not adding new tests for existing behavior — only updating tests broken by the EventEmitter removal.
- Not fixing Calendar event contract issues (covered in Plan {2}).

## Scope

### In Scope

- GanttStore revision bump for `parse`, `setZoom`, `recalcLayout`.
- GanttStore dead EventEmitter removal.
- GanttEditor `document.getElementById` → ref-based or unique-id form access.
- `prepareWasm` singleton → per-instance or documented shared-resource with reset.

### Out Of Scope

- GanttStore migration to Zustand (see Completed Plan {3} Out Of Scope).
- Adding i18n, a11y, or styling changes.
- Other calendar/barcode findings (covered in Plan {2}).

## Test Strategy

本档选择：建议有测

Each fix must have a focused regression test. The EventEmitter removal should be verified by asserting no `emit`/`on`/`off` calls remain in GanttStore. The revision bump should be verified by a unit test that calls `parse`/`setZoom`/`recalcLayout` and asserts the corresponding revision counter increased.

## Execution Plan

### Phase 1 - GanttStore Revision Bump & EventEmitter Removal

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts`, `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx`

- Item Types: `Fix | Proof`

- [x] F-31: Add `revision++` / `taskRevision++` / `layoutRevision++` calls at the end of `parse()`, `setZoom()`, and `recalcLayout()` in GanttStore.
- [x] F-31: Verify each bump triggers the correct `useSyncExternalStore` snapshot change — add a unit test that spies on `store.revision` after each method call.
- [x] F-32: Remove `_events: Map<string, Set<EventHandler>>`, `on()`, `off()`, `emit()` from GanttStore class.
- [x] F-32: Remove all 8 `emit*()` call sites (`emitTaskChange`, `emitLinkChange`, `emitTreeChange`, `emitLayoutChange`, `emitDataChange`, `emitLinkAdd`, `emitLinkDelete`, `emitTaskDelete`) from store methods (task update, link CRUD, toggle, parse, recalc, etc.).
- [x] F-32: Update any test that depends on EventEmitter events to use Zustand subscription patterns instead.
- [x] F-32: Run full scheduling test suite and fix any breakage from EventEmitter removal.

Exit Criteria:

- [x] `parse()` increments `revision` — verified by unit test.
- [x] `setZoom()` increments `revision` and `layoutRevision` — verified by unit test.
- [x] `recalcLayout()` increments `layoutRevision` — verified by unit test.
- [x] Zero EventEmitter infrastructure (`on`, `off`, `emit`, `_events`) remains in `gantt-store.ts`.
- [x] No test breakage from EventEmitter removal.

### Phase 2 - Cross-Instance Safety (GanttEditor + Barcode WASM)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx`, `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts`

- Item Types: `Fix | Decision | Proof`

- [x] F-33: Replace hardcoded `id` attributes in GanttEditor (`"edit-text"`, `"edit-start"`, etc.) with instance-unique IDs (e.g., `gantt-editor-text-${instanceId}`) to prevent cross-instance `htmlFor` misassociation. (Input values are already accessed via existing React refs — no `document.getElementById` reads to replace.)
- [x] F-33: Add a unit test rendering two GanttEditors and asserting cross-instance isolation (editing in instance B does not affect instance A's values).
- [x] F-37: Decide strategy — strategy (a): make `prepareWasm` per-URL using a `Map<string, Promise<void>>` keyed by WASM URL. Different URLs get independent cached promises. `resetWasmPromise()` accepts an optional URL parameter to clear a specific entry.
- [x] F-37: Implement chosen strategy and add test: two barcode instances with different URLs should use correct WASM per instance (or reset between unmount/mount cycles).
- [x] F-37: Strategy (a) chosen — per-URL isolation via Map, no lifecycle changes needed in `barcode-scanner-overlay.tsx`.

Exit Criteria:

- [x] GanttEditor form fields are cross-instance safe — IDs are instance-unique, no hardcoded `id` collisions between instances.
- [x] `prepareWasm` either supports per-instance URL isolation or properly resets on component lifecycle.
- [x] Regression tests pass for cross-instance scenarios.
- [x] `pnpm typecheck` passes.

## Draft Review Record

- Reviewer / Agent: review session (mission-driven)
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - **Major (F-33 baseline inaccuracy)**: Current Baseline claimed `GanttEditor` reads values via `document.getElementById` — false. Values are read via existing React refs. Corrected description to reflect actual `htmlFor` misassociation risk with duplicate `id` attributes. Execution item and Exit Criteria also updated.

## Closure Gates

- [x] GanttStore revision bumped on `parse`, `setZoom`, `recalcLayout` — verified by focused unit tests.
- [x] Zero dead EventEmitter infrastructure in GanttStore — verified by grep for `emit\w*\(` / `\.on\(` / `\.off\(`.
- [x] GanttEditor uses unique IDs or ref-based access — no cross-instance data corruption.
- [x] `prepareWasm` supports per-instance isolation or lifecycle-aware reset.
- [x] Full scheduling test suite passes.
- [x] No in-scope finding deferrable without explicit adjudication.
- [x] Relevant owner docs updated (GanttStore API surface changes, prepareWasm lifecycle contract) — internal implementation details, no external schema/docs reference these APIs. Daily dev log records the change.
- [x] By independent sub-agent (fresh session) executed closure audit.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### GanttStore architecture migration to Zustand

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Already deferred by completed Plan {3} §Non-Goals. The revision bump fix (Phase 1) restores correct reactivity without a full migration. A Zustand-native rewrite is a separate scope decision.
- Successor Required: `yes` (referenced in Plan {3} deferred items)
- Successor Path: `docs/plans/{future-plan-for-ganttstore-refactor}`

## Non-Blocking Follow-ups

- Consider adding a lint rule or store utility that forces revision bumps on all state-mutating methods.
- Consider whether `resetWasmPromise` should be exposed in the public barcode-input API for host-managed lifecycle.

## Closure

Status Note: All four findings (F-31, F-32, F-33, F-37) have landed. GanttStore revision bumps verified by focused unit tests. EventEmitter infrastructure fully removed (grep-confirmed zero remnants). GanttEditor uses `useId()` for instance-unique IDs. `prepareWasm` uses per-URL Map cache. Full scheduling test suite: 578/578 pass (69 files). `pnpm typecheck` 56/56, `pnpm build` 30/30, `pnpm lint` 0 errors. Plan can close.

Closure Audit Evidence:

- Auditor / Agent: mission-driven closure audit (fresh sub-agent session ses_07d812785ffeB3e4J7fxy0gc3K / ses_07d811ed9ffeZOBmG22iNeY0K9 / ses_07d811734ffe06hj9aWREL4ni6)
- Evidence: Live code audit confirms: (1) `parse()` bumps `revision`+`taskRevision`, `recalcLayout()` bumps `revision`+`layoutRevision`, `setZoom()` delegates to `recalcLayout()`; (2) zero `emit\|on\|off\|_events` in gantt-store.ts; (3) GanttEditor IDs use `${instanceId}-edit-*` pattern via `useId()`; (4) `prepareWasm` uses `Map<string, Promise<void>>` with URL key. Tests: 3 revision-bump tests in gantt-store.test.ts, 5 in gantt-store-proof.test.ts; cross-instance GanttEditor test; 5 per-URL isolation tests in prepare-wasm.test.ts. Daily log `docs/logs/2026/07-21.md` line 76 confirms "Independent closure audit: PASS."

Follow-up:

- No remaining plan-owned work after all Closure Gates checked.
