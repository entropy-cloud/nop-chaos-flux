# 11 UI 组件使用合规性

## 复核结论

- 保留: 3
- 降级: 0
- 驳回: 0

## 保留

### snippet panel trigger 仍用原生 `<button>`

- 文件: `packages/flux-code-editor/src/extensions/snippet-panel.tsx`
- 结论: 保留，P2
- 依据: 文件已引入 `Button`，但 `PopoverTrigger` 仍包裹原生 `<button>`。

### CRUD toolbar page-size 控件仍用原生 `<label>`

- 文件: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`
- 结论: 保留，P2
- 依据: `@nop-chaos/ui` 已提供 `Label`，这里不属于浏览器能力控件或高性能宿主例外。

### report designer playground demo palette toggle 仍用原生 `<button>`

- 文件: `apps/playground/src/pages/report-designer-demo.tsx`
- 结论: 保留，P3
- 依据: demo shell 也应展示推荐模式。

## 合理例外

- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 中的原生 table / input / button 属高性能 grid host surface。
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx` 的 `input[type=file]` 属浏览器能力控件。
- `packages/word-editor-renderers/src/toolbar/font-controls.tsx` 的 `input[type=color]` 属浏览器能力控件。
