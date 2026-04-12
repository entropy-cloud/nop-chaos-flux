# 77 Renderer Hot-Path Performance and Memory Continuation

> Plan Status: planned
> Last Reviewed: 2026-04-12
> Source: Code audit session 2026-04-12; `docs/plans/75-reaction-and-renderer-perf-fix-plan.md` (deferred PERF-6/7/8/9/11 and MEMORY-1)
> Related: `docs/plans/75-reaction-and-renderer-perf-fix-plan.md` (predecessor), `docs/plans/76-repo-refactor-hotspots-remediation-plan.md` (PERF-8 is in the same package as Plan 76 Phase 4 but targets different files)

## Purpose

收口 Plan 75 在 2026-04-12 审计中确认但延迟的 6 项渲染热路径问题：2 项多余 dep 导致的副作用重触发、2 项无 memoization 导致的 context 广播或同步副作用、1 项 async closure 中读取 stale 值、1 项 module-level Map 的生命周期可靠性问题。

## Current Baseline

- `DesignerXyflowCanvas.tsx:106–113`：minimap `querySelector` 的 `useEffect` 带着 `localNodes` 和 `localEdges` 作为 deps，但 `preserveAspectRatio` patch 是一次性 DOM 修复，与节点/边数据无关；每次拖拽或连线都触发一次实时 DOM 查询。
- `useNodeImports.ts:96`：`page` 在 `useEffect` deps 中但从未在 effect body 内被读取；`PageRuntime` 引用变化时会不必要地重触发整个 namespace import 解析流程。
- `loop.tsx:12` 和 `recurse.tsx:14–18`：`resolveLoopBindings` 在每次渲染时裸调用，无 `useMemo`；返回的新对象直接作为 `StructuralLoopContext.Provider value`，导致所有 context consumer 在任何父级 re-render 时都无条件 re-render。
- `table-renderer.tsx:60`：`ownerKey = useMemo(() => createTableOwnerKey(props), [props])` — deps 为整个 `props` 对象，每次渲染都产生新 `ownerKey` 字符串，使 `useMemo` 实质无效；`use-table-row-scope-cache.ts:50–84` 的 `useLayoutEffect` 以 `ownerKey` 为 dep，因此在每次渲染时同步重走全部 row scope 操作。
- `use-node-source-props.ts:115,140`：`propsValue` 在异步 `.then()` / `.catch()` 闭包中被捕获；若请求飞行期间 `propsValue` 已因 props 更新而变化，continuations 会把旧版 `propsValue` 展开到 `nextValue`，覆盖更新后的 prop 数据（`cancelled` flag 只防 unmount，不防同组件内的 mid-flight prop 更新）。
- `render-nodes.tsx:55–62`：`fragmentScopeCache` 是 module-level 单例 `Map`，依靠 `useEffect` cleanup 删除条目；在 React StrictMode 双调用、HMR/fast-refresh、多 React root 场景下，cleanup 顺序无法保证，旧 cleanup 会删除新条目；且每个缓存值持有 `ScopeRef` + `parent` 引用，可能在 scope 树上形成 GC 保留链。

## Goals

- 移除 `DesignerXyflowCanvas` minimap effect 中的 `localNodes`/`localEdges` 多余 deps。
- 移除 `useNodeImports` effect 中的 `page` 多余 dep。
- 用 `useMemo` 稳定 `loop.tsx` 和 `recurse.tsx` 的 `resolveLoopBindings` 调用，消除 `StructuralLoopContext.Provider` 的无效 broadcast。
- 收窄 `ownerKey` 的 `useMemo` deps 为 `createTableOwnerKey` 实际读取的字段，让 `use-table-row-scope-cache.ts` 的 `useLayoutEffect` 只在标识真正变化时触发。
- 用 ref 模式解决 `use-node-source-props.ts` 异步 continuation 中的 stale `propsValue` 问题。
- 修复 `fragmentScopeCache` 的生命周期可靠性，消除 StrictMode / HMR 下的错误删除和跨 root 共享问题。

## Non-Goals

