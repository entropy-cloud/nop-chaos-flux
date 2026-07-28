# Dimension 11: UI Component Usage Compliance

## 第 1 轮（初审）

### [D11-01] kanban-column-header 拖拽句柄使用 `<div role="button">` 而非 `<Button>`

- **文件**: packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:111-121
- **严重程度**: P1
- **原生元素**: `<div role="button">`（拖拽句柄图标按钮）
- **应替换为**: `<Button variant="ghost" size="sm">`
- **所在层**: 渲染器
- **替换可行性**: 高 — 同一文件中已导入并使用 `<Button>`（第 129 行用于折叠/展开切换）。
- **现状**: 拖拽句柄是手动 `div[role="button"]`，手工处理 `tabIndex`、`onKeyDown`、focus 样式，重复了 Button 已有的功能。
- **建议**: 替换为 `<Button variant="ghost" size="sm">` 以获得内置键盘导航、focus ring 和一致样式。
- **误报排除**: 校准模式#3 要求更强证据——这项满足，因为同一组件已有 Button 导入但此句柄未使用，造成真实的组件内一致性违规。

### [D11-02] diff-demo 页面使用原生 `<label>`、`<select>`、`<input type="checkbox">`

- **文件**: apps/playground/src/pages/diff-demo.tsx:180-218
- **严重程度**: P2
- **原生元素**: `<label>`、`<select>` + `<option>`、`<input type="checkbox">`
- **应替换为**: `<Label>`、`<NativeSelect>`、`<Checkbox>`
- **所在层**: 其他（playground）
- **替换可行性**: 中 — 页面仅导入 `{ Button }` 从 `@nop-chaos/ui`，需添加导入。
- **现状**: 演示页面使用原生 HTML 配置控件。
- **建议**: 使用 `@nop-chaos/ui` 组件提供一致样式。

### [D11-03] env-stream-demo 页面使用原生 `<label>`

- **文件**: apps/playground/src/pages/env-stream-demo.tsx:141, 157
- **严重程度**: P2
- **原生元素**: `<label>`
- **应替换为**: `<Label>`
- **所在层**: 其他（playground）
- **替换可行性**: 高 — 文件已从 `@nop-chaos/ui` 导入多项（`NativeSelect`、`Button`、`Card` 等）。
- **现状**: 已使用 NativeSelect 但关联的 label 仍用原生 `<label>`。
- **建议**: 将 `<label>` 替换为 `<Label>`。

### [D11-04] event-prevention-demo 页面使用原生 `<label>` + `<input type="checkbox">`

- **文件**: apps/playground/src/pages/event-prevention-demo.tsx:72-83
- **严重程度**: P2
- **原生元素**: `<label>` + `<input type="checkbox">`（在 `Toggle` 组件中）
- **应替换为**: `<Label>` + `<Checkbox>`
- **所在层**: 其他（playground）
- **替换可行性**: 中 — 需调整 onChange handler 以匹配 `<Checkbox>` 的 `onCheckedChange` API。
- **现状**: 本地辅助组件使用原生元素进行演示标志切换。
- **建议**: 替换为 `<Label>` + `<Checkbox>`。注意同文件中渲染器定义的有意原生 HTML 使用（第 9-56 行用于演示事件预防行为）不在此发现范围。

## 维度复核结论

- [D11-01]: 保留 P1。渲染器组件中同文件不一致——Button 已导入但拖拽句柄仍用 div[role=button]。
- [D11-02]: 保留 P2。Playground 页面，非渲染器层。
- [D11-03]: 保留 P2。Playground 页面，非渲染器层。
- [D11-04]: 保留 P2。Playground 页面，非渲染器层。

## 最终保留项

| 编号  | 严重程度 | 文件                                                        | 一句话摘要                                               |
| ----- | -------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| 11-01 | P1       | `scheduling/src/kanban/kanban-column-header.tsx:111-121`    | 拖拽句柄用 `<div role="button">` 而非已导入的 `<Button>` |
| 11-02 | P2       | `apps/playground/src/pages/diff-demo.tsx:180-218`           | 原生 label/select/checkbox                               |
| 11-03 | P2       | `apps/playground/src/pages/env-stream-demo.tsx:141-157`     | 原生 label 已使用 NativeSelect                           |
| 11-04 | P2       | `apps/playground/src/pages/event-prevention-demo.tsx:72-83` | 原生 label+checkbox 在 Toggle 组件中                     |
