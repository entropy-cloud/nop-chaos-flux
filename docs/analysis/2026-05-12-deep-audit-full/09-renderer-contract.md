# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

初审发现 4 项，独立复核后均保留，其中 1 项 P2、3 项 P3。

## 维度复核结论

- [09-01]: 降级为 P3。flex semantic props 与 marker-only 口径存在张力。
- [09-02]: 保留为 P2。tree repeated region 缺 `instancePath`。
- [09-03]: 降级为 P3。tabs semantic event payload 一致性不足。
- [09-04]: 降级为 P3。CRUD refresh event payload 一致性不足。

## 最终保留项

| 编号  | 严重程度 | 文件                                                 | 一句话摘要                                  |
| ----- | -------- | ---------------------------------------------------- | ------------------------------------------- |
| 09-01 | P3       | `packages/flux-renderers-basic/src/flex.tsx`         | flex semantic props 与 marker-only 口径张力 |
| 09-02 | P2       | `packages/flux-renderers-data/src/tree-renderer.tsx` | tree repeated region 缺 `instancePath`      |
| 09-03 | P3       | `packages/flux-renderers-basic/src/tabs.tsx`         | tabs event payload 缺语义对象               |
| 09-04 | P3       | `packages/flux-renderers-data/src/crud-renderer.tsx` | CRUD refresh event payload 缺语义对象       |
