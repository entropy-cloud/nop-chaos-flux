# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

### P2 发现（2 个）

1. Code Editor ToolbarButton 使用 `<span role="button">` 代替 `<Button>`（flux-code-editor）
2. WrappedFieldAction 使用 `<span role="button">` 代替 `<Button>`（flux-renderers-form-advanced）

### 合理例外（不报告为违规）

- Spreadsheet grid: 原生 table/thead/tbody/tr/td/th（高性能宿主表面）
- Spreadsheet 单元格编辑: 原生 input[type=text]（高性能宿主表面）
- Spreadsheet 行头按钮: 原生 button（grid 内部结构）
- Word Editor 颜色选择器: input[type=color]（无等价 UI 组件）
- Word Editor 文件上传: input[type=file]（无等价 UI 组件）

### 依赖检查通过

只有 @nop-chaos/ui 直接依赖 radix-ui，所有其他包通过 ui 间接使用。
