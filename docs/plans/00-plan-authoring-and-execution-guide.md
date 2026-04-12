# Plan Authoring And Execution Guide

> Status: active workflow guide
> Last Reviewed: 2026-04-12
> Sources: `docs/logs/2026/03-31.md`, `docs/logs/2026/04-03.md`, `docs/logs/2026/04-04.md`, `docs/logs/2026/04-07.md`, `docs/logs/2026/04-08.md`, `docs/logs/2026/04-09.md`, `docs/logs/2026/04-10.md`

## Goal

这份指南只解决两件事：

- 计划怎么写才不容易缺项。
- 计划执行完后怎么审，才不容易漏 phase 或剩余工作。

`docs/plans/` 是执行文档，不是 ideas dump，也不是 architecture 的替代品。

## Lessons From History

从 `docs/logs/` 看，最常见的问题只有 5 类：

1. 没先审 current baseline，直接沿用旧计划或旧 completion note。
2. 一个计划过宽，后面不得不重写或拆分。
3. 只记录最近 landing 的改动，没有回头逐条核对整个 plan。
4. 剩余工作没有明确归属，导致计划看起来完成，实际上还有隐含 debt。
5. 把“最近一个 slice 已 landing”误当成“整份 plan 可关闭”，缺少独立 closure audit。
6. 看到接口、类型、方法名已经出现，就误判对应语义已经完整落地，没有继续核对 live behavior 和 focused tests。

所以本指南只保留最少规则，并把它们直接体现在模板里。

## Minimum Rules

1. 写计划前先核对 live repo，再写 `Current Baseline`。
2. 一个计划只负责一个明确结果面；过宽就拆成新 plan。
3. 必须有 `Goals` 和 `Non-Goals`，因为历史上真正稳定的计划几乎都靠这两段防止 scope drift。
4. 必须有 plan 级状态、execution-slice 级状态、validation checklist。
5. 不要求给 `Purpose`、`Scope`、`Risks` 这类说明段落单独标记完成状态。
6. 只有当前 scope 真正完成，且 leftover 已明确移出 debt，才能标 `completed`。
7. 旧 baseline 失效时，显式写 `Outdated Note`、`Supersession Note` 或 `replaced/superseded`，不要让多套 baseline 并存。
8. `completed` 必须来自单独的 closure audit，不要在完成最后一个编码 slice 的同时顺手宣布 plan 关闭。
9. 任何 execution slice 只要还有一项未完成、blocked、或未移出 scope，plan 就不能标 `completed`。
10. 如果目标本身是一个用户可感知的完整 feature，优先写成能收口该 feature 的完整实现计划；不要默认先拆成多个彼此依赖的零散计划，除非 live repo 证据已经表明该 feature 无法由一个 owner plan 清晰收口。
11. 关闭计划时，必须区分“contract surface 已出现”和“contract semantics 已落地”；前者不能替代后者。
12. 标记 `completed` 前，必须完成一次由独立审阅者或独立子 agent 执行的 closure audit，并把证据写进 plan 或对应 daily log。self-audit 可用于执行中的自查，但不能替代 `completed` 所需的独立 closure audit。

## Required Status Markers

### Plan-Level Status

每个 plan 顶部必须有：

- `> Plan Status: proposed | planned | in progress | partially completed | completed | superseded | replaced | deferred | cancelled`
- `> Last Reviewed: YYYY-MM-DD`
- `> Source: <<说明>>`

说明：

- `proposed` 适合已经成型但还未进入正式执行的计划。
- `superseded` / `replaced` 适合历史计划或已被新计划接管的计划。
- `deferred` 适合明确延后、不作为当前 active queue 的计划。

### Execution-Slice Status

每个 execution slice 都必须有自己的状态。slice 可以是顺序 `Phase`，也可以是并行 `Workstream`。

- `planned`
- `in progress`
- `completed`
- `blocked`
- `cancelled`

推荐做法：

- 顺序执行的计划：用 `Phase`。
- 可并行或按主题拆开的计划：用 `Workstream`。
- `## Phase Status` / `## Workstream Status` 总表是可选的，不是强制的；真正强制的是每个 slice 本身要写 `Status: ...`。

### Checklist Status

执行和验收项统一用 checkbox：

- 未完成：`[ ]`
- 已完成：`[x]`

## Template

下面这个模板就是默认格式。`<<说明>>` 保留为占位提示，写 plan 时直接替换。

历史核对后的结论：

- `Goals` / `Non-Goals` 应保留，它们在近期高质量计划里几乎是稳定项。
- `Phase Status` 总表不应强制，因为历史上很多好计划只有 slice 内状态，没有总表。
- `Phase` 与 `Workstream` 都应允许，取决于任务是顺序还是并行。

