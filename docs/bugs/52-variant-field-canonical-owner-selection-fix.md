# 52 Variant Field Canonical Owner Selection Fix

## Problem

- `variant-field` could keep rendering an old branch after the parent owner value had already changed shape.
- The visible selector state was no longer just cosmetic: it also drove projected scope payload, hidden-branch participation, and validation subtree selection.
- The smallest repro was: manually switch variants, then update the bound field through the parent form/runtime so the canonical value now belongs to a different variant.

## Diagnostic Method

- The deep-audit retained finding `04-03` already narrowed the issue to `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, but the exact stale path still had to be re-checked against the live repo.
- The first check was the `activeKey` precedence chain because that key controls both rendering and owner-sensitive projected runtime behavior.
- Re-audit showed the component already cleared `userSelectedKey` when `matchedKey` disagreed, but `activeKey` still gave local `userSelectedKey` higher priority than owner-derived detection.
- The decisive proof was a focused regression that manually switched to one variant and then changed `payload` through `form.setValue(...)`, verifying that the rendered branch must follow the new owner-derived result.

## Root Cause

- `variant-field` kept a local `userSelectedKey` and treated it as the highest-priority fact source for `activeKey`.
- That local selector state therefore outlived the authoritative parent-owned value classification derived from `matchedKey` and `detectedKey`.

## Fix

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` now resolves `activeKey` from owner-derived detection first: `matchedKey`, then `detectedKey`, and only then the transient local `userSelectedKey` fallback.
- `docs/architecture/variant-field.md` now records the live owner rule explicitly: the active branch must converge back to the canonical variant derived from the parent-owned value.

## Tests

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-selector.test.tsx` - verifies an external `form.setValue(...)` after a manual switch still drives the component back to the owner-derived active variant.
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-detection.test.tsx` - remained green as the existing detection baseline proof after the precedence change.

## Affected Files

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-selector.test.tsx`
- `docs/architecture/variant-field.md`

## Notes For Future Refactors

- Treat selector-local state in `variant-field` as transient UI state only; it must never become a long-lived second fact source for active branch ownership.
- If future work changes variant detection ordering, re-check projected scope publication, hidden-branch clearing, and validation participation together because they all depend on the same `activeKey` truth.
