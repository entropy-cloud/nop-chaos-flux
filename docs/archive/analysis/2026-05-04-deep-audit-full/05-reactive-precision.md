# 维度 05：响应式订阅精度

- 初审发现：2
- 维度复核：完成
- 子项复核：1

## 保留

1. [子项复核通过] `report-designer-renderers` 的 inspector / field panel / inspector shell / toolbar 直接 `useOwnScopeSelector((data) => data)` 订阅整份 host projection，实际只使用少量字段。
   文件：`packages/report-designer-renderers/src/report-designer-inspector.tsx:8-12`、`packages/report-designer-renderers/src/field-panel-renderer.tsx:13-26`、`packages/report-designer-renderers/src/inspector-shell-renderer.tsx:17-24`、`packages/report-designer-renderers/src/report-designer-toolbar.tsx:15-24`
   相关调用链：`packages/report-designer-renderers/src/host-data.ts:153-204`、`packages/flux-react/src/workbench/hooks.ts:47-89`
   严重程度：P2

## 降级

1. [已降级] 若干 advanced/composite form control 在 form path 之外仍额外保留 fallback scope 订阅。
   文件：`packages/flux-renderers-form-advanced/src/key-value.tsx:210-233`、`array-editor.tsx:160-177`、`variant-field.tsx:96-102`、`detail-view/detail-field.tsx:54-63`
   说明：这是局部性能噪音，不应再表述成基础表单层面的通用 P7 缺陷。

## 复核摘要

- `useCurrentFormFieldState` / `subscribeToPath` 路径未发现新的 P7 硬违规。
- 维度 05 的最终主问题集中在 report-designer workbench host projection 的宽订阅。