```md
# NN <<计划标题>>

> Plan Status: planned
> Last Reviewed: YYYY-MM-DD
> Source: <<关联 architecture / analysis / logs>>
> Related: <<相关计划，可选>>

## Purpose

<<这份计划要把什么收口到什么状态>>

## Current Baseline

- <<当前已经成立的事实>>
- <<已完成但旧文档/旧计划可能还没同步的事实>>
- <<真正剩余的 gap>>

## Goals

- <<这份计划要达成的结果>>
- <<这份计划要达成的结果>>

## Non-Goals

- <<明确不在本计划内的方向>>
- <<明确不在本计划内的方向>>

## Scope

### In Scope

- <<说明>>
- <<说明>>

### Out Of Scope

- <<说明>>
- <<说明>>

## Execution Plan

<<顺序任务用 Phase；并行任务用 Workstream。二选一即可，不要求同时使用。>>

### Phase 1 - <<名称>>

Status: planned
Targets: `<<文件/模块/文档>>`

- [ ] <<执行项>>
- [ ] <<执行项>>

Exit Criteria:

- [ ] <<完成判定>>
- [ ] <<验证点>>

### Phase 2 - <<名称>>

Status: planned
Targets: `<<文件/模块/文档>>`

- [ ] <<执行项>>
- [ ] <<执行项>>

Exit Criteria:

- [ ] <<完成判定>>
- [ ] <<验证点>>

### Workstream 1 - <<名称>>

Status: planned
Targets: `<<文件/模块/文档>>`

- [ ] <<执行项>>
- [ ] <<执行项>>

Exit Criteria:

- [ ] <<完成判定>>
- [ ] <<验证点>>

## Validation Checklist

- [ ] <<行为/契约结果>>
- [ ] <<相关 docs/examples 已更新>>
- [ ] <<focused verification 已完成>>
- [ ] <<独立子 agent / 独立审阅者 closure-audit 已完成并记录证据>>
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<剩余工作归属到哪个 successor plan>>
- <<或者明确写 no remaining plan-owned work>>

## Optional Sections

- `## Problem`
- `## Root Cause`
- `## Risks And Rollback`
- `## Outdated Note`
- `## Supersession Note`
- `## Documentation Follow-Up`
```

## How To Use The Template

### When Drafting

1. 先写 `Current Baseline`，再写 phase。
2. 如果 `Out Of Scope` 写不清，说明 plan 还太宽。
3. 如果 `Goals` / `Non-Goals` 写不清，说明边界还不够硬。
4. 如果 slice 写不出 `Exit Criteria`，说明它还不够可执行。
5. 如果你正在规划的是一个完整 feature，先问自己这份 plan 是否真的能把 feature 收口；如果答案是否定的，再考虑拆成 successor plans，而不是一开始就把 feature 切碎。
6. `Exit Criteria` 尽量写成 repo-observable 结果：具体 API、具体行为、具体测试，而不是只写抽象语义。

### When Executing

1. 开始某个 slice 时，把它改成 `in progress`。
2. slice 完成后，把该 slice 的 `Status` 改成 `completed`，并勾掉对应 checklist。
3. 非执行性的说明段落不用打完成状态。
4. 如果只完成了类型/接口/方法壳，而语义或测试还没对齐，不要把 slice 标成 `completed`；这类情况通常应保持 `in progress` 或改成 `partially completed` 的 plan-level 状态。

### When Closing The Plan

关闭前必须做 6 件事：

1. 从头重读整份 plan，不只看最近 landing 的部分。
2. 逐条核对每个 slice 的 `Exit Criteria`。
3. 逐条核对 `Validation Checklist`。
4. 把剩余工作写进 `Follow-up`，明确 successor plan 或明确无剩余 debt。
5. 明确区分“接口存在”与“行为完成”，至少抽查一轮 live code path 和 focused tests，确认实现语义真的满足 exit criteria。
6. 由独立审阅者或独立子 agent 做 closure-audit，并在 plan 或对应 daily log 中记录证据。这里的独立子 agent 指为 closure audit 单独启动的 fresh session，而不是复用实现阶段的同一 task session 继续自查。

如果这些事没做完，就不要把 `Plan Status` 改成 `completed`。

### Closure Audit Rule

把 plan 改成 `completed` 前，必须把“执行”与“收口审计”当成两件事。

最低要求：

1. 关闭动作必须发生在一次明确的 closure-audit pass 中，而不是某个实现 slice 的顺手附带动作。
2. closure audit 要回看 live repo，而不是只看旧 completion note、旧 checklist、或最近一次提交说明。
3. closure audit 必须由独立审阅者或独立子 agent 执行；实现者自己的 self-audit 不能单独作为 `completed` 的依据。
4. 每个 `Phase` / `Workstream` 都必须已经是 `completed`，否则 plan 不能关闭。
5. 如果某个 slice 的工作不再属于本 plan，先把它显式移到 successor plan 或标注取消原因，再关闭本 plan。
6. `Validation Checklist` 中的未完成项只能保留在 plan 仍未关闭时；若计划关闭，这些项也必须完成或被移出当前 scope。
7. closure audit 必须抽查“关键行为是否真的被实现”，不能只因为接口、类型、方法名、或注释已经存在就判定完成。
8. 如果 closure audit 发现 only-partial landing，必须把 plan 改成 `partially completed` 或 `in progress`，而不是勉强保留 `completed`。

推荐 closure-audit 证据来源：

- live code or docs paths that satisfy each slice exit criterion
- focused verification results or a clearly cited already-green workspace baseline
- daily log entry recording the closure pass and any final doc-sync work
- independent reviewer / subagent findings with task id or cited review note that explicitly check for plan/doc drift and interface-vs-semantics mismatch

实操上可以把 closure audit 理解为一轮独立复核：

- 不是“我刚做完最后一项，所以应该没问题”
- 而是“我现在重新核对整份计划，确认没有剩余 plan-owned work”

一个常见误区：

- “接口已经有了，所以这一 phase 应该算完成”

正确做法：

- 继续核对该接口是否真的被调用、是否满足文档语义、是否有 focused tests 证明行为成立；否则最多算 partial landing。

## Practical Rule

计划不需要写得很长，但必须一眼看清 3 件事：

- 当前 baseline 是什么。
- phase 到哪一步了。
- 剩余工作归谁。

补充判断：

- 如果读者看完 plan 仍然不知道“这个 feature 什么时候算真正可用”，说明计划可能被切得过碎。
- 如果计划中的多个 slice 只有全部完成后 feature 才第一次成立，那么默认应把它们放在同一个 owner plan 下，直到 live repo 证据证明需要拆分。
