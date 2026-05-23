# 维度 07：生命周期与副作用归属

## 初审概览

- 初审候选：2
- 维度复核：1 条降级，1 条驳回

## 条目复核

### [降级] `useSourceValue()` 仍在 React effect 中持有匿名 source 生命周期

- **关键文件**: `packages/flux-react/src/useSourceValue.ts:21`, `packages/flux-react/src/node-source-prop-controller.ts:45`, `packages/flux-react/src/use-node-source-props.ts:21`
- **说明**: 与 owner 文档仍有偏差，但已不是主路径实现，更像残留过渡逻辑。

### [驳回] `dialog-host.tsx` 在 effect 中重复发布 surface status

- **关键文件**: `packages/flux-react/src/dialog-host.tsx:25-148`, `packages/flux-runtime/src/surface-runtime.ts:22-49`
- **说明**: 当前 live code 中 status 发布已收敛到 runtime，初审线索对应的是旧状态。
