# 2026-09-28-5 视觉一致性与交互修复

> Plan Status: draft
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（U4、U5、U9、U10）
> Related: `docs/architecture/styling-system.md`（styling contract，protected area 的 owner doc）

## Purpose

收口 scheduling 渲染器族的主题令牌违规（硬编码 gray-\* 调色板破坏 dark mode/theming）、echarts 渲染器缺失 loading 态（异步期闪现"暂无数据"）、tree chevron 触控/点击区过小、transfer 无键盘列表导航四项已证实的视觉一致性与交互缺陷。

## Current Baseline

- **U4 gray-\* 违规**：`packages/flux-renderers-scheduling/src` 19 处/9 文件（`kanban-column.tsx:333,341,347`、`kanban-board.tsx:530,542`、`kanban-activity-log.tsx:104,110,113-115`、`kanban-tag-filter.tsx:28,42`、`calendar-week-view.tsx:200`、`calendar-day-view.tsx:154`、`calendar-month-view.tsx:302`、`gantt-timescale.tsx:28`、`kanban-card-tags.tsx`）；其他渲染器族产品代码 0 处（basic 的命中全在测试文件）。`docs/architecture/styling-system.md` 渲染器契约将颜色/交互默认保留给 theme token 层；`check:audit-ui-consistency-gaps` 的 hardcoded-literal-color 规则对这些文件已有 exempt 登记（220 instances/64 files），本次修复后相应 exempt 条目应收缩或删除。
- **U5 echarts 无 loading**：`packages/flux-renderers-data/src/echarts-renderer.tsx:368-381` 立即以空态渲染（`isEmpty` 判定不含 loading），全文零 loading 引用；同包 `chart-renderer.tsx:570-621` 已有正确范式（loading 优先于空态 + `role="status" aria-live="polite"` spinner）。
- **U9 chevron 命中区 20px**：`packages/flux-renderers-form-advanced/src/tree-option-list.tsx:94-99`——`Button size="icon-xs"`（24px）再被 `size-5` 覆盖为 20×20，低于 WCAG 2.5.8 的 24px 下限。
- **U10 transfer 无键盘导航**：`transfer-renderer.tsx:421-444` 面板为 `ul > li > Label+Checkbox`，无 roving tabindex/方向键/虚拟化；同包 `tree-option-list.tsx` 三者齐备（含 >100 行虚拟化 + scroll-to-active），是既有范本。图标按钮已有正确标签与禁用态。
- loading/空态家族分歧（kanban 手搓 `bg-gray-100` 骨架 div、gantt 用 Skeleton、table/form/select 用 `role="status"` spinner overlay）——随 U4 修复统一 kanban 到 `@nop-chaos/ui` Skeleton。

## Goals

- scheduling 渲染器全部颜色类走语义 token（`text-muted-foreground`/`text-foreground`/`border-border`/`bg-muted`），dark mode 下可读；kanban 骨架换 Skeleton 组件；相应 `find-ui-consistency-gaps` exempt 条目收缩。
- echarts 渲染器具备 loading 态，优先级与 chart-renderer 一致（loading > 数据 > 空态），异步期不再闪现空态。
- tree chevron 可点击/触控区恢复 ≥24px（icon 视觉尺寸不变）。
- transfer 双面板具备键盘列表导航（roving tabindex + 方向键/Home/End + Space 勾选），读屏可感知列表位置。

## Non-Goals

- 不改 scheduling 各视图的布局/交互逻辑（仅颜色载体与骨架实现替换）。
- 不引入新的公共组件或改 `packages/ui` 导出面。
- 不做 transfer 虚拟化（选项集通常 <100，键盘导航先行；记入 Deferred）。
- 不处理 echarts 的按需注册/体积问题（独立主题，既有 chunk 已隔离）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/`（上列 9 文件的颜色类 + kanban-board 骨架）
- `packages/flux-renderers-data/src/echarts-renderer.tsx`（loading 态）
- `packages/flux-renderers-form-advanced/src/tree-option-list.tsx`（chevron 命中区）、`transfer-renderer.tsx`（键盘导航）
- `scripts/audit/`（ui-consistency-gaps exempt 登记收缩）
- 上述包 colocated 单测

### Out Of Scope

- styling contract 本身的规则变化（仅按既有契约纠正违规）
- gantt/calendar 的功能性变更
- flux-renderers-industrial 的 canvas 内 hardcoded color（引擎绘制语义，既有 exempt 合理）

## Failure Paths

> 不适用：纯视觉载体与交互增强，无错误处理/API 契约/鉴权/外部集成变更。

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：建议有测。颜色 token 化用"渲染输出不含 gray-\* 字面类"断言测试；echarts loading 用状态优先级单测；chevron 用渲染尺寸断言；transfer 键盘导航用键击序列行为测试（上下移动/勾选/循环边界）。

## Execution Plan

### Phase 1 - scheduling 颜色 token 化 + kanban Skeleton 统一

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/`、`calendar/components/`、`gantt/gantt-timescale.tsx`

