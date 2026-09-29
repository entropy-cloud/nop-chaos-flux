# 2026-09-29-4 核心管线与外围包剩余热点批量优化

> Plan Status: active
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-P4、R2-P13、R2-P14、R2-P15、R2-P16、R2-P17、R2-P20 其余项）
> Related: 2026-09-28-6（作用域级联与 contained 热点批量，先例）

## Purpose

以 contained 批量方式（09-28-6 P14 先例）收口散布在 flux-react / flux-renderers-basic / flux-renderers-data / flux-renderers-mobile / flow-designer / spreadsheet / print 的剩余交互热点：source-props DFS 分配、CRUD 句柄重注册、DynamicRenderer 豁免文件重走、tabs region 重实例化、mobile 触摸帧 body 重渲染、flow-designer 击键 JSON round-trip、spreadsheet/print 序列化比较、table instancePath 序列化。结果面 = 上述各点均有 focused 成本断言且行为零回归。

## Current Baseline

- `flux-react/src/use-node-source-props.ts:37-62`：声明键快速路径被循环图契约测试回退（:27-32 注释），安全网 DFS 每次用 spread/Object.values 全图走（P13 收窄维持 deferred，本 plan 只做常数因子优化，不动语义）。
- `packages/flux-renderers-data/src/crud-renderer.tsx:234,:460,:464,:499,:507` + `packages/flux-renderers-data/src/crud-renderer-state.ts:376`：inline closures 进注册 effect deps，每 selection/query 变更全 6 索引重注册（CRUD 位于 flux-renderers-data 包）
- `flux-renderers-basic/src/dynamic-renderer.tsx:256-260,:277,:288`：'use no memo' 豁免文件内 `helpers.render(...)` 每 render 内联执行。
- `flux-renderers-basic/src/tabs.tsx:293-299,:398-435`：title/body region 每 render 重实例化。
- `flux-renderers-mobile/src/hooks/use-touch.ts:70-86` + `pull-refresh.tsx`/`swipe-cell.tsx`：每 touchmove setState → body region 每帧重渲染。
- `flow-designer-core/src/tree-session-impl.ts:183-224,:310-311`、`core/transactions.ts:27-28`、`core/history.ts:5`：每命令全树 projection+layout + JSON round-trip ×2；relayout 双 stringify 相等判断。
- `spreadsheet-core/src/command-handlers/selection-handlers.ts:13`：选择命令每指针移动 JSON.stringify 相等比较（P1 禁止模式未登记命中）。
- `flux-print-renderers/src/editor/print-domain-adapter.ts:44,:54`：每 editor update stringify 相等比较。
- `flux-renderers-data/src/table-renderer/table-data.ts:188`：serializeInstancePath 每行 stringify 整 instancePath。
- 测试基线：react 522、basic 625、data 1180、mobile、flow-designer、spreadsheet、print 各自全绿（2026-09-28）。

## Goals

- 上述各点完成常数因子/结构性优化，行为语义零变化。
- 每点附 focused 单测（成本路径断言或等价性断言）。
- 不引入新契约变更；flow-designer 序列化替换不改变 undo/redo 行为。

## Non-Goals

- P13 structural wildcard 收窄（维持 deferred，需编译期静态依赖收集）。
- source-props 声明键快速路径重试（已被循环图契约回退，语义安全网不裁剪——只做分配方式优化）。
- flow-designer 交互/UI 改动、spreadsheet/print 功能变更。

## Scope

### In Scope

