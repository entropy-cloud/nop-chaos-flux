# 维度 05：响应式订阅精度 — 审计报告

## 第 1 轮（初审）

### [维度05-01] NodeRendererResolved 使用广播级 scope subscribe，通知后过滤 (P2)

- **文件**: `packages/flux-react/src/node-renderer-resolved.tsx:96-109`
- **严重程度**: P2
- **订阅位置**: `props.scope.store?.subscribe((change: ScopeChange) => {...})`
- **订阅范围**: 每个动态节点订阅全部 scope change 广播，在 listener 回调内过滤
- **实际需要**: 节点应只订阅其编译期确定的依赖路径集合
- **风险**: 每个 scope 变更唤醒页面上所有动态 NodeRenderer，做 O(depSet) 匹配
- **建议**: 利用 `createScopeSubscribe(scope, paths)` 能力，将 `nodeState.metaDependencies.paths` + `nodeState.propsDependencies.paths` 合并为 per-node 声明式路径列表

### [维度05-02] useOwnScopeSelector 使用广播订阅 + own-snapshot 后过滤 (P2)

- **文件**: `packages/flux-react/src/hooks.ts:140-155`
- **严重程度**: P2
- **订阅位置**: `createScopeOwnSubscribe(scope)` → `scope.store?.subscribe(listener)` → 对比 `scope.readOwn()` snapshot identity
- **订阅范围**: 所有 scope 变更都触发 listener
- **建议**: 暂无优化快速方法。需在 scope store 层添加 `subscribeToOwnChange` 事件

### [维度05-03] render-nodes scope.readOwn() in useLayoutEffect (P2 观察项，已安全)

- **文件**: `packages/flux-react/src/render-nodes.tsx:336`
- **严重程度**: P2（观察项）
- **判定**: 非渲染期读取，在 useLayoutEffect 中。但该副作用驱动了 `setSnapshot` 写回，形成"副作用的副作用"模式

### [维度05-04] DetailField / DetailView 命令式 store.getState() (P3)

- **文件**: `detail-field.tsx:146`, `detail-view.tsx:231`
- **严重程度**: P3
- **判定**: 事件处理器/异步回调中的一次命令式快照读取，非渲染期 reactive read。已判定安全

### [维度05-05] ScopeDebugRenderer 读取完整 scope 无 paths (P3)

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:54`
- **严重程度**: P3
- **判定**: 调试工具，非生产路径。暂不修复

### [维度05-06] form-publication 全 store 广播订阅 (P3)

- **文件**: `packages/flux-react/src/form-publication.ts:47,84`
- **严重程度**: P3
- **判定**: form-level consumer 的合理广播订阅。不做修复

### [维度05-07] P7 per-path 表单订阅验证通过 (P1 - PASSED)

- **验证范围**: form-store.ts, form-store-owned.ts, projected-form-runtime.ts, projected-validation-runtime.ts
- **判定**: 所有表单 store 正确实现了 per-path 订阅机制。✅ 通过

### [维度05-08] DialogHost surface entries 订阅 (P2)

- **文件**: `packages/flux-react/src/dialog-host.tsx:48-54`
- **严重程度**: P2
- **判定**: 对于 surface store 合理。不做修复

### [维度05-09] useScopeSelector getSnapshot 返回 undefined (P3)

- **文件**: `packages/flux-react/src/hooks.ts:122-128`
- **严重程度**: P3
- **问题**: `enabled=false` 时 `getSnapshot` 返回 `undefined`
- **建议**: 当 `enabled=false` 时返回 `options?.fallback` 的基础容器

## 深挖第 2 轮追加

### [维度05-10] Word Editor 多处广播订阅 (P2)

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:111-154`
- **复核后降级**: 原定 P1/8个，复核确认 5 个订阅（P2）
- **建议**: 合并为 1 个组合选择器

### [维度05-11] Flow Designer 多处广播订阅 (P2)

- **文件**: `packages/flow-designer-renderers/src/designer-inspector.tsx:24-29`
- **复核后降级**: 原定 P1/~12个，复核确认 6+ 个订阅但选择器过滤影响（P2）

### [维度05-12] useSurfaceRenderer 双重广播订阅 (P2)

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:63,352`
- **保留**: P2

### [维度05-13] CRUD 5 个 useScopeSelector (P2)

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:235-269`
- **保留**: P2

## 维度复核结论

| 编号  | 原定 | 复核结果    | 理由                   |
| ----- | ---- | ----------- | ---------------------- |
| 05-01 | P2   | **保留 P2** | 带过滤器广播订阅       |
| 05-02 | P2   | **保留 P2** | 带自有范围快照比较     |
| 05-03 | P2   | **保留 P2** | 观察项                 |
| 05-04 | P3   | **保留 P3** | 安全                   |
| 05-05 | P3   | **保留 P3** | 不修复                 |
| 05-06 | P3   | **保留 P3** | 不修复                 |
| 05-07 | ✅   | **通过**    | P7 per-path 验证       |
| 05-08 | P2   | **保留 P2** | 不做修复               |
| 05-09 | P3   | **保留 P3** | 建议修复               |
| 05-10 | P1   | **降级 P2** | 计数降为 5，选择器过滤 |
| 05-11 | P1   | **降级 P2** | 选择器过滤             |
| 05-12 | P2   | **保留 P2** | 双重广播确认           |
| 05-13 | P2   | **保留 P2** | 带路径过滤确认         |

## 最终保留项

| 编号  | 程度 | 文件                                | 摘要                       |
| ----- | ---- | ----------------------------------- | -------------------------- |
| 05-01 | P2   | `node-renderer-resolved.tsx:96-109` | 广播级 subscribe           |
| 05-02 | P2   | `hooks.ts:140-155`                  | 广播订阅                   |
| 05-03 | P2   | `render-nodes.tsx:336`              | 观察项                     |
| 05-10 | P2   | `use-word-editor-state.ts`          | 多处广播订阅               |
| 05-11 | P2   | `designer-inspector.tsx`            | 多处广播订阅               |
| 05-12 | P2   | `use-surface-renderer.ts`           | 双重广播订阅               |
| 05-13 | P2   | `crud-renderer-state.ts`            | 5 个 useScopeSelector      |
| 05-09 | P3   | `hooks.ts:122-128`                  | getSnapshot 返回 undefined |
