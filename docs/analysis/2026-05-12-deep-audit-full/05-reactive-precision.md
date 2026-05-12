# 维度 05：响应式订阅精度

## 第 1 轮（初审）

初审发现 4 项，独立复核后均保留，其中 1 项 P2、3 项 P3。

## 维度复核结论

- [05-01]: 保留为 P2。form field state 更新唤醒 scope 数据订阅。
- [05-02]: 保留为 P3。field scope fallback 缺 path subscription。
- [05-03]: 降级为 P3。surface host 粗粒度订阅成立但风险较低。
- [05-04]: 保留为 P3。code editor form 模式仍有 scope fallback 订阅。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                            | 一句话摘要                                 |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| 05-01 | P2       | `packages/flux-runtime/src/form-runtime.ts`                                     | field state 变更广播给 form scope 数据订阅 |
| 05-02 | P3       | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`               | scope fallback 缺 path 订阅                |
| 05-03 | P3       | `packages/flux-react/src/dialog-host.tsx`                                       | surface host 整 scope 订阅较粗             |
| 05-04 | P3       | `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` | form 模式下仍启用 scope fallback 订阅      |