- 不做 `use-table-controls.ts` 的订阅收窄和 `allSelected` 删除——这属于 Plan 76 Phase 4。
- 不做 `use-node-source-props.ts` 的完整 source prop runtime 所有权下沉——这属于 Plan 76 Phase 3；本计划只修复异步闭包中的 stale capture，不重构请求编排架构。
- 不做 `render-nodes.tsx` 的完整 scope 隔离架构重写；只收紧 cache 生命周期可靠性。
- 不做 PERF-6 以外的 Flow Designer 性能优化。
- 不做 `loop.tsx` / `recurse.tsx` 以外的 renderer context provider 优化。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx` — PERF-6 dep 清理
- `packages/flux-react/src/useNodeImports.ts` — PERF-7 dep 清理
- `packages/flux-renderers-basic/src/loop.tsx` — PERF-9 memoization
- `packages/flux-renderers-basic/src/recurse.tsx` — PERF-9 memoization
- `packages/flux-renderers-data/src/table-renderer.tsx` — PERF-8 ownerKey deps
- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts` — PERF-8 验证
- `packages/flux-react/src/use-node-source-props.ts` — PERF-11 stale ref fix
- `packages/flux-react/src/render-nodes.tsx` — MEMORY-1 cache 生命周期
- 为以上变更必须更新的 focused tests

### Out Of Scope

- `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`（Plan 76 Phase 4 owner）
- `packages/flux-react/src/use-node-source-props.ts` 的 source 请求编排重构（Plan 76 Phase 3 owner）
- 其他 renderer / context provider 的 memoization

## Execution Plan

### Phase 1 — Spurious Dep Removal (PERF-6, PERF-7)

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`, `packages/flux-react/src/useNodeImports.ts`

- [ ] `DesignerXyflowCanvas.tsx:106–113`：将 `useEffect` deps 从 `[showMinimap, localNodes, localEdges]` 改为 `[showMinimap]`；effect 已是幂等 DOM patch，不依赖节点/边数据。
- [ ] `useNodeImports.ts:96`：从 `useEffect` deps 中移除 `page`；确认 `page` 参数在 effect body 及其所有调用的函数中均未被读取。
- [ ] 为两项变更补充或更新 focused tests（至少：minimap effect 在 `localNodes` 变化时不重触发；import effect 在 `page` 引用变化时不重触发）。

Exit Criteria:

- [ ] minimap `querySelector` 不再随节点/边数据变化触发。
- [ ] namespace import 解析不再随 `page` 引用变化重触发。
- [ ] `pnpm --filter @nop-chaos/flow-designer-renderers typecheck` 通过。
- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` 通过。

### Phase 2 — Loop Binding Memoization (PERF-9)

Status: planned
Targets: `packages/flux-renderers-basic/src/loop.tsx`, `packages/flux-renderers-basic/src/recurse.tsx`

- [ ] `loop.tsx:12`：将 `resolveLoopBindings(props.props as LoopSchema)` 包裹为 `useMemo(() => resolveLoopBindings(props.props as LoopSchema), [props.props.itemName, props.props.indexName, props.props.keyName])`。
- [ ] `recurse.tsx:14–18`：对内联对象入参做同等 `useMemo` 包裹，deps 为 `[props.props.itemName, props.props.indexName, props.props.keyName]`。
- [ ] 确认 `StructuralLoopContext.Provider value` 引用在 bindings 字段不变时保持稳定。
- [ ] 补充 focused test：父级 re-render 不触发 `StructuralLoopContext` consumer re-render，当 `itemName`/`indexName`/`keyName` 不变时。

Exit Criteria:

- [ ] `resolveLoopBindings` 返回值在 binding 字段不变时引用稳定。
- [ ] `StructuralLoopContext.Provider value` 在父级无关更新时不产生新引用。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic typecheck` 通过，相关 tests 通过。

### Phase 3 — ownerKey Memo Granularity (PERF-8)

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`

- [ ] 审计 `createTableOwnerKey` 的实现，确认它读取的字段集（预期为 `props.node.templateNode.templateNodeId`、`props.meta.cid`、`props.id`、`props.node.instancePath`）。
- [ ] `table-renderer.tsx:60`：将 `useMemo` deps 从 `[props]` 改为 `createTableOwnerKey` 实际读取的最小字段集。
- [ ] 确认 `use-table-row-scope-cache.ts` 的 `useLayoutEffect` 在 identity 未变时不重触发。
- [ ] 补充 focused test：同一 table 实例在无关父级 re-render 时 `ownerKey` 引用不变，`useLayoutEffect` 不重触发。

Exit Criteria:

- [ ] `ownerKey` 只在 table 结构标识字段真正变化时产生新值。
- [ ] `useLayoutEffect` 在无关 props 更新时不同步重走 row scope 操作。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过，相关 tests 通过。

### Phase 4 — Stale propsValue Ref Pattern (PERF-11)

