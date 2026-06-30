> Audit Status: closed
> Audit Type: open-ended
> Mission: amis-bug-driven-improvements

# Open-Ended Adversarial Audit — `amis-bug-driven-improvements`

- **Date**: 2026-06-27 (snapshot HEAD `b6848f32`).
- **Why this supersedes the prior file at this path**: the previous `closed` run (round 2 of the `2026-06-26-1859` execution) filed G1–G18 against HEAD `77bd50b6`; commits `2cd616c0`/`bd89ab34`/`0d49a6e6`/`12a8ab0e`/`ec92f4c3`/`dde7880d`/`99df7bfe` remediated almost all of them. This is a fresh open-ended pass on the **post-remediation** state. G1–G18 are re-verified FIXED in §0 and are NOT re-reported; the findings below (H-series) are genuinely new.
- **Scope**: `packages/` code/config/tests probed against `AGENTS.md`, `docs/skills/react19-best-practices-review.md`, and `docs/references/reopened-design-decisions-and-audit-adjudications.md`.
- **Method**: code-driven, not dimension-driven. 4 open-ended parallel probes (table/CRUD/selection/chart/list/drag-sort · form-advanced composite cluster · runtime/validation/i18n/core · mobile/content/tree/async-lifecycle) + main-agent live re-verification of every `certain` finding. Lenses: _contract archaeologist_, _exception-path detective_, _combination-explosion tester_, _lifecycle tracker_, _10×-scale operator_, _a11y user_, _closure-staleness tracker_.
- **Dedup baseline**: prior open-audit G1–G18 (FIXED, §0), parallel multi-audit AUDIT-01..22, reopened-decisions adjudications #1–#5.
- **Provenance discipline**: each finding is labelled **[mission-introduced]** / **[pre-existing]** / **[residual-adjacent]**.

## Verification snapshot

| Command          | Result                   |
| ---------------- | ------------------------ |
| `pnpm typecheck` | PASS (55/55, full turbo) |
| `pnpm lint`      | PASS (29/29, full turbo) |

Every finding below passes typecheck+lint+test. Several exist precisely because the relevant behaviour has **no regression test** — most notably **H6/H8**, whose dedicated tests pass only because they exercise the wrong code path (a direct API call) instead of the real interaction path.

---

## §0 — Prior open-audit G1–G18 are FIXED (re-verified live, not re-reported)

| Prior finding                  | Status                 | Live evidence at HEAD `b6848f32`                                                                                                                                                                          |
| ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 picker single-select erase  | FIXED                  | `picker-renderer.tsx:153,205,298,333` seeds `pending` with current value, falls back to `selectedValues[0]`, disables Confirm when empty.                                                                 |
| G2 tree-table child prune      | FIXED                  | `use-table-selection.ts:60-63,78-87` sources `currentRowKeySet` from flattened rows; prune returns same identity when unchanged. Real nested-child test `table-tree-selection-child-selectable.test.tsx`. |
| G3 validation `rule.message`   | FIXED                  | `message.ts:13,17,19` every kind uses `rule.message ?? t(...)`.                                                                                                                                           |
| G4/G15 contract-honesty core   | FIXED (core)           | `contract-honesty.ts:109-120,135-147` anchored matchers + per-definition resolver API. **Production adoption incomplete — see H6/H16.**                                                                   |
| G5 infinite-scroll             | FIXED                  | `use-infinite-scroll.ts:116-157` drives `loading`/`error` from the promise, `loadingRef` guard, post-load re-check.                                                                                       |
| G6/G7 comparator + prune       | FIXED                  | `table-flattened-items.ts:97-100` adds `quickEdit`/`copyable`; prune identity-stable.                                                                                                                     |
| G8 chart dotted paths          | FIXED                  | `chart-renderer.tsx` uniformly `getIn`.                                                                                                                                                                   |
| G9 composite churn             | FIXED                  | `childPaths`/`scalarChildPaths` keyed on `items.length`/`name`.                                                                                                                                           |
| G10 drag-sort controlled no-op | FIXED                  | `use-row-drag-sort.ts:112-118` warns.                                                                                                                                                                     |
| G11 upload cancel              | FIXED                  | `upload-field.tsx:223,234,266` AbortController + mountedRef.                                                                                                                                              |
| G12 list stale selection       | FIXED                  | `list-renderer.tsx:251-271` identity-stable prune.                                                                                                                                                        |
| G13 tree fat-node              | **PARTIAL (residual)** | See **H17** — first-50-then-all-after-0ms is cosmetic batching, not virtualization.                                                                                                                       |
| G14 requiredRange i18n         | FIXED                  | `validation.requiredRange` in both locales; consumed `message.ts:15`.                                                                                                                                     |
| G16 queryFailed                | FIXED                  | consumed `crud-renderer.tsx:422`.                                                                                                                                                                         |
| G17 tree focus                 | FIXED                  | `tree-renderer.tsx:437-452` moves DOM focus on active-node change.                                                                                                                                        |
| G18 positional keys            | FIXED                  | `buildStableObjectItemKeys` + `useCompatibilityItemKeys`.                                                                                                                                                 |
| F1/F2/F6 carousel              | FIXED                  | re-confirmed; no regression.                                                                                                                                                                              |

