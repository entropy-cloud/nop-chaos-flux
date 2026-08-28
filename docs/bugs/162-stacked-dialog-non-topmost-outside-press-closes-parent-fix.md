# 162 Non-Topmost Controlled Dialog Closes on Nested Click-Outside / Esc

## Problem

- `apps/playground/src/complex-pages/sundial-workbench.json`: opening the workbench detail dialog (`taskDetailOpen: true`), then opening the inner date picker (`openDialog` for the `选择日期` picker), then **clicking a radio button inside the picker** causes the outer workbench detail dialog to close.
- Same shape for `Esc`: pressing `Esc` while the inner picker is on top also closes the outer.
- The user never asked to close the outer — they were interacting with the picker.
- The outer is a controlled dialog (`open: "${taskDetailOpen}"`); once it writes `taskDetailOpen = false`, the next time the schema tries to open it, the controlled expression is `false` and it stays closed until the page is reloaded or the user resets state.

## Why it looked like one thing but was another

- First instinct: "nested `openDialog` is broken" → "controlled `closeOnSubmit` closes the wrong surface" → "form submission via `surface` scope is shared across dialogs".
- None of those matched the actual trigger. The crash happens **on a radio click**, not on submit. The picker stays open after the click; only the outer disappears.
- Second instinct (also wrong): "the form's `setValue` is somehow writing to the page scope and flipping `taskDetailOpen`" — adding log to `scope.update`, `form-store.setValue`, `scope.replace`, `setSnapshot`, `action-adapter.setValue` did not show a `taskDetailOpen: false` write on the radio click path. The flag's true→false transition appeared in the page scope with no corresponding write captured anywhere.
- Third instinct (correct): the Base UI click-outside / Esc listener fires on every mounted dialog independently of stacking. The picker is rendered as a sibling of the outer in the DOM tree (both at body level via DialogHost), so a click inside the picker is _outside_ the outer's content from the outer's listener perspective. The outer's `onOpenChange(false, { reason: 'outside-press' })` fires, runs `handleSurfaceOpenChange`, which is the Plan 459 B1 controlled-close path that writes `openPath = false` into the page scope.

The reason this was hard:

- The framework had no single diagnostic knob for "which listener is closing this surface". Without that, the only signal was the end-state (`taskDetailOpen: false`) and the symptom (outer closed). Tracing back from the symptom through the React tree to the Base UI primitive required multiple rounds of `console.log` injection across `scope.ts`, `surface-runtime.ts`, `action-adapter.ts`, `form-store.ts`, `schema-renderer.tsx`, `use-surface-renderer.ts` — only the final call-stack inspection of `form-store.setValue` revealed that the write was coming from `use-surface-renderer.ts:224`'s `node.scope.update(openPath, false)`.
- Several red herrings on the way: the picker form's `data: { taskDetailDate: "..." }` looked like it could leak; the page-level `data` sync effect looked like it could re-apply on re-render; `setSnapshot` looked like it could re-replace and drop the flag. None of those were the cause. The actual cause was in code path I had previously read without thinking about its trigger conditions (Plan 459 B1).

## Root Cause

`packages/flux-renderers-basic/src/use-surface-renderer.ts` `handleSurfaceOpenChange(false)`:

- dispatches `onClose` event hook
- (Plan 459 B1) also tears down the surface entry
- (Plan 459 B1) also writes `openPath = false` into `node.scope` so an idempotent `setValue(openPath, true)` could later reopen

…but **does not check whether the dialog that fired `onOpenChange(false)` is currently the topmost dialog**. Base UI attaches one click-outside listener per `<Dialog>` instance and one global Esc listener. When the picker (inner) is on top, the outer's listener still fires for any click outside the outer's content — and clicks inside the picker are outside the outer's content because DialogHost renders dialogs as siblings, not as DOM-nested children.

So `handleSurfaceOpenChange(false)` runs on the outer (non-topmost) dialog for an outside-press / Esc reason, executes the Plan 459 B1 controlled-close write, and resets `taskDetailOpen = false`. The user did not close the outer.

## Fix

`packages/flux-react/src/dialog-host.tsx` `handleOpenChange` (in `DialogView`):

- After `shouldSuppressClose(reason, ...)` returns false, add: if `!isTopmost` and `reason` is `outside-press` or `escape-key`, return without calling `handleClose()`.
- All other close paths still work because they go through `surfaceRuntime.close(id)` directly (e.g. `closeSurface` action, `closeOnSubmit`, X-press) without going through `handleOpenChange`. So `closeOnOutsideClick: false` and `closeOnEsc: false` schema overrides still work, and the X button still closes only the topmost dialog.

Design intent: a dialog that is not the topmost is interactionally inert — the user is interacting with whatever is on top. This is consistent with `modal={isTopmost}` already being applied at the Base UI primitive level (which only the topmost dialog acts as a modal block).

13 lines, single `if (!isTopmost && (reason === 'outside-press' || reason === 'escape-key')) return;` guard inside `handleOpenChange`. No change to `handleSurfaceOpenChange` — its controlled-close write remains correct for the cases where the user genuinely closes the dialog.

## Tests

`packages/flux-react/src/__tests__/dialog-host-close-behavior.test.tsx` — new `describe('DialogHost stacked dialogs (E2f regression: nested dialog must not close parent)')`:

- `does NOT close a non-topmost dialog on outside-press` — two stacked dialogs in `surfaceRuntime.entries`; clicking `dialog-outside-press` on the inner (topmost) calls `surfaceRuntime.close('inner')` and never `('outer')`.
- `does NOT close a non-topmost dialog on escape-key` — same stacking; clicking `dialog-escape-key` on the inner closes only the inner.
- `still closes the topmost dialog on outside-press / esc` — explicit guard that the topmost's own close paths still fire.

Existing tests in this file (`does not close on outside-press when closeOnOutsideClick is false` etc.) still cover the schema-level `closeOnOutsideClick` / `closeOnEsc` overrides; the new tests cover the stacking case, which is orthogonal.

## Affected Files

- `packages/flux-react/src/dialog-host.tsx` — +13 lines, the new guard in `DialogView`'s `handleOpenChange`.
- `packages/flux-react/src/__tests__/dialog-host-close-behavior.test.tsx` — +102 lines, 3 new regression tests in a new `describe` block.

## Notes For Future Refactors

- **`isTopmost` is currently computed in `DialogHost` by scanning `surfaces` for the last dialog.** If `DialogHost` is refactored to render dialogs through a different strategy (e.g. portals per surface, or a stacked context), the new topmost detection must preserve the same semantics: a dialog is topmost iff no other open dialog was mounted after it.
- **The "stacking inertness" rule applies symmetrically to drawer / popover / toast surfaces if they ever gain outside-press semantics.** `DrawerView` in the same file does not currently go through `handleOpenChange` because it uses its own primitive — keep that asymmetry intentional. If you add outside-press to drawers, mirror the `!isTopmost` guard.
- **Do not move the guard into `handleSurfaceOpenChange`.** That handler is the canonical controlled-close writer; gating it on stacking would silently lose the Plan 459 B1 reopen contract for any non-topmost dialog that _did_ genuinely close (e.g. via X press on the picker after the outer has been re-stacked on top by a subsequent action). The guard belongs at the _input boundary_ (`handleOpenChange`).
- **`modal={isTopmost}` is the UI-side mirror of this guard.** If a future refactor makes a non-topmost dialog visually non-modal, the new topmost check is still required at the close-handler boundary — the Base UI primitive's `modal` flag controls pointer-event capture, not click-outside detection on sibling dialogs.
