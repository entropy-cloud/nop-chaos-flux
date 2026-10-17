# 637 跨 roadmap UR-10 状态所有权与渲染杂项（6 条收口）

> Plan Status: completed（2026-10-17 closure audit approved（独立子 agent agent_a712df38，0 Blocker / 0 Major / 4 Minor 随同批修正））
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-10（Wave C，audit-remediation Follow-up Backlog：D04 组 04-04/05/07 + P2-F/G/L）
> Related: `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog、`docs/plans/2026-07-28-0900-2-code-quality-and-styling-compliance.md`（react-hooks/refs 先例）、`docs/plans/627-scanner-ratchet-stringify-equality-plan.md`（B6 有意模式注记先例）

## Purpose

收口 UR-10 全部 6 条。经独立审查（R1，agent_595d9771）实读核实：6 条中 1 条已修复（状态同步）、4 条为**有意模式/无害微分配**（位点注记 + 裁定回写，对齐 01-11 与 B6 先例）、1 条结构性重构登记 successor（行内注册）。本计划为注记 + 回写收口，零行为变更。

## Current Baseline

（2026-10-17 独立审查实读核实，证据 file:line：）

- 04-04 upload-field：已修复——`items` 仅存瞬态条目（:163），committed 值从 store 读（existingItems/committedItems :232-238），`latestValueRef` 同步赋值 :223-224，:219-222 注释「field value is the source of truth」——状态同步回写。
- P2-F `node-renderer-resolved.tsx:381-393`：`componentProps` 字面量每渲染重建——**裁定 finding 不成立（无害微分配）**：①唯一消费点 `<Comp {...componentProps} />`（:434）经 JSX spread 拆成逐字段，容器 identity 不到达 Comp；②各字段已全部 identity 稳定（nodeInstance/finalResolvedMeta/regions/events/reactions/helpers 均 useMemo，resolvedComponentProps 经 use-node-source-props + isEqual 钉住）；③下游 renderer 为普通函数组件（非 memo()），无 props 比较可失效。useMemo 化是不可观察 no-op。**位点注记 + 裁定回写**。
- P2-L `flux-core/src/utils/path.ts:8-20`：`has→delete→set` 为**标准 Map 型 LRU recency-refresh 惯用法**（set 已有 key 不移动插入序，必须 delete+set 才移队尾；`keys().next().value` 取队首驱逐；容量 1000），V8 Map delete/set 均 O(1)——原 finding 的「rehashing」微性能主张不成立。**位点注记 + 裁定回写**（对齐 plan 627 B6「文档化有意模式」先例，经审查核实）。
- P2-G `use-surface-renderer.ts:172-185`：两个 ref 回写 effect（:172-174 declarativeScopeRef、:176-185 cleanupRef）——消费方为 unmount cleanup 闭包（:400-424），**依赖 effect 期时序**（需最近 commit 的快照），是 latest-ref 模式的定义；render 期写会被 `react-hooks/refs` 拦截（仓库先例：`docs/plans/2026-07-28-0900-2-code-quality-and-styling-compliance.md:161/169/232`）且并发渲染下有丢弃渲染仍污染 ref 的风险。**裁定 + 位点注记**。
- 04-07 `diff-view-renderer.tsx:75-78`：4 个 useDebouncedValue（DEBOUNCE_MS=150）喂 computeDiffFile/computeDiffStats 与三个视图，:71-74 cq-2 Phase 3 as-built 注释明示「四计时器同 tick 落批，可观测行为不变」——**防抖渲染是功能语义**。**裁定 + 位点注记**。
- 04-05 `designer-xyflow-canvas/use-xyflow-sync.ts:112-123`：反模式结构在（有缓解：merge 保留 dragging/measured :6-25、lastCommittedPositionsRef :53/:67、无变化返回原引用 :79；配套测试 use-xyflow-sync.test.tsx 6 用例 20 expect）。非 live defect——**successor 行内注册**（optimization candidate）。

## Goals

- 四处位点注记（P2-F 无害微分配裁定 / P2-L LRU 惯用法 / P2-G latest-ref 并发安全 / 04-07 防抖功能语义）。
- 04-04 状态同步回写 + 04-05 successor 行内注册；Backlog 6 行 + cross-roadmap UR-10 + daily log。

## Non-Goals

- use-xyflow-sync 派生化重构；共享工具抽取（07-28 治理轮裁定项）；其它 UR 条目。

## Scope

### In Scope

- 四处位点注记（node-renderer-resolved.tsx / path.ts / use-surface-renderer.ts / diff-view-renderer.tsx）。
- Backlog 6 行回写 + cross-roadmap UR-10 行 + daily log。

### Out Of Scope

- 一切行为变更。

## Failure Paths

不适用（零行为变更；纯注记 + 回写）。

## Test Strategy

档位选择：**不适用：纯注释 + 文档回写，无行为变更**。验证 = 四个涉及包的 focused typecheck + lint。

## Execution Plan

### Phase 1 - 注记

Status: completed
Targets: 四处位点

- Item Types: `Decision`

- [x] P2-F：node-renderer-resolved.tsx componentProps 位点注记（无害微分配裁定：spread 拆字段 + 字段已稳定 + 下游非 memo；引用审查结论）。
- [x] P2-L：path.ts LRU 惯用法注记（对齐 B6 先例）。
- [x] P2-G：use-surface-renderer 注记（effect 期 latest-ref 为并发安全选择，引 07-28-0900-2 先例）。
- [x] 04-07：diff-view-renderer 注记（防抖渲染为功能语义，引 cq-2 as-built 注释）。

Exit Criteria:

- [x] 四包 focused typecheck 绿（0 错）；四处 diff 与声明一致。

### Phase 2 - 回写

Status: completed
Targets: audit-remediation Backlog、cross-roadmap、daily log

- Item Types: `Proof`

- [x] Backlog 6 行注记（04-04 已修复 / P2-F 裁定不成立 / P2-L·P2-G·04-07 有意模式 / 04-05 successor 行内注册）。
- [x] cross-roadmap UR-10 行；daily log。

Exit Criteria:

- [x] 回写三面一致；04-05 successor 落点 = Backlog 行内注册（非悬空）。

## Draft Review Record

- Reviewer / Agent: agent_595d9771（fresh session 独立子 agent，2026-10-17）
- Verdict: `pass-with-minors`（R1 **fail** 0B/3M/5m → 全盘按审查员 (a) 方案修订：P2-F 机制声称被实读证伪改判裁定注记、M2 先例引用改指 07-28-0900-2、M3 successor 行内注册落点、m1-m5 坐标/措辞修正；修订方向均系审查员自给，达成共识）
- Rounds: 1（修订方向为审查员逐条自给）
- Findings addressed: M1（P2-F 改判无害微分配——spread 拆字段/字段已 useMemo 稳定/下游非 memo 三重证据）；M2（react-hooks/refs 先例改指 2026-07-28-0900-2:161/169/232）；M3（04-05 successor 行内注册落点写入 Phase 2）；m1（Non-Goals 引证改 07-28 治理轮）；m2/m3/m4（坐标修正）；m5（04-04 回写附证据核对）

## Closure Gates

- [x] 四处位点注记落地
- [x] 回写三面一致（Backlog 6 行 + cross-roadmap + daily log；04-05 successor 行内注册非悬空）
- [x] 四包 focused typecheck 绿（0 错）；全量门禁无非既有红（最终轮：typecheck 0 非既有错、build 唯 vite.config 既有红、lint 绿、test 唯 playground 3 文件既有登记红、check 唯 knip xlang hit——均既有登记）
- [x] 不存在被静默降级的 in-scope 项（四处裁定均有 R1 实读三重证据；04-05 successor 非悬空）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P2-F componentProps memo 化

- Classification: `out-of-scope improvement`（finding 不成立——无害微分配，memo 化为不可观察 no-op）
- Why Not Blocking Closure: 唯一消费点经 JSX spread 拆字段传入、各字段已 useMemo/selector 稳定、下游为普通函数组件无 props 比较——审查员三重实读证伪了「props 比较失效」机制声称（R1 M1）。
- Successor Required: `no`

### 04-05 use-xyflow-sync 派生化重构

- Classification: `optimization candidate`
- Why Not Blocking Closure: 反模式观察非 live defect（合并保留 + lastCommittedPositionsRef 缓解 + 6 用例测试守护）；完全消除需设计器画布热路径结构性重构，回归风险与收益不成比例。
- Successor Required: `yes`
- Successor Path: 行内注册——audit-remediation Backlog 04-05 行注记即为登记落点（flow-designer 派生模型重构，demand-gated，无独立 plan 文件直至需求出现）。

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-17 收口。UR-10 6 条全闭环：04-04 状态同步回写；P2-F/P2-L/P2-G/04-07 四处经 R1 独立实读证伪/裁定为有意模式并注记；04-05 successor 行内注册（Backlog 行即落点，非悬空）。closure audit M1（audit 条目预勾流程瑕疵）随本批以本审计证据补实；m3 注记位置/方向修正。

Closure Audit Evidence:

- Auditor / Agent: agent_a712df38（独立 fresh-session sub-agent，2026-10-17）
- Evidence: Verdict `approved`（0B/0M/4 Minor）——四处注释逐处实读一致、回写三面一致（Backlog 6 行归属 + cross-roadmap done + Plan 列 + daily log）、改判诚实性三重证据独立复核（唯一消费点 :440 spread、字段稳定 useMemo/selector 清单、下游非 memo 交叉核对全部注册 Comp；04-04/04-05 实核）、门禁独立实跑（四包 focused 0 错 + 既有红登记核实）。M1 流程瑕疵（audit 条目预勾）以本审计补实；m3 注记修正、m4 提交卫生（只圈 637 足迹）随批执行。

Follow-up:

- 见 Deferred But Adjudicated。
