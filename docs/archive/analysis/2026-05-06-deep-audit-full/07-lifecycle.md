# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07] use-surface-renderer 双 effect 重叠导致声明式 surface 不必要 close-reopen

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:230,253`
- **严重程度**: P2
- **effect 职责**: Effect L230 管理 surface open/close 生命周期；Effect L253 负责卸载清理
- **应归属层级**: React 层
- **现状**: 两个 effect 依赖集合有交集。当 declarativeScope 变更而 effectiveOpen 仍为 true 时，close-reopen 序列可能导致 validationOwner 关联丢失。
- **建议**: 合并两个 effect 或在 cleanup 中跳过 effectiveOpen=true 时的 close。

### [维度07] useCrudHandle 将 RefObject 纳入 useEffect 依赖数组

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:194`
- **严重程度**: P3
- **effect 职责**: CRUD component handle 注册
- **现状**: RefObject 引用标识全生命周期稳定，无害但多余。

---

## 整体评价

Bug 15 教训已充分吸收，无回归。~89 处 effect 经逐一审查，归属层级均正确。历史问题（DataSource 轮询/缓存/去重在 React effect 中）已迁移至 runtime 层。所有 useLayoutEffect 选择合理。全局事件监听器 cleanup 完整。

| 级别 | 数量 |
| ---- | ---- |
| P0   | 0    |
| P1   | 0    |
| P2   | 1    |
| P3   | 1    |
