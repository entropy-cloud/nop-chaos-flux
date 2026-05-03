# 39 SchemaRenderer StrictMode Runtime Dispose Form Reset Fix

## Problem

- In Playwright and the live playground, form inputs in component-lab scenarios sometimes accepted a keystroke and then immediately cleared themselves.
- The smallest repro was typing into `input-text` or reaction-driven form demos: `onChange` fired, but the visible field value snapped back to empty.
- The same form behavior still passed colocated unit tests, which made the failure look like an e2e-only field binding regression.

## Diagnostic Method

- Diagnosis was hard because the symptom looked like an `Input` renderer bug, a field handler regression, or a form store write failure. All three were plausible from the browser behavior.
- First checked the form renderer stack in `packages/flux-renderers-form`, including `input.tsx`, `field-handlers.tsx`, and `form.tsx`, and confirmed the field `onChange` path still called `currentForm.setValue(...)`.
- Browser-side probing then showed the decisive mismatch: `currentForm` existed and `setValue(name, value)` was invoked, but the form store no longer retained the write and sibling scope-debug output only exposed `$form`, not the expected field values.
- That ruled out the UI component itself and pointed to a broken runtime/form ownership layer. The next step was comparing browser-only behavior against the playground host setup.
- The decisive evidence was that `apps/playground/src/main.tsx` runs inside React `StrictMode`, while `packages/flux-react/src/schema-renderer.tsx` disposed the active runtime in a plain effect cleanup. In dev StrictMode, the throwaway mount/unmount cycle disposed the runtime before the real mount reused it.

## Root Cause

- `packages/flux-react/src/schema-renderer.tsx` used `useEffect(() => () => runtime.dispose(), [runtime])`.
- Under React dev `StrictMode`, the temporary unmount cleanup ran during the simulated remount cycle and disposed the current runtime too early.
- The next real mount reused a runtime tree whose form runtime had already been torn down, so later `setValue(...)` calls became no-ops even though field event handlers still fired normally.

## Fix

- Changed `SchemaRenderer` runtime cleanup to avoid disposing the current runtime during the StrictMode throwaway cleanup pass.
- The renderer now tracks the active mounted runtime and defers disposal until it can tell that the runtime is truly no longer the current mounted instance.
- This keeps real unmount cleanup intact while preventing dev StrictMode from invalidating live form runtimes.

## Tests

- `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx` - verifies form input state survives React StrictMode remount cycles.
- `tests/e2e/component-lab/action-logic.spec.ts` - verifies live playground form/action interactions no longer reset immediately after input.
- `tests/e2e/component-lab/simple-form.spec.ts` - verifies simple form typing persists in the live playground.

## Affected Files

- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx`
- `tests/e2e/component-lab/action-logic.spec.ts`
- `tests/e2e/component-lab/simple-form.spec.ts`
- `apps/playground/src/main.tsx`

## Notes For Future Refactors

- Any runtime owned by `SchemaRenderer` must treat React dev `StrictMode` cleanup as a special lifecycle shape; plain effect cleanup can be too eager if the runtime is reused across mounts.
- If a live form bug reproduces only in the browser or Playwright but not in unit tests, check whether the playground host is running under `StrictMode` before rewriting field/render/store logic.
- When `setValue(...)` fires but the visible form state does not persist, inspect runtime lifetime and disposal boundaries before blaming field handlers or UI controls.
