# 85 diff-view Component Handle 与 Reaction 通道死接线 — useImperativeHandle 运行时不可达 + CX-9 reaction 未激活

## Problem

`diff-view` 的两条运行时集成通道在真实 Flux runtime 中全部失效（单测绿但真实浏览器失败——bug 73 模式）：

1. **ComponentHandle 不可达（P1-8）**：渲染器用 `useImperativeHandle(ref, ...)` 暴露 `DiffViewHandle`（toggleViewType/setViewType/expandAll/collapseAll），但 flux-react 运行时渲染 renderer 组件时不传 `ref`（`node-renderer-resolved.tsx:426` `<Comp {...componentProps} />`，`componentProps` 无 ref 键）——`component:toggleViewType` 等（design §8 声明的组件能力面）在真实运行时 resolve 不到 handle，报 "Component handle not found"。单测直接传 ref 渲染故全绿（假绿）。
2. **CX-9 reaction 通道未激活（P1-4）**：注册定义声明 `toggleViewType`/`setViewType`/`expandAll`/`collapseAll` 为 `kind:'reaction'`（content-renderer-definitions.ts:530-533），runtime 依此创建 `ReactionHandle`（`props.reactions`），但句柄初始为 `initial-paused`（`renderer-reaction-handle.ts:91`），必须由渲染器调 `ready()` 才激活（CRUD 先例 `crud-renderer-state.ts:710`）。diff-view 从不消费 `props.reactions` → 反应字段永不 fire（死声明）。

## Diagnostic Method

- C6.5 审计 dim 2/22：grep 确认 flux-react 无 useImperativeHandle/ref 适配；`runtime-scope-actions.test.ts:206` 证明 component 动作只能经 `componentRegistry.register` 的 handle 到达。
- 对照同族先例：carousel（C6.4 O-03/F6）已迁 `useCurrentComponentRegistry` + `componentRegistry.register`（carousel.tsx:175-216）。
- 重写假绿测试（原 `[data-diff-type="added"]`/`[data-diff-hunk-action="expand"]` 选择器永不匹配）后，handle 断言抛 "no handle registered"、reaction ready 断言 0 次调用——实证死通道。

## Root Cause

- diff-view 使用旧式 ref-handle 模式，而框架的 React 集成通道是 componentRegistry（hooks: `useInputComponentHandle`/`useSurfaceComponentHandle`/`useCompositeFieldHandle`，渲染器自注册 handle{capabilities.invoke/hasMethod/listMethods}）。
- reaction 字段声明后缺渲染器侧激活义务（ready()），机制（CX-9，C4.2 收口）正确但本组件未消费。

## Fix

- **P1-8**：`diff-view-renderer.tsx` 迁 carousel O-03 模式——`useCurrentComponentRegistry()` + `componentRegistry.register(handle, {cid})`（effect 内构造，state 经 `viewTypeRef` 读取保持句柄身份稳定）；`capabilities.invoke` 实现四方法（setViewType 校验 viewType ∈ split/unified，非法返回 ok:false）；移除 `useImperativeHandle`/`DiffViewHandle`/`ref` prop。
- **P1-4**：mount effect 对 schema 提供的 reaction handle 调 `ready()`（`reactions[key]?.ready()`，仅激活声明的字段）。
- 单测：diff-view-renderer.test.tsx 重写 handle 测试为 registry 模式（mock useCurrentComponentRegistry + lastHandle），新增 ready() 激活断言、setViewType 非法值拒绝、expandAll/collapseAll data-expanded 真值断言。

## Tests

- `packages/flux-renderers-content/src/diff-view/__tests__/diff-view-renderer.test.tsx` — 13 个用例先红（13 failed，test-first 证据）后绿；新增/重写：handle 注册与四方法、toggleViewType/setViewType invoke 行为、reaction ready() 激活、hunk data-diff-type/onHunkExpand 真实 payload。
- Phase 3 宿主实证：`tests/e2e/component-lab/c6-5-host-surfaces.spec.ts` host-diff-reaction（schema `toggleViewType: {action:'component:toggleViewType', componentId, dependsOn:['toggle']}` + setValue 驱动 scope → data-view 翻转）。

## Notes

- 同型旧模式残留：gantt/calendar（scheduling 包，C9 范围）仍用 useImperativeHandle + 不消费 reactions——记 CR/C9 观察（见审计卡 dim 22）。
- 验证：`pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（279 tests）。
