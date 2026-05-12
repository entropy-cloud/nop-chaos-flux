# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

初审发现 5 项，独立复核后保留 4 项、驳回 1 项。

## 维度复核结论

- [07-01]: 降级为 P3。source observer 生命周期边界偏 React。
- [07-02]: 驳回。`useSourceValue` 与当前 observer design 一致。
- [07-03]: 保留为 P3。request runtime parent signal listener settle 后未移除。
- [07-04]: 保留为 P2。ActionScope 缺 scope-level namespace cleanup。
- [07-05]: 保留为 P1。`RenderNodes` render/useMemo 阶段写 fragment scope cache。

## 最终保留项

| 编号  | 严重程度 | 文件                                                      | 一句话摘要                                   |
| ----- | -------- | --------------------------------------------------------- | -------------------------------------------- |
| 07-01 | P3       | `packages/flux-react/src/use-node-source-props.ts`        | anonymous source lifecycle 边界偏 React      |
| 07-03 | P3       | `packages/flux-runtime/src/async-data/request-runtime.ts` | parent AbortSignal listener 请求完成后不移除 |
| 07-04 | P2       | `packages/flux-runtime/src/action-scope.ts`               | ActionScope 缺 scope-level dispose           |
| 07-05 | P1       | `packages/flux-react/src/render-nodes.tsx`                | render 阶段写 fragment scope cache           |
