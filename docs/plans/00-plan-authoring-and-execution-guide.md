# Plan Authoring And Execution Guide

> Status: active workflow guide
> Last Reviewed: 2026-04-09
> Sources: `docs/logs/2026/03-31.md`, `docs/logs/2026/04-03.md`, `docs/logs/2026/04-04.md`, `docs/logs/2026/04-07.md`, `docs/logs/2026/04-08.md`, `docs/logs/2026/04-09.md`

## Goal

这份指南只解决两件事：

- 计划怎么写才不容易缺项。
- 计划执行完后怎么审，才不容易漏 phase 或剩余工作。

`docs/plans/` 是执行文档，不是 ideas dump，也不是 architecture 的替代品。

## Lessons From History

从 `docs/logs/` 看，最常见的问题只有 4 类：

1. 没先审 current baseline，直接沿用旧计划或旧 completion note。
2. 一个计划过宽，后面不得不重写或拆分。
3. 只记录最近 landing 的改动，没有回头逐条核对整个 plan。
4. 剩余工作没有明确归属，导致计划看起来完成，实际上还有隐含 debt。

所以本指南只保留最少规则，并把它们直接体现在模板里。

## Minimum Rules

1. 写计划前先核对 live repo，再写 `Current Baseline`。
2. 一个计划只负责一个明确结果面；过宽就拆成新 plan。
3. 必须有 `Goals` 和 `Non-Goals`，因为历史上真正稳定的计划几乎都靠这两段防止 scope drift。
4. 必须有 plan 级状态、execution-slice 级状态、validation checklist。
5. 不要求给 `Purpose`、`Scope`、`Risks` 这类说明段落单独标记完成状态。
6. 只有当前 scope 真正完成，且 leftover 已明确移出 debt，才能标 `completed`。
7. 旧 baseline 失效时，显式写 `Outdated Note`、`Supersession Note` 或 `replaced/superseded`，不要让多套 baseline 并存。

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
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

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

### When Executing

1. 开始某个 slice 时，把它改成 `in progress`。
2. slice 完成后，把该 slice 的 `Status` 改成 `completed`，并勾掉对应 checklist。
3. 非执行性的说明段落不用打完成状态。

### When Closing The Plan

关闭前必须做 4 件事：

1. 从头重读整份 plan，不只看最近 landing 的部分。
2. 逐条核对每个 slice 的 `Exit Criteria`。
3. 逐条核对 `Validation Checklist`。
4. 把剩余工作写进 `Follow-up`，明确 successor plan 或明确无剩余 debt。

如果这 4 件事没做完，就不要把 `Plan Status` 改成 `completed`。

## Practical Rule

计划不需要写得很长，但必须一眼看清 3 件事：

- 当前 baseline 是什么。
- phase 到哪一步了。
- 剩余工作归谁。
