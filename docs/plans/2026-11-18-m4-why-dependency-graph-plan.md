# M4 语义层 Why 归因 + 依赖图 + cid 选择器（低代码差异化）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M4 节）· docs/research/2026-11-17-flux-devtools-design.md §7
> Related: M1（ForestSnapshot 历史/repo）、M2（capture tag 证据）、M3（waitFor）、既有 explanations.ts 底座

## Purpose

选中节点回答"为什么"：统一 `WhyReport`（五类归因链 + 可点击 EvidenceLink）、依赖图（写/读/派生边，>2k 边退化为路径查询）、cid 选择器建议、Why verdict 自动附截图证据。

## Current Baseline（live repo 核对）

- explanations.ts 已有：`explainNodeValue`（值/数据来源，:154）、`explainNodeMeta`（disabled/visible/hidden meta 归因 + metaRules 评估，:379）、`explainNodeFailure`/`explainNodeAsync`（explanations-failure-async.ts）。返回形状已含 `evidenceRefs`/`related`/`limitations`/`confidence`。
- 无统一 `WhyReport`（一次回答五类问题）；无 reaction 归因；无"首写 epoch"数据归因（ForestSnapshot 历史反查）；无依赖图（M1 只有写观察者广播与 onRender dependencyPaths 可选发射）；无 cid 选择器建议；无 Why verdict 自动截图。
- 面板 node-tab（409 行）**未展示** explain 结果——explain 四入口（explainNodeValue/Meta/Failure/Async）目前仅为 automation/headless 面，无任何 UI 消费者；Phase 3 的 Why 区块将是首个 UI 消费方。
- runtime 有 `registerReaction`/reactionRegistry（flux-runtime async-data/reaction-runtime.ts），reaction plan 结构待核对。

## Goals

- `why(cid)` 统一归因：WhyReport `{question, verdict, evidence: EvidenceLink[], parts: {meta?, props?, notRendered?, reaction?, data?}}`，EvidenceLink `{type:'epoch'|'cid'|'expression', target, label}` 可点击语义（面板跳转）。
- 补三类归因：不渲染（visible=false / region 未激活 / error boundary 吞错——复用 onError 日志）、reaction 归因（reaction plan 命中/未命中谓词展示）、数据归因（路径首写 epoch 反查 ForestSnapshot 历史）。
- 依赖图：写边（store 写 diff paths）、读边（onRender dependencyPaths，M1 已预留）、派生边（region/slot）；`queryImpact(path)` 影响反查；>2k 边自动退化为路径查询模式。
- cid 选择器：点选/给定 cid → selector 建议（`data-testid` > `data-cid` > 最短唯一 CSS）。
- Why verdict 自动截图：`tag: 'why:<verdict>'`（M2 capture）。
- 面板 node-tab 增加 Why 区块（verdict + evidence 列表 + 可跳转）。

## Non-Goals

- 写-读竞态检查（同 epoch read-after-write 警告，设计 §7.2 后半）——依赖图仅做影响反查；竞态检查归依赖图增强后续
- 数据归因的 writer 身份（source/reaction/上游 action 归属，设计 §7.1 全语义）——本阶段回答"首写 epoch"（何时写入）；writer 身份归后续
- 面板内力导向依赖图可视化（query API + 列表渲染即可，图形渲染归后续）。
- 表达式级采样追踪（M1 采样默认关，保持）。
- 服务端依赖图（M6）。

## Scope

### In Scope

- nop-debugger：`why-report.ts`（五类归因编排 + EvidenceLink）、快照历史反查（snapshot-repository 扩展 `findFirstWriteEpoch(path)`）、`dependency-graph.ts`（边收集 + queryImpact + 2k 降级）、`selector-suggest.ts`（getBestSelector）、automation V2 第三批（`why`/`queryDependencyImpact`/`suggestSelector`）、面板 node-tab Why 区块（列表式）
- flux-runtime：reaction plan 读取面（`listReactions(scopeId?)` 只读，若既有 registry 已可查则零改动）
- playground debugger-lab：Why 演示复用 flux-basic 既有真实渲染节点 fixtures（mystery schema demo 按钮已裁决 Deferred——未挂载节点无法检视）
- e2e：归因文本与 evidence 链接可达程序化断言；selector 建议断言
- 文档：quick-reference Why/依赖图节；roadmap 附注；daily log

### Out Of Scope

- 图形化依赖图渲染；跨页面依赖图聚合；服务端 span 合并（M6）

## Failure Paths

