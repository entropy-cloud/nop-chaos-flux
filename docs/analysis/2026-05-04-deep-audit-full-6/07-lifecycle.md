# 维度 07：生命周期与副作用归属

## 复核状态：1×Low 保留

### Bug 15 回归检查

- ✅ 未发现 render 阶段调用 store.setState/setSnapshot
- ✅ 所有 store 写入均在 useEffect/useLayoutEffect 中

### 发现

### [维度07] CRUD scope 初始化放在 effect 中

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:273-304`
- **严重程度**: Low
- **effect 职责**: 初始化 scope 中 query/pagination/sort/filter/selection 默认值
- **应归属层级**: Runtime 层（scope 初始化应在创建 scope 时完成）
- **建议**: 移到 runtime 工厂函数中，当前无运行时风险
- **复核状态**: 子项复核通过

### useLayoutEffect 选择

- ✅ 所有 useLayoutEffect 使用均有合理理由（scope 同步、canvas 测量）
- ✅ 卸载清理完整
