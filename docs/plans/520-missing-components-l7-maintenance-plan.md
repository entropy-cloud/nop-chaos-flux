# 520 Missing Components L7 — matrix/roadmap 维护 + 文档债收口

> Plan Status: draft
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §10（L7 全表）+ §7（gap-analysis 引用）；`docs/components/amis-baseline-matrix.md`（:139-141 已翻行、:283-298 folded 行）；`docs/references/quick-reference.md:240-261`（stream/openSocket 陈旧措辞）；`docs/components/roadmap.md:295-298`（O1 清单）
> Related: plan 503（L1 命名决议）/512（host channels 落地——P-1 措辞过时的根源）

## Purpose

收口 roadmap L7 线的**非 demand-gated** 文档维护项（L7.5 matrix maintenance、L7.6 roadmap O1 reconcile、L7.7 quick-reference P-1 措辞刷新），并对 demand-gated 项（L7.1–L7.4、L7.8）做终态登记（维持 demand-gated + 触发条件），使 L7 线达到「done 或 demand-gated 全登记」的出口状态，解锁 QA.1-L7。

**单计划边界依据**：三项维护同属「文档与登记面一致性」结果面，改动都是登记面小编辑（guide Rule 22 合并优先）；demand-gated 项只做登记不实现。

## Current Baseline

2026-09-26 live repo 核对：

- **已翻行（无需处理）**：matrix :139-141 slider/rating/input-color 三行已 `runtime`+landed（L1 flip 完成）；:285 `color` 行已带「display 行 ≠ input-color form 行」澄清注记（L7.5 该子项已在册）。
- **L7.5 待处理行**：folded 节 :287 `icon-picker`、:296 `sparkline`、:289 `calendar`、:298 `hidden` 四行——其中 **icon-picker 已实现**（flux-renderers-form-advanced/src/icon-picker.tsx 在库）且 **calendar 已实现**（flux-renderers-scheduling/calendar 全家 + design.md 族）——matrix 行与 live 事实相反；sparkline/hidden 无实现，行措辞应维持 folded 但补「实现面核实结论」注记。
- **L7.7 待处理**：quick-reference :240-241 stream/openSocket 行写「待 P-1 实施」、:261 注释「流式响应（P-1 实施后）」——两者已于 2026-07-23 落地实施（plan 512 亦消费），措辞过时。
- **L7.6 待处理**：roadmap :298 O1 移动端 flux-native 清单含 `area`（省市区）——已被 missing-components L2.2 `input-city` 取代（需求由 input-city 承接，且 matrix/Form Core 已登记）；`icon-picker`/`calendar` 已注册事实未回写 O1 清单。
- **demand-gated 终态**（无需实现，登记触发条件即可）：L7.1 skeleton / L7.2 image-preview capability / L7.3 lazyload / L7.4 input-excel 等 survey 项 / L7.8 survey leftover 复查 / L4.12 phone mask / L4.3 / L4.11e / L5.8 / L6 S4 协作可选。

## Goals

- matrix folded 节四行与 live 对齐：icon-picker/calendar 翻为已实现注记（指向实现 + design.md），sparkline/hidden 补核实结论注记（维持 folded）。
- quick-reference stream/openSocket 措辞刷新为「已落地（2026-07-23）」并删除 P-1 待实施注释。
- roadmap O1 清单 reconcile：area 行标注由 input-city 取代；icon-picker/calendar 已注册事实回写。
- demand-gated 项终态登记：roadmap §13 L7 行 + QA.7 残余债登记册所需清单在本 plan Closure 成形。

## Non-Goals

- 不实现任何 demand-gated 组件（skeleton/image-preview/lazyload/input-excel 等）。
- 不改任何 renderer 代码。
- 不动 matrix retained 决策本身（icon-picker/calendar 的「翻」是**事实对齐注记**——实现已存在；若视为 retained 决策变更，依据 = 用户 2026-09-26 概括放行指令 + 实现已存在的客观事实）。

## Scope

### In Scope

- `docs/components/amis-baseline-matrix.md`（四行注记）、`docs/references/quick-reference.md`（三处措辞）、`docs/components/roadmap.md`（O1 清单）、roadmap §13 L7 行、dev log。

### Out Of Scope

- 一切代码与组件实现；gap-analysis/ui-review 历史报告改写（快照档案）。

## Failure Paths

> 纯文档计划，不适用。

## Test Strategy

档位选择：`不适用：纯文档登记维护，无行为变更；一致性验证用 grep 复核（matrix/quick-reference/roadmap 三面命中）。`

## Execution Plan

### Phase 1 - matrix 四行对齐 live

Status: planned
Targets: `docs/components/amis-baseline-matrix.md`

- Item Types: `Fix`（docs）

- [ ] icon-picker/calendar 行补「已实现」注记（实现 file:line + design.md 指针）；sparkline/hidden 行补核实结论注记（无实现，维持 folded + 触发条件）
- [ ] 与 ：285 color 澄清注记交叉核对（该子项已在册，仅复核）

Exit Criteria:

- [ ] grep 复核四行注记命中且与 live 实现面一致

### Phase 2 - quick-reference 措辞刷新 + roadmap O1 reconcile

Status: planned
Targets: `docs/references/quick-reference.md`、`docs/components/roadmap.md`

- Item Types: `Fix`（docs）

- [ ] stream/openSocket 三处「待 P-1 实施」→「已落地（2026-07-23，INV-2 C 档；消费先例 plan 512 host channels）」
- [ ] roadmap O1：area 行标注「由 missing-components L2.2 input-city 取代」；icon-picker/calendar 已注册事实回写清单

Exit Criteria:

- [ ] grep 复核：「待 P-1 实施」零残留；O1 两处注记命中

### Phase 3 - demand-gated 终态登记 + 收口

Status: planned
Targets: roadmap §13 L7 行、本 plan Closure

- Item Types: `Decision`、`Proof`

- [ ] demand-gated 项终态登记（每项：触发条件 + 启动路径）：L7.1 skeleton（host 骨架屏需求）/ L7.2 image-preview capability（gallery 需求）/ L7.3 lazyload（improvement roadmap）/ L7.4 survey Tier1-3 各自 gate / L7.8 survey leftover（各自 gate）+ 关联 L4.12/L4.3/L4.11e/L5.8 引用
- [ ] roadmap §13 L7 行回写终态 + dev log

Exit Criteria:

- [ ] roadmap §13 L7 行终态与 demand-gated 登记齐
- [ ] 纯文档变体：pnpm 全量不适用；`pnpm check:active-doc-code-anchors` 过

## Draft Review Record

- Reviewer / Agent: <<待填>>
- Verdict: <<待填>>
- Rounds: <<待填>>
- Findings addressed: <<待填>>

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（demand-gated 项均有触发条件登记）
- [ ] 受影响 owner docs 已同步（matrix/quick-reference/roadmap O1）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] 纯文档计划：pnpm typecheck/build/lint/test/check 不适用（`check:active-doc-code-anchors` 除外，已随 Phase 3 执行）

## Deferred But Adjudicated

### L7.1–L7.4 / L7.8 demand-gated 组件与复查项

- Classification: `watch-only residual`（demand-gated，Phase 3 终态登记后生效）
- Why Not Blocking Closure: 各项均有明确触发条件（host 需求/survey gate），无在案消费诉求；roadmap 原文即按需启动设计
- Successor Required: `no`（需求出现时按交付铁律建 plan）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