The fixes are genuinely correct. They did **not** introduce the H-series below.

---

## P0 — Silent data loss / corruption

### H1 — Column-resize under `scope` ownership persists the PRE-DRAG width and shows no live feedback `[pre-existing, high-impact]`

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts:197` (`onPointerMove` gated `if (effectiveOwnership === 'local')`), `:202-214` (`onPointerUp`), `:212` (`const currentWidth = localWidths[active.key] ?? active.startWidth`).
- **What**: Under `columnWidthsOwnership: 'scope'`, `onPointerMove` only calls `setLocalWidths` when `effectiveOwnership === 'local'`, so during a scope-owned drag **no state updates at all** → the column never visually resizes while the user drags. On `pointerup`, `onPointerUp` reads `localWidths[active.key]` — but `localWidths` was never mutated under scope, so it equals the **pre-drag** width — and writes that stale value to the scope path (`renderScope.update(statePath, { ...current, [active.key]: currentWidth })`). The user's entire resize is silently discarded, and the scope is poisoned with the pre-drag width.
- **Why it matters**: This is the documented flagship of the E1c column-width ownership feature (`table/design.md:233` "scope 时 resize 结果写 columnWidthsStatePath"). It is non-functional in the real interaction path. Worse, the focused test `table-e1c-column-widths-persistence.test.tsx` passes because it calls the hook's `persistWidth(next)` API directly (`:169-179`, which is correct) — it never simulates a real `pointerdown`→`pointermove`→`pointerup` sequence through the window listeners, so it asserts a code path the runtime never reaches. A green test guarding a broken feature.
- **Confidence**: **certain** (traced the closure + the state-mutation gating; mechanism unambiguous).
- **Provenance**: pre-existing (the scope branch shipped in E1c Phase 7).
- **Dedup**: distinct from G10 (drag-_sort_ under `controlled`); this is column-_resize_ under `scope`, different hook/ownership, and the failure is data-loss, not a silent no-op.
- **Fix sketch**: under scope, either (a) drive the live width through a ref + `getColumnWidth` reads, updating `activeResizeRef.current` on each move and persisting `active.next` (not `localWidths[…]`) on `pointerup`; or (b) drop the `local`-only gate and let `setLocalWidths` run in all modes, then persist from the up-to-date `localWidths`. Add a test that fires real pointer events and asserts the persisted width equals the dragged-to width (not the pre-drag width).
- **Lens**: closure-staleness over an async listener lifetime + test-vs-reality gap.

### H2 — `PaginationRenderer` captures `total` once and never updates it `[pre-existing]`

- **Where**: `packages/flux-renderers-data/src/pagination-renderer.tsx:135` (`const [total] = useState<number>(initialTotal);` — setter never destructured, never called), consumed by `currentTotalPages`/`canGoNext`/`canGoPrev` (`:137-139`) and the page-link/ellipsis UI.
- **What**: `total` is captured from `schemaProps.total` on mount and frozen. The file's own comment (`:124-127`) justifies this "seed + local mutation" pattern for `currentPage`/`pageSize` — but those are _user_-mutated, whereas `total` is _server/schema-driven only_. After any data refresh that changes the row count (filter, server refresh, scoped query), `currentTotalPages` and `canGoNext` stay stale → wrong page count, a disabled/enabled "next" that lies, and a last-page link that points at the old total.
- **Why it matters**: Wrong pagination chrome after the very first server refresh; silently ships wrong "total pages" to the user. The asymmetric justification (documented for user-state, mis-applied to server-state) is a strong signal this is an oversight.
- **Confidence**: **certain**.
- **Provenance**: pre-existing.
- **Fix sketch**: derive `total` from `schemaProps.total` at render time (it is not user-mutated), or sync via `useEffect` when `initialTotal` changes. Add a test that pushes a new `total` after mount and asserts `currentTotalPages`/`canGoNext` update.
- **Lens**: state-capture footgun + control/derived-state boundary.

### H3 — Condition-builder `BetweenInput` silently destroys the survivor when one side is cleared `[pre-existing]`

- **Where**: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:468-476` (start side) and `:485-493` (end side).
- **What**: Each side's `onChange` does `if (left !== undefined && right !== undefined) onChange([left, right]); else onChange(undefined);`. If a user has `[1, 5]` and clears the start field, `left=undefined` while the valid `right=5` still exists → `onChange(undefined)` — the `5` is silently destroyed. Same for clearing the end. There is no "partial range pending" state.
- **Why it matters**: Silent data loss during routine editing of a `between`/`not_between` condition; the survivor value vanishes with no feedback.
- **Confidence**: **certain**.
- **Provenance**: pre-existing.
- **Fix sketch**: emit `[left, right]` allowing `undefined` slots (let the parent/validator decide whether a half-range is acceptable), or track a local "editing" draft and only publish on blur. Add a test: set `[1,5]`, clear start, assert the end value is retained (or at least not silently nulled without intent).
- **Lens**: silent data loss.

