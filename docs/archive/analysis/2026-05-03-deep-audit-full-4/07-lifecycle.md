# 维度07 生命周期与副作用归属

- 初审发现数: 2
- 复核结果: 保留 2 / 降级 0 / 驳回 0

### [维度07] declarative surface 的 `statusPath` cleanup 语义不安全

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:81-97`
- **证据片段**:

```ts
return () => {
  publishOwnerStatus(ownerScope, statusPath, { open: false, active: false, ... });
};
```

- **严重程度**: P2
- **effect 职责**: surface status publication
- **应归属层级**: 更理想地收口到 runtime owner；当前若由 React 发布，也应使用 cleanup-safe helper。
- **现状**: 卸载时写 closed summary，而不是写 `undefined` 清除摘要。
- **风险**: 父 scope 可能长期保留“已关闭但仍存在”的陈旧 surface 状态。
- **建议**: 复用 `flux-react/src/status-path.ts` 的清理语义，或让 declarative surface 统一收口到 runtime owner。
- **为什么值得现在做**: 已与已落地的 cleanup-safe 发布 helper 出现双轨语义。
- **误报排除**: 这不是普通 DOM effect，而是 owner summary 发布。
- **历史模式对应**: stale summary publication。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度07] source prop 执行与异步治理仍滞留在 React 层

- **文件**: `packages/flux-react/src/use-node-source-props.ts:21-54`, `packages/flux-react/src/node-source-prop-controller.ts:53-175`, `packages/flux-react/src/node-renderer.tsx`
- **证据片段**:

```ts
controller.run(...)
runtime.executeSource(...)
const abortController = new AbortController()
```

- **严重程度**: P1
- **effect 职责**: source 执行、取消、loading/error/ready 过渡态治理
- **应归属层级**: `flux-runtime` async-data owner
- **现状**: `NodeRenderer` 通用路径上的 source prop 仍由 React controller 承担执行与治理。
- **风险**: source 语义分裂成 runtime-owned `data-source/reaction` 与 react-owned prop source 两套 owner 模型。
- **建议**: 将 source-prop controller 下沉到 runtime，React 只做声明式连接和订阅。
- **为什么值得现在做**: 这是通用渲染热路径，不是边缘 helper。
- **误报排除**: 不是在否定普通 host effect；这里已经承担了完整异步 owner 语义。
- **历史模式对应**: runtime concern trapped in React hook.
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/api-data-source.md`
- **复核状态**: `维度复核通过`

## 已降级

- `packages/flux-react/src/use-source-value.ts`: 同样归属不理想，但当前 live 使用面较低，暂列观察项。
