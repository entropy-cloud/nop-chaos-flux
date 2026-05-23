# 维度 11：UI 组件使用合规性

## 复核状态：零违规确认

### 审查范围

- flux-renderers-\*/src/
- flow-designer-\*/src/
- spreadsheet-\*/src/
- report-designer-\*/src/
- word-editor-\*/src/

### 排除项（全部合理）

| 位置                                                  | 元素             | 排除原因        |
| ----------------------------------------------------- | ---------------- | --------------- |
| spreadsheet-renderers/src/spreadsheet-grid.tsx        | table/tr/td/th   | 高性能宿主表面  |
| word-editor-renderers/src/toolbar/insert-controls.tsx | input[type=file] | 浏览器原生能力  |
| flux-renderers-data/src/table-body-rows.tsx           | tr aria-hidden   | 虚拟滚动 spacer |

### 结论

当前审计范围内不存在需要替换为 @nop-chaos/ui 组件的原生 HTML 违规。
