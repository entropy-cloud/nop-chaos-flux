# 维度 10：样式系统合规性 — 审计报告

## 第 1 轮（初审）

### [维度10-01] 电子表格 UI shell CSS 硬编码 RGB 颜色 (P1)

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:365,367,394,401,406`
- **现状**: find/replace 面板、cell editor、comment editor 中使用 `rgb(226, 232, 240)` 等
- **建议**: 替换为 `var(--nop-border)` 等 CSS 变量

### data-slot 选择器 63 处全部通过豁免检查

- 电子表格画布：styling-system.md 明确豁免
- default-spacing.css：@layer base 主题 CSS，作用域选择器
- code-editor-styles.css：widget 渲染器，允许 data-slot
- **零违规**

### 间距约定、主题独立性、Tailwind 集成均通过

- stack-_/hstack-_ 别名正确
- 无 ThemeProvider ✅
- @source 指令覆盖所有包 ✅
