# 35 Performance Table Form Control Isolated Cell Scope Binding Fix

## Problem

- on the playground performance-table page, most table cell renderers displayed empty or incorrect content
- badge column was empty, status column showed raw expression text like `${$slot.record.active ? `ACTIVE`:`PAUSED`}`, checkbox/switch/select/textarea/tag-list/radio-group all showed blank or default values
- pagination bar and row data were correct (the table sliced the right rows), only the cell-level rendering was broken
- the problem existed from page creation; it was not a regression

## Diagnostic Method

- diagnosis was hard because three independent bugs overlapped and produced a blanket "everything is empty" symptom
- investigation started with a Playwright diagnostic script that captured `textContent` per cell, which revealed the Profile column (`type: 'text'`) worked correctly while all form-control columns did not
- this narrowed the problem to "form controls inside table cells can't read their values"
- first hypothesis: `name: 'fieldName'` should resolve through the scope chain to the row scope's `record.fieldName` — rejected because cell scopes are **isolated** (`isolate: true` in `tables.ts:24`), so `readVisible()` returns only `{ $slot: { record, index } }` with no prototype chain to the parent row scope
- second hypothesis: `name: 'record.fieldName'` would walk up via `scope.get()` — rejected because `scope.get()` walks `scope.parent` which points to the **table scope**, not the row scope (the row scope is a sibling created by `useTableRowScopeCache`)
- decisive evidence: the switch for user_1 showed `"Off"` which matched `active: false`. This was a **false positive** — the switch actually read `undefined`, and `Boolean(undefined)` is `false`, which coincidentally matched the expected value. Confirmed by checking user_2 (`active: true`) which also showed `"Off"` before the fix
- the correct binding path `$slot.record.fieldName` was confirmed by reading `slot-frame.ts` (SLOT_KEY is the plain string `'$slot'`) and tracing `getIn(scopeData, '$slot.record.active')` step by step

additional bugs found during the same investigation:

- badge renderer uses props `text` and `level`, not `label` and `variant` — the schema had the wrong prop names
- formula expressions containing backtick template literals (`` `ACTIVE` ``) are not supported by the flux-formula compiler — they silently fail and render the raw expression string

## Root Cause

- table cell regions are declared with `params: ['record', 'index']` and `isolate: true` in `packages/flux-compiler/src/schema-compiler/tables.ts:18-24`
- the isolated cell scope stores record data under `{ $slot: { record, index } }`, not at the top level
- all form controls read values via `useFormFieldController(name)` → `useBoundFieldValue(name)` → `useScopeSelector((data) => getIn(data, name))`
- when `name: 'verified'`, `getIn({ $slot: { record: { verified: true } } }, 'verified')` returns `undefined` because `'verified'` is not a top-level key
- the correct name must be `'$slot.record.verified'` so that `getIn` traverses `$slot` → `record` → `verified`
- badge column used wrong props (`label`/`variant` instead of `text`/`level`)
- status column and action expressions used backtick template literals inside `${...}` which the formula compiler does not parse

## Fix

- changed all form control `name` bindings in table cell schemas from `'fieldName'` to `'$slot.record.fieldName'`
- changed badge cell from `label`/`variant` to `text`/`level` with correct expression syntax
- replaced all backtick template literals in expressions with double-quoted strings or string concatenation
- added `scoreBand` computed field to `PerfRow` type and `createRow()` so the radio-group has a proper data-backed value instead of a computed expression
- added `tags` prop to tag-list cell with the full set of available tag options (the renderer needs static `tags` for the button list; `name` only provides the selected subset)
- simplified header text expression to avoid unsupported `Math.ceil`

## Tests

- verified via Playwright: first row (user_1) all 10 columns display correct values
- verified via Playwright: second row (user_2) switch correctly shows "On" (active=true)
- verified via Playwright: last page (page 20) shows rows 951-1000 with correct data
- existing e2e tests `tests/e2e/performance-table.spec.ts` continue to pass

## Affected Files

- `apps/playground/src/pages/performance-table/schema.ts`
- `apps/playground/src/pages/performance-table/types.ts`

## Notes For Future Refactors

- **form controls inside isolated regions must use `$slot.paramName.field` for their `name` binding.** This is not documented in the renderer contract and is easy to get wrong. If a new table or repeatable-region schema uses form controls in cells, the author must know this convention.
- **the switch false-positive is a diagnostic trap.** When a boolean field happens to be `false`, `Boolean(undefined)` produces the same result. Always verify with both `true` and `false` expected values.
- **the formula compiler does not support backtick template literals inside expressions.** Schema authors should use `"double quotes"` or string concatenation instead.
- **badge renderer props are `text`/`level`, not `label`/`variant`.** Other playground pages may have the same mistake.
- if the cell scope isolation model changes (e.g. record fields are spread into the scope), the `$slot.record.` prefix would break and need updating across all cell schemas.
