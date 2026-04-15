# 90 Form Store Per-Path Subscription

> Plan Status: completed
> Last Reviewed: 2026-04-15
> Source: `docs/architecture/performance-design-requirements.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/unified-runtime-indexing-and-path-binding.md`
> Related: plan 35 (form-runtime-performance), plan 75 (reaction-and-renderer-perf-fix), plan 77 (renderer-hot-path-perf)

## Purpose

Replace the Zustand broadcast subscription used by field-state hooks with per-path
fine-grained listeners inside `FormStoreApi`, so that a keystroke in one field only
wakes up the React component(s) subscribed to that exact path — matching the
per-field reactivity model used by `@formily/reactive`.

## Current Baseline

- `FormStoreApi.subscribe` is a raw Zustand store subscription.  Any write to any
  field (errors, touched, validating, dirty, visited) triggers `subscribe` callbacks
  for every subscriber in the store.
- `useCurrentFormFieldState` (and `useFieldError`) use
  `useSyncExternalStoreWithSelector` with a per-path selector, but the subscribe
  argument is still the **full-store broadcast**.  In a 1 000-field form, one
  keystroke wakes 1 000 hooks; 999 selector calls return the same value and are
  discarded.
- `FormStoreState` holds five flat `Record<string, V>` maps: `errors`, `validating`,
  `touched`, `dirty`, `visited`.  Projected stores (`createPrefixedStore`,
  `createItemStore`, `createVariantStore`) each re-subscribe to the parent broadcast
  and filter by prefix on every update.
- `FormStoreApi` interface lives in `packages/flux-core/src/types/runtime.ts`.
- `createFormStore` implementation lives in
  `packages/flux-runtime/src/form-store.ts`.
- Hooks live in `packages/flux-react/src/hooks.ts`.
- `batchUpdate` (array remap) is the main caller that mutates many paths at once; it
  is the primary case that needs diffing before notifying.

## Goals

- Add `subscribeToPath(path, listener): () => void` to `FormStoreApi` so hooks can
  subscribe to exactly one path.
- Add `subscribeToSubmitting(listener): () => void` so hooks that also need to react
  to `submitting` changes can do so cheaply.
- Add `getPathState(path): FormPathState` as a stable snapshot reader for
  `useSyncExternalStore`'s `getSnapshot`.
- Rewrite `useCurrentFormFieldState` and `useFieldError` to use
  `useSyncExternalStore` with the new precise subscriptions.
- Make projected stores (`createPrefixedStore`, `createItemStore`,
  `createVariantStore`) delegate `subscribeToPath` directly to the parent store
  (path-translation only, no intermediate broadcast re-subscription).
- After the change: a keystroke that updates `errors["name"]` wakes **only** hooks
  subscribed to `"name"`, regardless of form size.

## Non-Goals

- Replacing `FormStoreApi.subscribe` (the existing Zustand broadcast) — it remains
  for non-field-level consumers (form-level submitting banner, debugger, etc.).
- Changing `batchUpdate` call-sites in `form-runtime-array.ts` beyond what is needed
  to make diffing work correctly.
- Introducing a MobX-style reactive graph (`@formily/reactive` approach) — the
  implementation stays Zustand-based; per-path listeners are added on top.
- Cross-form or cross-scope subscription optimizations.
- Changing `useScopeSelector` broadcast behavior (separate concern covered by plan
  75/77).

## Scope

### In Scope

- `packages/flux-core/src/types/runtime.ts` — extend `FormStoreApi` with three new
  members: `subscribeToPath`, `subscribeToSubmitting`, `getPathState`.
- `packages/flux-runtime/src/form-store.ts` — add `pathListeners: Map<string,
  Set<() => void>>` and `submittingListeners: Set<() => void>` internally; implement
  `notifyPath(path)`, `notifySubmitting()`; wire into `setBooleanState`,
  `setPathErrors`, `setSubmitting`; implement `batchUpdate` diffing.
- `packages/flux-runtime/src/form-runtime-array.ts` and any other caller of
  `batchUpdate` — no change expected unless `batchUpdate` signature changes.
