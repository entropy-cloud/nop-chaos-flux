# 534 flux-renderers-mobile 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W7）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-mobile 全部 renderer type 的 DOM 结构收口到契约 6 维。本包仅 5 个 type 且基线最好（`nop-*`/`data-slot` 全覆盖），重点是 notice-bar 动画服务层的豁免登记与触摸交互容器（pull-refresh/swipe-cell）的归因确认，并冻结包级契约测试。

## Current Baseline

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

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 5 张）

- Item Types: `Proof`

- [ ] 逐 type 落卡；notice-bar 动画层与触摸容器各层归因（预期多为组件契约作用域，如实记录）

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全

### Phase 2 - 整改

Status: planned
Targets: 卡面 fix 项（盘点未发现必修项；如 Phase 1 判出 fix 则在此落地）

- Item Types: `Fix | Proof`

- [ ] 卡面 fix 项（如有）test-first 落地

Exit Criteria:

- [ ] 无悬置 fix；既有包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（该包为同目录多数派）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type D1 三件套 + 本包登记的关键项（使用 527 helper）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W7 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass（行号 Minor 已修订：notice-bar 实际区间 :241-284）
- Rounds: 1
- Findings addressed: notice-bar 行号修正

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] 如有 in-scope fix 已落地并有 focused proof
- [ ] `dom-structure` 契约测试冻结
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 同步核对完成
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 待收口

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 见 Non-Blocking Follow-ups
