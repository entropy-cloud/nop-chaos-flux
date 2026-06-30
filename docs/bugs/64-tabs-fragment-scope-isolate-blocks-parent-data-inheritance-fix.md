# 64 Tabs Fragment Scope Isolate Blocks Parent Data Inheritance Fix

## Problem

- Tab panel bodies could not read page-level scope variables (e.g. data-source results like `ds_products`, `ds_profile`).
- Expressions like `${ds_profile?.data?.name}` inside tab panels resolved to `undefined`, while the same expressions worked in sibling components outside the tabs.
- 17 e2e tests in `m5-mobile-showcase` failed because data-bound content (products, categories, cart, profile) rendered empty inside tab panels.

## Diagnostic Method

- **Diagnosis difficulty**: Very high. The symptom (empty rendered content) could have been caused by data-source loading, expression compilation, or scope binding. Had to rule out each layer.
- First confirmed data sources ARE loading correctly — scope-debug showed all data in the page scope. Data sources, mock fetcher, and action dispatch were all functional.
- Confirmed formula Evaluation WORKS — `props.helpers.evaluate('${ds_profile?.data?.name}')` returned `"张三"` from the scope-debug's scope context.
- Directly inspected the tab panel text renderer's scope via React fiber: `scope.readVisible()` returned only `{ $slot: { item, index, key } }` — NO parent data.
- Inspected `scope.id`, `scope.parent`, and `scope.isolate`: scope had `parent` set correctly but `isolate: true`.
- Traced `isolate: true` back through `instantiateRegion()` → `region.isolate` → compiled TemplateRegion.
- Searched for all sources of `isolate: true` in the compiler and renderer definitions. Found three separate sources, all needed fixing.

## Root Cause

Tab panel fragment scopes were created with `isolate: true`, which causes `readVisible()` in `scope.ts:180` to short-circuit and return only own data without merging parent scope data.

`isolate: true` was set in three separate places:

1. `packages/flux-compiler/src/schema-compiler/tables.ts` — `TABS_ITEM_REGION_FIELDS` had `isolate: true` on title, body, and toolbar.
2. `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` — `deepFields[0].nestedRegions` had `isolate: true` on the same three regions.
3. `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` — the `deepFields[0].normalize` function had inline rules with `isolate: true`.

All three code paths fed into `createTemplateRegion()` → `instantiateRegion()` → `renderFragment()` → `createChildScope(..., { isolate })` → `readVisible()` short-circuits, returning own-only data.

Table column regions use `isolate: true` correctly (row data should not leak between rows). But tab panels should inherit parent scope — they are not row-level contexts.

## Fix

Removed `isolate: true` from all three sources for tabs regions:

1. `tables.ts`: Removed `isolate: true` from `TABS_ITEM_REGION_FIELDS` (kept for `TABLE_COLUMN_REGION_FIELDS`).
2. `basic-renderer-definitions.ts`: Removed from `nestedRegions` (kept for condition-builder `isolate` prop).
3. `basic-renderer-definitions.ts`: Removed from the `normalize` function's inline rules.

Only tab-related regions were changed. Table column, table expandedRow, and non-tabs isolate flags were preserved.

## Tests

- `packages/flux-compiler/src/tables.test.ts` — updated to expect `isolate` is falsy for tabs regions.
- `tests/e2e/m5-mobile-showcase.spec.ts` — all 21 tests now pass (were 10 failures before).
- Also fixed: architecture panel text mismatch, `cartTotal` undefined reference.

## Affected Files

- `packages/flux-compiler/src/schema-compiler/tables.ts`
- `packages/flux-compiler/src/tables.test.ts`
- `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`
- `packages/flux-runtime/src/scope.ts` (read but not changed — the `isolate` gate is correct)
- `packages/flux-react/src/node-renderer-resolved.tsx` (read but not changed — the slot-frame branch correctly applies `region.isolate`)

## Notes For Future Refactors

- Before adding `isolate: true` to any `NestedRegionFieldRule`, verify whether the region's children genuinely need scope isolation (like table rows) or should inherit parent scope (like tab panels, navigation, layout regions).
- The renderer definition's `deepFields.nestedRegions` and the `normalize` function's inline rules are two independent code paths — both must be kept in sync.
- `readVisible()` at `scope.ts:180` is the single gate for scope inheritance. Any future change to scope visibility must preserve the `!parent || isolate` guard semantics.