- `packages/flux-react/src/hooks.ts` — rewrite `useCurrentFormFieldState` and
  `useFieldError` to use `useSyncExternalStore` with `subscribeToPath` +
  `subscribeToSubmitting`.
- `packages/flux-react/src/form-state.ts` — `selectCurrentFormFieldState` may be
  simplified or removed once hooks no longer need a full-store selector.
- `packages/flux-runtime/src/form-runtime-projected.ts` (or equivalent file
  containing `createPrefixedStore`, `createItemStore`, `createVariantStore`) —
  delegate `subscribeToPath` / `subscribeToSubmitting` / `getPathState` through to
  parent store with path prefix translation.
- `docs/architecture/form-validation.md` — document the new `subscribeToPath` /
  `getPathState` contract.
- `docs/architecture/performance-design-requirements.md` — add P7 constraint (field-
  state hooks must use per-path subscription).

### Out Of Scope

- Flow designer, spreadsheet, report designer stores.
- `useScopeSelector` broadcast subscription granularity.
- Formily-style computed field graph.
- Any change to `FormStoreState` shape (the five flat maps stay).

## Execution Plan

### Phase 1 - Extend FormStoreApi Contract

Status: completed
Targets: `packages/flux-core/src/types/runtime.ts`

- [x] Add `FormPathState` interface: `{ errors: ValidationError[] | undefined; validating: boolean; touched: boolean; dirty: boolean; visited: boolean; }`.
- [x] Add `subscribeToPath(path: string, listener: () => void): () => void` to `FormStoreApi`.
- [x] Add `subscribeToSubmitting(listener: () => void): () => void` to `FormStoreApi`.
- [x] Add `getPathState(path: string): FormPathState` to `FormStoreApi`.

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core typecheck` passes with the new members.
- [x] No other package is broken by the interface extension (existing implementors need stub implementations until Phase 2).

### Phase 2 - Implement Per-Path Listeners in createFormStore

Status: completed
Targets: `packages/flux-runtime/src/form-store.ts`

- [x] Add `pathListeners: Map<string, Set<() => void>>` private to the store closure.
- [x] Add `submittingListeners: Set<() => void>` private to the store closure.
- [x] Implement `notifyPath(path: string)`: call each listener in `pathListeners.get(path)` if the set exists.
- [x] Implement `notifySubmitting()`: call each listener in `submittingListeners`.
- [x] Wire `notifyPath` into `setBooleanState` and `setPathErrors` after each write.
- [x] Wire `notifySubmitting` into `setSubmitting` after each write.
- [x] Implement `batchUpdate` diffing: snapshot five maps before update, after update diff against snapshot with `diffFlatMap`, call `notifyPath` only for changed paths.
- [x] Implement `subscribeToPath`, `subscribeToSubmitting`, `getPathState` as public API on the store object.
- [x] `getPathState` reads directly from `zustandStore.getState()` (no extra allocation beyond the returned plain object).

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck` passes.
- [x] Unit test: subscribe to path "a", write `setPathErrors("a", [...])`, verify listener fires exactly once.
- [x] Unit test: subscribe to path "a", write `setPathErrors("b", [...])`, verify listener does NOT fire.
- [x] Unit test: `batchUpdate` remapping 100 rows fires only notifications for changed paths.

### Phase 3 - Update Projected Stores

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/object-field.tsx`, `packages/flux-renderers-form/src/renderers/array-field.tsx`, `packages/flux-renderers-form/src/renderers/variant-field-runtime.ts`

- [x] Locate `createPrefixedStore`, `createItemStore`, `createVariantStore`.
- [x] For each: implement `subscribeToPath(relativePath, listener)` by translating to
  absolute path and delegating to parent `subscribeToPath`.
  - Path translation uses `PathBindingService` from `@nop-chaos/flux-core` (shared rebasing helper).
- [x] For each: implement `subscribeToSubmitting(listener)` by delegating to parent.
- [x] For each: implement `getPathState(relativePath)` by translating to absolute path
  and delegating to parent (same rebasing helper).
- [x] Fixed `ownerPath` projection bug: when `ownerPath` is not in projected range, set it to the projected `path`.

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck` passes.
- [x] Unit test: projected store subscribed to relative path "email" receives
  notification when parent store path "row.0.email" changes (given prefix "row.0").
