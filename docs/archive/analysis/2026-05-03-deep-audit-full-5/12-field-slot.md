# 12 表单字段与 Slot 建模

- 初审发现数: 5
- 维度复核: 完成
- 子项复核: 1
- 最终结果: 保留 1 / 降级 0 / 驳回 4

## 保留

### [维度12] code editor fullscreen header 把 `label` 的 region 内容错误字符串化

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:74-75,190-192`
- **证据片段**:
  ```tsx
  const labelContent = resolveRendererSlotContent(props, 'label');
  <span data-slot="code-editor-header-title">{String(labelContent ?? '')}</span>;
  ```
- **严重程度**: P2
- **违规类别**: slot / value-or-region
- **现状**: `label` 已按 `value-or-region` 建模，`resolveRendererSlotContent()` 返回 `ReactNode`，但 fullscreen header 仍把结果强制 `String(...)`。
- **建议**: 直接渲染 `labelContent`，或仅对 `string/number` 走文本化。
- **为什么值得现在做**: 这是当前 live renderer 对 value-or-region 契约的直接破坏。
- **误报排除**: 复核明确排除了 `transformInAction/transformOutAction/validateValueAction` 这类 owner semantic action slot 误报；真正留下的是 `label` region 被字符串化的明确 bug。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/components/code-editor/design.md`
- **复核状态**: 维度复核通过

## 已驳回

- `object-field` 的 `transformInAction/transformOutAction` 作为 `prop` 建模: **已驳回**
- `detail-view` 的 staged action 字段作为 `prop` 建模: **已驳回**
- `detail-field` 的 staged action 字段作为 `prop` 建模: **已驳回**
- `variant-field` 的 detect/transform/validate action 字段整体作为问题: **已驳回原表述**
  - 复核认为 `detectVariantAction` 属于当前有意设计的 semantic action slot；若后续要审 `variant-field` 的 field-level pipeline 是否未接线，应另起子项。
