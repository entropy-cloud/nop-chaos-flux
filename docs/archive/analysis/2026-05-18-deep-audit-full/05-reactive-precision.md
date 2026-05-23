# 维度 05：响应式订阅精度

## 第 1 轮（初审）

未发现需报告问题。

已检查文档：

- `docs/index.md`
- `AGENTS.md`
- `docs/references/audit-tooling.md`
- `docs/references/deep-audit-calibration-patterns.md`
- `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/renderer-runtime.md`

已检查关键代码：

- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-basic/src/scope-debug.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/hook-subscriptions.ts`
- `packages/flux-react/src/node-renderer-resolved.tsx`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-core/src/types/scope.ts`

检查范围说明：

- `render-nodes.tsx:336` 是 `useLayoutEffect` 内的 snapshot sync，不是 render-phase reactive read，也不是 stale subscription 缺陷。
- `detail-field.tsx:146` 与 `detail-view.tsx:231` 属于事件或异步时机的回滚与提交读取；真正的 render-time 读取已通过 path-scoped `useCurrentFormState(..., { path })` 或 `useScopeSelector(..., { paths })` 收窄。
- `scope-debug.tsx:54` 是明确的调试 renderer 全 scope 订阅，不属于热路径订阅精度问题。

结论：本轮未确认真实的热路径过宽订阅、失准 selector、或 stale subscription 问题。

## 维度复核结论

- 结论: 保持零发现。
- 理由: 复核 `packages/flux-react/src/hooks.ts`、`packages/flux-react/src/hook-subscriptions.ts`、`packages/flux-react/src/node-renderer-resolved.tsx`、`packages/flux-react/src/render-nodes.tsx`、`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`、`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`、`packages/flux-renderers-basic/src/scope-debug.tsx`、`packages/flux-runtime/src/scope.ts` 后，确认当前可疑点分别属于显式 path 订阅、`useLayoutEffect` 内 fragment snapshot sync、事件或异步阶段读取、或调试专用全量订阅；未见真实的热路径过宽订阅、stale subscription、或 render-phase 响应式读取缺陷。

## 子项复核结论

- 无。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要 |
| ---- | -------- | ---- | ---------- |
