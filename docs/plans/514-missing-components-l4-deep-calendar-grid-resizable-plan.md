# 514 Missing Components L4 深化 — calendar 6 周格视图档（L4.2）+ Resizable schema 化（L4.6）

> Plan Status: draft
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §7（L4.2/L4.6 行）；`docs/analysis/ui-review/C1-complex-page-conceptions.md:36`（G-J）/ C2 裁决表 :31-32；`docs/analysis/visual-quality/V11a-scheduling.md`（A3 否决先例）；`docs/analysis/ui-review/D2-closure.md:72`（Open candidates #12）
> Related: `docs/plans/513-missing-components-l4-substrate-and-quick-wins-plan.md`（同线快赢先行）；`docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`（L4 底座文档——本计划两项不沿用其契约，各自独立立约）

## Purpose

收口 roadmap L4 线两个被 plan 513 显式移交的 M~L 项：L4.2（calendar Booker 式 6 周竖网格视图档 + date-cell 选中 API——需正面重裁 V11a A3 否决先例）与 L4.6（Resizable 面板 schema 化——需裁定新 type vs 布局语义字段路由 + 与三处 bespoke pointer-resize 的统一口径）。**design-first：Phase 1 裁决未过独立 review 前，不写任何实现代码**（roadmap Rule 3：若裁定走新 renderer type，matrix flip human gate 前置——用户 2026-09-26「执行 roadmap 直到彻底完成」指令为概括放行依据，先例 plan 510 §6）。

## Current Baseline

2026-09-26 live repo 核对（继承 plan 513 起草期两轮独立只读调研 + 本计划起草复核）：

- **L4.2 calendar 现状**：calendar renderer 在 `packages/flux-renderers-scheduling/src/calendar/`；视图三档 month/week/day（calendar.tsx:25-27,68）。月视图 = 资源行 × 当月日期列矩阵（calendar-month-view.tsx:68-69 `getMonthStartEnd`，calendar-date-utils.ts:5-41——28-31 列，无相邻月补位、无周行堆叠）。cell 点击只有事件块/溢出展开语义；日期变更唯一内建通道 = header 导航 `onDateChange`（calendar.tsx:112-118，`dateOwnership:'scope'` 写 scope，e2e 已锁）。长按拖拽创建（use-calendar-drag-create）与键盘创建入口在库。
- **V11a A3 否决先例**：`V11a-scheduling.md:26,99,108` + calendar design.md §12 曾把 6 周网格判为「通用月历形态、与排班矩阵设计意图相悖」而显式否决。L4.2 若实现必须以「**新增视图档**（与资源矩阵并存、不改既有月视图语义）」重裁，不能沿用或推翻旧月视图。
- **Notion 复刻先例**：notion 复刻的自绘六周竖网格（container grid + loop）无 renderer 事件面（回写⑥）——形态参照物在库但非产品能力。
- **L4.6 现状**：`packages/ui/src/components/ui/resizable.tsx`（react-resizable-panels 薄包装：ResizablePanelGroup/Panel/Handle + `withHandle`），全仓唯一消费该库处；**任何 renderer 均未注册 resizable type**；playground 零使用。现存「可拖拽分栏」全部 bespoke：workbench-shell.tsx:112-180（left/rightResizable + pointer capture）、designer-page-body.tsx:507,523（palette/inspector）、dashboard-editor-renderer.tsx:366,373。
- **G-J 登记链**：C1:36（「ui 有原语且 AGENTS.md 已宣传，schema 层无 renderer type」）→ C2 裁决表 :31（L3、构想库存）→ D2 closure :72（#12「后续 roadmap 立项」）——本计划即该「后续立项」。
- **依赖底座**：flow-designer canvas-adapters 先例（docs/architecture/flow-designer/canvas-adapters.md）；renderer 注册面（definition + propContracts + defaultSchema 模式）；condition-builder 表单式属性面板先例（若 inspector 需求出现）。

## Goals

- Phase 1 一份双项裁决文档落盘 `docs/discussions/2026-09-26-l4-2-l4-6-calendar-grid-and-resizable-adjudication.md`：
  - **L4.2**：V11a A3 关系重裁（预期：新增 `monthShape: 'resource' | 'grid'` 视图档语义——resource 为缺省且语义不变；grid 档 = 6 周固定 42 格竖网格 + date-cell 选中事件 `onDateSelect` + `dateOwnership` 贯通 + 相邻月补位规则）；date-cell 键盘可达性口径。
  - **L4.6**：路由裁定（预期候选：①布局 renderer 新 type `resizable`（走 matrix flip）vs ②既有布局容器（flex/panel）增 `resizablePanes` 语义字段 vs ③page 级 slot 语义）+ 方向/默认尺寸/min-max/持久化字段面 + 三处 bespoke 实现的统一口径（迁移 or 保留声明豁免）+ inspector/属性面是否进 MVP。
  - 独立 review 共识（0B/0M）后才进实现 Phase。
- Phase 2（L4.2 实现）：grid 视图档 + date-cell 选中 + focused 单测 + e2e。
- Phase 3（L4.6 实现）：按 Phase 1 裁定路由落地 + focused 单测 + e2e。
- Phase 4：登记（quick-reference / flux-guide schema 节 / calendar design.md §12 与 V11a 注记回写）+ 收口全量验证 + roadmap §13 回写。

## Non-Goals

