# 维度07：生命周期与副作用归属

- 审核日期：2026-04-17
- 初审发现：2
- 维度复核结论：保留 1，驳回 1，补充 1

## 已通过独立复核

### [维度07-01] `DialogView/DrawerView` 重复发布 surface status，且写入错误 scope

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-react/src/dialog-host.tsx`, `packages/flux-runtime/src/surface-runtime.ts`, `docs/architecture/surface-owner.md`

### [维度07-02] surface 关闭后未清理 `statusPath` 摘要

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/dialog-host.tsx`, `docs/architecture/surface-owner.md`

## 复核后排除

### [维度07-X1] `DynamicRenderer` 把 runtime 逻辑误放到 React effect

- 复核判定：驳回
- 原因：更准确地说这是异步取消/竞态问题，不足以单列为生命周期归属错误。
