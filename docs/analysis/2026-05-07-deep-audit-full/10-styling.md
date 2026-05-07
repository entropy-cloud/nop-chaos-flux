# 10 Styling

- 深挖轮次: 3
- 深挖发现数: 7
- 维度复核: 3 保留 / 3 降级 / 1 驳回
- 子项复核: 无

## 第 1 轮初审

- Tailwind v4 下保留未接线 `tailwind.config.ts` / `tailwind-safelist.txt`
- spreadsheet canvas 辅助 class 双命名未收口

## 深挖第 2 轮追加

- `flux-code-editor/src/code-editor-styles.css` 大量硬编码颜色
- `spreadsheet-renderers/src/canvas-styles.css` 大量硬编码颜色

## 深挖第 3 轮追加

- `container` / `flex` renderer 在代码里写布局类
- `flow-designer-renderers/src/designer-theme.css` 硬编码梯度未令牌化
- `report-field-panel.css` 在 `var(..., literal)` fallback 中散落默认色

## 维度复核结论

保留:

- `flux-code-editor` 大量硬编码色值
- `spreadsheet-renderers` 大量硬编码色值
- `flow-designer` 主题梯度未令牌化

降级:

- Tailwind v4 旧 config/safelist 认知负债
- spreadsheet 双命名未收口
- report field panel fallback 散落

驳回:

- `container` / `flex` “硬编码布局类” 作为整体问题不成立

## 最终保留项

### [维度10] `flux-code-editor` 与 `spreadsheet-renderers` 仍保留大量未令牌化的包级色值

- **文件**: `packages/flux-code-editor/src/code-editor-styles.css`, `packages/spreadsheet-renderers/src/canvas-styles.css`
- **严重程度**: P2
- **现状**: toolbar/header/panel/sheet tab/selection 等包拥有视觉仍大量直接写 `#hex` / `rgb` / `rgba`
- **风险**: host theme 很难统一接管这些可复用视觉壳层
- **建议**: 将静态视觉迁移到 `--nop-*` / `--fd-*` / 局部 token，再让规则消费 token
- **复核状态**: 维度复核通过

### [维度10] `flow-designer` 主题梯度仍未先提升为稳定 token

- **文件**: `packages/flow-designer-renderers/src/designer-theme.css`
- **严重程度**: P2
- **现状**: palette appearance 仍直接写死多组渐变
- **风险**: host theme 无法稳定覆盖设计器配色层级
- **建议**: 先建 token，再由 palette 规则消费
- **复核状态**: 维度复核通过