- 不改既有 calendar month（resource 矩阵）/week/day 视图语义与 e2e 钉住行为。
- 不迁移 workbench/flow-designer/dashboard bespoke pointer-resize 内部实现（除非 Phase 1 明确裁定迁移并给出窗口；缺省登记声明豁免）。
- 不做 drag-and-drop 式布局编辑器（canvas 编排归 L6 标准设计器线）。
- 不实现 calendar 事件块的 grid 档复用语义（grid 档是日期选择面，非排班面——事件渲染归 resource 档）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/calendar/`（视图档 + 选中 API）、`packages/flux-renderers-layout` 或 `packages/flux-renderers-basic`（L4.6 路由落地包随 Phase 1 定）、`packages/ui`（必要时 resizable 包装增强）、theme-tokens、flux-guide、quick-reference、calendar/resizable design.md（若落 design.md 族）、roadmap §13。

### Out Of Scope

- flow-designer/report-designer 等设计器内部布局改造。
- 移动端 wheel/手势变体（calendar 移动形态归 mobile 包既有模式）。

## Failure Paths

| 可测场景编号                | 触发                          | 行为                                                                          | 可重试 | 用户可见表现        |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------- | ------ | ------------------- |
| grid-month-boundary         | grid 档跨月补位日被点击       | 选中语义带完整日期值（含年月），跳转行为按 Phase 1 裁定（切换月份 or 仅高亮） | 是     | 高亮 + 事件派发正确 |
| resizable-schema-invalid    | min>max / sizes 不归一        | 归一化/钳制到合法域，不崩                                                     | 是     | 最近合法布局        |
| legacy-schema-no-monthShape | 既有 calendar schema 无新字段 | resource 档语义逐字节不变                                                     | —      | 无变化              |
| resizable-persist-conflict  | 持久化 layout 读取失败/损坏   | 回落 default sizes                                                            | 是     | 默认布局            |

## Test Strategy

档位选择：**必须自动化**（roadmap §10 预声明）。Phase 1 为纯文档裁决（不适用档）；实现 Phase 各带 focused 单测（先红后绿姿势）+ e2e 程序化断言。

## Execution Plan

### Phase 1 - 双项裁决文档 + 独立 review（design gate）

Status: planned
Targets: `docs/discussions/2026-09-26-l4-2-l4-6-calendar-grid-and-resizable-adjudication.md`、（若裁定新 type）`docs/components/amis-baseline-matrix.md` flip 预记录

- Item Types: `Decision`

- [ ] L4.2 裁决：monthShape 双档语义、grid 档 42 格补位规则、onDateSelect 事件形状（payload/dateOwnership 贯通）、键盘可达性、与既有视图/e2e 的兼容红线
- [ ] L4.6 裁决：路由（新 type vs 语义字段）、schema 字段面（方向/sizes/min/max/persist）、bespoke 三处口径、（若新 type）matrix flip 执行记录
- [ ] 独立 review 共识（fresh 子 agent，0B/0M）记录于文档 Review 头注

Exit Criteria:

- [ ] 裁决文档含两项目录级决定（无「待定」残留）+ review 记录在案
- [ ] matrix flip（如触发）落盘并有放行依据注记

### Phase 2 - L4.2 calendar grid 视图档 + date-cell 选中

Status: planned
Targets: `packages/flux-renderers-scheduling/src/calendar/`（calendar.tsx、calendar-date-utils.ts、新 grid-view 组件、schemas）

- Item Types: `Fix`、`Proof`

- [ ] monthShape 双档落地（Phase 1 契约）；grid 档 6×42 格渲染 + 相邻月补位 + 今日/选中标记
- [ ] onDateSelect 事件 + dateOwnership 贯通 + 键盘可达（Phase 1 口径）
- [ ] focused 单测（42 格/补位/选中派发/缺省零回归）+ e2e（选中 → 事件程序化断言）

Exit Criteria:

- [ ] 既有 calendar e2e 全绿（零回归红线）+ grid 档新断言全绿
- [ ] calendar design.md §12 与 V11a 注记回写（重裁记录）

### Phase 3 - L4.6 Resizable schema 化（按 Phase 1 路由）

Status: planned
Targets: 随 Phase 1 裁定（布局包 + ui 包装 + playground demo）

- Item Types: `Fix`、`Proof`

- [ ] schema 面（方向/sizes/min/max/persist）+ 渲染面接线（ui ResizablePanelGroup 消费）
- [ ] playground 演示 entry（经 L0 注册表露出）+ focused 单测（归一化/钳制/持久化回落）+ e2e（拖拽 handle → 尺寸变化程序化断言）

Exit Criteria:

- [ ] 落地路由与 Phase 1 裁定一致；focused/e2e 全绿；AGENTS.md 宣传与实现欠账对齐（schema 面可声明）

### Phase 4 - 收口验证 + 登记

Status: planned
Targets: 全仓 + 登记面

- Item Types: `Proof`

- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；e2e 全量零新增红
- [ ] 登记：quick-reference（monthShape/onDateSelect、resizable schema 面）+ flux-guide 对应节 + roadmap §13 L4.2/L4.6 done 回写 + dev log

Exit Criteria:

- [ ] 全量验证记录于 Closure；登记面 grep 复核命中；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: <<待填>>
- Verdict: <<待填>>
- Rounds: <<待填>>
- Findings addressed: <<待填>>

## Closure Gates

- [ ] Phase 1 裁决全部落地（无偏离裁定的实现；matrix flip 如触发已执行）
- [ ] 各实现 Phase Exit Criteria 全勾
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步（calendar design.md / V11a 注记 / quick-reference / flux-guide）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红）
- [ ] `pnpm test:e2e`（零新增红口径）

## Deferred But Adjudicated

### bespoke pointer-resize 迁移（workbench/flow-designer/dashboard 三处）

- Classification: `watch-only residual`（Phase 1 缺省裁定为声明豁免、不迁移）
- Why Not Blocking Closure: 三处为设计器/workbench 内部 UI（非 schema 面），迁移无消费者价值且回归面大
- Successor Required: `no`（若 Phase 1 裁定迁移则本条改写）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
