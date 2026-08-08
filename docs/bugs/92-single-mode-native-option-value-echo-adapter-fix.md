# 92 Single-Mode Number/Boolean Option Value Selected-State Echo Fix

## Problem

In `select` / `radio-group` / `button-group-select` single mode, options whose
`value` is a number (including `0`) or boolean lost their selected state echo:
the control re-rendered with nothing selected even though the store value
matched an option. Number `0` was especially confusing — it looked like a
"clear selection" state.

## Diagnostic Method

- Hard part: the three components look unrelated but shared one adapter; the
  bug only appeared in single mode (multiple mode used a different adapter and
  kept array identity).
- Inspected the shared input-choice adapters first (`input-choice-renderers.tsx`)
  because all three components were flagged by the same audit finding.
- Rejected "Base UI bug" hypothesis by verifying the strict matching semantics:
  Base UI `RadioGroup` matches `checkedValue === value`, and
  `button-group-select` uses `Object.is` — both are strict native-type equality.
- Decisive evidence: `stringAdapter` (`input-choice-renderers.tsx:648`)
  converted option values to strings for `selectedValue`, so `0 === '0'` was
  `false` and no option could ever match.

## Root Cause

- The shared `stringAdapter` stringified values at the adapter boundary. Strict
  equality checks in Base UI (`checkedValue === value`) and button-group-select
  (`Object.is`) then failed for number/boolean option values.
- Same shared root cause across three components (select / radio-group /
  button-group-select) — a cross-component duplication that needed one fix.

## Fix

- Introduced `choiceSingleAdapter`, a value-preserving adapter
  (`input-choice-renderers.tsx:70-89,667`).
- `selectedValue` is normalized to `''` only for `null`/`undefined` (to keep
  Base UI controlled and avoid the uncontrolled→controlled React warning);
  all other native types are preserved as-is (`:679-685`).

## Tests

- `packages/flux-renderers-form/src/__tests__/choice-native-value-echo.test.tsx`
  (test-first, red before the fix): numeric `0` option selected + write-back +
  controlled flip regression; button-group-select numeric selection assertions.

## Affected Files

- `packages/flux-renderers-form/src/input-choice-renderers.tsx` (adapters)
- select / radio-group / button-group-select renderers (adapter wiring)

## Notes For Future Refactors

- Any new single-choice control must keep option-value fidelity; do not
  normalize values to strings at adapter boundaries.
- When Base UI enforces strict native equality, the adapter must pass values
  through untouched except for the `null`/`undefined` → `''` control-mode
  normalization.