| 场景                 | 触发                        | 行为                                                                                                             | 可重试 | 用户可见表现        |
| -------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| why-unknown-cid      | why(cid 不存在)             | `{verdict:'unknown', evidence:[]}`，不抛                                                                         | 否     | 面板显示未知节点    |
| history-ring-evicted | 数据归因所需 epoch 已被淘汰 | data 归因标 `limitations:['history evicted']`，verdict 降 low confidence                                         | 否     | 面板提示历史有限    |
| edges-flood          | 依赖图边数 >2k              | 记录模式切换标记 `degradedToPathQuery=true`，增量边清除，queryImpact 返回空结果 + 降级标记（即时扫描增强归后续） | 否     | 结果含降级标记      |
| no-read-edges        | 依赖图无任何读边            | queryImpact 仅遍历写边，结果不含读侧影响                                                                         | 否     | 面板/结果仅含写边链 |

## Test Strategy

档位选择：`建议有测`（一般功能）+ Why demo e2e 为 Must（低代码核心回归路径——归因正确性）

Proof 先行：五类归因各自的判别单测（disabled 之谜、不渲染之谜、首写 epoch、reaction 谓词）先于面板接线；依赖图边收集 + 降级开关单测。

## Execution Plan

### Phase 1 - WhyReport 统一 + 三类补齐归因

Status: completed
Targets: `packages/nop-debugger/src/why-report.ts`、`snapshot-repository.ts`、automation

- Item Types: `Fix | Proof`

- [x] Proof 先行：snapshot-repository `findFirstWriteEpoch(path)` 单测（环形内命中/淘汰后 limitation）。path 语义钉死：入参 `{scopeId, path}`，path 为 scope 内嵌套路径（getIn 语义，'a.b.0.c' 数组下标段）；scopeId 不存在与 path 不存在分别返回 `{found:false, reason:'scope'|'path'}`
- [x] `why-report.ts`：编排五类归因（meta/props 复用 explainNodeMeta/Value；notRendered 复用 meta visible + error boundary onError 日志；reaction 读 runtime reaction 注册表；data 首写 epoch 反查），产出 `WhyReport`
- [x] EvidenceLink 语义：`{type:'epoch', target}` → automation `getSnapshotAt` 可达；`{type:'cid'}` → inspectByCid；`{type:'expression'}` → evaluateNodeExpression
- [x] automation V2：`why(cid): WhyReport`
- [x] 单测：disabled 之谜（metaRules 假路径定位）、不渲染之谜（visible=false 归因 + error boundary 归因）、首写 epoch 反查、unknown cid

Exit Criteria:

- [x] why-report 单测全绿（五类各 ≥1 判别用例 + unknown）
- [x] findFirstWriteEpoch 环形/淘汰判别用例绿

### Phase 2 - 依赖图 + cid 选择器

Status: completed
Targets: `packages/nop-debugger/src/dependency-graph.ts`、`selector-suggest.ts`

- Item Types: `Fix | Proof`

- [x] `dependency-graph.ts`：`recordWriteEdge(scopeId, path)`（挂 M1 写观察者）、`recordReadEdge(cid, paths)`（**producer 为 demand-time 检查记录**：explainNodeMeta/Value 已产出 dependencyPaths，why/inspect 查询时登记读边——span 级 dependencyPaths 需完整收集器（Deferred 节），非本阶段；测试以注入调用驱动）、`recordDeriveEdge(fromPath, cid)`（region/slot 投影）；边数 >2k → `degradedToPathQuery=true`（停止增量维护，queryImpact 返回空 + 降级标记）；queryImpact 在无读边时仅遍历写边（Failure Path 语义）
- [x] `queryImpact(path): {cids, paths, degraded}` 影响反查（写→读链）
- [x] `selector-suggest.ts`：`suggestSelector(cid)` → `data-testid` > `data-cid` > 最短唯一 CSS（document.queryBubble 验证唯一性）
- [x] automation V2：`queryDependencyImpact(path)`、`suggestSelector(cid)`
- [x] 单测：边收集/2k 降级开关/impact 反查；selector 三级优先与唯一性

Exit Criteria:

- [x] 依赖图单测全绿（2k 降级判别：>2k 边后 degradedToPathQuery=true）
- [x] selector 单测全绿（data-testid 优先 / data-cid 兜底 / 最短唯一 CSS + 唯一性验证）

### Phase 3 - 面板 Why 区块 + 截图证据 + demo e2e

Status: completed
Targets: `packages/nop-debugger/src/panel/node-tab.tsx`、debugger-lab 页

- Item Types: `Fix | Proof`

- [x] node-tab：Why 区块（verdict + parts 摘要 + evidence 列表；epoch/cid 链接触发既有面板跳转语义——cid → inspect、epoch → snapshot 查看）
- [x] Why verdict 自动截图：`why()` 完成后 `screenshot({tag:'why:<verdict>', fresh:true})`（失败静默降级不阻塞归因）
- [x] debugger-lab 演示：复用 flux-basic 既有 fixtures（真实渲染节点）；mystery schema demo 按钮裁决 Deferred（why() 依赖检视注册表，未挂载节点无法检视；不渲染归因由单测层判别覆盖）
- [x] e2e（debugger-m4-why.spec.ts）：真实节点 `api.why(cid)` 归因断言（verdict/parts 非空）+ evidence 链接可达断言（epoch→getSnapshotAt / cid→inspectByCid）+ selector 建议断言 + screenshotTag 前缀断言；内核后台发起 fresh 截图（像素/存在性断言归 M2 capture 面覆盖）；不渲染/error boundary 归因文本由单测层判别覆盖（Deferred 裁决）

