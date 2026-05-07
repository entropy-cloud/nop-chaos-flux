# 维度 20: 可访问性 (WCAG)

## 深挖轮次

- 第 1 轮: WrappedFieldAction/table row/pagination/ArrayEditor/KeyValue/TreeRenderer。
- 第 2 轮: form wrappers, checkbox group, input-number, condition-builder, tree-controls, chart, loading status。
- 第 3 轮: CodeEditor toolbar, spreadsheet headers/tabs/find labels, flow inspector, debugger JSON toggles。
- 第 4 轮: carousel unnamed region, word toolbar/dialog labels, spreadsheet grid role hierarchy。
- 第 5 轮: report designer drag-only workflow。

## 维度复核结论

### P1 保留

| 条目                                                                       | 证据/说明                                                                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| table row `onRowClick` mouse-only                                          | `table-body-row-rendering.tsx` row has onClick without keyboard; expand button itself exists so claim narrowed |
| TreeRenderer/tree-controls incomplete tree keyboard model                  | exposes `role=tree/treeitem` but lacks roving focus/arrow/Home/End model                                       |
| condition-builder selected Badge delete mouse-only; between inputs unnamed | `condition-builder/value-input.tsx`                                                                            |
| chart `onClick` no keyboard/name                                           | `chart-renderer.tsx` clickable div lacks role/tabIndex/onKeyDown/name                                          |
| spreadsheet corner/column headers mouse-only                               | `spreadsheet-grid.tsx` clickable `<th>` lacks keyboard; row header button exists                               |
| flow inspector branch card clickable div                                   | `designer-inspector.tsx` branch card lacks role/tabIndex/key handling                                          |
| word editor dialog form controls lack programmatic labels                  | icon button claim narrowed; dialog Labels/input ids remain                                                     |
| report designer drag/drop field workflow has no keyboard alternative       | field panel draggable items + canvas drop only                                                                 |

### 保留 P2/P3

- pagination select lacks associated label。
- ArrayEditor/KeyValue sub-input errors lack `aria-describedby/errormessage`。
- checkbox-group source error lacks live/association。
- table loading status lacks text when no loadingContent。
- spreadsheet find/cell labels and debugger JSON toggles need semantic labels/buttons。
- carousel region lacks accessible name。

### 驳回 / 校正

- WrappedFieldAction and CodeEditor toolbar “no keyboard” rejected: live code has role, tabIndex, Enter/Space handling。
- form wrapper aria-to-wrapper claim rejected: FieldFrame attempts child clone aria injection。
- input-number stepper tabIndex rejected as a11y blocker: input supports ArrowUp/Down; raw button is handled by维度11。

## 子项复核

Accessibility P1 batch confirmed B, C, D, E, F, H成立; A and G narrowed but retained as partial P1。

## 最终保留项

- Prioritize keyboard alternatives for row/cell/chart/tree/drag workflows and programmatic labels for complex editor dialogs。
