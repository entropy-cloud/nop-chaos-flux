# 07 生命周期与副作用归属

- Task ID: `ses_268e2c9c0ffeW43hKgWoNyNLQI`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## 应迁移到 runtime

### [维度07] 匿名 source 生命周期仍由 `flux-react` effect 持有
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-node-source-props.ts:21-48`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-source-prop-controller.ts:45-148`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\useSourceValue.ts:21-63`
- **严重程度**: P1
- **effect 职责**: 在 React effect 中启动 source 执行、管理 `AbortController`、维护 loading/error/transient state
- **应归属层级**: runtime 层
- **现状**: `useNodeSourceProps`/`useSourceValue` 直接在 React 层调用 `runtime.executeSource(...)`，并由 React 控制请求取消、状态补丁、Promise 完成后的状态提交；这把匿名 source 的生命周期编排放回了 React，而不是 runtime。
- **建议**: 将匿名 source 的实例化、取消、并发控制、瞬时状态统一收敛到 `flux-runtime`，React 侧只保留订阅/渲染桥接。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] `DynamicRenderer` 在 renderer effect 中直接执行 schema 请求
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\dynamic-renderer.tsx:17-57`
- **严重程度**: P2
- **effect 职责**: 拉取远端 schema，并在组件内维护异步请求生命周期
- **应归属层级**: runtime 层
- **现状**: renderer 里直接 `executeApiObject(...)`，再用 `mountedRef` 防止卸载后写状态；请求没有接入 runtime 的统一 source/data-source/request 生命周期，也没有 runtime 级别的取消、去重、缓存、重试治理。
- **建议**: 把 schema 拉取抽到 runtime/source 机制中，renderer 只消费 runtime 暴露的结果与状态；至少不要让 renderer 自己持有请求生命周期。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] `FormRenderer` 自己订阅 form store 并派生状态摘要
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form.tsx:250-312`
- **严重程度**: P2
- **effect 职责**: 订阅 `ownedForm.store`、聚合 field state、向父 scope 发布 `statusPath`
- **应归属层级**: runtime 层
- **现状**: effect 不只是挂载/卸载桥接，而是在 React 层做了 form runtime 状态聚合与发布逻辑；这类摘要计算完全基于 runtime store，不依赖 DOM/React 视图。
- **建议**: 让 `flux-runtime`/form runtime 提供现成的状态摘要或发布能力，React renderer 只负责声明是否启用 `statusPath`。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`

## 正确位于 React 层

### [维度07] `RenderNodes` 已避免 render 阶段写 store
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:257-275`
- **严重程度**: P3
- **effect 职责**: 在 render 之后把 fragment 绑定同步到 scope store
- **应归属层级**: React 层
- **现状**: 当前实现把 `setSnapshot` 放在 effect 中，而不是 render 阶段直接写 Zustand store，符合 Bug 15 的修复方向。
- **建议**: 保持现状；不要把 `fragmentScope.store.setSnapshot(...)` 移回 render 路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/bugs/15-render-nodes-setstate-during-render-fix.md`

### [维度07] `SchemaRenderer` 的根数据同步只处理后续变更
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\schema-renderer.tsx:44-65`
- **严重程度**: P3
- **effect 职责**: 将后续 `props.data` 变化 reconcile 到 page scope
- **应归属层级**: React 层
- **现状**: 初始 page data 在 runtime 创建时种入，effect 只负责后续 prop 变化，避免 mount 时子树 effect 被后续根同步覆盖。
- **建议**: 保持这种“初始化在 runtime、后续 reconcile 在 effect”的分层。
- **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度07] `DataSourceRenderer` 仅桥接挂载生命周期
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\data-source-renderer.tsx:10-20`
- **严重程度**: P3
- **effect 职责**: 注册/释放 data-source 实例
- **应归属层级**: React 层
- **现状**: effect 只做 `registerDataSource(...)/dispose()`，轮询、缓存、去重、刷新仍由 runtime 持有，分层正确。
- **建议**: 保持 renderer 的“注册器”角色，不要把请求控制重新移回 renderer。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] `ReactionRenderer` 仅桥接 reaction 的挂载/卸载
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\reaction.tsx:15-28`
- **严重程度**: P3
- **effect 职责**: 注册/释放 reaction
- **应归属层级**: React 层
- **现状**: renderer 只把 mounted node 生命周期映射到 `runtime.registerReaction(...)`，没有在 React 层自行做监听、轮询、重试或缓存。
- **建议**: 保持现状。
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`

### [维度07] 表格行 scope 同步使用 `useLayoutEffect` 是合理的
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\use-table-row-scope-cache.ts:54-88`
- **严重程度**: P3
- **effect 职责**: 在绘制前同步 row scope，保证子行读取到最新 record/index
- **应归属层级**: React 层
- **现状**: 这是与渲染时序直接相关的 pre-paint 同步，使用 `useLayoutEffect` 符合行级作用域更新的要求。
- **建议**: 保持 `useLayoutEffect`，不要降级成普通 `useEffect`。
- **参考文档**: `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/renderer-runtime.md`

### [维度07] 复杂控件 namespace 发布放在 `useLayoutEffect` 合理
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:316-322`
- **严重程度**: P3
- **effect 职责**: 在页面级复杂控件挂载时注册 action namespace
- **应归属层级**: React 层
- **现状**: namespace 发布与页面宿主挂载生命周期绑定，且需要早于下游 layout 读取，放在 `useLayoutEffect` 合理。
- **建议**: 保持现状；不要改回 render 阶段或普通 `useEffect`。
- **参考文档**: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/renderer-runtime.md`
