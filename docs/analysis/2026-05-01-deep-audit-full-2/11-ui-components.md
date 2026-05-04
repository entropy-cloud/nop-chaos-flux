# 维度 11：UI 组件使用合规性（初审）

## 发现

### [维度11-F1] snippet-panel.tsx 原生 button (P2)

- **文件**: `packages/flux-code-editor/src/extensions/snippet-panel.tsx:25-32`
- **现状**: PopoverTrigger render prop 使用原生 `<button>`，同文件38行已用 `<Button>`
- **替换可行性**: 中（可能受 shadcn render prop 限制）

### [维度11-F2] crud-renderer-toolbar.tsx 原生 label (P2)

- **文件**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:84`
- **现状**: `<label>` 包裹 "Rows per page"，应使用 `<Label>`
- **替换可行性**: 高

## 已排除

- input[type=color] (word-editor): 浏览器原生控件 ✓
- spreadsheet-grid 原生 table/input/button: 高性能宿主表面 ✓
- ui 包内部 button: ui 包内部实现 ✓

## 复核状态: 未复核
