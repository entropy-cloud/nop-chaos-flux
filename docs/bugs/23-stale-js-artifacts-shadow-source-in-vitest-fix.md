# 23 Stale `.js` Build Artifacts Shadow Source Files in Vitest + Dialog Scope Not Reactive to Parent Data

## Problem

- Two tests in `packages/flux-react/src/index.test.tsx` were failing
- Test 1 (`updates page scope data without recreating the form runtime`): `PageValueProbe` used `scope.get()` (imperative escape hatch) instead of `useScopeSelector` (reactive subscription), so the component never re-rendered when page data changed
- Test 2 (`preserves dialog form state across host rerenders and page data updates`): dialog content showed stale data ("Dialog Architect") after the page scope was updated to "Dialog Operator" — the dialog nodes did not re-render despite the parent scope data changing

## Diagnostic Method

- **Diagnosis difficulty: high.** The fix for Test 2 was applied correctly to source files (`scope.ts`, `node-renderer.tsx`, `dialog-host.tsx`) but tests still failed after rebuild.
- Adding `console.log` to test files showed output, but `console.log` in `packages/flux-runtime/src/scope.ts` never appeared — even after `pnpm --filter @nop-chaos/flux-runtime build`
- The Vitest config uses workspace aliases (`vite.workspace-alias.ts`) that resolve `@nop-chaos/flux-runtime` to `packages/flux-runtime/src/index.ts`, which then imports `./scope` via relative path
- Checked for stale artifacts: `ls packages/flux-runtime/src/scope.js` — **found it**. A compiled `scope.js` existed alongside the source `scope.ts`
- Vite/Vitest resolves `./scope` by finding `scope.js` before `scope.ts`, so the old compiled code ran instead of the modified source
- Found **102 stale `.js`/`.d.ts`/`.js.map` files** in `packages/flux-runtime/src/` alone, and 162 total across all packages under `packages/*/src/`

## Root Cause

Two independent issues:

1. **Stale `.js` build artifacts in `src/` directories** — `tsc -p tsconfig.build.json` had emitted `.js`/`.d.ts`/`.js.map` files into `src/` instead of `dist/`. Vite's module resolver prefers `.js` over `.ts` when both exist, so Vitest ran the outdated compiled code. All source changes to `scope.ts` were silently ignored during testing.

2. **Dialog scope store did not subscribe to parent scope changes** — when a dialog scope had a parent (the page scope), the scope's `exposedStore` only wrapped the own store. It did not forward subscriptions from the parent store, so `useSyncExternalStoreWithSelector` in `NodeRenderer` never received notifications when the page data changed.

## Fix

### Test 1: `PageValueProbe` reactivity

- Changed `PageValueProbe` in the test from `scope.get('currentUser.name')` to `useScopeSelector((data) => data.currentUser?.name ?? '')`
- `scope.get()` is an imperative escape hatch; reactive renderers must use `useScopeSelector` to subscribe to store changes

### Test 2: Dialog scope parent reactivity

- Added `createCompositeScopeStore` in `packages/flux-runtime/src/scope.ts` — a `ScopeStore` wrapper that subscribes to both own and parent stores and returns merged snapshots via `read()`
- Changed `createScopeRef` to use the composite store when `parent` exists and `isolate` is not set
- Changed `node-renderer.tsx` and `dialog-host.tsx` to use `scope.read()` (merged data) instead of `scope.readOwn()` (own data only) for `useSyncExternalStoreWithSelector` snapshots

### Stale artifacts cleanup

- Deleted all `.js`/`.d.ts`/`.js.map` files from `packages/*/src/`
- This is the same issue described in AGENTS.md: "NEVER emit .js, .d.ts, or .js.map files into packages/*/src/ directories"

## Tests

- `packages/flux-react/src/index.test.tsx` — `updates page scope data without recreating the form runtime` (Test 1 fix)
- `packages/flux-react/src/index.test.tsx` — `preserves dialog form state across host rerenders and page data updates` (Test 2 fix)
- All 31 tests in `flux-react` now pass
- All 138 tests in `flux-runtime` pass

## Affected Files

- `packages/flux-runtime/src/scope.ts` — added `createCompositeScopeStore`, changed `createScopeRef` to use it
- `packages/flux-react/src/node-renderer.tsx` — changed `readOwn()` to `read()` in `useSyncExternalStoreWithSelector` snapshot
- `packages/flux-react/src/dialog-host.tsx` — changed `readOwn()` to `read()` in `DialogView`'s `useSyncExternalStoreWithSelector` snapshot
- `packages/flux-react/src/index.test.tsx` — fixed `PageValueProbe` to use `useScopeSelector`
- Stale `.js`/`.d.ts`/`.js.map` files deleted from `packages/*/src/`

## Notes For Future Refactors

1. **Always verify stale artifacts after build config changes.** If `tsconfig.build.json` has incorrect `outDir`, `.js` files leak into `src/` and silently shadow source during tests. The `.gitignore` excludes them but they persist on disk.
2. **After any source change that doesn't seem to take effect in tests, check for generated files in `src/`.** Run `find packages/*/src \( -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" \)` to audit.
3. **Dialog scope parent reactivity** depends on the composite store pattern. If `ScopeRef.store` subscription semantics change, verify that child scopes with parents still receive parent store notifications.
4. **`scope.get()` vs `useScopeSelector`** — `scope.get()` does not subscribe and will not trigger re-renders. Any component that needs reactive scope data in render must use `useScopeSelector`.
