# `kind:'reaction'` Fields Must Be Wired: ready() + ComponentHandle（reaction 接线）

## Problem Context

definition 中声明 `kind:'reaction'` 的字段（如 crud `loadAction`、content 族 toggleViewType/setViewType/expandAll/collapseAll、scheduling 族 zoomIn/zoomOut/scrollToToday/scrollToTask/print/exportPNG/importICal/exportToICal）若渲染器不消费 `props.reactions`、不注册 ComponentHandle，则：① `dependsOn` 反应式 force() 的**结果被反应注册表吞掉**（fetch 发出但渲染器拿不到数据）；② `component:*` action 不可解析（无句柄可调）。

## Initial Judgment

"声明了 reaction 字段 = 作者能用"——定义注册完成即视为契约成立；或"dependsOn 触发能发请求就行，结果渲染器自己 fetch"。

## Why It Looked Plausible

- `kind:'reaction'` 与普通 action 字段（`kind:'action'`）同为 schema 声明，注册后编辑器/校验都通过；
- force() 派发在单测里"发出了 fetch"（网络层可见），rows 未更新这类**结果丢失**在 jsdom 断言面上不显眼；
- ComponentHandle 注册是运行时能力（useImperativeHandle 存在但 flux-react 不传 ref），静态核对容易漏。

## Why It Was Wrong

reaction 通道有专属生命周期：`props.reactions[key]` 是 lazy proxy，需渲染器显式 `ready()` 激活并捕获结果（`renderer-reaction-handle.ts` 的 `__setLoadCallbacks`/`__setScopeOverride`/`__setIgnoreWritesTo` 扩展点）；`useImperativeHandle` 句柄不进 componentRegistry 时 `component:*` 解析不到（diff-view P1-8，bug 85）。声明 ≠ 接线，未接线的 reaction 字段是**静默死契约**。

## Decisive Evidence

- `docs/bugs/79`：crud loadAction——force() dispatch 结果被吞，rows 永不更新；修复经 `__setLoadCallbacks` 统一结果捕获 + `__setScopeOverride` scope 投影 + `dispatch()` honor ctx.scope；
- diff-view P1-4（4 个 reaction 字段 ready() 激活）+ P1-8（`useCurrentComponentRegistry` + register handle，移除 useImperativeHandle）；
- CX-12：gantt/calendar reaction 字段 ready() + header 按钮派发 + 句柄注册，test-first 各组件 regression + c9-host-surfaces `${_taskId}` 实证。

## Correct Decision Rule

**definition 声明 `kind:'reaction'` 的字段必须三件套落地**：渲染器 `reactionsRef` 捕获 + `reactions[key].ready()` 激活（含结果捕获/scope 投影语义）+ `useCurrentComponentRegistry` 句柄注册（capabilities.invoke/hasMethod/listMethods）。三者缺一即视为未接线。

## Preventive Checklist

- 新增/修改 reaction 字段定义：对照渲染器逐一核对三件套（捕获/ready/注册）；
- 检查 `useImperativeHandle` 旧形态——flux-react 运行时传 ref 不成立，必须走 componentRegistry；
- `dependsOn` 场景：断言"force 触发 → 渲染器数据更新"（fetch 发出 ≠ 结果可见）；
- 宿主 e2e 至少 1 例 `component:*` 或 reaction 触发真机解析；
- 卡内新开 reaction 字段时在维度 7 明确接线证据（`文件:行`）。

## Related Files / Docs

- `docs/bugs/79-*.md`、`docs/bugs/85-*.md`
- `packages/flux-runtime/src/renderer-reaction-handle.ts`、`packages/flux-react/src/reaction-handle-proxy.ts`
- roadmap CX-9 / CX-12 行；`docs/audits/per-component/pc-index.md` CX-n 索引
- `docs/audits/component-audit-checklist.md` v2 维度 7
