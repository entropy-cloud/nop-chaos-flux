# 维度 10：样式系统合规性

## 第 1 轮（初审）

### P2 发现（2 个）

1. flow-designer-canvas fallback 颜色 #3296fa 与项目色系不一致（仅 fallback 触发时可见）
2. flow-designer-inspector 标记类与布局类混合表达（功能正确，表达不清晰）

### P3 观察项（9 个）

1. nop-debugger 面板 inline style 布局
2. spreadsheet canvas CSS 硬编码颜色值（架构认可的 hybrid 策略）
3. chart-renderer inline style 布局
4. flow-designer-palette 硬编码 shadow rgba
5. crud-renderer Tailwind 布局类（合规，Calibration Pattern 8）
6. nop-debugger JS 注入 CSS 而非 CSS 文件（架构取舍）
7. tree-renderer inline style 缩进（合规，动态几何值）
8. tree-controls inline style 缩进（合规）
9. word-editor 大量 var(--nop-\*) 任意值 Tailwind 类（设计决策）

### 正面发现

- Layout renderers 零隐式样式
- Widget renderers 合规使用内部布局
- BEM 残留为零
- ThemeProvider 零依赖
- classAliases 实现正确
- Tailwind @source 覆盖正确