Status: planned
Targets: `packages/flux-react/src/use-node-source-props.ts`

- [ ] 在 hook 顶部添加 `propsValueRef`，每次渲染时更新 `propsValueRef.current = propsValue`。
- [ ] 将异步 `.then()`（`line 115`）和 `.catch()`（`line 140`）闭包中对 `propsValue` 的读取改为读取 `propsValueRef.current`。
- [ ] 从 `useEffect` deps 中移除 `propsValue`（它已通过 ref 始终读取最新值，不再需要触发 effect 重跑）。
- [ ] 补充 focused test：props 在 source 请求飞行期间更新时，`.then()` 使用新 `propsValue` 而非旧快照。

Exit Criteria:

- [ ] async continuation 不再将 stale `propsValue` 展开到结果中。
- [ ] `propsValue` 变化不再触发 `useEffect` 重跑（不再是 dep）。
- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` 通过，focused test 通过。

### Phase 5 — Fragment Scope Cache Lifetime (MEMORY-1)

Status: planned
Targets: `packages/flux-react/src/render-nodes.tsx`

- [ ] 将 `fragmentScopeCache` 从 module-level 单例改为由 `RendererRuntime` 实例持有（或通过 React context 注入的 per-root 实例），消除跨 React root 共享。
- [ ] 确保 cleanup 路径与挂载/卸载严格对应：用 `useRef` + 挂载时注册 / 卸载时删除，或等价的 per-instance 存储，替代 module-level `Map` + `useEffect` cleanup 的不可靠组合。
- [ ] 如 `RendererRuntime` 持有，添加 `dispose()` 时清空所有缓存条目的逻辑。
- [ ] 补充 focused test：StrictMode 双调用后 cache 条目数量正确（不多不少）；runtime dispose 后 cache 为空。

Exit Criteria:

- [ ] `fragmentScopeCache` 不再是 module-level 单例；不同 React root 之间不共享缓存。
- [ ] StrictMode 双调用不会导致"旧 cleanup 删除新条目"问题。
- [ ] runtime dispose 后，所有属于该 runtime 的 fragment scope 条目都被释放。
- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` 通过，focused test 通过。

## Validation Checklist

- [ ] 所有 5 个 phase 的 exit criteria 均已满足。
- [ ] PERF-6：minimap DOM query 不再随节点/边数据变化触发。
- [ ] PERF-7：namespace import 不再随 `page` 引用变化重触发。
- [ ] PERF-9：`StructuralLoopContext.Provider value` 在 bindings 不变时引用稳定。
- [ ] PERF-8：`ownerKey` 仅在 table 结构标识真正变化时更新。
- [ ] PERF-11：async continuation 读取最新 `propsValue` 而非 stale 快照。
- [ ] MEMORY-1：`fragmentScopeCache` 不再是 module-level 单例，StrictMode 下生命周期正确。
- [ ] `docs/logs/` 中对应执行日已更新。
- [ ] `pnpm typecheck` 通过。
- [ ] `pnpm build` 通过。
- [ ] `pnpm lint` 通过。
- [ ] `pnpm test` 通过。
- [ ] 独立 closure audit 完成并记录证据。

## Risks And Rollback

- Phase 5 (MEMORY-1) 改动面最广：将 module-level Map 移入 runtime 实例需要确认 `render-nodes.tsx` 的所有调用路径都有访问 runtime 的方式，否则需要通过 context 注入。执行前先读 `render-nodes.tsx` 完整文件，确认 `useRendererRuntime()` 在 `RenderNodes` 内是否已可用。
- Phase 4 (PERF-11) 移除 `propsValue` 出 deps 时，需核查 `currentValue` 的派生路径，避免 effect 触发条件因 deps 精简而出现逻辑漏洞；优先补 focused test 锁住行为再改 deps。
- Phase 3 (PERF-8) 改 `ownerKey` deps 前必须先读 `createTableOwnerKey` 完整实现，不得凭假设减少 deps；deps 只移除已确认未被读取的字段。

## Closure

Status Note: Not started. Plan can close only after all five phases land, verification is green, docs/logs are updated, and an independent closure audit confirms no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- Plan 76 Phase 3 (source prop runtime ownership) 与 Phase 4 (table control subscription) 是本计划 PERF-11 和 PERF-8 的架构层后继工作，执行顺序可并行，但本计划的 Phase 4/3 变更需与 Plan 76 执行者协调，避免同时修改 `use-node-source-props.ts` 和 `table-renderer.tsx`。
