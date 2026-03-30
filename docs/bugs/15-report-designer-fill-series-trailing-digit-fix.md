# 15 Report Designer Fill Series — Trailing-Digit Pattern Not Incrementing

## Problem

- Fill series drag on a cell containing `abc12` produces `abc12` copies instead of auto-incrementing to `abc13`, `abc14`, etc.
- Pure numeric strings like `"33"` also copied instead of incrementing
- `applyFillSeries` only handled `typeof value === 'number'`; any string (even `"33"`) fell through to the copy branch

## Diagnostic Method

- Diagnosis was straightforward — read `applyFillSeries` source and saw `Number(srcCell.value)` + `isNaN` check as the only path
- String `"33"` passes `Number()` but the original code had `srcCell.value !== ''` guard which was fine; the real gap was strings with mixed alpha+digit content like `"abc12"` where `Number()` returns `NaN`
- Wrote unit tests first to confirm the gap, then implemented the fix

## Root Cause

- `applyFillSeries` in `packages/spreadsheet-core/src/core.ts` used a binary check: `isNumber` (pure numeric) → increment, else → copy
- No detection of trailing-digit patterns in strings (e.g., `abc12`, `code001`)
- Zero-padding was not preserved (e.g., `code001` → `code2` instead of `code002`)

## Fix

- Extracted a new helper `incrementSeriesValue(value, step)` that handles three cases:
  1. **Pure number** (number type or numeric string) → arithmetic increment
  2. **Trailing-digit string** (regex `/^(.*?)(\d+)$/`) → parse suffix, increment, re-pad to original digit width
  3. **Non-incrementable** → return value unchanged (copy)
- `applyFillSeries` now calls `incrementSeriesValue(srcCell.value, step)` instead of the old `isNumber` branch
- Works for both `down` and `right` directions

## Tests

- `packages/spreadsheet-core/src/p1-features.test.ts` — 6 new tests:
  - trailing-digit string fill down (`abc12` → `abc13`, `abc14`...)
  - trailing-digit string fill right (`item01` → `item02`, `item03`...)
  - zero-padding preservation (`code001` → `code002`, `code003`...)
  - pure numeric string fill down (`"33"` → 34, 35...)
  - mixed prefix with number (`12abc99` → `12abc100`)
  - non-incrementable string copies as-is (`noDigitsHere`)

## Affected Files

- `packages/spreadsheet-core/src/core.ts` — added `incrementSeriesValue`, rewrote `applyFillSeries`
- `packages/spreadsheet-core/src/p1-features.test.ts` — added 6 regression tests

## Notes For Future Refactors

1. **`incrementSeriesValue` is a pure function** — it can be unit-tested independently and reused if other fill modes are added (geometric, date-based, etc.)
2. **The regex `/^(.*?)(\d+)$/` matches the LAST digit sequence** — `12abc99` → prefix=`12abc`, digits=`99`. This matches Excel behavior (increment the trailing number).
3. **Zero-padding is determined by the source cell's digit width** — if the source has 3 digits (`001`), all fill values are padded to 3 digits. Overflow beyond the original width (e.g., `code999` → `code1000`) is handled naturally by `toString().padStart()`.