---

## P1 — Core contract / a11y / dead feature

### H4 — Column-resize leaks window listeners; no `pointercancel` path `[pre-existing, P0-lifecycle]`

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts:217-220` (add + return-onPointerUp), `:202-204` (remove only inside `onPointerUp`); caller `table-header-row.tsx` discards the returned cleanup.
- **What**: `startResize` attaches `pointermove`/`pointerup` to `window` and removes them only inside `onPointerUp`. There is no `pointercancel` handler and no `useEffect`-based teardown. If the table unmounts mid-drag (data swap, virtualizer recycling, route change) or the browser cancels the pointer (touch-scroll takeover, OS interruption, tab switch), `onPointerUp` never fires → the listeners stay attached to `window` permanently and `activeResizeRef.current` stays set.
- **Why it matters**: Accumulating global listeners across drags; cross-instance interference via the shared `window`. A single canceled drag can break resize for the session.
- **Confidence**: **certain**.
- **Provenance**: pre-existing.
- **Fix sketch**: attach listeners in a `useEffect` keyed on `activeResizeRef` so React owns teardown, or register a `pointercancel` handler and clean up in a component-unmount effect. Add a test that unmounts mid-drag and asserts no `window` listeners remain.

### H5 — `controlled` ownership column-resize is a fully silent no-op; doc claims "read upstream" but no channel exists `[pre-existing]`

- **Where**: `use-column-resize.ts:143,149-150,176,197,207-214`; documented contract `docs/components/table/design.md:233` ("controlled 只读上游").
- **What**: Under `controlled`, `widths` returns `controlledWidths = initialWidths` (the schema's own `column.width`) always; `onPointerMove` is local-gated (no visual feedback); `onPointerUp` is scope-gated (nothing); `persistWidth` is a no-op ("controlled: no local write"); and there is **no `onWidthsChange` callback** anywhere in the API for an upstream owner to be notified. So a schema author who sets `columnWidthsOwnership: 'controlled'` gets a draggable-looking handle that silently does nothing — the exact G10 trap, for column resize. The documented "只读上游" (read upstream) is not implementable: the only "upstream" is the column schema, and there is no event channel back to the owner.
- **Why it matters**: Silent misconfiguration; the ownership matrix documents a mode that does not function. Mirrors G10 (which was fixed for drag-sort) — the fix was not propagated to the sibling resize hook.
- **Confidence**: **certain**.
- **Provenance**: pre-existing.
- **Fix sketch**: add an `onWidthsChange` callback (mirroring drag-sort's `onReorder`) and emit the G10-style dev warning for `controlled` with no callback; or document `controlled` as unsupported for resize and drop the branch.
- **Lens**: ownership-matrix consistency (the same family G10 lives in).

### H6 — Drag-sort handle advertises `role="button"` + `tabIndex=0` but has no keyboard activation `[mission-adjacent a11y]`

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts:190-206` (`dragHandleProps`).
- **What**: The drag handle is given `role: 'button'`, `tabIndex: 0`, `'aria-label': 'Drag to reorder row'`, but **no `onKeyDown`** is wired (only `onPointerDown`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`). HTML5 drag-and-drop is pointer/mouse-only. A keyboard user can focus the handle but Enter/Space does nothing. WAI-ARIA `role=button` contractually requires Enter/Space activation (WCAG 2.1 SC 4.1.2 + 2.1.1).
- **Why it matters**: Advertised-but-broken keyboard interaction is worse than no keyboard interaction (AT users are told they can activate it). The G10 remediation wave added the `role`/`tabIndex`/`aria-label` surface but not the handler.
- **Confidence**: **certain**.
- **Provenance**: residual-adjacent to the G10 drag-sort work (which added the a11y attributes).
- **Fix sketch**: add `onKeyDown` mapping ArrowUp/ArrowDown (or Enter/Space) to move the focused row up/down via the existing `reorderArray` path, or demote to `role="separator"` until keyboard reordering is implemented.
- **Lens**: a11y role contract.

### H7 — Contract-honesty production tests do not achieve per-renderer isolation (sibling masking still live) `[residual-adjacent, headline]`

- **Where**: `packages/flux-core/src/contract-honesty.ts:135-147` (the per-definition resolver API — correct); production harnesses, e.g. `packages/flux-renderers-form/src/__tests__/contract-honesty.test.ts:60-88` (and the 5 sibling packages).
- **What**: The G15 fix shipped the `ContractHonestySourceResolver` API and a `flux-core` unit test proving per-renderer isolation. But **every production harness collects one whole-package blob** (`collectSource(srcDir)` → a single `formSource` string) and either passes it as a bare string (the events check, `:67` → takes the string branch at `contract-honesty.ts:143`, applying the same source to every definition) or returns the _same_ `runtimeSource` for every definition (the capability resolver, `:79-82`). So renderer A's `props.events.onChange` still satisfies renderer B's declared-but-unwired `onChange`, and A's `methods:['save']` satisfies B's missing `save`. The per-renderer isolation that is the entire point of G15 is **not exercised by any production test**.
- **Why it matters**: This is the exact defect class G4/G15 were filed against: a guard whose stated purpose is "convert lying-contract drift into a test-time failure" but which, in production, cannot detect a sibling renderer that silently dropped a declared event/capability. The green tests give false confidence that the contract surface is honest. (Note: it still catches a key used by _no_ renderer in the package — only sibling masking is defeated.)
- **Confidence**: **certain** (re-read the live harness).
- **Provenance**: residual-adjacent (incomplete adoption of a declared fix).
- **Dedup**: distinct from G15 — G15 claimed "fixed"; the fix exists in the API + core unit test but zero production harness uses per-renderer-different source.
- **Fix sketch**: each production harness should resolve a definition's `componentSource` to **that renderer's own file(s) only** (e.g. walk from the `component` import to its file, or maintain a `type → source-file(s)` map), so a sibling's usage cannot mask a missing one. Add a regression test that injects a second renderer declaring the same event key but not referencing it, and asserts it is flagged.
- **Lens**: contract archaeologist (the guard's contract vs its production behaviour).
- **Cross-ref**: **H16** (the capability matcher's array-element anchor is also still over-broad).

### H8 — Tree remote-search debounce is stalled by `treeConfig` identity instability `[pre-existing]`

- **Where**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:50` (`const treeConfig = getTreeOptionConfig(props.props as InputTreeSchema)`); `tree-options.ts:45-53` (returns a fresh object literal every call); consumed at `tree-controls.tsx:74` (`config: treeConfig`) feeding `useTreeRemoteSearch`'s debounce effect.
- **What**: `getTreeOptionConfig` returns a brand-new object every render (no memoization). It is a dependency of the `useTreeRemoteSearch` 300 ms debounce effect, so **every render tears down and restarts the debounce timer**. Any re-render within 300 ms (value change, parent re-render, hover state, options refresh) prevents the search from ever firing; even after typing stops, the next options/value update resets it.
- **Why it matters**: Remote tree search is effectively dead under any non-trivial render cadence — queries silently never execute, or execute far later than intended. The single-date-field debounce pattern is the canonical "correct" reference; this deviates.
- **Confidence**: **certain** (identity instability); likely (user-visible search failure depends on render cadence).
- **Provenance**: pre-existing.
- **Dedup**: distinct from AUDIT-12 (bare `cancelled` boolean in the same hook) — different defect, same hook.
- **Fix sketch**: memoize `treeConfig` (`useMemo(() => getTreeOptionConfig(props.props), [deps of the config fields])`), or have `getTreeOptionConfig` return a stable reference for equal inputs.
- **Lens**: React 19 hook-dependency correctness.

### H9 — `date-range` time-typing bypasses `minDate`/`maxDate` (single date field clamps, range does not) `[pre-existing]`

- **Where**: `packages/flux-renderers-form/src/renderers/date-range-renderer.tsx:161-177` (`setTimeOn` → `commitRange`), `:143-153` (`commitRange` → `normalizeRange` only normalizes start≤end order). Contrast `date-field-control.tsx:142-169` (`handleTimeChange` + `clampToRange`).
- **What**: The single `input-date`/`input-datetime` control explicitly clamps typed hour/minute into `[minDate, maxDate]` (with a comment "Time-typing must not bypass minDate/maxDate"). The `date-range` renderer has the identical datetime time-row UI, but `setTimeOn` clamps only to 0–23/0–59 (`:163`) and `commitRange` only normalizes start≤end — never enforces min/max. Typing `25` into an end-time hour when `maxDate` caps at `18:00` silently stores an out-of-range value.
- **Why it matters**: Constraint bypass; stored range can violate declared bounds; inconsistent contract between sibling date controls (one clamps, the sibling doesn't).
- **Confidence**: **certain**.
- **Provenance**: pre-existing.
- **Dedup**: G14 was the _message_; this is the range-side validation-logic gap.
- **Fix sketch**: clamp each side to `[minDate, maxDate]` inside `commitRange`/`setTimeOn` (mirroring `date-field-control`).
- **Lens**: contract consistency.

---

## P2 — Real maintenance cost / local defect

### H10 — `MemoizedDataRow` uses a hand-written `React.memo` whose comparator omits `fixedColumnLayout` `[pre-existing]`

- **Where**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:362-394`.
- **What**: (1) Convention: hand-written `React.memo(DataRowView, comparator)` with no `eslint-disable-next-line react-compiler/react-compiler`. Per `docs/skills/react19-best-practices-review.md` §"React Compiler 自动记忆化" this is redundant (React Compiler is the baseline; lint passes because memo is allowed, just unnecessary). (2) Correctness: `DataRowView` reads `fixedColumnLayout.getExpandCellProps()` / `.getSelectionCellProps()` / `.getColumnCellProps()` ~11× in JSX, but the comparator does **not** compare `prev.fixedColumnLayout === next.fixedColumnLayout`. When `fixedColumnLayout` becomes a new object (its `useMemo` deps churn on `tableSchemaProps` identity) while every compared field stays equal, the memo returns `true` → the row renders with stale sticky offsets / fixed-column className / fixed-column style. Each future prop added to `DataRowView` is another forgotten-comparator footgun.
- **Why it matters**: Fixed-column visual corruption on schema-churn; ongoing maintenance debt. The right answer per AGENTS.md is to delete the hand-written memo and rely on React Compiler + per-row stable scope subscription.
- **Confidence**: certain (convention); likely (correctness under fixed columns).
- **Provenance**: pre-existing.
- **Dedup**: G6 added `quickEdit`/`copyable` to a _different_ comparator (`areColumnsRenderEquivalent`); this is the row-level memo and the rule violation itself.
- **Fix sketch**: drop `React.memo` (let React Compiler own it); if row-level bailout is truly needed, drive it through stable per-row scope subscription, not a hand-maintained comparator.

### H11 — `useTableExpand` is local-only, breaking the table ownership matrix `[pre-existing]`

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-table-expand.ts` (entire file).
- **What**: Every other table-state family (pagination, selection, sort, filter, visible columns, column order, column widths, drag-sort order) implements the full `local | controlled | scope` ownership matrix. `useTableExpand` is the lone outlier: only local `useState`. There is no `expandOwnership`, no `expandStatePath`, no way for a CRUD host / action / parent page to read or write which rows are expanded.
- **Why it matters**: A CRUD host cannot observe expansion via `$crud` summary; "expand row id=X" via a handle is impossible; after a refresh that rebuilds `source`, expand state is silently lost with no scope path to re-seed. The ownership-matrix docs are a lie for this one hook.
- **Confidence**: certain.
- **Provenance**: pre-existing.
- **Fix sketch**: implement `expandOwnership`/`expandStatePath` matching the sibling hooks, or explicitly document expand as local-only and reconcile the ownership-matrix docs.

### H12 — `useRowDragSort` is silent on `scope` ownership without `statePath` `[pre-existing]`

- **Where**: `use-row-drag-sort.ts:101-119` (warning block), `:164` (`handleDrop` gates scope write on `ownership === 'scope' && statePath && orderField`).
- **What**: The dev-warning block warns on `!orderField` and on `controlled && !onReorder`, but says nothing about `ownership === 'scope' && !statePath`. At `:164`, if `statePath` is missing under scope ownership, the drop silently falls through to `onReorder?.()` only — the scope (configured as source of truth) is never updated. Sibling hooks (`use-column-resize.ts:102-106`, `use-table-pagination.ts`, `list-pagination.ts`) all warn on this exact misconfiguration; drag-sort does not.
- **Why it matters**: Misconfiguration is invisible; inconsistent diagnostics across the table-state family.
- **Confidence**: certain.
- **Provenance**: pre-existing.
- **Fix sketch**: add the `scope && !statePath` warning (and the `scope && !orderField` combination).

### H13 — Out-of-order success can publish stale data in the data-source controller `[pre-existing, P0-class race]`

- **Where**: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:351-377` (success path); contrast catch path `:422-431` and finally `:457-466`.
- **What**: The error/finally paths guard stale results with `requestSequence < mutable.latestSettledRequestSequence`, but the **success** path's only staleness guard is `input.asyncGovernance.isCurrentRun(run)` at `:351` — which is skipped entirely when `run` is `undefined` or `asyncGovernance` is absent (`:351`). Under `refreshDedup: 'parallel'` (no abort of the prior request), two concurrent requests run with neither aborted; if request #1 resolves _after_ #2, `publishControllerData` (`:374`) overwrites the fresh data with #1's stale payload. Line `:358` only _writes_ `latestSettledRequestSequence` without _checking_ it.
- **Why it matters**: Silent data regression — a slower, older API response clobbers newer data in the scope. The asymmetric guard between success/error paths is a strong oversight signal. _(Reachability depends on whether every real controller is always constructed with governance — if so, this downgrades; the sub-agent flagged this as a blind spot.)_
- **Confidence**: likely.
- **Provenance**: pre-existing.
- **Dedup**: distinct from G5 (infinite-scroll _hook_); this is the _data-source controller_ success path.
- **Fix sketch**: mirror the catch-path guard before `:358`: `if (requestSequence < mutable.latestSettledRequestSequence) { settleRun(...); return; }`.

### H14 — Tree lazy-children `runLoad` has no cancellation / unmount guard, and stale-merges into an outdated base `[pre-existing]`

- **Where**: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:194-240` (`runLoad`).
- **What**: Unlike `useTreeRemoteSearch` (which has a `cancelled` flag), `runLoad` has **no `cancelled` flag and no AbortController**. On unmount or `baseOptions` change, the in-flight `.then` still invokes `setMergedOptions`/`setNodeStates`. `runLoad` closes over `baseOptions` (dep `:239`); if `baseOptions` changed since dispatch, the resolver merges fetched children into a **stale `baseOptions`** (`prev ?? baseOptions` at `:209`), producing a tree that drops the newer base.
- **Why it matters**: Stale-merge corrupts the options tree after a data refresh during lazy load. AUDIT-12 covered the _search_ path; the _lazy-children_ path was missed.
- **Confidence**: likely.
- **Provenance**: pre-existing.
- **Dedup**: distinct from AUDIT-12 (sibling controller).

### H15 — Tree expanded-state forcibly re-expands every node on any options change `[pre-existing]`

- **Where**: `tree-control-controllers.ts:546-554`.
- **What**: The effect rebuilds `expandedKeys` from _all_ nodes that have children and assigns it wholesale whenever `options` identity changes. Lazy-child merge and any remote refresh change `options` identity → the effect runs → **every node the user manually collapsed re-expands**. Collapse state is not preserved across data refresh.
- **Why it matters**: Loss of user expand/collapse state; for lazy trees, loading one node's children resets the user's collapse choices elsewhere.
- **Confidence**: likely.
- **Provenance**: pre-existing.

### H16 — Contract-honesty capability matcher's array-element anchor is over-broad `[residual-adjacent]`

- **Where**: `packages/flux-core/src/contract-honesty.ts:116-117` (`new RegExp([[,]\s*['"]<h>['"])` and `new RegExp(['"]<h>['"]\s*(?:,|\]))`).
- **What**: The G4 tightening replaced the catch-all quoted regex with anchors, but the array-element anchors match **any** array-literal element, not specifically a `methods`/`listMethods` wiring array. A renderer declaring `componentCapabilityContracts:[{handle:'save'}]` is satisfied by an unrelated `const labels = ['save','cancel']` or `actions:['save']`. The JSDoc (`:101-102`) promises "methods/listMethods array literal" but the regex does not enforce that context.
- **Why it matters**: Common-word handles (`save`, `submit`, `reset`, `cancel`, `close`) populate UI string arrays everywhere, so a dropped capability can still pass via an incidental sibling array — the false-positive mirror of the G4 false-negative.
- **Confidence**: likely.
- **Provenance**: residual-adjacent (post-G4 matcher still loose on one anchor class).
- **Dedup**: distinct from G4 (incidental standalone strings) — this is incidental _array elements_, a match class the fix left permissive.

### H17 — (RESIDUAL to G13) Tree fat-node freeze is only deferred, not virtualized `[pre-existing]`

- **Where**: `packages/flux-renderers-data/src/tree-renderer.tsx:165-180`.
- **What**: The first `TREE_EXPANDED_CHILD_BATCH_SIZE` (50) children render synchronously, but the deferred render at `:173-175` still sets `setRenderedChildCount(childNodes.length)` — i.e. ALL remaining children in a single commit after one 0 ms yield. A node with 5k–50k children still locks the main thread for the full subtree render after one tick. No progressive chunking, no virtualization.
- **Why it matters**: A category/org/file-tree node with thousands of children hangs on expand; G13 was only cosmetically addressed.
- **Confidence**: certain (residual).
- **Provenance**: residual.
- **Fix sketch**: chunk incrementally (`setRenderedChildCount(prev => Math.min(prev + BATCH, childNodes.length))` and re-arm the timer until caught up), or virtualize.

---

## P3 — Lower severity (summarised)

- **H18** — `useCrudRuntimeState` init effect runs every render: `defaultQuery` is a fresh object literal each render (`crud-renderer.tsx:60-65`) feeding the init-effect deps (`crud-renderer-state.ts:351-382`); also clobbers an intentionally-cleared `selectionStatePath`/`queryStatePath` back to `[]`. Perf + intent-clobber. Likely.
- **H19** — Drag-handle click bubbles to row: `dragHandleProps` (`use-row-drag-sort.ts:190-206`) has no `onClick` stopPropagation; a no-move click fires the row's `onRowClick`/`expandRowByClick`. Likely.
- **H20** — Quick-edit save commits the wrong record when `record` changes mid-save (`table-quick-edit-controller.ts:250-274,339-340`): the reset effect reassigns `draftRecordRef` on `record` change, but an in-flight save reads it post-await; `saveGenerationRef` only guards concurrent saves, not record-mutation races. Likely.
- **H21** — `handleSelectAll` carries phantom keys under `keepOnPageChange:true` (`use-table-selection.ts:140-148,178-187`): prunes only against current-page rows, so keys from previously-visited (now-deleted) pages survive in the `onSelectionChange` payload. Likely.
- **H22** — Pie chart `Cell` key collides on equal `name` (`chart-renderer.tsx:289`); `Number()` casts produce `NaN` pie/scatter values with no `Number.isFinite` guard on the source-array path (`:183`). Likely.
- **H23** — `TableLoadingOverlay` hardcodes English `'Loading'` (`table-loading-overlay.tsx:9`); `CopyButton` aria-labels hardcoded English (`table-cell-chrome.tsx:99`). Both bypass `t()` and the `check:i18n-keys` script (which only scans literal `t('flux.*')`). Certain (i18n coverage hole).
- **H24** — `input-table` lacks `removeWhen` support (combo & array-field have it via `remove-when-gating.ts`; input-table's definition omits the field) — a contract asymmetry among the three object-array composite editors sharing `COMPOSITE_EDITOR_CAPABILITY_CONTRACTS`. Certain (asymmetry); whether intended is undocumented.
- **H25** — key-value has no inline duplicate-key feedback (`key-value.tsx:521-564`): `validateChild` only checks empty; duplicate detection exists only as the opt-in aggregate `uniqueBy` rule that flags the whole field, not the offending rows. Likely.
- **H26** — Upload `removeExisting` reads reactive `value` while `commitItems` accumulates against `latestValueRef` (`upload-field.tsx:333-336,185-197`): a remove landing in the commit→re-render window can drop/resurrect a just-completed upload. Likely.
- **H27** — Inconsistent validation-trigger semantics across composite editors: key-value `handleRemove` validates unconditionally (`:368`) ignoring `validateOn`, while `addItem` honors it (`:449-453`); move/remove use `validateField` vs `validateSubtree` inconsistently across editors. Likely.
- **H28** — `validateSubtree` drops the caller's abort `signal` on the compiled-model path (`form-runtime-owner.ts:659` → `form-runtime-validation.ts:562-592`): the no-model fallback passes `options`, the compiled path does not. Likely.
- **H29** — `rewriteItemRight` matches by `id` across the whole nested tree with no short-circuit (`condition-builder.tsx:341-359`): persisted trees with id collisions cross-contaminate values. Likely.
- **H30** — Condition-builder projected form/scope recreated every render (`condition-builder.tsx:203-239`, consumed `condition-group.tsx:244-246,297-299`): factory-called-in-render defeats downstream memoization; possible scope-handle churn. Likely (perf).
- **H31** — notice-bar marquee not re-evaluated on container resize (`notice-bar.tsx:64-80`): `useLayoutEffect` deps omit container width, no `ResizeObserver` (sibling `swipe-cell.tsx:68` uses one for the symmetric problem). Certain. Mobile devices rotate frequently.
- **H32** — `page.tsx:130` injects hardcoded `flex flex-col` on a mobile boolean (layout-renderer marker-class-only contract drift). Likely.
- **H33** — Cluster-wide redundant hand-written `useMemo`/`useCallback` under React Compiler (notice-bar, swipe-cell, countdown, tabs, page, tree-renderer, use-surface-renderer, image) with no `eslint-disable react-compiler` — convention only, low value per the skill doc. Certain (convention).
- **H34** — (interesting-guess) Latent TDZ: `reaction-runtime.ts:420` `dispose()` references `unsubscribe?.()` before its `const` init at `:442`; safe today only via a microtask invariant with no guard comment. Interesting-guess.
- **H35** — (interesting-guess) Action `cancelled`/`timedOut` results are failure-classified (`action-core.ts:71-72`) and route through schema-authored `onError` recovery, emitting `actionError` on intentional cancellation. Could be intended; no doc/test pins it. Interesting-guess.

---

## Non-findings (checked and dismissed, to save future rounds)

- **NEW-T4 (controlled never reflects schema width)** — **REJECTED**. `initialWidths` is a `useMemo([columns, columnResize])` so under controlled `widths` _does_ reflect schema `column.width` changes; `useState(initialWidths)` staleness only affects `localWidths`, which is irrelevant under controlled.
- **swipe-cell keyboard reveal** — by-design (`swipe-cell.tsx:198-203`); `inert` gating of off-screen actions is the _correct_ a11y behavior, not a defect.
- **countdown visibility/drift** — wall-clock derivation (`startTimestampRef` + `Date.now()`) is inherently throttle-proof under background-tab `setInterval`; no explicit `visibilitychange` needed. Correct.
- **notice-bar single-span marquee "gap"** — the `+100` buffer is an intentional scroll-then-gap cycle, not a seamless-loop bug.
- **surfaces (dialog/drawer/sheet)** — correctly delegate focus-trap/scroll-lock/Esc to the Radix-based `@nop-chaos/ui` primitives; `closeOnEsc`/`closeOnOutsideClick` routed through `shouldSuppressClose`; unmount cleanup uses a `cleanupRef` snapshot. No plan-211 dual-state residual (adjudication #2).
- **request-runtime dedup** — `'merge'` is not a valid `RequestDedupStrategy` (only `cancel-previous|parallel|ignore-new`); the mission's `merge` reference conflates it with `mergeStrategy`. No bug.
- **prototype-pollution / ReDoS** — `getIn`/`setIn`, the formula scope proxy, evaluator `DANGEROUS_MEMBER_KEYS` + `MAX_EVAL_DEPTH=256`, and `isSafeValidationPattern` all check out.
- **validation dependency-closure cycles / async-cancel stale-winner** — BFS `visited` set terminates; three independent guards (post-await `signal.aborted`, `validationRuns` generation, `modelGeneration`). Solid.
- **i18n key parity** — 603/603 keys present in both locales with matching placeholders; only the hardcoded-string bypasses (H23) and dead/dynamic-key edges remain.

---

## Overall assessment — the 1–3 directions most worth attention now

1. **The column-resize ownership feature is non-functional on its flagship paths (H1, H4, H5).** Under `scope`, the user's drag is both invisible during the drag _and_ discarded on release (the persisted width is the pre-drag value); under `controlled`, the handle silently does nothing and the documented "read upstream" channel does not exist; and the window listeners leak on any non-`pointerup` termination. This is the same ownership-matrix defect family as the just-fixed G10 (drag-sort), in the sibling resize hook — the remediation was not propagated. Compounding it, the persistence test is green only because it calls `persistWidth()` directly instead of simulating real pointer events (a test-vs-reality gap that masks H1). Highest ROI: fix the scope drag path to drive the live width through a ref, add `onWidthsChange` + a G10-style warning for controlled, and rewrite the test to fire real pointer events.

2. **The mission's own guard infrastructure still does not guard in production (H7, H16), and a sister date control silently bypasses declared bounds (H9).** G4/G15 shipped the contract-honesty _capability_ (anchored matchers + per-definition resolver) but **no production harness uses per-renderer-different source** — every package feeds one whole-package blob, so sibling masking is live and the green tests give false confidence that the contract surface is honest. Separately, the capability matcher's array-element anchor matches _any_ array literal (H16), so common-word handles (`save`/`submit`/`reset`) are still satisfied by incidental UI string arrays. And the `date-range` control, unlike its single-field sibling, never clamps typed times to `minDate`/`maxDate`. Each is a small, local fix; together they are "the safety net has holes."

3. **Silent data-loss edges across composite/date/condition-builder controls and one async race (H2, H3, H9, H13, H26).** Pagination freezes `total` after mount (wrong page count post-refresh); the condition-builder `BetweenInput` destroys the survivor value when one side is cleared; the data-source controller's success path lacks the stale-winner guard its error path has (an older response can clobber newer data under `refreshDedup:'parallel'`); and upload `removeExisting` reads a reactive snapshot while `commitItems` accumulates against a ref. The unifying pattern: state that the render/commit path reads must be sourced consistently (ref _or_ reactive, not both), and any async pipeline reachable more than once must guard on its own per-invocation sequence token — the error path already does, the success path doesn't.

## Blind-spot self-assessment

What this round likely missed and where a next round should cut in:

- **`transfer-renderer.tsx`, `tag-list.tsx`, `editor-renderer.tsx`, `detail-view/*`, `variant-field/*`** were not deeply read; they may harbor the same removeWhen/identity/race patterns found in the composite cluster.
- **`createProjectedOwnerScope` / `createProjectedFormRuntime` registration lifecycle** was not traced — affects H30's leak confidence and condition-builder scope correctness.
- **Virtualizer integration edge cases** (`table-body-rows.tsx` `VirtualBody`, the hardcoded `120` expand-row height estimate, dynamic-content mis-sizing) were noted but not probed.
- **`crud-schema.ts` `normalizeCrudSchema`** for mutation-of-input / default-merge bugs was read but not adversarially probed.
- **Performance was assessed statically, not measured.** H10/H13/H17/H30 are reasoning-about-cost, not profiles; a real 10k-row form/table/tree benchmark would quantify them and likely surface hot paths not reasoned about (e.g. `componentRegistry` `name→Set<cid>` indexing under scale, or the `fixedColumnLayout` useMemo churn under H10).
- **e2e coverage** was not assessed; findings rest on unit-level reasoning + code reading.
- **H13's reachability** depends on whether every real controller is always constructed with governance (`runtime-owned-factories.ts`); if so it downgrades to P3. Worth a focused verify before prioritizing.
- **The mobile pull-refresh / infinite-scroll-mobile variant** beyond the data package's `useInfiniteScroll` was not deeply audited.

Per-round artifacts: `docs/analysis/2026-06-27-open-ended-adversarial-review-amis-bug-driven/round-01.md` (raw 4-probe candidates) and `round-02-verification.md` (main-agent re-verification verdicts).
