# 维度 05: 响应式订阅精度

## 第 1 轮（初审）— 零发现

核对了 `pnpm check:audit-reactive-render-reads` 输出的全量 suspect 以及 `useScopeSelector`/`useSyncExternalStore`/`NodeRenderer`/`RenderNodes` 热路径。

### 已复核的 suspect

- `packages/flux-react/src/render-nodes.tsx:344` — `scope.readOwn()` 在 `useLayoutEffect` 中而非 render-phase，不是 reactive read。
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx:56` — `useScopeSelector` 未显式传 `paths`，但这里消费的是稳定标量 `loadActionKey`，且缺少热路径 + 可静态收窄 + 已证实不必要重渲染三项证据。
- 其余 test-support 命中不影响 live path。

### 结论

未发现需报告的过宽订阅、selector 引用不稳定、不必要重渲染问题。

## 维度复核结论

独立复核 agent 已重新验证：

- 审计脚本 8 条 suspect 全量独立审查，均无 actionable 问题
- `useSyncExternalStore`/`useScopeSelector` 引用稳定性已逐层验证
- `NodeRendererResolved` 和 `RenderNodes` 订阅模式正确
- 所有 per-field form hook 均符合 P7 per-path subscription 要求
- `useScopeSelector` 无 paths 的生产级用法仅一处 (dynamic-renderer.tsx)，因选择器产稳定标量、非热路径而可接受

零发现复核通过。

## 最终保留项

无。
