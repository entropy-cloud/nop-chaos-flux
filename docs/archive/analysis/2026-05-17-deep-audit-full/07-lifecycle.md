# 维度 07：生命周期与副作用归属 — 审计报告

## 第 1 轮（初审）

### [维度07-01] useNodeSourceProps 在 React hook 中拥有 source 生命周期 (P2)

- **文件**: `packages/flux-react/src/use-node-source-props.ts:86-92,94-98`
- **应归属层级**: runtime 层
- **现状**: 创建 NodeSourcePropController 并由 effect 驱动 run/dispose，不符合 renderer-runtime.md 架构要求
- **建议**: 按 Plan 231 迁移 source 生命周期至 flux-runtime

### [维度07-02] useSourceValue 保留相同的 React-owned source controller 模式 (P2)

- **文件**: `packages/flux-react/src/use-source-value.ts:57-68`
- **应归属层级**: runtime 层
- **建议**: 与 07-01 并行修复

### [维度07-03] ImportStack 部分安装失败时无 provider 回滚 (P1)

- **文件**: `packages/flux-runtime/src/import-stack.ts:379-423,427-440`
- **现状**: 循环注册 namespace provider，若第 N 个失败，前 N-1 个已注册 provider 残留
- **建议**: 在 push()/installPrepared() 中添加失败回滚

### [维度07-04] ActionScope 无 dispose(); runtime.dispose() 泄漏 provider (P2)

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:151-159,501-507`
- **现状**: ActionScope 上没有 dispose() 方法，runtime.dispose() 仅 clear() 列表但不释放 provider
- **建议**: 向 ActionScope 添加 dispose()

### [维度07-05] Node-owned ActionScope 清理不注销 runtime tracking (P2)

- **文件**: `packages/flux-react/src/use-node-scopes.ts:70-86`
- **建议**: 与 07-04 一起修复

### [维度07-06] RenderNodes render 阶段写入模块级缓存 (P2)

- **文件**: `packages/flux-react/src/render-nodes.tsx:104-118,276-286,402-410`
- **现状**: useMemo 期间写入模块级 WeakMap，删除仅在 useEffect cleanup 中
- **风险**: 接近 Bug 15 模式（render 阶段外部状态突变）
- **建议**: 将缓存移至组件本地状态

### [维度07-07 至 07-12] 合规确认 (P3)

- 7-07: Variant-field effect 检测调度 ✅ 通过
- 7-08: useLayoutEffect vs useEffect 选择 ✅ 正确
- 7-09: Effect 依赖完整性 ✅ 一般正确
- 7-10: React 19 'use no memo' 指令 ✅ 正确
- 7-11: StrictMode 安全的 form/runtime 清理 ✅ 正确
- 7-12: Crud 状态 scope 初始化 effect ✅ 正确
