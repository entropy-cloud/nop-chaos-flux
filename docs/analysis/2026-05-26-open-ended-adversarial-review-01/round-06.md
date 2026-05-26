# Open-Ended Adversarial Review — 2026-05-26 — Round 06

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: composite projected editors, projected owner scopes/forms, readOnly enforcement  
**Discovery source**: final stop-check after Round 03 found basic-control readOnly affordance drift, then following composite field write paths

---

## Finding 1: Composite projected editors publish `readOnly`, but their projected child scopes/forms still write through to the parent owner

- **Where**:
- `docs/architecture/field-binding-and-renderer-contract.md:257-273`
- `docs/architecture/object-field.md:22-44,79-99,120-138`
- `docs/architecture/array-field.md:36-64,77-83,150-177`
- `packages/flux-renderers-form-advanced/src/projected-owner-scope.ts:27-50,119-134`
- `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:301-319,343-351`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:84-123,126-134,254-360,380-427`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:110-160,292-315,425-454,557-579`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts:6-44,47-73`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-runtime.ts:6-35,38-95`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:99-107,157-165`
- **What**: `object-field`, `array-field`, and `variant-field` all project a child editing context that includes a `readOnly` value, but the write channels behind that context do not enforce it. `createProjectedOwnerScope(...)` exposes `readOnly` in the payload while `update(...)`, `merge(...)`, and `replace(...)` still delegate directly to `setValue` / `setNestedValue` / `setAdditionalPath`. `createProjectedInlineForm(...)` forwards `setValue`, `setValues`, and optional array mutation methods directly to the parent form. `object-field.writeProjectedValue(...)` writes via `parentForm.setValue(...)` or `parentScope.update(...)` with no `readOnly` / disabled guard. `array-field` hides add/remove buttons when read-only, but existing item content receives an item form/scope that can still mutate the parent. `variant-field` hides the selector in read-only mode, but if no separate viewer region is provided it renders the active content region under the same writable projected form/scope.
- **Why it matters**: composite `readOnly` should protect the bound field as a whole, not just hide the parent control's add/remove/switch affordances or publish a boolean that child schemas may manually inspect. A schema author can mark an `object-field`, `array-field`, or `variant-field` as read-only and still have nested `input-text` / actions mutate `profile.firstName`, `tags.0`, or the active variant value unless every nested field redundantly declares its own `readOnly`. That violates the field contract that `readOnly` means visible but not editable at the bound field layer, and it is especially dangerous because these composites are explicitly parent-owned inline editors whose projected views write straight into the parent owner.
- **Confidence**: Certain
- **Non-duplication note**: Round 03 covered basic controls that look editable but block writes in the handler. This is a different, stronger defect: composite parent readOnly does not block the projected child owner write channels at all, so nested interactions can actually mutate parent data. Existing composite tests cover live editing and readOnly payload publication, but not “readOnly composite prevents child writes.”

## Round Assessment

This round found the readOnly problem at a deeper layer than individual widgets. The shared projected owner substrate treats `readOnly` as a payload field, not as an authority guard. That makes every composite editor built on it rely on children to opt in to the parent's business editability rule, which is the wrong direction for a field-level contract.

Immediate improvement direction: enforce readOnly/effective-disabled at the projected owner boundary. `createProjectedOwnerScope` and projected form proxy creation should accept a write guard or `readOnly` option that turns `update` / `merge` / `replace` / `setValue` / array mutations into no-ops or structured failures before they reach the parent. Then add regression tests for read-only `object-field`, scalar/object `array-field`, and `variant-field` without a separate viewer region.

## Blind-Spot Self-Assessment

This round did not inspect every composite control built outside this projected-owner substrate. Controls such as condition-builder, key-value, tag-list, tree controls, and array-editor appear to have local readOnly guards/tests, but they deserve a separate systematic pass after the shared projected editor fix lands.
