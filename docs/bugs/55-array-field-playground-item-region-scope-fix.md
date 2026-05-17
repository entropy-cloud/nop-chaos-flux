# 55 Array Field Playground Item Region Scope Fix

## Problem

- In `#/lab/array-field`, preloaded object rows showed only the row-level delete buttons.
- The actual item controls (`Name`, `Role`) were missing even though the attached `scope-debug` panel still showed the correct `members` array data.
- The visible symptom looked like empty row content, not missing data.

## Diagnostic Method

- Reproduced the issue directly in the browser against the live Vite dev server instead of relying only on existing unit tests.
- Confirmed the contradiction: `scope-debug` still showed `members: [{ name: 'Alice' ... }, { name: 'Bob' ... }]`, while `[data-slot="array-field-item-body"]` was empty and only delete buttons rendered.
- Added focused regression coverage that mirrors the playground registry + `scope-debug` wrapping path; test coverage stayed green, which ruled out a simple schema/registry omission and narrowed the problem to the browser/runtime render path.
- Instrumented the live page to confirm `props.regions.item.templateNode` and `props.regions.item.render(...)` were both present and returned valid React elements, proving the item region existed but was being rendered through the wrong context path.

## Root Cause

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` rendered the item region without explicitly passing the projected item scope to `region.render(...)`.
- That left object-item child rendering dependent on outer provider timing/ambient context instead of the documented array-item projected scope contract.
- In the real playground/browser path, that implicit context path was not reliable, so the item subtree collapsed to empty content while row chrome (`Remove`) still rendered from the outer `ArrayItem` shell.

## Fix

- `ArrayItem` now receives the current item value, instance path, and item region handle directly.
- The item body explicitly calls `itemRegion.render({ scope: itemScope, bindings, instancePath })` so object-item child renderers always execute against the projected item scope.
- This keeps the actual item subtree aligned with the documented `array-field` item scope model instead of relying on ambient provider inheritance.

## Tests

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.test.tsx` - verifies the playground-style registry + `scope-debug` wrapped `array-field` still renders preloaded object-item child controls.
- `tests/e2e/component-lab/complex-form.spec.ts` - verifies `#/lab/array-field` shows the preloaded `Alice` / `Bob` rows and their `Role` controls instead of only delete buttons.

## Affected Files

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.test.tsx`
- `tests/e2e/component-lab/complex-form.spec.ts`

## Notes For Future Refactors

- Do not rely on ambient provider inheritance for repeated region rendering when the region has a concrete projected scope available.
- For composite/repeated controls, prefer explicit `region.render({ scope: ... })` when child authoring depends on item-local bindings or projected owner scope.
- If this renderer is refactored again, re-check both unit coverage and the real playground/browser path because this defect was only visible in the live page, not in the earlier narrower tests.
