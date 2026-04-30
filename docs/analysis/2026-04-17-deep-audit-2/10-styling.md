# [维度10] 样式系统合规性 — 初审报告

## 发现清单

### P1 级发现（4 项）

#### [维度10-01] flow-designer-nodes.css BEM 残留

- **文件**: `apps/playground/src/flow-designer-nodes.css:11-212`
- 大量 `__` 元素类和 `--` 修饰符类，违反 styling-system.md
- **建议**: 迁移为 data-slot + data-\* 属性

#### [维度10-02] code editor CSS BEM 残留

- **文件**: `apps/playground/src/styles.css:426-442`
- nop-code-editor--fullscreen/has-toolbar 死代码 BEM 类
- **建议**: 删除，统一使用 data-\* 属性选择器

#### [维度10-03] DingFlow 组件硬编码 hex 颜色

- **文件**: flow-designer-renderers/src/dingflow/ 多个文件
- 约 10 处硬编码颜色，宿主无法覆盖
- **建议**: 迁移为 --fd-\* CSS 变量

#### [维度10-04] designer-inspector 硬编码 inline style 颜色

- **文件**: `packages/flow-designer-renderers/src/designer-inspector.tsx:8-23,64-79`
- 16 种节点类型颜色通过 inline style 注入
- **建议**: 注册为 CSS 变量

### P2 级发现（7 项）

- Marker class 携带隐式布局：designer-toolbar, report-designer-toolbar, designer-inspector/palette, form wrapper
- 硬编码颜色：code editor CSS, nop-gradient-\*/flow-designer-nodes

### P3 级发现（1 项）

- stack-_/hstack-_ 仅在 playground CSS 定义

## 合规项

- classAliases 实现正确 ✓
- 无 ThemeProvider ✓
- Tailwind @source 正确 ✓
- 核心渲染器 marker 纯净 ✓