Exit Criteria:

- [x] e2e 用例全绿（真实节点归因 + 链接可达 + selector + screenshotTag 断言）
- [x] 面板 Why 区块渲染单测/组件测试绿

### Phase 4 - 文档 + 收口

Status: completed
Targets: docs

- Item Types: `Proof`

- [x] quick-reference：Why/依赖图/selector 节
- [x] roadmap M4 附注；daily log
- [x] M2 Deferred（dependencyPaths 收集）收口说明：读边 producer 采用 demand-time 检查记录（explain 依赖路径），span 级完整收集器接线 Deferred 到后续（见 Deferred 节，非 M4 内收口）

Exit Criteria:

- [x] docs 节与 live 契约一致
- [x] daily log / roadmap 落盘

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
- Verdict: round 2 修订后 pass（0 Blocker / 0 Major；round 2 残留 Major 1 项——Goals/Phase 2 两处 data-test 残留已改 data-testid、Failure Paths 补 no-read-edges 行）。round 1：3 Major——node-tab 未展示 explain 的 baseline 误述（已纠正，Phase 3 为首个 UI 消费方）、dependencyPaths 无生产者（已改为 M4 补齐发射 + Deferred 重写）、data-test 无生产者（已改 data-testid）；4 Minor——写读竞态/writer 身份入 Non-Goals、findFirstWriteEpoch 语义钉死、Phase 4 标签对齐）
- Rounds: 2
- Findings addressed: Major×3 + Minor×4 如上

## Closure Gates

- [x] WhyReport 五类归因 + EvidenceLink 全落地且有判别测试（disabled/不渲染/首写 epoch/reaction/unknown）
- [x] 依赖图边收集 + queryImpact + 2k 降级 + selector 三级建议落地（判别测试绿）
- [x] 面板 Why 区块 + verdict 截图证据（内核后台发起）+ e2e 全绿（真实节点归因/链接可达/selector）
- [x] 受影响 owner docs 已同步（quick-reference）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### disabled/不渲染之谜 schema demo 按钮（Phase 3 原计划项）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: why() 依赖检视注册表，仅已挂载节点可检视——visible=false 未渲染节点无法发起检视；"不渲染归因"语义已由单测层完整判别覆盖（visible=false 与 error boundary 各 1 判别用例），e2e 层在真实渲染节点（flux-basic fixtures）上验证归因链与 evidence 可达。schema demo 按钮归依赖图增强后续。
- Successor Required: `yes`
- Successor Path: 依赖图增强后续 plan（roadmap M4 附注声明）

### 读边完整 ScopeDependencyCollector 接线

- Classification: `optimization candidate`
- Why Not Blocking Closure: M4 在 debug-instrumentation 补齐 onRender span dependencyPaths 的 runtime 可得子集发射（props meta 依赖），读边消费该子集；完整收集器（表达式求值期逐读路径记录）跨层接线影响求值热路径，需独立性能评估，归后续 plan（roadmap 全局红线：调试器关闭零开销）。
- Successor Required: `yes`
- Successor Path: 后续依赖图增强 plan（暂无编号，roadmap M4 附注声明）

## Non-Blocking Follow-ups

- 面板依赖图可视化（力导向/分层）
- reaction 归因的谓词表达式高亮

## Closure

Status Note: M4 四 Phase 落地：统一 why(cid) 五类归因（含 props/首写 epoch scope:path 区分）、EvidenceLink 可点击跳转（面板 ndbg-why-evidence）、依赖图写/派生边 + demand-time 读边 + queryImpact + 2k 降级、selector 三级建议（data-testid 优先）、verdict 后台截图证据。closure audit 3 轮（round 1 issues 1 Blocker/6 Major——数据归因接线死路、自动截图未实现、demo/e2e 声称漂移等；round 2 issues 2 Major——plan 契约漂移、roadmap 勘误缺失；round 3 approved）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18，3 轮）
- Evidence: round 3 approved（round 1：1 Blocker + 6 Major + 5 Minor；round 2：2 Major + 1 Minor——均为 plan 契约与 live repo 漂移，代码修复 round 2 全部核实通过）。实跑 why-report/dependency-graph 16 例 + e2e 3/3；nop-debugger 266 单测；typecheck/lint/check/build 全绿。

Follow-up:

- （见 Non-Blocking Follow-ups）