- Item Types: `Fix`

- [ ] Fix: 19 处 `gray-*` 字面类按映射替换（`text-gray-400/500→text-muted-foreground`、`text-gray-800→text-foreground`、`border-gray-100/200/300→border-border`、`bg-gray-100→bg-muted`、hover 组合按同规则）；视觉语义逐处核对（如 drop-zone 空态、add-card 按钮、activity-log 时间戳、tag-filter 边框）
- [ ] Fix: `kanban-board.tsx:530` 手搓骨架 div 换 `@nop-chaos/ui` `Skeleton`
- [ ] Proof: 渲染断言测试：kanban/calendar/gantt 相关组件输出不含 `gray-[0-9]` 字面类
- [ ] Follow-up: 重跑 `check:audit-ui-consistency-gaps`，收缩 scheduling 相关 exempt 登记并确认 0 新增 hit

Exit Criteria:

- [ ] 渲染断言测试绿；`pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿
- [ ] `check:audit-ui-consistency-gaps` 在收缩 exempt 后仍 exit 0
- [ ] 视觉抽查（playground kanban/calendar/gantt 页 light+dark 模式截图自检）无回归

### Phase 2 - echarts loading 态

Status: planned
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof: focused 单测：loading=true 时不渲染空态（渲染 spinner 且 `role="status"`）；loading 结束后数据/空态按既有优先级渲染
- [ ] Fix: 按 `chart-renderer.tsx:570-621` 范式接入 loading（优先级 loading > 数据 > 空态；同一 `aria-live="polite"` spinner 结构）

Exit Criteria:

- [ ] focused 单测绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] echarts 与 chart 两渲染器 loading 行为一致（代码审查记录）

### Phase 3 - chevron 命中区 + transfer 键盘导航

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/tree-option-list.tsx`、`transfer-renderer.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof: 单测：chevron 按钮可点击区 ≥24px（size 类断言），icon 视觉尺寸不变
- [ ] Proof: 单测：transfer 键盘序列——ArrowDown/ArrowUp 移动活动项（首尾边界不越界/或循环策略与 tree-option-list 一致）、Space 切换勾选、Home/End 跳转；aria（`tabindex` roving、活动项可见性）断言
- [ ] Fix: chevron 去除 `size-5` 覆盖（保留 icon `size-3.5`），命中区恢复 `icon-xs` 24px
- [ ] Fix: transfer 双面板接入 roving tabindex + 方向键导航（复用 tree-option-list 的控制器模式），列表容器 `role="listbox"`/`aria-multiselectable` 语义核对

Exit Criteria:

- [ ] 两类 focused 单测绿；`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿
- [ ] 键盘操作路径（无鼠标完成一次双面板勾选）在测试中成立

## Draft Review Record

- Reviewer / Agent: <<待独立子 agent 填写>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数>>
- Findings addressed: <<Blocker/Major 处理记录>>

## Closure Gates

- [ ] 所有 in-scope confirmed live defects（U4/U5/U9/U10）已修复
- [ ] 行为/契约结果已达成：token 化、loading 优先级、24px 命中区、键盘导航均有 focused proof
- [ ] 必要 focused verification 已完成（三 Phase Exit Criteria 全勾）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（transfer 虚拟化已显式裁定 Deferred）
- [ ] 受影响的 owner docs 已同步（styling contract 的 exempt 登记收缩在 `scripts/audit/` 侧完成；`docs/architecture/styling-system.md` 无规则变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### transfer 面板虚拟化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 传输选择器典型选项集 <100；键盘导航与语义修复是可操作性缺陷，虚拟化是规模优化，收益阈值未证实。
- Successor Required: `no`
- Successor Path: 出现大规模 transfer 使用证据后再立优化项

## Non-Blocking Follow-ups

- 全渲染器族 loading/空态呈现形式清单化（spin overlay / Skeleton / role=status 三形态并存现状已在 U4/U5 修复范围内统一 scheduling 与 echarts；其余族已有正确形态）。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
