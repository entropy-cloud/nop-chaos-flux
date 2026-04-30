# Performance Audit Report

**Date**: 2026-04-16
**Last Re-audited**: 2026-04-16
**Scope**: Full monorepo - `flux-runtime`, `flux-react`, `flux-formula`, renderer packages, spreadsheet/flow-designer, playground build configuration
**Severity Scale**: CRITICAL / HIGH / MEDIUM / LOW

---

## Executive Summary

This report was re-audited against the live repository after the original draft overstated several items and mixed confirmed hot-path issues with unmeasured hypotheses.

This revised version keeps only findings that are supported by current code, removes one incorrect claim, and rewrites several others to reflect the real behavior more precisely.

Highest-confidence priorities:

1. **Spreadsheet grid still renders the full table with no virtualization** - `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
2. **`NodeRendererResolved` still resolves node props twice** - `packages/flux-react/src/node-renderer.tsx`
3. **Formula registry snapshots are rebuilt for every expression evaluation** - `packages/flux-formula/src/registry.ts`
4. **Playground still eagerly pulls most route/page code at the root** - `apps/playground/src/App.tsx`, `apps/playground/src/pages/index.ts`
5. **Spreadsheet bulk update paths still clone large shared structures repeatedly** - `packages/spreadsheet-core/src/core/document-access.ts`, `packages/spreadsheet-core/src/core/search-operations.ts`

Re-audit rules used for this revision:

- Treat bundle bloat claims as **bundle risk** unless current build output proves concrete size impact.
- Treat React memoization advice as **situational** because the repo already uses the React Compiler in the playground build.
- Avoid exact latency, allocation, or memory numbers unless the code itself proves them.
- Separate true defects from documented current baselines and already-mitigated behavior.

---

## Table of Contents

1. [Build & Bundle](#1-build--bundle)
2. [React Re-Render Patterns](#2-react-re-render-patterns)
3. [Expression Engine](#3-expression-engine)
4. [Spreadsheet](#4-spreadsheet)
5. [Runtime Store & Scope](#5-runtime-store--scope)
6. [Renderer Components](#6-renderer-components)
7. [Flow Designer](#7-flow-designer)
8. [API & Data Source](#8-api--data-source)
9. [Memory & Growth](#9-memory--growth)
10. [CSS & Layout](#10-css--layout)
11. [Removed Or Reframed Findings](#11-removed-or-reframed-findings)

---

## 1. Build & Bundle

### 1.1 CRITICAL - Most playground routes are still eagerly imported

**Files**: `apps/playground/src/App.tsx`, `apps/playground/src/pages/index.ts`

**Diagnosis**

`App.tsx` imports nearly all domain pages from the root page barrel, and the page barrel re-exports those modules synchronously. `WordEditorPage` is the main exception because it lazy-loads its heavy renderer payload inside the page module, but the route component itself is still imported through the root barrel.

This means route-level code splitting is weaker than it could be, and page-specific dependencies are harder to defer until navigation.

**Recommended action**

- Convert heavyweight route components in `App.tsx` to `React.lazy()` boundaries.
- Keep route registration/lightweight metadata at the root, but move page implementation imports behind the route switch.
- Re-measure the build after the route split instead of carrying forward stale bundle-size estimates.

### 1.2 HIGH - `@nop-chaos/ui` root barrel exposes the chart module and increases tree-shaking risk

**Files**: `packages/ui/src/index.ts`, `packages/ui/src/components/ui/chart.tsx`

**Diagnosis**

The UI root barrel re-exports `./components/ui/chart`, and that module imports `recharts` directly. This does **not** prove that every `@nop-chaos/ui` consumer always ships `recharts`, but it does widen the module graph and makes dead-code elimination depend on bundler behavior.

**Recommended action**

- Move chart exports to a dedicated subpath such as `@nop-chaos/ui/chart`.
- Keep the root barrel focused on broadly shared primitives.
- Validate the change with an actual bundle diff rather than assuming universal savings.

### 1.3 HIGH - `@nop-chaos/flux-renderers-data` root export surface includes the ECharts renderer

**Files**: `packages/flux-renderers-data/src/index.tsx`, `packages/flux-renderers-data/src/chart-renderer.tsx`

**Diagnosis**

The package root exports `ChartRenderer`, and the chart renderer imports ECharts modules at top level. That creates the same tree-shaking risk as the UI chart barrel: consumers that only need table/tree/data-source functionality may still pay for chart-related graph reachability depending on bundler behavior.

**Recommended action**

- Split chart exports into a dedicated subpath or lazy boundary.
- Keep `registerDataRenderers()` available, but consider lazy chart registration when the host does not need charts.

### 1.4 HIGH - Flow designer renderers are registered eagerly at app startup

**Files**: `apps/playground/src/App.tsx`, `packages/flow-designer-renderers/src/index.tsx`

**Diagnosis**

`registerFlowDesignerRenderers(registry)` runs at the root app module, so flow-designer code is pulled into the initial application path even when the user never visits the designer routes.

**Recommended action**

- Move flow-designer registration behind the flow-designer route boundary.
- If registry ownership must stay centralized, introduce lazy renderer registration on first route entry.

### 1.5 MEDIUM - Package manifests do not currently declare `sideEffects`

**Files**: representative `packages/*/package.json`

**Diagnosis**

The audited package manifests do not declare `sideEffects`. That does not create runtime slowness by itself, but it can reduce how aggressively bundlers tree-shake barrel exports and dead modules.

**Recommended action**

- Add `"sideEffects": false` to packages that are side-effect free.
- Use `"sideEffects": ["*.css"]` where CSS imports are intentionally side-effectful.

### 1.6 LOW - Vite chunk warning threshold is currently very permissive

**File**: `apps/playground/vite.config.ts`

**Diagnosis**

`chunkSizeWarningLimit: 6000` means large sub-6 MB chunks will not trigger warnings. This does not hide _all_ warnings; it simply makes warning-based bundle review less sensitive than the default.

**Recommended action**

- Lower the threshold after route splitting work lands.
- Pair the warning threshold with a checked-in build report or CI size snapshot.

### 1.7 LOW - Tailwind source scanning currently covers the full `packages/` tree

**File**: `apps/playground/src/styles.css`

**Diagnosis**

`@source "../../../packages"` points Tailwind at the entire packages tree, including many packages that do not own Tailwind-authored UI. The current doc baseline explains why this broad scan exists. This is best treated as a tuning candidate, not a confirmed build bottleneck.

**Recommended action**

- Narrow the `@source` set to packages that actually emit Tailwind classes, if that can be done without reintroducing monorepo scan regressions.
- Re-check against the Tailwind v4 monorepo bug note before tightening the scan.

---

## 2. React Re-Render Patterns

### 2.1 CRITICAL - `NodeRendererResolved` still resolves node props twice

**File**: `packages/flux-react/src/node-renderer.tsx`

**Diagnosis**

The store selector computes both `meta` and `resolvedProps`, but only `meta` is retained from the selector result. The component then calls `runtime.resolveNodeProps(...)` again later in render.

This is a confirmed redundancy in a core render path. The current code does **not** prove that every second call produces a new props reference, because `resolveNodeProps()` already has runtime state reuse paths. The real issue is the duplicate work itself.

**Recommended action**

- Retain `resolvedProps` from the selector result and reuse it through the rest of the component.
- Re-profile node rendering after the change before making stronger claims about rerender fan-out.

### 2.2 HIGH - Several `useSyncExternalStoreWithSelector` hooks recreate `subscribe` / `getSnapshot` closures every render

**Files**: `packages/flux-react/src/hooks.ts`

**Diagnosis**

`useScopeSelector`, `useCurrentFormState`, `useCurrentFormErrors`, and `useCurrentFormError` all create `subscribe` and/or `getSnapshot` closures inline in render. This creates avoidable identity churn around subscription setup.

The repo should not assume catastrophic re-subscription from this alone, but stabilizing these closures is still the cleaner hot-path baseline.

**Recommended action**

- Wrap `subscribe` / `getSnapshot` in `useMemo` or `useCallback` keyed to the store/scope/form owner.
- Keep the fix minimal and local; do not add abstraction unless several hooks can share it cleanly.

### 2.3 HIGH - Node lifecycle dispatch is coupled to `helpers` identity

**Files**: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-effects.ts`

**Diagnosis**

`useNodeLifecycleActions()` depends on `helpers`, and `helpers` is recreated whenever any of its inputs changes. That means helper identity churn can retrigger cleanup + mount dispatch for nodes with lifecycle actions.

This is not just a micro-allocation issue. When nodes do define lifecycle actions with side effects, helper-identity churn expands the set of changes that can retrigger mount/cleanup dispatch.

**Recommended action**

- Decouple lifecycle effect stability from the wider `helpers` object.
- Keep mount/unmount behavior keyed to node identity, while reading the latest dispatcher/helper implementation via ref where needed.

### 2.4 MEDIUM - Meta normalization is repeated after `resolvedMeta` is already computed

**File**: `packages/flux-react/src/node-renderer.tsx`

**Diagnosis**

`resolvedMeta` already handles class alias resolution and CID normalization, but the component repeats that same work immediately afterward when building `finalResolvedMeta`.

**Recommended action**

- Reuse `resolvedMeta` directly unless a later transform truly changes it.

### 2.5 MEDIUM - `RenderNodes` is not memoized

**File**: `packages/flux-react/src/render-nodes.tsx`

**Diagnosis**

`RenderNodes` is exported as a plain function component. That is a real structural fact, but the performance consequence is context-dependent because upstream scope/action/component-registry changes already drive much of the subtree work, and the React Compiler is part of the repo baseline.

**Recommended action**

- Treat this as a profiling candidate, not an automatic `React.memo` rule.
- If profiling shows parent-driven churn with stable inputs, wrap the component or split hot internal branches first.

### 2.6 MEDIUM - `SchemaRenderer` treats fresh `props.data` references as full-scope replacement

**File**: `packages/flux-react/src/schema-renderer.tsx`

**Diagnosis**

When `props.data` changes by reference, `SchemaRenderer` calls `page.scope.store?.setSnapshot(pageData, { paths: ['*'], ... })`. Hosts that recreate the data object each render can therefore force broad scope invalidation.

**Recommended action**

- Add a cheap guard before replacing the whole page snapshot.
- Encourage hosts to pass stable `data` objects when they do not intend a full-page data refresh.

### 2.7 MEDIUM - `FieldFrame` allocates selector closures and a `sourceKinds` array literal every render

**File**: `packages/flux-react/src/field-frame.tsx`

**Diagnosis**

`FieldFrame` installs three selectors inline via `useCurrentFormState(...)`. The aggregate-error selector also allocates a fresh `sourceKinds` array literal on each render.

This is a small but repeated cost in large forms.

**Recommended action**

- Hoist the static `sourceKinds` array to module scope.
- Stabilize selectors where it improves readability without adding noise.

### 2.8 LOW - `useNodeSourceProps` uses no-deps effects only to update refs

**File**: `packages/flux-react/src/use-node-source-props.ts`

**Diagnosis**

Two `useEffect()` calls run after every render only to mirror `propsValue` and `scope` into refs.

**Recommended action**

- Assign those refs during render instead of using no-op post-commit effects.

---

## 3. Expression Engine

### 3.1 CRITICAL - Formula registry snapshots are rebuilt for every evaluation

**Files**: `packages/flux-formula/src/registry.ts`, `packages/flux-formula/src/evaluator.ts`

**Diagnosis**

`getFormulaRegistrySnapshot()` rebuilds plain objects from Maps and freezes them on every call. The evaluator reads that snapshot in the expression execution path, so this work repeats across expression-heavy renders.

**Recommended action**

- Cache the registry snapshot.
- Invalidate the cache only when function or namespace registration mutates the registry.

### 3.2 HIGH - `evaluateLeaf()` spreads the eval context for every leaf execution

**File**: `packages/flux-formula/src/evaluate.ts`

**Diagnosis**

`node.compiled.exec({ ...context, collector }, env)` allocates a fresh object for each leaf evaluation.

**Recommended action**

- Pass the collector through a lighter mechanism, such as a specialized context wrapper or extra parameter.

### 3.3 HIGH - Dependency collection allocates per leaf evaluation

**Files**: `packages/flux-formula/src/evaluate.ts`, `packages/flux-formula/src/scope.ts`

**Diagnosis**

Each leaf evaluation creates a new dependency collector, including a `Set`, collector/finalize objects, and a sorted array at finalize time.

The original draft overstated this as the single hottest allocation path in the entire system; current code only supports the narrower claim that it is a repeated hot-path allocation source.

**Recommended action**

- Pool or reuse collector internals where possible.
- If reuse complicates correctness, start with removing the sorted-array work for clearly single-path reads.

### 3.4 HIGH - Lambda identifier resolution still walks the frame chain twice

**File**: `packages/flux-formula/src/evaluator.ts`

**Diagnosis**

`hasFrame(...)` and `lookupFrame(...)` both walk the same frame chain linearly, and the identifier path can call them back-to-back.

**Recommended action**

- Merge the two lookups into one helper that returns either a sentinel or a found value.

### 3.5 MEDIUM - Imported-function name parsing still allocates a regex per identifier

**File**: `packages/flux-formula/src/evaluator.ts`

**Diagnosis**

`parseImportedFunctionName()` creates a fresh `RegExp` inside the function.

**Recommended action**

- Hoist the regex to module scope.
- Add a fast guard such as `startsWith()` before falling back to regex matching.

### 3.6 LOW - Builtins are reinstalled for each compiler creation

**Files**: `packages/flux-formula/src/compile.ts`, `packages/flux-formula/src/builtins.ts`

**Diagnosis**

`createFormulaCompiler()` re-runs `installBuiltins()`, which repeatedly sets the same builtin functions and namespaces into the default registries. This is confirmed duplicate setup work, but its runtime weight is modest compared with the other expression-engine findings in this report.

**Recommended action**

- Make builtin installation idempotent at the registry level or guard it with a one-time flag.

### 3.7 MEDIUM - Arrow-function execution still creates closure and frame objects repeatedly

**File**: `packages/flux-formula/src/evaluator.ts`

**Diagnosis**

Arrow expressions allocate a closure once per expression evaluation, and callback execution allocates parameter-mapping/frame objects for each invocation.

The original draft overcounted allocations in `ARRAYMAP` style cases; the real code-level issue is repeated closure/frame creation, not a guaranteed one-closure-per-item pattern.

**Recommended action**

- Optimize the common single-parameter path first.
- Avoid `Object.fromEntries(...)` in tight callback loops.

### 3.8 MEDIUM - Hot expression execution is wrapped in `try/catch`

**File**: `packages/flux-formula/src/compile.ts`

**Diagnosis**

Compiled expression and template exec paths currently keep `try/catch` in the direct execution body.

That is a real code fact. The original draft went too far by asserting a guaranteed engine optimization failure without measurement.

**Recommended action**

- Treat this as a benchmark-backed optimization candidate.
- If profiling justifies it, move error wrapping into a helper that preserves diagnostics while keeping the hot path simpler.

### 3.9 LOW - Lexer character helpers still create regex literals on repeated character checks

**File**: `packages/flux-formula/src/lexer.ts`

**Diagnosis**

Whitespace/digit/identifier checks still rely on regex-based helpers in the lexer's tight loop.

**Recommended action**

- Hoist regexes or replace them with `charCodeAt` comparisons.

---

## 4. Spreadsheet

### 4.1 CRITICAL - Spreadsheet grid renders the full table with no virtualization

**File**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`

**Diagnosis**

The grid renders a full HTML table using `Array.from({ length: rows })` and nested `Array.from({ length: cols })`, so row and cell DOM scale directly with sheet dimensions.

This remains the clearest spreadsheet scalability limit in the repo.

**Recommended action**

- Introduce viewport virtualization for rows and columns.
- Keep sticky headers/frozen panes in mind when selecting the virtualization model.
- If virtualization becomes too complex with merged cells/fill handles, evaluate a canvas-backed rendering path for the long term.

### 4.2 HIGH - `setCell()` clones the entire cell map for each cell mutation

**Files**: `packages/spreadsheet-core/src/core/document-access.ts`, `packages/spreadsheet-core/src/core/cell-operations.ts`

**Diagnosis**

Single-cell updates spread the existing `cells` object and write one address. Range operations that call this repeatedly compound the cost.

**Recommended action**

- Batch range operations into one cloned `cells` map per command.
- Keep single-cell commands simple, but give bulk operations dedicated batched implementations.

### 4.3 HIGH - `replaceAllInDocument()` still performs repeated whole-document replacement work

**File**: `packages/spreadsheet-core/src/core/search-operations.ts`

**Diagnosis**

`replaceAllInDocument()` applies replacement through repeated document update steps instead of batching all matches into one document transform.

**Recommended action**

- Collect all replacements first.
- Apply them in one sheet/document rewrite pass.

### 4.4 HIGH - Undo depth is hardcoded and does not honor `SpreadsheetConfig.maxUndoDepth`

**Files**: `packages/spreadsheet-core/src/core/internal-state.ts`, `packages/spreadsheet-core/src/types.ts`

**Diagnosis**

The undo stack keeps up to 100 prior document snapshots/references, and the config field for max undo depth is not currently read.

The original draft overstated this as proven multi-hundred-MB memory growth. Current code supports the narrower but still important diagnosis: retention policy is hardcoded and disconnected from configuration.

**Recommended action**

- Read `config.maxUndoDepth` in the history push path.
- Follow up with structural-sharing or operation-based history if large-sheet memory becomes measurable.

### 4.5 HIGH - Spreadsheet snapshot hook does not use `useSyncExternalStore`

**Files**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`, `packages/spreadsheet-renderers/src/page-renderer.tsx`

**Diagnosis**

The spreadsheet interaction hook uses `useState` plus effect-driven subscription, while another package file already uses `useSyncExternalStore` for the same ownership model.

The original draft called this a guaranteed double-render path. The stronger conclusion needs measurement, but the hook mismatch itself is real.

**Recommended action**

- Replace the custom state/effect subscription with `useSyncExternalStore`.

### 4.6 MEDIUM - Drag selection updates React state for every traversed cell

**File**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`

**Diagnosis**

During drag selection, `setDragEnd(...)` is called as the pointer enters each cell.

**Recommended action**

- Stage drag state in refs and publish on `requestAnimationFrame`.
- Keep pointer correctness first; do not over-throttle if it makes the selection box visibly lag.

### 4.7 MEDIUM - Fill-handle hit testing uses `document.elementFromPoint()` on every mousemove

**File**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-fill-handle.ts`

**Diagnosis**

The code currently resolves the hovered cell via `elementFromPoint()` for each mousemove.

The original draft overclaimed guaranteed layout thrash. The accurate code-level problem is repeated DOM hit testing at mousemove frequency.

**Recommended action**

- Prefer coordinate-to-cell math from the grid container when possible.
- Otherwise, throttle the hit testing to one calculation per animation frame.

### 4.8 MEDIUM - Row/column resize still publishes state at raw mousemove frequency

**File**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts`

**Diagnosis**

Resize handlers update state directly from mousemove.

**Recommended action**

- Coalesce resize updates with `requestAnimationFrame`.

### 4.9 MEDIUM - Sheet copy still uses JSON serialization cloning

**File**: `packages/spreadsheet-core/src/core/sheet-operations.ts`

**Diagnosis**

`applyCopySheet()` uses `JSON.parse(JSON.stringify(...))`, which is slow for large structures and narrows the data model to JSON-safe values.

**Recommended action**

- Replace it with `structuredClone` or a schema-aware copy helper.

---

## 5. Runtime Store & Scope

### 5.1 HIGH - Readonly status binding allocates a fresh visible overlay on every `readVisible()` call

**File**: `packages/flux-runtime/src/status-owner.ts`

**Diagnosis**

`createReadonlyScopeBinding().readVisible()` creates `Object.create(scope.readVisible())` and writes the binding key each call.

The original draft overstated the fan-out. The confirmed issue is the lack of visible-view caching on this overlay path.

**Recommended action**

- Reuse the visible-view caching pattern already present in `scope.ts` where feasible.

### 5.2 CRITICAL - Parent visible-scope invalidation cascades through child scope caches

**File**: `packages/flux-runtime/src/scope.ts`

**Diagnosis**

Child `readVisible()` cache reuse depends on parent visible reference stability. Parent changes therefore force child visible-view reconstruction through the chain.

**Recommended action**

- Move from reference-only invalidation to explicit versioning or finer invalidation metadata.

### 5.3 HIGH - `batchUpdate()` still notifies per changed path

**File**: `packages/flux-runtime/src/form-store.ts`

**Diagnosis**

`batchUpdate()` diffs field-state changes, then calls `notifyPath()` once per changed path.

The original draft's "listeners can fire twice" claim was not proven here; the accurate concern is per-path notification fan-out inside one batch.

**Recommended action**

- Coalesce notifications at the batch boundary.
- Preserve per-path semantics for path subscribers, but avoid repeated outer broadcast work.

### 5.4 HIGH - Dependent revalidation still loops through `batchUpdate()` per dependent field

**File**: `packages/flux-runtime/src/form-runtime-owner.ts`

**Diagnosis**

`revalidateDependents()` performs a batch update per dependent path instead of one combined dependent-state publication.

**Recommended action**

- Collect all dependent changes and publish them in a single batch.

### 5.5 HIGH - Form validation still walks fields sequentially

**File**: `packages/flux-runtime/src/form-runtime-owner.ts`

**Diagnosis**

`validateForm()` awaits field validation sequentially across traversal-order and child-owner paths.

This is especially relevant for forms with many fields and mixed sync/async rules.

**Recommended action**

- Keep the externally visible validation semantics stable.
- Batch sync phases together and only serialize where rule ordering truly matters.

### 5.6 HIGH - `refreshDataSource()` falls back to an O(n) registry scan when no scope is provided

**File**: `packages/flux-runtime/src/source-registry.ts`

**Diagnosis**

Refresh-by-id without a scope iterates registry buckets and entries to locate a matching source.

**Recommended action**

- Maintain a direct id-to-entry index alongside the scoped buckets.

### 5.7 HIGH - Parent scope changes still fan out to child-scope subscribers broadly

**File**: `packages/flux-runtime/src/scope.ts`

**Diagnosis**

Scope change propagation remains broad across nested scopes.

**Recommended action**

- Carry changed-root metadata deeper into scope propagation so unrelated child subscribers can be skipped earlier.

### 5.8 MEDIUM - `computeScopeState()` scans all field states each time it runs

**Files**: `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime.ts`

**Diagnosis**

The can-submit and scope-state calculation paths still derive status by scanning the full `fieldStates` map.

**Recommended action**

- Maintain incremental aggregate flags for common summaries such as `hasErrors`, `hasValidating`, and `canSubmit`.

### 5.9 MEDIUM - Ignored-root filtering allocates a `Set` per call

**Files**: `packages/flux-runtime/src/scope-change.ts`, `packages/flux-runtime/src/source-registry.ts`

**Diagnosis**

`filterScopeChangeByIgnoredRoots(...)` normalizes ignored roots into a fresh `Set` instead of reusing pre-normalized metadata.

**Recommended action**

- Cache normalized ignored-root sets on the subscriber/entry that owns them.

### 5.10 MEDIUM - Result mapping still creates short-lived child scopes for each evaluation

**Files**: `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`

**Diagnosis**

Both result-mapping paths create a child scope for mapping evaluation and leave it to GC immediately afterward.

**Recommended action**

- Evaluate whether result mapping can use a lighter eval carrier than a full child scope.
- Keep the binding contract identical if you optimize this path.

---

## 6. Renderer Components

### 6.1 HIGH - Audited renderer packages do not currently use `React.memo`

**Files**: representative renderers across `packages/flux-renderers-basic`, `packages/flux-renderers-form`, `packages/flux-renderers-data`

**Diagnosis**

The renderer packages audited here export plain function components rather than `React.memo(...)` wrappers.

This is a real structural observation, but the original draft overstated the conclusion. In this repo, memoization decisions must account for the React Compiler baseline and for the fact that many renderer props are intentionally scope-driven.

**Recommended action**

- Profile leaf renderers first.
- Add memoization selectively where prop stability already exists or where a custom comparator is cheap and obvious.

### 6.2 HIGH - Form status publication still scans all field states on every relevant store update

**File**: `packages/flux-renderers-form/src/renderers/form.tsx`

**Diagnosis**

`publishStatus` computes aggregate form status from all field states and republishes to the parent scope.

**Recommended action**

- Narrow the subscription inputs if possible.
- Reuse incremental aggregate state from the form runtime once it exists.

### 6.3 HIGH - Table row-scope cache store clones the full `Map` on each mutation

**File**: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`

**Diagnosis**

The row-scope cache does reuse row scopes and sync them in place, but the outer cache store still clones the whole `Map` whenever entries change.

The original draft overstated this as a total cache rebuild. The more accurate issue is full-container cloning around partial row changes.

**Recommended action**

- Mutate only the entries that changed, then publish a more selective snapshot strategy if the store API allows it.
- Skip cache publication when visible row identities and row payloads are unchanged.

### 6.4 HIGH - Table, loop, and tree renderers still render all visible items without virtualization

**Files**:

- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-renderers-basic/src/loop.tsx`
- `packages/flux-renderers-basic/src/structural-loop.tsx`
- `packages/flux-renderers-data/src/tree-renderer.tsx`

**Diagnosis**

Tables paginate but do not virtualize rendered rows. Loop and tree renderers likewise render all currently materialized items.

**Recommended action**

- Add virtualization to the table body first, because it has the clearest scale profile.
- For `loop` and `tree`, make virtualization opt-in and aligned with existing row/item scope semantics.

### 6.5 MEDIUM - Inline event handlers still reduce prop stability in hot renderer paths

**Files**: representative handlers in `button.tsx`, `dialog.tsx`, `input.tsx`, `table-renderer.tsx`

**Diagnosis**

Several renderers still create inline closures in JSX.

The original draft claimed this "defeats memoization" universally. That is too strong for this repo, especially with the React Compiler baseline. The accurate issue is narrower: inline handler identity can still make hot child props less stable and complicate selective memoization.

**Recommended action**

- Fix this only in measured hot paths.
- Prefer event delegation or stable callbacks where the change is local and readability does not suffer.

### 6.6 MEDIUM - Text inputs still write through to form state on each keystroke

**Files**: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/renderers/array-editor.tsx`

**Diagnosis**

Keystrokes update form state immediately.

The original draft ignored important existing mitigations: validation behavior already gates when validation runs, and rule-level debounce already exists in the validation model. So the real concern is store churn in very large forms, not a blanket "all typing should be debounced" rule.

**Recommended action**

- Do not debounce all inputs by default.
- Introduce local buffering only for measured hot fields or large inline-edit surfaces where immediate global state publication is too expensive.

### 6.7 MEDIUM - Chart resize is wired directly to raw resize events

**File**: `packages/flux-renderers-data/src/chart-renderer.tsx`

**Diagnosis**

The chart renderer calls `chart.resize()` directly from resize-driven updates.

**Recommended action**

- If resize profiling shows pressure, gate calls through `requestAnimationFrame` or debounce.

### 6.8 MEDIUM - `useBoundFieldValue()` always installs two subscriptions

**File**: `packages/flux-renderers-form/src/field-utils.tsx`

**Diagnosis**

The hook subscribes to both form state and scope state even though only one branch is consumed at a time.

**Recommended action**

- Split the hook or component path so only one subscription is active for each bound field mode.

---

## 7. Flow Designer

### 7.1 MEDIUM - ELK layout uses the bundled ELK entrypoint with no explicit worker offload in repo code

**File**: `packages/flow-designer-core/src/elk-layout.ts`

**Diagnosis**

The code imports `elkjs/lib/elk.bundled.js` and constructs `new ELK()` directly in the layout module. The repo does not show any explicit worker offload boundary around this path.

**Recommended action**

- Move large-layout execution to a worker-backed ELK integration if layout latency becomes user-visible.

### 7.2 MEDIUM - Tree-mode structural inserts still trigger full relayout

**File**: `packages/flow-designer-renderers/src/designer-command-adapter.ts`

**Diagnosis**

The original draft said "every mutation" triggers full relayout. Current code is narrower: the tree-mode structural insert commands rerun layout for the whole document after each mutation.

**Recommended action**

- Start with delta-friendly relayout for the insert commands that dominate authoring usage.

### 7.3 MEDIUM - XYFlow node sync still does `find()` inside `map()`

**File**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`

**Diagnosis**

The merge path uses `snapshotNodes.find(...)` while mapping current nodes, which is avoidable quadratic work.

**Recommended action**

- Build a `Map<string, Node>` for `snapshotNodes` once per effect run.

### 7.4 MEDIUM - History still stores cloned document entries with no structural sharing

**Files**: `packages/flow-designer-core/src/core.ts`, `packages/flow-designer-core/src/core/history.ts`, `packages/flow-designer-core/src/core/clone.ts`

**Diagnosis**

History keeps up to 50 cloned document entries.

**Recommended action**

- Keep the current model for correctness if needed, but document it as a memory tradeoff.
- Evaluate structural sharing if designer document size grows materially.

### 7.5 LOW - Viewport updates are published from both `onMove` and `onMoveEnd`

**Files**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`, `packages/flow-designer-core/src/core.ts`

**Diagnosis**

Viewport changes are published from both `onMove` and `onMoveEnd`, and viewport updates enter history when the normalized viewport actually changes.

The original draft's "history fills in under a second" claim was unmeasured. The confirmed code-level issue is narrower: viewport persistence is more eager than it needs to be.

**Recommended action**

- Consider persisting viewport only on `onMoveEnd`, or store viewport outside undo history if that matches the intended UX.

---

## 8. API & Data Source

### 8.1 MEDIUM - Fixed-interval polling skips overlapping ticks and can drift under slow responses

**File**: `packages/flux-runtime/src/data-source-runtime.ts`

**Diagnosis**

The original draft claimed polling aborts the in-flight request whenever interval < latency. That is not what current code does. Current polling uses a loading guard to skip overlapping ticks, so the in-flight request survives, but the schedule can drift and miss intended cadence under slow responses.

**Recommended action**

- If exact cadence matters, switch to "schedule next poll after response settles".
- Keep the current skip-overlap behavior if avoiding concurrency is more important than wall-clock precision.

### 8.2 MEDIUM - Request dedup key generation still recursively serializes request inputs

**File**: `packages/flux-runtime/src/request-runtime.ts`

**Diagnosis**

`stableSerialize(...)` recursively serializes request data/headers for dedup-key generation. This is a bounded, localized cost, not a cost paid by every request subsystem equally.

**Recommended action**

- Cache serialization results where object identity is stable.
- Keep the optimization scoped to the dedup key path.

### 8.3 MEDIUM - Recursive request serialization logic is duplicated

**Files**: `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/api-cache.ts`

**Diagnosis**

`stableSerialize` and `stableStringify` implement near-identical recursive serialization logic in two places.

**Recommended action**

- Extract one shared utility.
- Keep both callers aligned on normalization rules.

---

## 9. Memory & Growth

### 9.1 MEDIUM - Adaptor expression cache remains unbounded

**File**: `packages/flux-runtime/src/request-runtime-adaptor.ts`

**Diagnosis**

Compiled adaptor expressions are cached in a `Map<string, CompiledExpression>` with no size cap.

**Recommended action**

- Add a simple size bound or LRU if adaptor source cardinality is high in long-lived sessions.

### 9.2 MEDIUM - Successful dynamic import loads stay cached for the lifetime of `ImportManager`

**File**: `packages/flux-runtime/src/imports.ts`

**Diagnosis**

Successful module-load promises stay in `moduleLoads` until the import manager is disposed. This is intentional caching, not a leak in the narrow sense, but it is currently unbounded.

**Recommended action**

- Keep the cache if repeated namespace loads are common.
- Add a size/retention policy if the host can load many distinct modules in one long session.

### 9.3 LOW - Expired API cache entries are cleaned lazily, but growth is bounded by the LRU cap

**File**: `packages/flux-runtime/src/api-cache.ts`

**Diagnosis**

Expired entries are removed on access/eviction rather than via background sweeping. The original draft overstated the risk by ignoring the existing 200-entry LRU bound.

**Recommended action**

- Leave this alone unless profiling shows stale entries materially affecting memory or lookup performance.

### 9.4 LOW - Reaction cascades are already coalesced and capped; remaining risk is multi-turn churn

**Files**: `packages/flux-runtime/src/reaction-runtime.ts`, related architecture docs

**Diagnosis**

The previous draft was outdated here. Current reactions already coalesce same-tick triggers and enforce `MAX_REACTION_FIRE_COUNT`. The residual concern is not unbounded same-tick explosion, but repeated multi-turn work in complex reaction graphs.

**Recommended action**

- Treat this as an observability concern, not an immediate algorithmic defect.
- Add targeted tracing or counters if reaction-heavy screens still feel noisy in practice.

---

## 10. CSS & Layout

### 10.1 LOW - Tree indentation is still expressed as per-node inline style

**Files**: `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-form/src/renderers/tree-controls.tsx`

**Diagnosis**

Tree indentation uses inline `paddingInlineStart` based on depth.

**Recommended action**

- If large trees become style-heavy, switch to a CSS variable or depth class strategy.

### 10.2 LOW - Duplicate row-key diagnostics still run outside dev-only guards

**File**: `packages/flux-renderers-data/src/table-renderer/table-data.ts`

**Diagnosis**

`warnOnDuplicateRowKeys(...)` is not currently guarded to development-only execution, even though the table row architecture doc positions duplicate-key warnings as development diagnostics.

**Recommended action**

- Gate the warning behind `import.meta.env.DEV` or equivalent debug configuration.

### 10.3 NOTE - Spreadsheet canvas CSS is globally imported by current playground design

**Files**: `apps/playground/src/styles.css`, `docs/architecture/report-designer/spreadsheet-canvas-css.md`

**Diagnosis**

The earlier draft treated this as a defect. Current docs explicitly describe global spreadsheet canvas CSS in the playground as the active baseline.

**Recommended action**

- Do not treat this as a current bug.
- Revisit page-scoped CSS loading only if CSS payload becomes a measured problem.

---

## 11. Removed Or Reframed Findings

The following original claims were removed or materially reframed during re-audit:

- **Removed**: "`next-themes` is unused in `@nop-chaos/ui`". Current code uses it in `packages/ui/src/components/ui/sonner.tsx`.
- **Reframed**: route and barrel-export bundle findings now describe **bundle risk** instead of asserting specific savings without current build evidence.
- **Reframed**: several React findings now distinguish between a confirmed code smell and an unproven rerender impact.
- **Reframed**: the polling finding now reflects actual behavior: overlapping ticks are skipped, not auto-aborted.
- **Reframed**: the reaction-cascade finding now reflects current coalescing and fire-count safeguards.
- **Reframed**: global spreadsheet canvas CSS is now treated as a documented baseline, not an active defect.

---

## Priority Matrix

### Immediate

| #   | Issue                                      | Why first                                                 |
| --- | ------------------------------------------ | --------------------------------------------------------- |
| 4.1 | Virtualize spreadsheet grid                | Dominant scalability ceiling in a visible product surface |
| 2.1 | Remove duplicate `resolveNodeProps()` work | Core renderer hot path with confirmed redundant work      |
| 3.1 | Cache formula registry snapshot            | Repeated allocation on expression-heavy paths             |
| 1.1 | Lazy-load heavyweight playground routes    | Clean architectural win with likely bundle payoff         |
| 4.2 | Batch spreadsheet cell-map updates         | Clear algorithmic improvement for range operations        |

### Short-term

| #   | Issue                                               | Why next                               |
| --- | --------------------------------------------------- | -------------------------------------- |
| 2.3 | Decouple lifecycle actions from `helpers` identity  | Can affect correctness, not just speed |
| 4.3 | Batch replace-all document updates                  | Large-operation cost multiplier        |
| 5.2 | Reduce visible-scope cascade invalidation           | Broad runtime fan-out source           |
| 5.3 | Coalesce form-store batch notifications             | Common form hot path                   |
| 6.4 | Add virtualization to table body                    | Large dataset rendering ceiling        |
| 7.3 | Replace node-sync `find()` loop with indexed lookup | Simple, low-risk quadratic-path fix    |

### Measure Before Changing

| #    | Issue                                    | Why measure first                                                  |
| ---- | ---------------------------------------- | ------------------------------------------------------------------ |
| 2.5  | Memoizing `RenderNodes`                  | Outcome depends on real parent/input stability                     |
| 3.8  | Moving `try/catch` out of exec path      | Engine-level benefit is not guaranteed                             |
| 6.1  | Adding `React.memo` broadly to renderers | React Compiler and scope-driven props may already cover some cases |
| 6.5  | Replacing inline handlers broadly        | Benefit is localized and readability tradeoffs are real            |
| 6.7  | Debouncing chart resize                  | Should be driven by measured resize pressure                       |
| 10.3 | Page-scoped spreadsheet CSS loading      | Not currently a verified problem                                   |
