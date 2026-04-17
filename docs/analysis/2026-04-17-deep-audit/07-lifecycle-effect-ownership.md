# 07 生命周期与副作用归属

- Task ID: `ses_268e2c9c0ffeW43hKgWoNyNLQI`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Last verified: 2026-04-17

## 设计合理（无需迁移）

### [维度07] 匿名 source 生命周期由 `flux-react` 控制器持有
- **文件**: `packages/flux-react/src/use-node-source-props.ts:21-48`; `packages/flux-react/src/node-source-prop-controller.ts:45-148`; `packages/flux-react/src/useSourceValue.ts:21-86`
- **严重程度**: ~~P1~~ → **设计合理**
- **effect 职责**: 在 React effect 中启动 source 执行、管理 `AbortController`、维护 loading/error/transient state
- **现状分析**:
  - `node-source-prop-controller.ts` 是一个**框架无关的控制器**（非 React 组件/hook），有独立的 subscribe/getSnapshot 模式
  - React 通过 `useSyncExternalStore` 桥接到控制器，只做订阅，不参与状态管理
  - AbortController 管理在控制器内部，取消逻辑不依赖 React 生命周期
  - 匿名 source 是 Node-level 的瞬时请求，其生命周期**天然与组件挂载绑定**
- **结论**: 当前设计是合理的权衡。将其移到 runtime 层需要引入 Node 实例追踪机制，成本较高且收益不明确。控制器模式已经实现了状态管理与 React 的解耦。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

## 改进建议（低优先级）

### [维度07] `DynamicRenderer` 在 renderer effect 中直接执行 schema 请求
- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:17-80`
- **严重程度**: ~~P2~~ → **P3（改进建议）**
- **effect 职责**: 拉取远端 schema，并在组件内维护异步请求生命周期
- **现状**: renderer 里直接 `executeApiObject(...)`，用 `mountedRef` 防止卸载后写状态；请求没有接入 runtime 的统一 source/data-source/request 生命周期。
- **实际影响**: DynamicRenderer 使用场景有限（动态加载 schema），且 schema 加载通常是一次性的，不需要缓存/去重/重试。
- **改进方向**: 如果未来需要 schema 缓存或预加载，可以考虑接入 runtime 机制。目前保持现状。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] `FormRenderer` 自己订阅 form store 并派生状态摘要
- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:254-316`
- **严重程度**: ~~P2~~ → **P3（改进建议）**
- **effect 职责**: 订阅 `ownedForm.store`、聚合 field state、向父 scope 发布 `statusPath`
- **现状**: effect 在 React 层做了 form runtime 状态聚合与发布逻辑；这类摘要计算完全基于 runtime store，不依赖 DOM/React 视图。
- **改进方向**: 让 `flux-runtime`/form runtime 提供内置的状态摘要发布能力，React renderer 只负责声明是否启用 `statusPath`。这是合理的改进，但当前实现可工作。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`

## 正确位于 React 层

### [维度07] `RenderNodes` 已避免 render 阶段写 store
- **文件**: `packages/flux-react/src/render-nodes.tsx:257-275`
- **严重程度**: P3
- **effect 职责**: 在 render 之后把 fragment 绑定同步到 scope store
- **应归属层级**: React 层
- **现状**: 当前实现把 `setSnapshot` 放在 effect 中，而不是 render 阶段直接写 Zustand store，符合 Bug 15 的修复方向。
- **建议**: 保持现状；不要把 `fragmentScope.store.setSnapshot(...)` 移回 render 路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/bugs/15-render-nodes-setstate-during-render-fix.md`

### [维度07] `SchemaRenderer` 的根数据同步只处理后续变更
- **文件**: `packages/flux-react/src/schema-renderer.tsx:50-65`
- **严重程度**: P3
- **effect 职责**: 将后续 `props.data` 变化 reconcile 到 page scope
- **应归属层级**: React 层
- **现状**: 初始 page data 在 runtime 创建时种入，effect 只负责后续 prop 变化，避免 mount 时子树 effect 被后续根同步覆盖。
- **建议**: 保持这种"初始化在 runtime、后续 reconcile 在 effect"的分层。
- **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度07] `DataSourceRenderer` 仅桥接挂载生命周期
- **文件**: `packages/flux-renderers-data/src/data-source-renderer.tsx:10-20`
- **严重程度**: P3
- **effect 职责**: 注册/释放 data-source 实例
- **应归属层级**: React 层
- **现状**: effect 只做 `registerDataSource(...)/dispose()`，轮询、缓存、去重、刷新仍由 runtime 持有，分层正确。
- **建议**: 保持 renderer 的"注册器"角色，不要把请求控制重新移回 renderer。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] `ReactionRenderer` 仅桥接 reaction 的挂载/卸载
- **文件**: `packages/flux-renderers-basic/src/reaction.tsx:15-28`
- **严重程度**: P3
- **effect 职责**: 注册/释放 reaction
- **应归属层级**: React 层
- **现状**: renderer 只把 mounted node 生命周期映射到 `runtime.registerReaction(...)`，没有在 React 层自行做监听、轮询、重试或缓存。
- **建议**: 保持现状。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] 表格行 scope 同步使用 `useLayoutEffect` 是合理的
- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:64-98`
- **严重程度**: P3
- **effect 职责**: 在绘制前同步 row scope，保证子行读取到最新 record/index
- **应归属层级**: React 层
- **现状**: 这是与渲染时序直接相关的 pre-paint 同步，使用 `useLayoutEffect` 符合行级作用域更新的要求。
- **建议**: 保持 `useLayoutEffect`，不要降级成普通 `useEffect`。
- **参考文档**: `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/renderer-runtime.md`

### [维度07] 复杂控件 namespace 发布放在 `useLayoutEffect` 合理
- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:339-345`
- **严重程度**: P3
- **effect 职责**: 在页面级复杂控件挂载时注册 action namespace
- **应归属层级**: React 层
- **现状**: namespace 发布与页面宿主挂载生命周期绑定，且需要早于下游 layout 读取，放在 `useLayoutEffect` 合理。
- **建议**: 保持现状；不要改回 render 阶段或普通 `useEffect`。
- **参考文档**: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/renderer-runtime.md`
