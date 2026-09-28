# 2026-09-28-5 视觉一致性与交互修复

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`、`calendar/components/`、`gantt/gantt-timescale.tsx`

- Item Types: `Fix`

- [x] Fix: 19+ 处 `gray-*` 字面类按映射替换完成（kanban-board/column/activity-log/tag-filter/card-tags、calendar-week/day/month-view、gantt-timescale；grep 复核全包产品代码 0 处 `gray-[0-9]`，仅剩 calendar-print.css 打印白底 watch-only）。tag-filter 选中 chip 文字色改 WCAG 对比度计算（新 `kanban-tag-contrast.ts` + 4 单测）——`text-white/text-black` 对任意用户色是对比度必需字面，无 token 可替，注册精确豁免（source: 本 plan Phase 1）
- [x] Fix: `kanban-board.tsx` 手搓骨架 div 换 `@nop-chaos/ui` `Skeleton`（animate-pulse 容器保留）
- [x] Proof: 渲染断言测试：visual-quality-guard.test.ts 强化——FIX_FACE 扩入 gantt-timescale/kanban-board/kanban-activity-log；中性灰基线 30 → 0（全包清零，只许保持）；4/4 绿
- [x] Proof: `check:audit-ui-consistency-gaps` exit 0——9 个已修复文件的 exempt 条目删除（19 instances 清零），新增 1 条精确豁免（tag-filter 对比度字面，含 reason/source）

Exit Criteria:

- [x] 渲染断言测试绿；`pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿（108 文件/1046 用例，含新增 kanban-tag-contrast 4 用例）
- [x] `check:audit-ui-consistency-gaps` 在收缩 exempt 后仍 exit 0
- [x] 视觉抽查：token 均为既有语义面（muted/border/foreground/accent），dark mode 由 token 层正确接管；kanban skeleton 同族化后视觉结构不变。**e2e 关联核查（gate 阶段）**：w4c-composite-form-family（transfer 双面板 shuttle）8/8 绿；table-popover 等 9 spec 在 **clean master HEAD（stash 二分证实，b53d2eeca 零工作区改动）即失败**——pre-existing master e2e failures，与本 plan 无关，已登记 daily log 交后续 owner（不作为本 plan 门口禁项）

### Phase 2 - echarts loading 态

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`

- Item Types: `Proof | Fix`

- [x] Proof: focused 单测 echarts-loading-state.test.tsx 3/3 绿——loading=true 无 option 时渲染 status spinner（role=status + aria-live=polite）不渲染空态；loading=true 有 option 时 spinner 覆盖画布；loading=false 恢复空态优先级
- [x] Fix: echarts-renderer.tsx 按 chart-renderer 范式接入 loading——优先级 loading > 空态 > loadFailed > 画布（chart 为 loading > 空态 > 画布；echarts 的 loadFailed 分支保留在其后），同一 `role="status"` + `aria-live="polite"` + Spinner + t(flux.common.loading) 结构，data-slot 统一命名 echarts-loading

Exit Criteria:

- [x] focused 单测绿（3/3）；echarts 既有 4 套件回归 28/28 绿；data 包全量在 gate 阶段复核
- [x] echarts 与 chart loading 行为一致（代码审查记录：同 trigger `props.props.loading === true`、同结构 role=status + aria-live=polite + Spinner size-4 + t(flux.common.loading)、同优先级 loading 先于空态；差异仅 echarts 保留 loadFailed 分支——既有行为，不在本 phase 范围）

### Phase 3 - chevron 命中区 + transfer 键盘导航

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-option-list.tsx`、`transfer-renderer.tsx`

- Item Types: `Proof | Fix`

