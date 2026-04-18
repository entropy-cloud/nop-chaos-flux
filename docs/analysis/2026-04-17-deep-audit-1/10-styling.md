# 维度10：样式系统合规性

- 审核日期：2026-04-17
- 初审发现：3
- 维度复核结论：保留 2，降级 1，补充 2

## 已通过独立复核

### [维度10-01] Flow Designer 节点模板仍大量依赖 BEM 内部类和 modifier

- 严重程度：P1
- 复核判定：保留
- 文件：`apps/playground/src/flow-designer-nodes.css`, `apps/playground/src/schemas/dingtalk-workflow-tree-schema.json`, `action-flow-tree-schema.json`

### [维度10-02] Spreadsheet outer shell 样式越过了 `ss-*` canvas 例外边界

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx`, `canvas-styles.css`, `docs/architecture/styling-system.md`

### [维度10-03] DingFlow 可复用视觉仍硬编码颜色/阴影/chrome

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/dingflow/DingFlowPlusButton.tsx`, `DingFlowAddConditionOverlay.tsx`, `DingFlowAddNodeMenu.tsx`, `DingFlowCanvasOverlay.tsx`

### [维度10-04] code editor expression 装饰仍以内联样式注入稳定视觉

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-code-editor/src/extensions/expression/decoration.ts`

## 降级项

### [维度10-D1] code editor 包级视觉样式仍依赖 playground CSS

- 复核判定：降级保留
- 文件：`packages/flux-code-editor/src/code-editor-renderer.tsx`, `apps/playground/src/styles.css`
- 原因：主问题成立；“BEM modifier 残留”应收窄为陈旧选择器，而非当前活跃实现。