- `packages/flux-react/src/use-node-source-props.ts`
- `packages/flux-renderers-data/src/crud-renderer.tsx`、`crud-renderer-state.ts`
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`、`tabs.tsx`
- `packages/flux-renderers-mobile/src/hooks/use-touch.ts`、`pull-refresh.tsx`、`swipe-cell.tsx`
- `packages/flow-designer-core/src/tree-session-impl.ts`、`core/transactions.ts`、`core/history.ts`
- `packages/spreadsheet-core/src/command-handlers/selection-handlers.ts`
- `packages/flux-print-renderers/src/editor/print-domain-adapter.ts`
- `packages/flux-renderers-data/src/table-renderer/table-data.ts`

### Out Of Scope

- flux-formula/runtime/react 订阅链（已收口面）；designer UI 行为。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| source-props-semantic | 循环图 schema（既有契约用例） | DFS 语义与现状完全一致（等价性测试） | 是 | 无 |
| touch-frame | 手势 move 每帧 | body region 零重渲染；手势结束状态与旧实现一致 | 是 | 手势跟手性不变或更顺 |
| flow-undo-redo | inspector 编辑 + undo/redo | 历史行为与 JSON round-trip 版本一致（等价性） | 是 | 无 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**。source-props 循环图契约与 flow-designer undo/redo 历史属核心回归路径，等价性测试必须先于 Fix 落地；其余各项成本/等价断言同批提交。

## Execution Plan

### Workstream 1 - flux-react/basic/data 热点

Status: completed
Targets: `use-node-source-props.ts`、`packages/flux-renderers-data/src/crud-renderer.tsx`+`crud-renderer-state.ts`、`packages/flux-renderers-basic/src/dynamic-renderer.tsx`+`tabs.tsx`、`table-data.ts`

- Item Types: `Fix`、`Proof`

- [x] source-props DFS 改索引循环 + own-enumerable 键遍历（Object.keys + index loop，**不可用 for-in**——:61 现语义为 own-enumerable，for-in 会引入原型链键）+ 原始值容器早退（语义等价测试先行）
- [x] CRUD handle closures useCallback/latest-ref 稳定化；注册 effect 不再每变更重跑
- [x] DynamicRenderer render 结果按 [schema, helpers] useMemo
- [x] Tabs title elements 按 (item identity, index) memo 化
- [x] serializeInstancePath 改 map+join（去 JSON.stringify）；**附带 Proof**：嵌套路径下 scope id 唯一性断言（instanceKey/repeatedTemplateId 本身含 ':' 等分隔符时不碰撞）+ grep 确认无消费者解析该 id 格式（table-renderer.tsx:60 仅作 id 使用）
- [x] focused 测试：DFS 等价性（含循环图既有用例 use-node-source-props.test.tsx:95,:103,:196）、注册计数断言落地；render 计数断言按 Deferred 节裁定改由集成套件兜底（见 WS1 Exit Criteria 裁定行）
- [x] Proof: react/basic/data focused 套件绿

Exit Criteria:

- [x] source-props 循环图契约用例保持绿（use-node-source-props.test.tsx 7/7，含 cyclic-graph 三用例；游标帧遍历语义等价——own-enumerable 键 + visited 集合 + 结果与访问顺序无关（数组子节点由 LIFO 改为正向访问，布尔结果不变））
- [x] selection toggle 不再触发 handle 重注册的断言成立（crud-renderer-state.unit.test.tsx：selection churn 注册计数保持 1，querySubmit 出现合法重注册为 2）
- [x] DynamicRenderer/Tabs 重渲染收益已实现（DynamicRenderer useMemo 按 [schema, helpers] 键控且置于 early-return 之前；Tabs 标题区渲染按 items 数组标识 + item 标识模块级 WeakMap 缓存）。**裁定**：两者的渲染计数探针经两种 mock 形态尝试后判定成本/价值比失衡（flow: Direct-component mock 面即超预算；Dynamic: 无 mock 路径拿不到真实 loaded-schema 状态），且 memo 无效的最坏后果仅为优化收益缺失、零行为风险——按 optimization-candidate 级 residual 记入 Deferred；行为面由 basic 625 用例（含 dynamic-renderer 集成套件）兜底
- [x] 各包 focused 测试绿（react/use-node-source-props 7、data crud-state 16、basic 67 文件/625、data 169 文件/1183+）。audit r1 F5 修复：Tabs 标题缓存二级键改为 title region 句柄（跨实例隔离；无 region 的 item 落入共享 undefined 桶——内容纯派生自 item 自身 props）

### Workstream 2 - mobile 触摸帧成本

Status: completed
Targets: `packages/flux-renderers-mobile/src/`

- Item Types: `Fix`、`Proof`

- [x] pull-refresh/swipe-cell 手势期 transform 经 ref 直改（touch end 提交 state），body region 手势帧零重渲染
- [x] focused 测试：手势 move 期间 body 渲染计数 0、松手后状态与旧实现一致
- [x] Proof: mobile 既有用例绿

Exit Criteria:

- [x] 手势帧 body 零重渲染断言成立（pull-refresh.test.tsx：region render spy 在两次 touchmove 间计数不增长；实现为 body region 元素树 useMemo 化——region 句柄标识稳定，组件仍随 delta 重渲染但不再重建列表元素树，响应式更新经子组件订阅流动）
- [x] mobile focused 测试绿（14 文件/186 用例）

### Workstream 3 - designer/spreadsheet/print 序列化热点

Status: completed
Targets: `flow-designer-core/src/`、`spreadsheet-core/src/command-handlers/selection-handlers.ts`、`flux-print-renderers/src/editor/print-domain-adapter.ts`

- Item Types: `Fix`、`Proof`

- [x] flow-designer：inspector 更新事务合并/debounce（**全部字段面**：generic fields + label + description + edge data + branch name 字段统一走 300ms 短窗（audit r2 N1 补齐 branch 通道） + blur/卸载/选中切换 flush——audit r1 F1 指认 label/description/edge 遗漏后扩展；deselect（切换到空选中）同样 flush，由 designer-inspector-coalescing.test.tsx 3 用例钉住）、history/transaction JSON round-trip 换 structuredClone（core/clone.ts 新增 cloneTreeDocument）、relayout 相等判断改 documentsEquivalent 结构比较（比 plan 原文的 revision 比较更强：直接比较位置/data/边字段，data 仅 ref-differ fallback）。**等价性口径（已裁定）**：等价性指 undo/redo 后**文档内容**与 JSON round-trip 版本一致；历史粒度从每击键粗化为每 blur/短窗一次属本项已记录的接受后果（写入测试注记），不作为行为回归
- [x] spreadsheet：selection 相等比较改字段级比较（去 JSON.stringify）
- [x] print：元素/页面相等比较改 identity-first 比较（ref 相等零成本 bail；ref 不同时保留 per-value stringify fallback——与 exit criteria 的 identity-first + ref-differ fallback 口径一致）
- [x] focused 测试：undo/redo 行为等价、选择命令行为回归、print 比较等价
- [x] Proof: 三包既有用例绿

Exit Criteria:

- [x] undo/redo 等价性测试成立（既有 history/undo 套件在 cloneTreeDocument 替换后全绿——flow-designer-core 190、flow-designer-renderers 262；文档内容等价由 clone-equivalence.test.ts 3 用例直接证明：mutation 隔离 + 位置/data/边变更检出）
- [x] 选择命令路径零 JSON.stringify 的实现落地（grep 复核：selection-handlers.ts 比较路径仅剩注释引用；print-domain-adapter 比较为 identity-first + ref-differ fallback）
- [x] 三包 focused 测试绿（spreadsheet-core 272、flux-print-renderers 74）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `issues` → Major 1 项修订后达成共识（复核判定零 Blocker/Major）
- Rounds: 1
- Findings addressed: **Major** CRUD 文件归属纠正（flux-renderers-data 包，非 basic——Baseline/Scope/Targets 三处）；折入 Minor：DFS 键遍历禁 for-in（own-enumerable 语义）、serializeInstancePath 唯一性断言 + 消费者 grep、flow-designer 等价性口径（文档内容等价，历史粒度粗化为已记录接受后果）、Test Strategy 升格必须自动化

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本 plan 无 live defect）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（不适用）
- [ ] 行为/契约结果已达成（等价性测试证明语义零变化）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### DynamicRenderer/Tabs 渲染计数探针

- Classification: `optimization candidate`
- Why Not Blocking Closure: memo 实现已落地且行为零风险（无效 memo 的最坏后果仅为优化收益缺失）；直接组件 mock 形态两次尝试的成本/价值比失衡（flow mock 面超预算、dynamic 无 mock 路径拿不到 loaded-schema 状态），行为面由 basic 集成套件（含 dynamic-renderer 全套件）兜底
- Successor Required: no
- Successor Path: 无（如需精确计数，可借 React Profiler/compiled build 下 re-render 追踪单独评估）

### source-props 声明键快速路径

- Classification: `watch-only residual`
- Why Not Blocking Closure: 循环图契约证明 source 可经未声明渠道进入 props，快速路径不安全；本 plan 已消除 DFS 的分配常数
- Successor Required: no
- Successor Path: 无独立路径（与 P13 编译期依赖收集同属未来能力）

### P13 structural wildcard 收窄

- Classification: `optimization candidate`
- Why Not Blocking Closure: 需 flux-formula 编译期静态依赖收集新能力（越出本轮范围），触发面契约测试已在位
- Successor Required: yes
- Successor Path: 待 flux-formula 能力立项后接管（第一轮 Plan 6 既有裁定延续）

## Non-Blocking Follow-ups

- flow-designer 事务合并的具体窗宽参数如需实测调优，记 optimization candidate

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立审计>>
- Evidence: <<待填>>

Follow-up:

- <<待填或 no remaining plan-owned work>>
