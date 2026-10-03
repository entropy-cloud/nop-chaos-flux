# 534 flux-renderers-mobile 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W7）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-mobile 全部 renderer type 的 DOM 结构收口到契约 6 维。本包仅 5 个 type 且基线最好（`nop-*`/`data-slot` 全覆盖），重点是 notice-bar 动画服务层的豁免登记与触摸交互容器（pull-refresh/swipe-cell）的归因确认，并冻结包级契约测试。

## Current Baseline

> **执行记录（2026-10-03）**：盘点复核 5 type 全部合规——notice-bar 3 内层（action/relative 裁剪层/marquee）全部带 slot（W2 盘点嫌疑复核关闭）；pull-refresh/infinite-scroll/swipe-cell/countdown 区域 slot 全覆盖；无 wrap 键（无帧通道 stamp 补 data-renderer）；无 in-scope fix 项。

- 组件清单（type 注册于 `mobile-renderer-definitions.ts`）：pull-refresh、infinite-scroll、swipe-cell（composite 多区域，触摸交互容器）；countdown、notice-bar（leaf 偏）。
- `nop-*` 根类与 `data-slot` 全覆盖；`data-renderer` 依赖 527。
- 已点名嫌疑：`notice-bar.tsx:241-284` 根(:241) → action flex 行(:254) → relative 裁剪层(:265) → marquee span(:270)（3 内层均为动画/布局服务，目的明确——低风险，预期 exempt/forced 登记）。
- 触摸容器的滚动/手势层（pull-refresh 的 indicator 层、swipe-cell 的左右动作层）属交互职责，预期在结构图中归因为组件自身契约要求的布局作用域。
- 盘点未发现本包自带 frame。

## Goals

- 全部 type 六维判定落卡；notice-bar / 触摸容器各层归因落卡
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；触摸手势/滚动加载行为变更
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- 手势库/触摸事件语义
- 移动端适配样式

## Test Strategy

档位选择：`建议有测`——包级契约测试覆盖 D1 三件套；归因类以卡面为准。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 5 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（5 张，六维判定齐全）；notice-bar 动画层归因落卡（全部带 slot，W2 嫌疑复核关闭）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（5/5）

### Phase 2 - 整改

Status: completed
Targets: 无（盘点未发现 in-scope fix 项）

- Item Types: `Proof`

- [x] 无 fix 项（5 type 全合规；notice-bar 嫌疑层已带 slot 归因成立）

Exit Criteria:

- [x] 无悬置 fix
- [x] 既有包测试无回归（mobile 全量含 3 新契约用例）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/dom-structure-contract.test.tsx`（3 用例）

- Item Types: `Proof`

- [x] 契约测试冻结：pull-refresh 根 + indicator/body slot、countdown span 根 + value slot、notice-bar 根 + content/text slot（手写锚断言；stamp 机制由 flux-react 541 用例覆盖）

Exit Criteria:

- [x] 契约测试落位并通过（3/3）
- [x] roadmap W7 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass（行号 Minor 已修订：notice-bar 实际区间 :241-284）
- Rounds: 1
- Findings addressed: notice-bar 行号修正

## Closure Gates

- [x] 全部 type 审计卡六维收口（5/5）
- [x] 无 in-scope fix（盘点与审计双确认）
- [x] `dom-structure` 契约测试冻结（3 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；mobile 全量 + 3）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。5 卡落盘（全合规）；notice-bar 嫌疑层复核关闭（已带 slot）；3 用例契约测试冻结。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_f5b6c9a5）
- Evidence: approved——notice-bar 三层 slot 行号逐一核实（:254/:265/:270）、其余 4 type 区域 slot 全覆盖核对、契约 3 用例有效断言、mobile 189/189 实跑；审计回填项（roadmap 翻 done、日志小节、pull-refresh 卡行号）已随收口完成。

Follow-up:

- 见 Non-Blocking Follow-ups
