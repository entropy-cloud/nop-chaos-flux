# 90 Form Store Per-Path Subscription

> Plan Status: planned
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

Status: planned
Targets: `packages/flux-core/src/types/runtime.ts`

- [ ] Add `FormPathState` interface: `{ errors: ValidationError[] | undefined; validating: boolean; touched: boolean; dirty: boolean; visited: boolean; }`.
- [ ] Add `subscribeToPath(path: string, listener: () => void): () => void` to `FormStoreApi`.
- [ ] Add `subscribeToSubmitting(listener: () => void): () => void` to `FormStoreApi`.
- [ ] Add `getPathState(path: string): FormPathState` to `FormStoreApi`.

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-core typecheck` passes with the new members.
- [ ] No other package is broken by the interface extension (existing implementors need stub implementations until Phase 2).

### Phase 2 - Implement Per-Path Listeners in createFormStore

Status: planned
Targets: `packages/flux-runtime/src/form-store.ts`

- [ ] Add `pathListeners: Map<string, Set<() => void>>` private to the store closure.
- [ ] Add `submittingListeners: Set<() => void>` private to the store closure.
- [ ] Implement `notifyPath(path: string)`: call each listener in `pathListeners.get(path)` if the set exists.
- [ ] Implement `notifySubmitting()`: call each listener in `submittingListeners`.
- [ ] Wire `notifyPath` into `setBooleanState` and `setPathErrors` after each write.
- [ ] Wire `notifySubmitting` into `setSubmitting` after each write.
- [ ] Implement `batchUpdate` diffing: snapshot five maps before update, after update diff against snapshot with `diffFlatMap`, call `notifyPath` only for changed paths.
- [ ] Implement `subscribeToPath`, `subscribeToSubmitting`, `getPathState` as public API on the store object.
- [ ] `getPathState` reads directly from `zustandStore.getState()` (no extra allocation beyond the returned plain object).

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck` passes.
- [ ] Unit test: subscribe to path "a", write `setPathErrors("a", [...])`, verify listener fires exactly once.
- [ ] Unit test: subscribe to path "a", write `setPathErrors("b", [...])`, verify listener does NOT fire.
- [ ] Unit test: `batchUpdate` remapping 100 rows fires only notifications for changed paths.

### Phase 3 - Update Projected Stores

Status: planned
Targets: `packages/flux-runtime/src/form-runtime-projected.ts` (or equivalent)

- [ ] Locate `createPrefixedStore`, `createItemStore`, `createVariantStore`.
- [ ] For each: implement `subscribeToPath(relativePath, listener)` by translating to
  absolute path and delegating to parent `subscribeToPath`.
  - The path translation (`relativePath -> absolutePath`) MUST use the same rebasing
    helper that `PathBindingService` (or its equivalent shared utility) provides, if
    that service is already available. Do NOT re-implement the prefix-concatenation
    logic per projected store — that is exactly the scattered duplication that
    `docs/architecture/unified-runtime-indexing-and-path-binding.md` calls out.
  - If `PathBindingService` is not yet landed, note the debt explicitly and file or
    reference a successor plan for the rebasing consolidation.
- [ ] For each: implement `subscribeToSubmitting(listener)` by delegating to parent.
- [ ] For each: implement `getPathState(relativePath)` by translating to absolute path
  and delegating to parent (same rebasing helper rule applies).
- [ ] Remove or simplify the intermediate broadcast re-subscription in projected stores
  if it is solely used for field-state propagation.

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck` passes.
- [ ] Unit test: projected store subscribed to relative path "email" receives
  notification when parent store path "row.0.email" changes (given prefix "row.0").
- [ ] Path translation in projected stores uses a shared rebasing helper, not inline
  string concatenation repeated per store type.

### Phase 4 - Rewrite Field-State Hooks

Status: planned
Targets: `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/form-state.ts`

- [ ] Rewrite `useCurrentFormFieldState(path)` to use `useSyncExternalStore`:
  - `subscribe`: calls both `formStore.subscribeToPath(absolutePath, ...)` and `formStore.subscribeToSubmitting(...)`, returns combined unsubscribe.
  - `getSnapshot`: calls `formStore.getPathState(absolutePath)` and combines with `formStore.getState().submitting`.
- [ ] Rewrite `useFieldError(path)` similarly (or compose on top of the above).
- [ ] Remove or simplify `selectCurrentFormFieldState` in `form-state.ts` if it is no longer called.
- [ ] Confirm no remaining call-sites rely on the old selector-based approach for field state.

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` passes.
- [ ] Integration test (Vitest + React Testing Library or similar): render a 3-field form, type into field "name", confirm only the "name" hook re-renders (spy on render counts).
- [ ] No console warnings about stale snapshots or tearing.

### Phase 5 - Documentation Sync

Status: planned
Targets: `docs/architecture/form-validation.md`, `docs/architecture/performance-design-requirements.md`

- [ ] In `form-validation.md`: add a section documenting `subscribeToPath`, `subscribeToSubmitting`, `getPathState` semantics and the guarantee that hooks only fire for their own path.
- [ ] In `performance-design-requirements.md`: add P7 (field-state hooks must not subscribe to full-store broadcast).
- [ ] Update daily dev log `docs/logs/2026/04-15.md`.

Exit Criteria:

- [ ] Both docs compile/render without broken links.
- [ ] P7 entry is present and cross-references plan 90.

## Validation Checklist

- [ ] A keystroke in one field does not wake hooks for unrelated fields (confirmed by render-count test or profiler trace).
- [ ] `subscribeToPath` / `subscribeToSubmitting` / `getPathState` are present and documented in `FormStoreApi`.
- [ ] Projected stores delegate per-path subscription without creating intermediate broadcasts.
- [ ] `batchUpdate` (array remap) fires only notifications for paths that actually changed.
- [ ] `docs/architecture/form-validation.md` documents the new subscription contract.
- [ ] P7 constraint is present in `docs/architecture/performance-design-requirements.md`.
- [ ] `pnpm typecheck` passes across all packages.
- [ ] `pnpm build` passes across all packages.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes (including new focused tests from phases 2–4).
- [ ] Independent closure audit performed and evidence recorded below.

## Closure

Status Note: not yet closed

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- After closure: consider removing legacy selector layer in `form-state.ts` if it becomes dead code (successor plan or clean-up slice in plan 76/84).
