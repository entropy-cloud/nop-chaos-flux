# 110 Spreadsheet Find Result Shape Contract Drift Fix

## Problem

- The host contract result shape for `find`/`findNext` declared `{ cell: cellRefShape, value }`, but the actual `FindResult` returned by the commands is `{ sheetId, address, row, col, value, matchStart, matchEnd }`.
- The declaration and the implementation drifted; any tooling that validates or documents the host method result against the manifest would disagree with the live payload.
- Minimal reproducible: read `findResultShape` from the manifest and compare against the `FindResult` type — the `cell`/`address`/`row`/`col`/`matchStart`/`matchEnd` fields mismatch.

## Diagnostic Method

- Surfaced by the declaration-is-contract double-check (lesson 08): compare every declared host method contract against its implementation return type.
- Inspected `findInDocument` (`search-operations.ts:89-98`) — it returns the flat `FindResult` shape.
- Inspected the consumer `use-find-replace.ts:23` — it reads `result.data.address` (flat shape), confirming the implementation shape is the live contract.
- Rejected hypothesis: "result shapes are not part of the contract" — the manifest declares `result` fields and `validateHostMethodPayload`/tooling consume them.

## Root Cause

- The manifest shape was written before the find implementation settled on the flat `FindResult` shape and was never re-synced; the action provider does not validate results at runtime, so the drift stayed silent.

## Fix

- `findResultShape` in `spreadsheet-manifest-shapes.ts` now declares the flat `FindResult` fields (`sheetId`, `address`, `row`, `col`, `value`, `matchStart`, `matchEnd`), matching `commands-style.ts:FindResult` and the live command payload.

## Tests

- `packages/spreadsheet-renderers/src/spreadsheet-manifest.test.ts` - new "find result shape contract" block asserts every `FindResult` type key is declared in the manifest shapes for `find` and `findNext`.

## Affected Files

- `packages/spreadsheet-renderers/src/spreadsheet-manifest-shapes.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-manifest.test.ts`

## Notes For Future Refactors

- If `FindResult` is ever extended (e.g. match highlighting metadata), the manifest `findResultShape` must be updated in the same change — the manifest test enforces this now.
- If result validation is added to `host-action-provider.invoke`, this shape becomes a hard runtime gate; keep it in sync.
