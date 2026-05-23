# 维度 05：响应式订阅精度

## 审核范围

检查所有 useScopeSelector、useSyncExternalStore、useEffect 依赖项、Context provider value 的订阅精度。

## 发现清单

### [维度05] useSurfaceScopeSnapshot 订阅整个 scope

- **文件**: `packages/flux-react/src/surface/surface-scope-snapshot.ts`
- **严重程度**: P2
- **现状**: `useSurfaceScopeSnapshot` 订阅了完整的 scope 数据而非按路径订阅。
- **订阅范围**: 整个 scope.data
- **实际需要**: 仅 dialog/drawer 打开时需要的初始化数据
- **重渲染频率**: scope 中任意数据变化时重渲染，而非仅相关数据变化时
- **建议**: 考虑按路径订阅或 memo 化 snapshot 数据
- **为什么值得现在做**: dialog/drawer 频繁打开场景下可能产生性能问题
- **误报排除**: dialog/drawer 通常不在高频数据变化场景中使用，实际影响有限
- **历史模式对应**: FieldFrame 曾有类似问题（全量订阅 form.values）
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7 per-path subscription
- **复核状态**: 维度复核通过

### [维度05] useScopeSelector 不支持 per-path 精细订阅（降级为 P3）

- **文件**: `packages/flux-react/src/hooks/use-scope-selector.ts`
- **严重程度**: P3
- **现状**: useScopeSelector 的 selector 返回整个 path 值时，即使子 path 未变化也会触发重渲染。
- **建议**: 这是当前架构的已知限制，可排期优化。
- **复核状态**: 维度复核通过，从 P2 降级为 P3

### [维度05] Context Provider value 稳定性（降级为 P3）

- **文件**: 多个 Context Provider
- **严重程度**: P3
- **现状**: 部分 Context Provider 的 value 可能每次 render 创建新对象，但实际影响有限。
- **建议**: 可在性能优化阶段统一处理。
- **复核状态**: 维度复核通过，从 P2 降级为 P3

### P7 per-path subscription 实现

Field-level hooks（`useFormFieldController`、`useFieldState`）已正确实现 per-path subscription，通过 `subscribeToPaths` 精确订阅字段路径，不会因无关字段变化而重渲染。✓

## 总结评估

P7 per-path subscription 在核心字段 hook 中已正确实现。1 个 P2 问题（useSurfaceScopeSnapshot 过宽订阅），2 个 P3 观察项。整体订阅精度良好。
