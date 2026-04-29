# 36 detail-field StrictMode Mounted Guard Dialog Open Fix

## Problem

- In the component-lab `detail-field` renderer, clicking `Edit` sometimes did nothing in the live playground.
- No dialog appeared, no browser error was shown, and the same interaction still passed the colocated unit tests.
- The smallest repro was the `detail-field` lab page in Playwright: the `Edit` button received the click, but no draft form or dialog mounted.

## Diagnostic Method

- Diagnosis was hard because the symptom looked like a dialog/surface regression, but the shared dialog infrastructure was healthy and `detail-view` worked on the same page model.
- First checked the e2e failure directly and confirmed the click landed while `[data-slot="dialog-content"]` and `[data-slot="detail-field-draft-body"]` stayed at count `0`.
- Compared `detail-field.tsx` against `detail-view.tsx` and verified they used the same draft-form creation and surface path, which ruled out the dialog shell and form runtime as the primary cause.
- Added temporary runtime logging inside `handleOpen()`. The decisive evidence was that logs appeared before `runTransformIn()` completed, but never reached draft-form creation. That narrowed the failure to the mounted guard between the async adaptation step and `runtime.createFormRuntime(...)`.
- The remaining difference was the local `mountedRef` lifecycle guard. Under React dev/StrictMode, the effect cleanup set `mountedRef.current = false` during the throwaway unmount, but the next real mount never restored it.

## Root Cause

- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` used a `mountedRef` to avoid state updates after unmount.
- The effect initialized the ref once with `useRef(true)` and only set it to `false` in cleanup. After a StrictMode remount cycle, the ref stayed `false`.
- `handleOpen()` awaited `runTransformIn(...)`, then hit `if (!mountedRef.current) return;`, so the renderer silently exited before creating the draft form or opening the dialog.

## Fix

- Reset the mount guard inside the effect on every real mount: `mountedRef.current = true` before registering cleanup.
- Kept the guard itself, so the renderer still avoids async state updates after a real unmount.
- Added a StrictMode-specific regression test so future refactors do not reintroduce the same live-only failure mode.

## Tests

- `packages/flux-renderers-form-advanced/src/detail-view/detail-field-unmount.test.tsx` - verifies `detail-field` still opens after React StrictMode remount cycles.
- `tests/e2e/component-lab/complex-form.spec.ts` - verifies the `detail-field` lab scenario opens, edits, confirms, and updates the viewer in the live playground.

## Affected Files

- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field-unmount.test.tsx`
- `tests/e2e/component-lab/complex-form.spec.ts`

## Notes For Future Refactors

- Any async renderer path guarded by a local mounted ref must explicitly restore the ref on each mount, not only initialize it in `useRef(...)`.
- Bugs that reproduce only in live playground/dev builds but not unit tests should be checked against React StrictMode remount behavior before rewriting shared runtime code.
- If `detail-field` and `detail-view` diverge again, compare their async pre-open path first; the shared dialog surface was not the failing layer here.
