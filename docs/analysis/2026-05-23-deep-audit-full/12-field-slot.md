# 维度 12: 表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] `variant-field-view.tsx` 的本地 `FieldFrame` 使用需要复核是否绕过 field metadata / wrapper owner 路径

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:183-217`
- **证据片段**:

  ```tsx
  const remark =
    typeof schemaProps.remark === 'object' && schemaProps.remark !== null
      ? toFieldRemarkProps(schemaProps.remark)
      : undefined;

  return (
    <FieldFrame
      label={schemaProps.label as React.ReactNode}
  ```

- **严重程度**: P2
- **现状**: scanner 从 field-slot / fieldframe-bypass 角度把它标成 candidate，因为 renderer 直接消费 chrome props 并实例化 `FieldFrame`。
- **风险**: 若该路径绕过了统一 wrapper 语义，可能导致 field metadata、hint/description/remark 渠道与普通 wrapped field 分叉。
- **建议**: 必须按 `field-frame.md` 的例外规则和 `field-metadata-slot-modeling.md` 的 normalized channel 重新裁定，而不是机械保留。
- **为什么值得现在做**: 该路径同时影响维度 09/12，是典型需要用 owner docs 驳回或保留的高频误报模式。
- **误报排除**: 先不把 direct `FieldFrame` 当成事实缺陷；这一步只是记录候选并准备复核。
- **历史模式对应**: calibration pattern 9 与 reopened adjudication 中的 wrapper contract reopen 风险。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`；`docs/architecture/field-frame.md`；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度12-01]: 驳回。当前实现仍通过 normalized `schemaProps` / `meta` 构造 field chrome，且 `field-frame.md` 已明确允许这种 `rootTag="div"` 例外；未发现 value-or-region / event / slot 分类被错误旁路的额外证据。

## 子项复核结论

- [维度12-01]: 批量复核驳回。该命中不足以证明 field metadata 契约违约。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度经复核未发现需报告问题 |
