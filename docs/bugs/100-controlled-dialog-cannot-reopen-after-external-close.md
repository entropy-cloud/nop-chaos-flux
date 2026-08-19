# 100 Controlled Dialog Cannot Reopen After External Close

## Problem

- `http://localhost:5173/#/complex-pages/sundial-todo-dialog`: opening the dialog, clicking the **取消 (cancel)** button (which uses `closeSurface` action), then clicking the open button again does nothing — the dialog does not reappear.
- Same shape: any `closeSurface` action against a controlled-open declarative dialog (`open: "${path}"`) leaves the dialog permanently closed until full page reload.

## Why it looked like one thing but was another

- First instinct was "cancel button click is broken" (action-level fault).
- Second instinct was "controlled-open expression got out of sync" (scope-level fault). This was correct, but the scope sync was incomplete: it covered only the X / outside / Esc path inside `handleSurfaceOpenChange(false)`. `closeSurface` and direct `surfaceRuntime.close(id)` are external removal paths that never touch `handleSurfaceOpenChange` and therefore never sync the scope variable.
- The "always-on" X-close scope sync made this _look_ like an X-only bug at first — until an actual cancel-button click reproduced it.

## Root Cause

`use-surface-renderer.ts handleSurfaceOpenChange(false)`:

- dispatches `onClose` event hook ✓
- (after plan 459) also tears down the surface ✓
- (after plan 459) also syncs the controlled scope variable to `false` so an idempotent `setValue(openPath, true)` would reopen it ✓

…but `closeSurface` action (action-adapter `case 'closeSurface'`) calls `surfaceRuntime.closeTop()` / `surfaceRuntime.close(id)` directly — bypassing `handleSurfaceOpenChange` entirely. The surface entry is removed, but the controlled scope variable stays `true`. The schema's `open: "${expr}"` expression still resolves to `true`, so the dialog re-mounts on the next React render triggered by the entry disappearance.

After that re-mount, `effectiveOpen = controlledOpen && !userClosed = true && !false = true`. The `openSurface()` effect runs and pushes the entry again — but **the user just clicked the cancel button and the entry should stay gone**. There is no user-input intent recorded that would let the renderer distinguish "user reopened" from "external close + re-mount".

## Fix

Two-part fix in `packages/flux-renderers-basic/src/use-surface-renderer.ts`:

1. **`userClosed` latch + reset on controlled `false → true` flip**
   - Add `const [userClosed, setUserClosed] = React.useState(false)`.
   - Fold `&& !userClosed` into `effectiveOpen`.
   - `handleSurfaceOpenChange(false)` now sets `userClosed(true)` on the controlled path.
   - A new effect watches `controlledOpen`; when the controlled expression flips `false → true`, the latch is cleared. base-ui only ever calls `onOpenChange(false)` (never `true`), so the effect is the canonical reopen path.

2. **External-removal scope sync via `summary.open` effect**
   - Subscribe to `summary.open` (already computed for `useSurfaceComponentHandle`).
   - Track a `sawSummaryOpen` latch so the first effect run (entry appearing on mount) is not mistaken for an external removal.
   - When the controlled expression is still truthy AND the entry vanished (`wasOpen === true && summary.open === false`), call `node.scope.update(extractedOpenPath, false)` so a subsequent idempotent `setValue(openPath, true)` flips it back.
   - `extractControlledOpenPath` is a small helper in the same file: matches `^\$\{([a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*)\}$` and returns the captured path.

Both fixes are idempotent: if the X-close path already wrote the scope to `false`, the external-removal path doing it again is a no-op.

## Tests

- `packages/flux-renderers-basic/src/__tests__/surface-controlled-x-close.test.tsx`
  - `removes surface entry from stack when X is clicked on a controlled dialog with no onClose schema handler` — regression for plan 459 B1 X-close path
  - `calls schema onClose handler when X is clicked on a controlled dialog (event still fires)` — onClose hook still dispatched
  - `reopens a controlled dialog after X close when the schema flips the open expression false→true (plan 459 B1 reopen)` — controlled `false → true` clears userClosed latch
  - `reopens after idempotent setValue(openPath, true) because X close syncs the scope variable to false (sundial scenario)` — `data.isOpen = true` starts open; cancel/X path syncs `false`; `setValue(true)` reopens
  - `reopens a controlled dialog after closeSurface (schema cancel button) removed the entry (plan 460 B1)` — `closeSurface` action (no `handleOpenChange` involvement) syncs scope and reopens

## Affected Files

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-renderers-basic/src/__tests__/surface-controlled-x-close.test.tsx`

## Reintroduction Risk

Any future refactor that:

- removes the `&& !userClosed` from `effectiveOpen` and relies on `controlledOpen` alone,
- removes the `prevControlledOpenRef` effect that clears the latch on `false → true`,
- removes the `sawSummaryOpenRef` latch that suppresses the first-mount false-positive,
- or calls `surfaceRuntime.close(id)` without first syncing the controlled scope variable,

…will silently bring back this bug. The three single-line guards and one helper look trivial, but each one blocks a distinct failure mode the unit tests cover.
