# 维度 09：渲染器契约合规性

- 初审发现：8
- 维度复核：完成
- 子项复核：建议继续围绕 code-editor、host root meta、region handle 统一入口展开

## 保留

1. [维度复核通过] `flux-code-editor/use-code-editor-binding.ts` 仍在 render 路径直接读取 store/scope。
2. [维度复核通过] code-editor 的事件 payload 与根节点 `meta.className` / `data-cid` 传递不完整。
3. [维度复核通过] `dialog.tsx` / `drawer.tsx` 的 open/close 事件缺少语义 payload。
4. [维度复核通过] 多个 host renderer 未完整透传 root `meta.className` / `data-testid` / `data-cid`。
5. [维度复核通过] `word-editor-page` 仍在 render 路径直接读取 dataset store。
6. [维度复核通过] `report-designer-page` 的根 marker 与组件文档不一致，且与子组件 marker 混用。

## 降级

1. [已降级] 多个 host renderer 直接 `helpers.render(region.templateNode)` 绕过 `region.render()`，目前更像偏离推荐契约，而非已证实功能错误。
2. [已降级] `report-designer-renderers` 使用 `joinClassNames` 而非 `cn()`，属于局部规范问题。

## 驳回

1. [已驳回] `crud-renderer.tsx` 内部 `nop-crud-query/nop-crud-toolbar/nop-crud-table`。组件文档当前仍明确保留这些结构 marker。

## 复核摘要

- 保留：6
- 降级：2
- 驳回：1
