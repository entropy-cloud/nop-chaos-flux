# 41 variant-field StrictMode Mounted Guard Tab Switch Fix

## Problem

- In the component-lab `variant-field` renderer, clicking the `String List` tab could leave the editor stuck on the original `Single String` tab in the live playground.
- The visible symptom looked like a flaky Playwright interaction at first: the tab button received focus, but the active editor, bound form value, and scope debug output did not change.
- The smallest repro was `tests/e2e/component-lab/complex-form.spec.ts` on the `String vs list editor with scope-state switching` scenario.

## Diagnostic Method

- Diagnosis was hard because the first failure looked like an e2e actionability problem: the tab sometimes focused but did not activate, and related unit tests already passed.
- First reproduced the issue in a temporary targeted Playwright spec and logged `aria-selected`, `data-active-variant`, the scope debug JSON, and the rendered tabs DOM before and after clicking the second tab.
- That output showed `Tabs` did receive `onValueChange('list')`, but `data-active-variant` stayed `text` and the form value stayed the original string.
- Added temporary runtime logging inside `handleVariantSwitch()` and confirmed execution entered the switch path but returned before `parentForm.setValue(...)`.
- The decisive evidence was the runtime log `switch-return-before-set` with `mounted: false` even though the component was visibly mounted in the playground. That pointed to a local lifecycle guard, not a tabs API mismatch or a Playwright locator issue.

## Root Cause

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` uses a local `mountedRef` to drop async updates after unmount.
- The ref was initialized with `useRef(true)` and only set to `false` in effect cleanup. Under React development StrictMode remount cycles, the throwaway cleanup ran first and left the ref stuck at `false`.
- After the user clicked a new variant tab, `handleVariantSwitch()` reached the mounted guard and returned before writing the target variant `initialValue` into the parent form, so the current string value continued matching the original variant.

## Fix

- Reset the mounted guard on every real mount by assigning `mountedRef.current = true` inside the effect before registering cleanup.
- Kept the mounted guard itself so async transform/switch paths still avoid post-unmount updates.
- Updated the component-lab e2e to cover real tab switching behavior and verify both the active editor and bound scope state change together.

## Tests

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-selector.test.tsx` - keeps selector-mode switching and active variant selection covered.
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-transform.test.tsx` - verifies switching between string and list variants updates the active editor and submitted value shape.
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-detection.test.tsx` - keeps variant detection behavior covered after the switch-path fix.
- `tests/e2e/component-lab/complex-form.spec.ts` - verifies the live playground can switch from string to list and back, and that the scope debug output tracks the variant value shape.

## Affected Files

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-selector.test.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-transform.test.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-detection.test.tsx`
- `tests/e2e/component-lab/complex-form.spec.ts`

## Notes For Future Refactors

- Any async renderer path guarded by a local mounted ref must re-arm the ref on each mount; `useRef(true)` alone is not enough under React development StrictMode.
- If a live playground interaction fails while unit tests pass, inspect StrictMode remount behavior before assuming the problem is in the UI library or Playwright selectors.
- For `variant-field`, active tab UI, matched-variant detection, and parent form value writes must be debugged together; the visible tab state can mask a form-write short circuit.
