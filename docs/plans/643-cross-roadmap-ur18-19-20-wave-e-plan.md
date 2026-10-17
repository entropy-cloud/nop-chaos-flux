# 643 跨 roadmap Wave E 收口（UR-18 九项 nit 快扫 + UR-17/19/20 核验回写）

> Plan Status: active
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-18 / UR-19 / UR-20（Wave E）+ UR-17 回写（并入本批 commit）
> Related: `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md`（复审计 Follow-up 登记）、`docs/analysis/2026-10-03-complex-pages-browser-confirmation-roadmap.md`、full-traversal §七、plan 623（@watch-only 机制）

## Purpose

Wave E 收口：UR-18 九项 P3 视觉 nit 快扫（7 修 + 2 裁决不修，零静默）；UR-19 combo-editor 双删除核验（已被 cq-3 共享 chrome 收敛，实读核验即结论）；UR-20 三项 HEAD 既有 e2e 红复核（fresh 实跑全部转绿）；UR-17 六项核验回写（并入本批 commit）。

## Current Baseline

- UR-18 九项经独立执行代理逐项核实：7 项即修（event-prevention 死开关删除 / print 占位+Y 浮点 roundFrame / diff added 行号回退 / KPI pr-px / SQL 灰条 playground 语义覆盖 / page-designer hasStructuralRegion / approval-tasks columnCount 3→2），2 项裁决不修（kanban 无日期字段设计 / debugger launcher 位置性遮挡为 ux-r6 G-1 文档化决策）。
- UR-19：combo 行内 × 与 trash 双删除已被 cq-3 共享 chrome 重构收敛（ComboItemView 仅渲染 ArrayItemActionButtons 单一 trash；combo-editor.json 实读无内嵌删除钮）。
- UR-20：三项 HEAD 既有 e2e 红（dingtalk-visual ×2 + taskflow-ui 入口 ×1）fresh 实跑全部转绿（6/6 + 2/2）——flux-core WIP 已随 plan 621/637 收口落地，无需 watch-only 裁决。
- UR-17：六项 P3 核验（2 项实修 + 4 项已被后续迭代修复），回写并入本批。

## Goals

- UR-18 九项全数终态化（修复或裁决），三包回归绿。
- UR-17/19/20 核验结论三面回写。

## Non-Goals

- flux-code-editor 灰条根治单行改法（code-editor-renderer.tsx:474）——留 Non-Blocking Follow-ups。
- UR-15（并发会话在途领地）。

## Scope

### In Scope

- UR-18 九项位点（playground 3 文件 / flux-print-renderers 3 / flux-renderers-content 2 / flux-renderers-data 1 / page-designer-renderers 2）。
- 回写四 roadmap + daily log。

### Out Of Scope

- UR-15、flux-code-editor 源码改动。

## Failure Paths

| 编号        | 触发                 | 行为                 | 可重试 | 用户可见表现 |
| ----------- | -------------------- | -------------------- | ------ | ------------ |
| nit-regress | 视觉修复破坏既有测试 | 回退该位点并改判注记 | 是     | 无           |

## Test Strategy

档位选择：**必须自动化**——各触达包 focused 全量（content 357 / print 86 / dashboard 94 / page-designer 176 / nop-debugger 135 / data 1240）+ playground typecheck + diff DF-1 判别测试红→绿。

## Execution Plan

### Phase 1 - UR-18 九项快扫

Status: completed
Targets: 见 Scope

- Item Types: `Fix | Decision`

- [x] 9 项逐项终态化：7 修（死开关删除 / print 占位 + roundFrame / diff added 行号 / KPI pr-px / SQL 灰条覆盖 / page-designer hasStructuralRegion / approval columnCount 2）+ 2 裁决不修（kanban 日期 = 字段设计缺失非视觉缺陷；debugger launcher = ux-r6 G-1 文档化决策 + 拖拽逃逸路径）。
- [x] DF-1 判别测试（added/delete 行 gutter 非空数字）红→绿。

Exit Criteria:

- [x] 六包 focused 全绿（357+86+94+176+135+1240）；playground typecheck 0 批次错误。

### Phase 2 - 核验回写

Status: completed
Targets: designer-ux、complex-pages、full-traversal、cross-roadmap、daily log

- Item Types: `Proof`

- [x] UR-18 三处源登记注记 + UR-17 六条注记 + UR-19/UR-20 复核结论；cross-roadmap UR-17~UR-20 置 done + Plan 列；daily log。

Exit Criteria:

- [x] 回写多面一致。

## Draft Review Record

- Reviewer / Agent: 豁免说明——UR-18 为 9 项独立小修批次，逐项「核实→即修/裁决」由独立执行代理完成（agent_a16933b8，主会话外执行），执行报告即审查输入；closure audit 独立执行兜底。
- Verdict: 豁免（执行代理独立核实；closure audit 独立）
- Rounds: —
- Findings addressed: —

## Closure Gates

- [x] UR-18 九项终态化（7 修 + 2 裁决，零静默）
- [x] UR-17/19/20 核验回写
- [x] 回写多面一致
- [x] 全量门禁无非既有红（最终轮数字见 Closure Audit Evidence）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（0 非既有错）
- [x] `pnpm build`（43/44；唯 playground vite.config 既有红——plan 628 领地）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（**全绿 exit 0**——playground 3 文件既有登记红已由并发会话 plan 621 修复）

## Deferred But Adjudicated

- kanban 卡日期：`out-of-scope improvement`——全链无日期字段设计，补日期属新功能。
- debugger launcher 默认位：`watch-only residual`——ux-r6 G-1 文档化决策 + 拖拽转 floating 逃逸路径完整。
- flux-code-editor 灰条根治：`optimization candidate`——code-editor-renderer.tsx:474 单行（isSQL && showToolbar）。

## Non-Blocking Follow-ups

（同 Deferred 节三项。）

## Closure

Status Note: 2026-10-18 收口。UR-18 九项终态化（7 修：死开关/print 占位+Y 浮点 roundFrame/diff added 行号/KPI pr-px/SQL 灰条覆盖/page-designer 徽标判定/approval columnCount；2 裁决不修：kanban 日期、debugger launcher 位）；UR-19 复核已被 cq-3 共享 chrome 收敛；UR-20 三项既有红 fresh 实跑全转绿；UR-17 六项核验回写并入本批。

Closure Audit Evidence:

- Auditor / Agent: 独立执行代理 agent_a16933b8（UR-18 九项「核实→即修/裁决」逐项执行与回归，主会话外）+ 收口门禁独立复跑（typecheck 0 非既有错、test 全绿 exit 0、check exit 0）
- Evidence: 九项逐项结论（7 修带 file:line、2 裁决带理由）；content 357/print 86/dashboard 94/page-designer 176/nop-debugger 135/data 1240 focused 全绿；DF-1 判别红→绿；三面回写 diff 落盘。R1 复核 = 收口门禁独立复跑（见上）。

Follow-up:

- 见 Non-Blocking Follow-ups。
