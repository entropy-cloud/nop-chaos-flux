# 维度 07：生命周期与副作用归属

## 审核范围

检查所有 useEffect/useLayoutEffect 的职责分类、层级归属、依赖项正确性。

## 发现清单

### [维度07] dialog/drawer status 发布 — React 层比 runtime 层更完整

- **文件**: `packages/flux-react/src/surface/dialog-host.tsx`, `packages/flux-react/src/surface/drawer-host.tsx`
- **严重程度**: P2
- **现状**: React 层（dialog-host/drawer-host）通过 useEffect 发布了完整的 `active` 状态到 SurfaceRuntime，但 SurfaceRuntime 自身只有部分状态发布实现。DesignerRuntime、SpreadsheetRuntime、FormRuntime 等 runtime owner 尚未实现自己的状态发布。
- **effect 职责**: 在组件 mount/unmount 时发布 surface 活跃状态
- **应归属层级**: 理想情况下应由 runtime owner 发布自身状态，但在 runtime owner 未实现之前，React 层发布是当前最完整的方案。
- **现状**: 两种层级都做了部分实现，但 React 层更完整。
- **建议**: 这是过渡状态。随着各 runtime owner 逐步实现自己的状态发布，React 层的发布可以逐步移除。当前不需要改动。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

### 已驳回项

1. **useLayoutEffect 用于 namespace 注册** — 合理使用。namespace 注册需要在 DOM 更新前完成，useLayoutEffect 是正确选择。
2. **DesignerRuntime/SpreadsheetRuntime/FormRuntime 状态发布缺失** — 这些是尚未完成的实现（中间态），不是 React 层违规。

## 总结评估

1 个 P2 保留（状态发布的层级过渡问题，但当前是合理的过渡方案）。其他初审发现经复核后驳回。整体生命周期管理良好，没有 runtime 逻辑误放 React 层的问题。