- [x] Proof: 单测 tree-chevron-hit-area.test.tsx 2/2——chevron 按钮不再携带 size-5 覆盖（icon-xs 24px 命中区恢复），icon 保持 size-3.5 视觉尺寸
- [x] Proof: 单测 transfer-keyboard-nav.test.tsx 4/4——ArrowDown/ArrowUp 移动 data-active 活动项且首尾钳制不越界、Home/End 跳转、Space 切换活动项勾选（aria-checked=true）、键盘全流程（导航→Space→shuttle→反方向回收）无鼠标成立；容器 tabindex=0 + aria-label。**语义裁定（执行期）**：不引入 role="listbox"/aria-multiselectable/role="option"——20-05 既有裁定（WCAG 4.1.2/1.3.1）明确 transfer 选择语义在 per-row checkbox、复合 listbox 包 checkbox 为无效 ARIA（既有契约测试 transfer-a11y 冻结）；键盘导航以 roving tabindex + data-active 视觉标记实现，不与该契约冲突
- [x] Fix: chevron 去除 size-5 覆盖，命中区恢复 icon-xs（24px）
- [x] Fix: transfer 双面板（candidate/selected 各自独立）接入 roving tabindex + 方向键导航（ArrowUp/Down 移动活动项并钳制、Home/End、Space 切换；activeKey 随选项列表失效自动重置）；**语义核对结论：不加 role=listbox**（与 20-05 裁定冲突，见 Proof 行）——核对步骤本身即为 plan 预期的防线，正确拦下了语义回归

Exit Criteria:

- [x] 两类 focused 单测绿（2/2 + 4/4）；`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿（161 文件/1137 用例，含 transfer-a11y 契约保持）
- [x] 键盘操作路径（无鼠标完成一次双面板勾选）在测试中成立

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；2 Minor 已吸收——exempt 收缩项由 Follow-up 改标 Proof（in-scope closure work）；sweep 清单注明以 grep 复核为准并补 kanban-tag-filter.tsx:55。

## Closure Gates

- [x] 所有 in-scope confirmed live defects（U4/U5/U9/U10）已修复——U4 gray-\* 19+ 处 token 化（grep 复核 0 残余）、U5 echarts loading 优先级接入、U9 chevron 24px 命中区恢复、U10 transfer 键盘导航（roving + Space，20-05 语义契约保持）
- [x] 行为/契约结果已达成：visual-quality-guard 强化断言（基线 30→0）+ exempt 收缩、echarts-loading-state 3/3、tree-chevron-hit-area 2/2、transfer-keyboard-nav 4/4 全部 focused proof
- [x] 必要 focused verification 已完成（三 Phase Exit Criteria 全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（transfer 虚拟化系分析报告层显式裁定 Deferred，非本 plan in-scope；tag-filter 对比度字面已注册精确豁免非降级）
- [x] 受影响的 owner docs 已同步核查：exempt 登记收缩/新增在 `scripts/audit/ui-consistency-exemptions.mjs` 完成（含 reason/source）；visual-quality-guard allowlist 注记同步；styling-system.md 无规则变化——No owner-doc update required（未新增 token 体系，均为既有语义类）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0：exempt 收缩 9 条 + 新增精确豁免 1 条后仍零新增红）

## Deferred But Adjudicated

### transfer 面板虚拟化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 传输选择器典型选项集 <100；键盘导航与语义修复是可操作性缺陷，虚拟化是规模优化，收益阈值未证实。
- Successor Required: `no`
- Successor Path: 出现大规模 transfer 使用证据后再立优化项

## Non-Blocking Follow-ups

- 全渲染器族 loading/空态呈现形式清单化（spin overlay / Skeleton / role=status 三形态并存现状已在 U4/U5 修复范围内统一 scheduling 与 echarts；其余族已有正确形态）。

## Closure

Status Note: 三 Phase 全部落地——scheduling gray-\* token 化（exempt 收缩 9 + 精确豁免 1）、kanban Skeleton 统一、echarts loading 优先级、chevron 24px 命中区、transfer 键盘导航（20-05 语义契约保持）。audit r1 verdict: revised（1 Major 为 daily log 缺 plan-5 执行与 e2e 裁定记录——已补记；3 Minor：prettier 格式已跑、scheduling 计数更正 108 文件/1046、contrast 测试就位 colocated 布局）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28；自行复跑 form-advanced 161 文件/1137、scheduling guard+contrast 8/8、echarts-loading-state 3/3、transfer-a11y 契约、pnpm check exit 0、guard 扫描逻辑复现 gray 计数 0）
- Evidence: transfer-renderer.tsx roving 键盘 + 无 listbox（transfer-a11y.test.tsx:16-17 冻结契约保持）；kanban-tag-contrast.ts:41-47 WCAG 计算 + 豁免条目 reason/source；visual-quality-guard.ts:47,67-68,75；echarts-renderer.tsx:381-409 优先级链对齐 chart-renderer.tsx:~570-630；9 exempt 删除 + 1 精确新增核验。

Follow-up:

- pre-existing master e2e failures（table-popover 等，见 daily log 裁定记录）交 e2e owner 跟进
