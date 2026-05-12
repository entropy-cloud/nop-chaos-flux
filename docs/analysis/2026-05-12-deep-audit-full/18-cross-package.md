# 维度 18：跨包模式一致性

## 第 1 轮（初审）

初审发现 1 项，独立复核后保留。

## 维度复核结论

- [18-01]: 保留为 P2。`designer-page` 声明 `$designer` scope export，但 live host projection 不发布 `$designer`。

## 最终保留项

| 编号  | 严重程度 | 文件                                             | 一句话摘要                       |
| ----- | -------- | ------------------------------------------------ | -------------------------------- |
| 18-01 | P2       | `packages/flow-designer-renderers/src/index.tsx` | domain host 读面 contract 不一致 |
