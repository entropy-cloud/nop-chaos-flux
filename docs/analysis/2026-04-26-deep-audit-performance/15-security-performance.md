# 15 Security And Performance

## Scope

- Dimension 15 focused on security red lines and performance hot paths across runtime, forms, spreadsheet, report-designer, and condition-builder code.
- Independent review re-checked each high-risk candidate before inclusion.

## Review Summary

- First-pass candidate count: 6
- Independently reviewed: 6 groups
- Retained: 5
- Downgraded: 3
- Rejected: 1

## Retained Findings

### [Dimension15] `valuesPath` publication in `FormRenderer` performs whole-value `JSON.stringify` checks on every form-store update
- **Files**: `packages/flux-renderers-form/src/renderers/form.tsx:370-392`
- **Severity**: P2
- **Category**: Performance
- **Rule**: P1
- **Current state**: When `valuesPath` is configured, the form renderer subscribes to the whole form store and uses `JSON.stringify(values)` to decide whether to republish to the parent scope.
- **Evidence**:
```ts
useEffect(() => {
  if (!valuesPath || !parentScope) {
    return;
  }

  let lastPublishedJson: string | undefined;

  function publishValues() {
    const values = ownedForm.store.getState().values;
    const nextJson = JSON.stringify(values);
    if (lastPublishedJson === nextJson) {
      return;
    }

    lastPublishedJson = nextJson;
    resolvedParentScope.update(resolvedValuesPath, values);
  }

  publishValues();
  return ownedForm.store.subscribe(publishValues);
}, [valuesPath, ownedForm, parentScope]);
```
- **Risk**: Field-state, submit, or validation-driven store updates can all trigger a full serialization of the form values even when `values` did not change. This is a real hot-path cost on large forms, although the issue only applies when `valuesPath` is enabled.
- **Independent review outcome**: Keep, but downgraded from high severity because the path is conditional on `valuesPath` rather than affecting every form.

### [Dimension15] Spreadsheet paste loops rebuild `sheet.cells` one cell at a time
- **Files**:
  - `packages/spreadsheet-core/src/core/clipboard-operations.ts:49-70`
  - `packages/spreadsheet-core/src/core/document-access.ts:40-42`
- **Severity**: P2
- **Category**: Performance
- **Rule**: P2
- **Current state**: Paste iterates every target cell and calls `setCell(...)`; `setCell(...)` clones the entire `sheet.cells` map each time.
- **Evidence**:
```ts
// packages/spreadsheet-core/src/core/clipboard-operations.ts:49-70
const { doc: updated, sheet } = ensureSheetCells(doc, target.sheetId);
let newSheet = sheet;
for (let rowOffset = 0; rowOffset < clipboard.cells.length; rowOffset++) {
  for (let colOffset = 0; colOffset < clipboard.cells[rowOffset].length; colOffset++) {
    ...
    newSheet = setCell(newSheet, targetRow, targetCol, {
      ...(existing ?? { address: key, row: targetRow, col: targetCol }),
      ...
    });
  }
}
```
```ts
// packages/spreadsheet-core/src/core/document-access.ts:40-42
export function setCell(sheet: WorksheetDocument, row: number, col: number, cell: CellDocument): WorksheetDocument {
  const cells = { ...sheet.cells, [cellAddress(row, col)]: cell };
  return { ...sheet, cells };
}
```
- **Risk**: Large clipboard pastes become increasingly expensive because immutable copying scales with the number of pasted cells and the growing `cells` map. This is a direct user-triggered hot path from paste commands and context-menu paste.
- **Independent review outcome**: Keep as P2. The cost is real and user-triggered, but the available evidence does not justify a P1 classification.

### [Dimension15] Condition builder deep equality uses `JSON.stringify` inside a field subscription path
- **Files**:
  - `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:48-52`
  - `packages/flux-renderers-form-advanced/src/condition-builder/utils.ts:18-20`
  - `packages/flux-renderers-form/src/field-utils.tsx:75-80`
