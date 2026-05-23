# 维度04：状态所有权与单一事实来源 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-core、flux-formula、flux-runtime、flux-react

---

## 复核结论

| 发现                                       | 维度复核                      | 子项复核    | 最终严重程度 |
| ------------------------------------------ | ----------------------------- | ----------- | ------------ |
| 发现1: statusPath 双写入                   | **驳回**（命令式/声明式互斥） | —           | —            |
| 发现2: lastChange 过时上下文               | 保留（降级P3）                | **成立** P3 | P3           |
| 发现3: useResolvedContainer 渲染阶段写 ref | 降级P4                        | —           | P4（不跟踪） |
| 发现4: useStatusPathPublication 无清理     | 保留                          | **成立** P3 | P3           |

---

## 发现清单

### [维度04] Dialog/Drawer statusPath 双写入 — runtime 与 React 层发布不一致

- **文件**: `packages/flux-runtime/src/surface-runtime.ts:76-78` + `packages/flux-renderers-basic/src/status-hooks.ts:5-8` + `packages/flux-renderers-basic/src/dialog.tsx:22` + `packages/flux-renderers-basic/src/drawer.tsx:22`
- **严重程度**: P2
- **现状**: Dialog/Drawer 的 `statusPath` 存在两个发布者：
  1. **Runtime 层**（`surface-runtime.ts:77`）：在 `open()` 被调用时同步写入 `{id, kind, open: true, active: true, ...}`；在 `close()` 时同步写入 `{open: false, active: false, ...}`
  2. **React 层**（`useStatusPathPublication` 被 `dialog.tsx:22`、`drawer.tsx:22` 调用）：在 useEffect 中异步写入由 `props.props.open ?? props.props.defaultOpen ?? true` 计算出的 summary
     两者写入同一个 scope 的同一个 `statusPath`，但 `open` 字段的取值来源不同。
- **风险**:
  - 打开阶段：runtime 先写 `open: true`，React effect 后写 `open: false`（如果 props 推导结果为 false），statusPath 消费者会看到值从 `true` 翻转为 `false`，造成状态闪烁
- **建议**: 统一 statusPath 的唯一写入者。runtime 层保留 open/close 生命周期写入，React 层退化为补充字段。
- **双状态详情**: `scope[statusPath]` 由 runtime（同步、生命周期驱动）和 React effect（异步、props 驱动）两条路径写入
- **同步失败症状**: 消费 statusPath 的组件在 runtime 写入后、React effect 执行前读取到不一致的值

### [维度04] form-runtime `lastChange` 在验证更新时携带过时上下文

- **文件**: `packages/flux-runtime/src/form-runtime.ts:70-92`
- **严重程度**: P2
- **现状**: `form-runtime.ts` 维护闭包级变量 `lastChange`，在 `setValue()` / `setValues()` 中先更新再调用 `store.batchUpdate()`。当 `setValue()` 触发 `revalidateDependents()` 时，fieldState 变更被错误标记为原始路径而非依赖路径。
- **风险**: `node-renderer.tsx` 中的 scope 订阅使用 `scopeChangeHitsDependencies(change, ...)` 过滤唤醒，当 `lastChange` 的 paths 与实际变更不匹配时，导致不相关节点被错误唤醒或受影响节点未被唤醒。
- **建议**: 为 fieldState-only 的 store 更新提供独立的 lastChange 语义。
- **双状态详情**: `lastChange` 闭包变量与 store 内实际变更的数据（fieldStates）表达了不同的事实，但被混在同一通知管道中
- **同步失败症状**: 在有交叉验证的表单中，输入字段 A 后，字段 B 的验证错误可能在 UI 上延迟一个渲染周期才出现

### [维度04] `useResolvedContainer` 在渲染阶段写入 ref

- **文件**: `packages/flux-react/src/container-hooks.ts:5-27`
- **严重程度**: P3
- **现状**: hook 在渲染函数体中执行 `componentRegistry.resolve()` 查找 DOM 元素，并将结果写入 `containerRef.current`。React 19 并发模式下可能被多次执行。
- **风险**: 渲染期 ref 写入违反 React 渲染纯性约定。幂等操作无实际数据风险。
- **建议**: 改用 `useMemo` 替代 ref + 渲染期写入。
- **双状态详情**: 不涉及双状态。
- **同步失败症状**: 无可见用户端故障。

### [维度04] `useStatusPathPublication` 无清理函数，卸载后残留状态

- **文件**: `packages/flux-renderers-basic/src/status-hooks.ts:5-8`
- **严重程度**: P3
- **现状**: useEffect 无清理函数，组件卸载后 statusPath 上残留旧数据。
- **风险**: 在动态页面/标签页切换场景中，消费者可能读到已卸载组件的旧状态。
- **建议**: 添加清理逻辑，组件卸载时将 statusPath 清为 undefined。
- **双状态详情**: scope 中的 statusPath 数据在组件卸载后成为孤立数据。
- **同步失败症状**: 消费者可能读到已卸载组件的旧状态。

---

## 确认安全的模式

| 文件                          | 模式                                           | 判定                                      |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `schema-renderer.tsx:95-96`   | `importsReady` + `rootImportBindings` useState | 合法异步加载状态                          |
| `useNodeImports.ts:55`        | `asyncState` useState                          | 合法异步加载状态                          |
| `useSourceValue.ts:26`        | `state` useState                               | 合法异步加载状态                          |
| `use-node-source-props.ts:21` | `controller` useState                          | 惰性初始化                                |
| `workbench/hooks.ts:58`       | `store` useState                               | 惰性初始化                                |
| `interaction-owner.ts:27`     | `localValue` useState                          | 互斥所有权模型                            |
| `dynamic-renderer.tsx:23`     | `state` useState                               | 合法异步加载状态                          |
| `form-runtime.ts:69`          | `isSubmittingInternal` vs `store.submitting`   | 设计意图不同，非双状态                    |
| `form-runtime.ts:82-93`       | scope store bridge                             | 必要的 React-Zustand 桥接                 |
| `render-nodes.tsx:257-275`    | fragment bindings useEffect 同步               | 必要的 props-to-store 同步                |
| `hooks.ts` 全文               | 所有 selector hooks                            | 全部使用 useSyncExternalStoreWithSelector |
