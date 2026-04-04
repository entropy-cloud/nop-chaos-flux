# 24 Word Editor E2E Test Failures: base-ui Tabs Role Mismatch and Manual State Divergence

## Problem

- 7 out of 24 word-editor E2E tests failed across 3 test files
- Tab selectors (`getByRole('button', { name: 'Datasets' })`) could not find sidebar tabs in the left panel
- Expression dialog tabs (`getByRole('button', { name: 'EL Expression' })`) could not be clicked
- After clicking the XPL tab in ExprInsertDialog, the tab panel content remained hidden (EL panel stayed visible)
- Tag name dropdown test matched "c:for" against both "c:for" and "c:forEach" options

## Diagnostic Method

- **Diagnosis difficulty: medium-high.** The component source code used `TabsTrigger` from `@nop-chaos/ui`, which wraps `@base-ui/react/tabs`. The accessible name appeared correct ("Datasets", "Fields", "EL Expression", "XPL Tag").
- Initial fix attempt: changed selectors from `getByRole('button')` to `getByRole('tab')` — 20 tests passed, but 4 still failed
- The 4 remaining failures all shared the same symptom: `TabsContent` panel not visible after tab switch
- Read base-ui's `TabsTab.js` source: `TabsPrimitive.Tab` renders `<button role="tab">` explicitly (line 171), which overrides the implicit `button` role — confirming the role mismatch
- Read base-ui's event handler merging: `useRenderElement` chains user's `onClick` with internal `onTabActivation`, meaning **both** fire
- The root cause of the 4 remaining failures: component code managed tab state manually (`activePanel`/`exprType` via `useState` + `onClick`), but base-ui's internal `onTabActivation` also changed its own value. The `TabsContent` had a hardcoded `value` prop (`value="datasets"` / `value="el"`), which no longer matched base-ui's internal value after a click, causing the panel to hide

## Root Cause

Three independent issues:

1. **base-ui `TabsPrimitive.Tab` renders `role="tab"`** — This explicit role overrides the implicit `button` role from the underlying `<button>` element. Playwright's `getByRole('button')` cannot match elements with `role="tab"`.

2. **`TabsContent` value hardcoded instead of reactive** — `TabsContent value="datasets"` was a static string. When the user clicked a tab, base-ui's internal value changed (due to chained `onClick`), but `TabsContent` still looked for `value="datasets"`, so the panel hid.

3. **Tag dropdown option matching used substring** — `.locator('option').filter({ hasText: 'c:for' })` matched both "c:for" and "c:forEach" because `hasText` does substring matching.

## Fix

### E2E test selector fixes (3 files)

- `tests/e2e/word-editor.spec.ts`: `getByRole('button')` → `getByRole('tab')` for tab triggers; Outline heading `level: 3` → `level: 2` (OutlinePanel renders `<h2>`)
- `tests/e2e/word-editor-dataset.spec.ts`: Same role fix for Datasets/Fields tabs
- `tests/e2e/word-editor-template-expr.spec.ts`: Same role fix for EL Expression/XPL Tag tabs; tag option matching changed from `.filter({ hasText: tag })` to `.locator('option[value="${tag}"]')` for exact match

### Component fixes (2 files)

- `WordEditorPage.tsx`: `TabsContent value="datasets"` → `TabsContent value={activePanel}` — panel now tracks the actual active tab state
- `ExprInsertDialog.tsx`: `TabsContent value="el"` → `TabsContent value={exprType}` — panel now tracks the actual expression type

## Tests

- `tests/e2e/word-editor.spec.ts` — 13 tests, all pass
- `tests/e2e/word-editor-dataset.spec.ts` — 5 tests, all pass
- `tests/e2e/word-editor-template-expr.spec.ts` — 6 tests, all pass
- Total: 24/24 word-editor E2E tests pass

## Affected Files

- `tests/e2e/word-editor.spec.ts` — tab role selectors, heading level fix
- `tests/e2e/word-editor-dataset.spec.ts` — tab role selectors
- `tests/e2e/word-editor-template-expr.spec.ts` — tab role selectors, exact option matching
- `packages/word-editor-renderers/src/WordEditorPage.tsx` — reactive `TabsContent value`
- `packages/word-editor-renderers/src/dialogs/ExprInsertDialog.tsx` — reactive `TabsContent value`

## Notes For Future Refactors

1. **base-ui `TabsTrigger` always renders `role="tab"`** — Any E2E or accessibility test must use `getByRole('tab')`, not `getByRole('button')`. This applies to all consumers of `@nop-chaos/ui` Tabs components.

2. **Manual tab state + base-ui internal state** — When using `TabsTrigger` with manual `onClick` state management, base-ui's internal `onTabActivation` also fires (event handler chaining). If `TabsContent` uses a static `value`, it will diverge. Always bind `TabsContent value` to the same state variable used for `TabsTrigger` selection.

3. **Playwright `hasText` is substring matching** — For exact option matching in `<select>` elements, use `.locator('option[value="exact"]')` instead of `.filter({ hasText: '...' })`.