- [x] Path translation in projected stores uses `PathBindingService`, not inline
  string concatenation repeated per store type.

### Phase 4 - Rewrite Field-State Hooks

Status: completed
Targets: `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/form-state.ts`

- [x] Rewrite `useCurrentFormFieldState(path)` to use `useSyncExternalStore`:
  - `subscribe`: calls both `formStore.subscribeToPath(absolutePath, ...)` and `formStore.subscribeToSubmitting(...)`, returns combined unsubscribe.
  - `getSnapshot`: calls `formStore.getPathState(absolutePath)` and combines with `formStore.getState().submitting`.
- [x] Rewrite `useFieldError(path)` similarly (or compose on top of the above).
- [x] Remove or simplify `selectCurrentFormFieldState` in `form-state.ts` if it is no longer called.
- [x] Confirm no remaining call-sites rely on the old selector-based approach for field state.

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-react typecheck` passes.
- [x] Integration test (Vitest + React Testing Library or similar): render a 3-field form, type into field "name", confirm only the "name" hook re-renders (spy on render counts).
- [x] No console warnings about stale snapshots or tearing.

### Phase 5 - Documentation Sync

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/performance-design-requirements.md`

- [x] In `form-validation.md`: add a section documenting `subscribeToPath`, `subscribeToSubmitting`, `getPathState` semantics and the guarantee that hooks only fire for their own path.
- [x] In `performance-design-requirements.md`: add P7 (field-state hooks must not subscribe to full-store broadcast).
- [x] Update daily dev log `docs/logs/2026/04-15.md`.

Exit Criteria:

- [x] Both docs compile/render without broken links.
- [x] P7 entry is present and cross-references plan 90.

## Validation Checklist

- [x] A keystroke in one field does not wake hooks for unrelated fields (confirmed by render-count test or profiler trace).
- [x] `subscribeToPath` / `subscribeToSubmitting` / `getPathState` are present and documented in `FormStoreApi`.
- [x] Projected stores delegate per-path subscription without creating intermediate broadcasts.
- [x] `batchUpdate` (array remap) fires only notifications for paths that actually changed.
- [x] `docs/architecture/form-validation.md` documents the new subscription contract.
- [x] P7 constraint is present in `docs/architecture/performance-design-requirements.md`.
- [x] `pnpm typecheck` passes across all packages.
- [x] `pnpm build` passes across all packages.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes (including new focused tests from phases 2–4).
- [x] Independent closure audit performed and evidence recorded below.

## Closure

Status Note: closed 2026-04-15

Closure Audit Evidence:

- Reviewer / Agent: Claude (claude-opus-4.5)
- Evidence:
  - `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass
  - Phase 1: `FormPathState` interface and three new methods added to `FormStoreApi` in `packages/flux-core/src/types/runtime.ts`
  - Phase 2: Per-path listener mechanism implemented in `packages/flux-runtime/src/form-store.ts` with `pathListeners` Map and `submittingListeners` Set
  - Phase 3: Projected stores (`createPrefixedStore`, `createItemStore`, `createVariantStore`) refactored to use `PathBindingService` from `@nop-chaos/flux-core` for path translation; `ownerPath` projection bug fixed
  - Phase 4: `useCurrentFormFieldState` and `useFieldError` rewritten to use `useSyncExternalStore` with per-path subscriptions in `packages/flux-react/src/hooks.ts`
  - Phase 5: Documentation added to `form-validation.md` (Per-Path Subscription API section); P7 constraint already present in `performance-design-requirements.md` (lines 76-89)
  - Bug fixes during implementation: (1) `validateRuntimeRegistrationChild` storing errors to wrong path, (2) array-field inner input-text registering wrong validation field on root form, (3) scalar array validation reading wrong value path, (4) projected store `ownerPath` projection error

Follow-up:

- Consider removing legacy `selectCurrentFormFieldState` in `form-state.ts` if it becomes dead code (clean-up slice in plan 76/84).
- The `PathBindingService` consolidation is now complete; no further rebasing helper debt remains.
