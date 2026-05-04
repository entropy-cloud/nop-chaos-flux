# 维度 10：样式系统合规性

- 初审发现：6
- 维度复核：完成
- 子项复核：2

## 保留

1. [子项复核通过] `report-field-panel.css` 仍使用固定 palette 值，而不是 theme-compatible token / CSS variable。
   文件：`packages/report-designer-renderers/src/report-field-panel.css:20-24,38-69`
   对照：`docs/architecture/theme-compatibility.md:190-197,239-251`
   严重程度：P2

2. [子项复核通过] 实际注册的 `report-field-panel` renderer 路径没有导入其 package CSS，只有 standalone `ReportFieldPanel` 组件路径会加载 `report-field-panel.css`。
   文件：`packages/report-designer-renderers/src/renderers.tsx:25-29`、`packages/report-designer-renderers/src/field-panel-renderer.tsx:1-81`、`packages/report-designer-renderers/src/report-field-panel.tsx:1`
   相关测试：`packages/report-designer-renderers/src/field-panel-renderer.test.tsx:9-10`
   严重程度：P2

## 降级

1. [已降级] `flux-code-editor` 内部 CSS 仍有字面量颜色，但它是 widget-owned self-styled control，当前更像 theme 收敛项。
2. [已降级] playground flow-designer 示例仍有 `__` / `--` BEM 样式残留，但主要发生在示例/演示层。

## 驳回

1. [已驳回] report/flow designer marker 命名差异不足以证明当前 selector contract 已损坏。
