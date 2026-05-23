# 维度09：渲染器契约合规性

- 审核日期：2026-04-17
- 初审发现：3
- 维度复核结论：保留 3，补充 1

## 已通过独立复核

### [维度09-01] 多处 `wrap: true` field renderer 在 `frameWrap: none` 时失去 root/meta 契约

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, `tag-list.tsx`, `key-value.tsx`, `array-editor.tsx`, `composite-field/array-field.tsx`, `object-field.tsx`, `condition-builder/ConditionBuilder.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`

### [维度09-02] `DetailFieldRenderer` 返回 fragment，关闭 wrapper 后没有单一 root

- 严重程度：P1
- 复核判定：保留
- 没有wrapper就放弃所有hint，error等特性，只返回内部body
- 文件：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`

### [维度09-03] input family 仍残留 `nop-*-wrapper` 内部 marker

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-form/src/renderers/input.tsx`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`

### [维度09-04] `detail-field` 默认路径下重复输出 `data-slot="field-control"`

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
