# 维度 19：错误传播保真度

## 第 1 轮（初审）

初审发现 1 项，独立复核后保留。

## 维度复核结论

- [19-01]: 保留为 P1。request-backed action 跳过 action-layer retry。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                         |
| ----- | -------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| 19-01 | P1       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts` | request-backed soft failure 不走 action retry/计数 |
