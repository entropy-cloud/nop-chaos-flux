# 94 Composite Field Family readOnly/disabled Not Propagating To Embedded Fields Fix

## Problem

In composite fields (`combo`, `input-table`, `array-field`, `object-field`,
`detail-field`, `detail-view`, `variant-field`), setting `readOnly` or
`disabled` on the composite locked only the composite's own chrome (add/remove
buttons, drag handles). The embedded item/row/draft child fields stayed
editable — users could still type into a read-only detail view and values
were written back to the parent form.

## Diagnostic Method

- Hard part: every child field renders correctly when it has its own
  `readOnly`/`disabled` schema props; the defect only appears when the flag is
  set on an ancestor composite. Standard per-field checks pass.
- Started from how a field resolves its presentation state:
  `useFormLayout().staticReadOnly` — a context-provided value — and checked
  which composites provided a `FormLayoutContext.Provider` over their embedded
  field regions.
- Rejected "child fields must read schema only" by the existing pattern: a
  context-based mechanism (`FormLayoutContext`) already exists and other
  components use it; the failing composites simply did not provide it.
- Decisive evidence: multiple audit cards flagged the same missing-provider
  pattern at the exact embedding sites (`DetailDraftBody`,
  `variant-field-view.tsx:157-167`, input-table cells, etc.) — one shared
  root cause across 6+ components.

## Root Cause

- Composite fields set `readOnly`/`disabled` only on their own chrome; the
  embedded child field regions were rendered without a
  `FormLayoutContext.Provider staticReadOnly` so child presentation read only
  their own schema props and stayed interactive.
- Same missing-provider pattern across the whole composite family
  (combo/input-table/array-field/object-field/detail-field/detail-view/
  variant-field + condition-builder custom value editors) — a cross-component
  duplication.

## Fix

- Embedded regions now wrap children in
  `FormLayoutContext.Provider staticReadOnly={...}` (readOnly layout) so the
  static read-only state propagates to every nested schema field, mirroring
  the existing form-level mechanism (plans `2026-08-03-0921-1` /
  `2026-08-03-0921-2`; e.g. `variant-field-view.tsx:162-177`,
  `DetailDraftBody`).
- Interaction chrome (buttons) stays disabled through the composite's own
  disabled wiring; field presentation now freezes via context.

## Tests

- `packages/flux-renderers-form-advanced/src/__tests__/c3-2-readonly-propagation.test.tsx`
  (test-first, red before the fix) — embedded fields uneditable under
  `readOnly` across the family; `composite-readonly-propagation.test.tsx`
  covers the composite-input subset.
- Host scenario `c3-4-host-surfaces.spec.ts host-le-readonly` proves
  read-only freeze with programmatic DOM assertions.

## Affected Files

- `packages/flux-renderers-form-advanced/src/` (combo/input-table/array-field/
  object-field/detail-field/detail-view/variant-field/condition-builder
  embedding sites)
- `packages/flux-react/src/` (`FormLayoutContext` consumer surface)

## Notes For Future Refactors

- Any new composite field must wrap embedded schema fields in
  `FormLayoutContext.Provider staticReadOnly` when readOnly; direct child
  disabled wiring is not enough.
- Keep `staticReadOnly` propagation symmetric with the form-level layout
  mechanism; do not invent a second channel.
