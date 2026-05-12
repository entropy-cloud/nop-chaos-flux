# 维度 20：可访问性 (WCAG)

## 第 1 轮（初审）

初审发现 7 项，独立复核后均保留。

## 维度复核结论

- [20-01]: 保留为 P2。FieldFrame label 未关联复合控件。
- [20-02]: 保留为 P2。Select/RadioGroup errors 未稳定关联 focus target。
- [20-03]: 保留为 P2。submit validation failure 无 first-error focus。
- [20-04]: 保留为 P2。condition-builder AND/OR 无 selected state ARIA。
- [20-05]: 保留为 P2。删除子组按钮缺 `aria-label`。
- [20-06]: 保留为 P2。interactive table row 缺 role/name/state。
- [20-07]: 保留为 P2。chart 缺数据文本替代。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                              | 一句话摘要                 |
| ----- | -------- | --------------------------------------------------------------------------------- | -------------------------- |
| 20-01 | P2       | `packages/flux-react/src/field-frame.tsx`                                         | 复合控件 label 关联缺失    |
| 20-02 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx`                            | 错误说明未稳定关联焦点控件 |
| 20-03 | P2       | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                           | 提交失败无首错聚焦         |
| 20-04 | P2       | `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` | AND/OR 状态缺 ARIA         |
| 20-05 | P2       | `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` | 删除子组按钮缺语义名称     |
| 20-06 | P2       | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`    | 可交互表格行缺语义状态     |
| 20-07 | P2       | `packages/flux-renderers-data/src/chart-renderer.tsx`                             | 图表缺文本替代             |
