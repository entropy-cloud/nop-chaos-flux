# 维度 10：样式系统合规性

- 初审发现：7
- 维度复核：完成
- 子项复核：建议继续围绕 Flow Designer 主题/gradient fallback、Spreadsheet CSS inventory 继续展开

## 保留

1. [维度复核通过] 多个 widget/host renderer 根节点未合并 `props.meta.className`，尤其是 `flux-code-editor`、`flow-designer-renderers`、`spreadsheet-renderers`、`designer-field`。
2. [维度复核通过] code-editor 的包级样式仍放在 `apps/playground/src/styles.css`，脱离 playground 会丢包级视觉。
3. [维度复核通过] Flow Designer palette 依赖 playground 私有 `nop-gradient-*` 动态类，且覆盖不完整。
4. [维度复核通过] Flow Designer 根节点未挂 `.nop-theme-root`，且 `--fd-*` 默认值直接绑 `--primary`。
5. [维度复核通过] Spreadsheet header active CSS 规则与 live DOM 不一致。

## 降级

1. [已降级] code-editor 的 BEM modifier 问题更准确地说是 playground 里残留 dead CSS，而不是 live DOM 与 `data-*` 并存。
2. [已降级] playground 里的旧 Flow Designer BEM CSS 更像示例/遗留资产债务，不是 package renderer 主路径违规。

## 复核摘要

- 保留：5
- 降级：2
- 驳回：0