- **Severity**: P2
- **Category**: Performance
- **Rule**: P1
- **Current state**: Condition builder passes `groupValuesEqual` into `useFormFieldController`; that comparator serializes the entire condition tree when references differ.
- **Evidence**:
```ts
// packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:48-52
const { currentForm, value, handlers, presentation } = useFormFieldController(name, {
  disabled: props.meta.disabled,
  required: Boolean(props.props.required),
  areValuesEqual: groupValuesEqual,
});
```
```ts
// packages/flux-renderers-form-advanced/src/condition-builder/utils.ts:18-20
export function groupValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
```
- **Risk**: The comparator runs in a whole-form subscription path and can do full tree serialization during unrelated form-store updates. This is a measurable hot-path cost for larger condition trees.
- **Independent review outcome**: Keep.

### [Dimension15] Range drop metadata updates rebuild semantic maps one cell at a time through the public command path
- **Files**: `packages/report-designer-core/src/runtime/metadata.ts:92-115`, `packages/report-designer-core/src/runtime/metadata.ts:232-268`
- **Severity**: P3
- **Category**: Performance
- **Rule**: P2
- **Current state**: `applyFieldDrop(...)` handles `target.kind === 'range'` by iterating each cell and calling `updateMetadata(...)`, which repeatedly clones semantic subtrees.
- **Evidence**:
```ts
// packages/report-designer-core/src/runtime/metadata.ts:92-115
function buildNextSemanticWithAxisMeta(...) {
  const currentGroup = semantic?.[containerKey] ?? {};
  const currentSheetEntries = currentGroup[sheetId] ?? {};
  const nextSheetEntries = { ...currentSheetEntries };
  ...
  return {
    ...(semantic ?? {}),
    [containerKey]: {
      ...currentGroup,
      [sheetId]: nextSheetEntries,
    },
  };
}
```
```ts
// packages/report-designer-core/src/runtime/metadata.ts:249-267
let currentDocument = document;
for (let row = range.startRow; row <= range.endRow; row++) {
  for (let col = range.startCol; col <= range.endCol; col++) {
    const result = updateMetadata(currentDocument, cellTarget, mergeMetadata(getTargetMeta(currentDocument.semantic, cellTarget), patch));
    currentDocument = result.document;
    changed = changed || result.changed;
  }
}
```
- **Risk**: Large range updates pay repeated immutable-copy costs. This is not the default built-in canvas drag path today, but it remains exposed through the public command/bridge surface and can become expensive for range-based integrations.
- **Independent review outcome**: Keep only as a lower-priority performance risk, not a high-severity default-user-path defect.

### [Dimension15] `useCurrentFormState` remains a whole-store subscription for several field-level selectors
- **Files**:
  - `packages/flux-react/src/hooks.ts:225-241`
  - `packages/flux-renderers-form/src/field-utils.tsx:75-80`
  - `packages/flux-renderers-form/src/field-utils.tsx:368-390`
- **Severity**: P3
- **Category**: Performance
- **Rule**: P7
- **Current state**: Field-value and field-presentation helpers still wake from the whole form store instead of path-level value subscriptions.
- **Evidence**:
```ts
// packages/flux-react/src/hooks.ts:232-241
const subscribe = useMemo(
  () => (enabled ? form?.store.subscribe ?? (() => () => undefined) : () => () => undefined),
  [enabled, form]
);
...
return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
```
- **Risk**: Equality functions prevent many rerenders, but they do not prevent selector wake-ups and recomputation on unrelated form-store updates.
- **Independent review outcome**: Keep only as a downgraded P7 convergence gap because path-aware field-state hooks already exist and partially mitigate the broader architecture risk.

## Rechecked Non-Findings

- No `eval(` or `new Function(` hits were confirmed in `packages/**/src` or `apps/**/src` during this audit.
- The earlier `object-field` dual-state concern was downgraded out of this file because live code shows it functioning as an intentional transform-in/transform-out working-value layer rather than a confirmed correctness bug.
