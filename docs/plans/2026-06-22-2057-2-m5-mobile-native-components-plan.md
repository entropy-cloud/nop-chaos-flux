# M5 移动端原生组件（pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar）

> Plan Status: active
> Last Reviewed: 2026-06-22
> Source: `docs/components/mobile-roadmap.md` M5；`docs/components/{pull-refresh,infinite-scroll,swipe-cell,countdown,notice-bar,use-touch}/design.md`（契约已立约）
> Related: `docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md`（软前置：M0.1c haptics + M0.1d z-index 最好先落地）
> Mission: mobile
> Work Item: M5

## Purpose

把 `@nop-chaos/flux-renderers-mobile` 包的 5 个移动端原生交互组件从"包骨架 + schemas + useTouch Hook 已有、5 个 renderer definition 与组件实现 0%"推进到"5 个组件全部实现 + renderer definition 注册 + playground 演示页 + e2e 验证通过"。这 5 个组件共用 `useTouch` Hook、同属一个包、同一组 closure criteria，按 plan guide §22 / §26 / roadmap 明确建议合并为**一个 work item / 一个 plan**，禁止拆成 5 个 micro-plan。

## Current Baseline

> 截至 2026-06-22 的 live repo 核查结论（read-only）：

- **包骨架已落地**：`packages/flux-renderers-mobile/` 有 `package.json`（deps: flux-core/flux-i18n/flux-react/@nop-chaos/ui）、`tsconfig`、`src/index.ts`、`src/schemas.ts`、`src/hooks/use-touch.ts`。
- **schemas 已声明**：`src/schemas.ts` 已定义全部 5 个 schema 接口（`PullRefreshSchema`/`InfiniteScrollSchema`/`SwipeCellSchema`/`CountdownSchema`/`NoticeBarSchema` + `NoticeBarVariant`），字段对齐各 design.md。
- **useTouch Hook 已实现**：`src/hooks/use-touch.ts`（101 行）导出 `useTouch` + 类型（`TouchState`/`TouchDirection`/`UseTouchOptions`/`UseTouchReturn`），含方向判定 + threshold。但**无 focused 单测**（`src/` 下无 `*.test.ts(x)`）。
- **`src/index.ts` 已导出** schema 类型 + useTouch + 类型，但**未导出**任何 renderer 组件或 renderer definition（5 个组件注册 0%）。
- **design.md 已立约**：6 份（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar + use-touch）+ bottom-sheet（M1a 用，非本 plan），契约文档先行，**不等于代码实现**。
- **软前置状态**：M0.1（haptics + z-index 栈）为本 plan 软前置，按 roadmap 不硬阻塞；若 M0.1 未先落地，本 plan 组件先用本地按压反馈/z-index 兜底，M0.1 落地后回头替换为 `nop-haptic` / `useGlobalZIndex()`。

## Goals

- 5 个移动端原生组件（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）作为 `flux-renderers-mobile` renderer 实现，严格遵循 `RendererComponentProps` 契约（读 `props.props`/`meta`/`regions`/`events`/`helpers`，不直接访问 store）。
- useTouch Hook 补 focused 单测（方向判定 / threshold / reset）。
- 5 个 renderer definition（`type`/`category`/`sourcePackage`/`fields` region 声明等）+ `registerMobileRenderers(registry)` 注册助手，从 `src/index.ts` 导出。
- playground 每个组件有演示页（移动端视口）；e2e 用 Playwright `setViewportSize` + `page.evaluate` 验证关键交互（不靠截图诊断）。
- 各组件 design.md 的"实现状态"翻转（如有"未实现"标记）。

## Non-Goals

- 不做 bottom-sheet 独立 renderer（归 M1a，复用 surface runtime + `@nop-chaos/ui` Sheet）。
- 不做 M1–M4 桌面组件响应式改进（独立 work item）。
- 不引入 `mobileUI` 标志位或 `*-mobile` 命名（baseline §7 禁止）。
- 不在本 plan 内实现 M0.1 基础设施（safe-area/hairline/haptics/z-index 栈归 M0.1 plan；本 plan 仅消费其产物，若未就绪则本地兜底）。
- 不做 useTouch 的 Pointer/Mouse 事件兼容（design.md 定位为触摸 Hook；桌面端测试用 Playwright touch events 注入）。

## Scope

### In Scope

- useTouch Hook focused 单测。
- `pull-refresh`：下拉/上拉刷新容器，状态机（pulling/loosing/loading/success），`onRefresh` action 触发。
- `infinite-scroll`：IntersectionObserver 触底加载容器，`onLoadMore` action，`distance`/`immediateCheck`/finished/error 状态。
- `swipe-cell`：左/右滑露出操作区，useTouch 驱动，`threshold`/`direction`/`closeOnOutside`，`onOpen/onClose/onAction`。
- `countdown`：倒计时展示，`time`/`targetTime`/`format`/`millisecond`/`paused`/`autoStart`，`onFinish` action。
- `notice-bar`：滚动通知栏，`scrollable`/`speed`/`direction`/`loop`/`closable`/`variant`，`onClick/onClose`。
- 5 个 renderer definition + `registerMobileRenderers` + `src/index.ts` 导出。
- playground 5 个演示页 + e2e 关键交互验证。

### Out Of Scope

- bottom-sheet renderer（归 M1a）。
- M0.1 基础设施实现（归 M0.1 plan）。
- 桌面组件响应式（归 M1–M4）。
- useTouch 的桌面 Pointer/Mouse 兼容层。
- Tabs 组件的 swipe 手势接入（归 M1d，本 plan 只交付 useTouch 工具）。

## Failure Paths

> 涉及触摸交互、定时器、IntersectionObserver，有若干可测失败场景。

| 场景编号              | 触发                              | 行为                                   | 可重试 | 用户可见表现                   |
| --------------------- | --------------------------------- | -------------------------------------- | ------ | ------------------------------ |
| pullrefresh-threshold | 下拉距离 < threshold              | 不触发 onRefresh，松手回弹             | 是     | 指示器显示"下拉刷新"，松手复位 |
| pullrefresh-loading   | 下拉 ≥ threshold 松手             | 进入 loading，触发 onRefresh action    | 否     | 指示器显示 loadingText         |
| infinitescroll-finish | 所有数据已加载（无更多）          | 不再触发 onLoadMore，显示 finishedText | 否     | 底部显示"没有更多了"           |
| infinitescroll-error  | onLoadMore action 失败            | 显示 errorText，可重试                 | 是     | 底部显示错误 + 重试            |
| swipecell-direction   | `direction:'left'` 时右滑         | 不响应右滑，仅左滑露出 right region    | 否     | 右滑无操作区出现               |
| swipecell-outside     | `closeOnOutside:true` 时点击外部  | 自动关闭操作区，触发 onClose           | 否     | 操作区收起                     |
| countdown-finish      | 倒计时归零                        | 停止，触发 onFinish action             | 否     | 显示 00:00（或 format 末态）   |
| countdown-paused      | `paused:true`                     | 暂停计时，不推进                       | 否     | 数字静止                       |
| noticebar-nonscroll   | `scrollable:false` 或文本短于容器 | 静态展示，不滚动                       | 否     | 文本居中/左对齐静态显示        |

## Test Strategy

本档选择：**必须自动化**

理由：pull-refresh/infinite-scroll/swipe-cell 是移动端核心交互回归路径（触摸状态机 / IntersectionObserver 触发），按 tier 表"核心回归路径"属必须自动化。useTouch 是 5 个组件共享的交互基础，Proof 必须先行（先写失败单测再实现组件）。countdown/notice-bar 的定时器/动画逻辑也需 focused 单测验证。e2e 用 Playwright `setViewportSize` + `page.evaluate`（不靠截图，遵循 AGENTS.md 诊断约束）。

## Execution Plan

### Phase 1 - useTouch Hook focused 单测（Proof 先行）

Status: planned
Targets: `packages/flux-renderers-mobile/src/hooks/use-touch.test.ts`（colocated，与 hook 同目录）

- Item Types: `Proof`

- [ ] **Proof**：为先行已有的 `useTouch` 写 focused 单测，覆盖：初始 state、onTouchStart 记录起点、onTouchMove 计算 deltaX/deltaY/offset/direction（horizontal/vertical/空，threshold 边界）、onTouchEnd 置 isTouching=false、reset 归零。
- [ ] **Proof**：验证 `resolveDirection` 在 absX/absY 均 ≤ threshold 时返回 `''`，absX>absY 返回 horizontal，否则 vertical。

Exit Criteria:

- [ ] `use-touch` focused 单测存在且 `pnpm --filter @nop-chaos/flux-renderers-mobile test` 通过。
- [ ] 单测覆盖方向判定 / threshold 边界 / reset（不仅是"不报错"）。

### Phase 2 - pull-refresh + infinite-scroll（滚动触发容器族）

Status: planned
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`、`infinite-scroll.tsx`（新建）

- Item Types: `Proof` + `Fix`

> 执行顺序：本档为 `必须自动化`，先写失败 Proof 再实现 Fix（plan guide 模板用法 #12）。

- [ ] **Proof**：pull-refresh focused 单测（threshold 边界触发 onRefresh / 不触发回弹）；infinite-scroll focused 单测（IntersectionObserver mock 触底触发 onLoadMore / finished 不再触发）。
- [ ] **Fix**：`pull-refresh` 组件——容器型 renderer，消费 `body` region；useTouch 驱动状态机（pulling→loosing→loading→success）；`threshold`/`direction`/`loadingText`/`pullingText`/`loosingText`/`successText`/`successDuration`/`animationDuration`/`disabled` 从 `props.props` 读；`onRefresh` 走 `props.events`。
- [ ] **Fix**：`infinite-scroll` 组件——容器型 renderer，消费 `body` region；IntersectionObserver + sentinel 触底触发；`distance`/`disabled`/`loadingText`/`finishedText`/`errorText`/`immediateCheck` 从 `props.props` 读；`onLoadMore` 走 `props.events`；finished/error 状态正确渲染。

Exit Criteria:

- [ ] `pull-refresh`、`infinite-scroll` 组件实现，遵循 `RendererComponentProps`（不直接访问 store）。
- [ ] 两者 focused 单测通过（验证 onRefresh/onLoadMore 触发与状态，不仅不报错）。

### Phase 3 - swipe-cell（手势驱动）

Status: planned
Targets: `packages/flux-renderers-mobile/src/swipe-cell.tsx`（新建）；操作按钮使用 `@nop-chaos/ui` `Button`（不写裸 `<button>`，遵循 AGENTS.md MANDATORY UI Component Usage）

- Item Types: `Proof` + `Fix`

> 执行顺序：先写失败 Proof 再实现 Fix。

- [ ] **Proof**：focused 单测——`direction:'left'` 时右滑不响应、左滑露出 right region；`closeOnOutside:true` 点击外部触发 onClose；超过 threshold 露出操作区并触发 onOpen。
- [ ] **Fix**：`swipe-cell` 组件——容器型 renderer，消费 `body`/`left`/`right` region；useTouch 驱动左/右滑露出操作区；`threshold`/`direction`/`disabled`/`closeOnOutside` 从 `props.props` 读；`onOpen`/`onClose`/`onAction` 走 `props.events`。

Exit Criteria:

- [ ] `swipe-cell` 组件实现，遵循 `RendererComponentProps`。
- [ ] focused 单测通过（方向限制 / closeOnOutside / threshold 露出，验证行为不仅不报错）。

### Phase 4 - countdown + notice-bar（展示族）

Status: planned
Targets: `packages/flux-renderers-mobile/src/countdown.tsx`、`notice-bar.tsx`（新建）；notice-bar 关闭按钮使用 `@nop-chaos/ui` `Button`（不写裸 `<button>`）

- Item Types: `Proof` + `Fix`

> 执行顺序：先写失败 Proof 再实现 Fix。

- [ ] **Proof**：countdown focused 单测（format 渲染 / paused 暂停 / 归零触发 onFinish / 卸载清理定时器）；notice-bar focused 单测（variant 样式 / closable 触发 onClose / scrollable 文本短于容器时不滚动）。
- [ ] **Fix**：`countdown` 组件——展示型 renderer；`time`/`targetTime`/`format`/`millisecond`/`paused`/`autoStart`/`prefix`/`suffix` 从 `props.props` 读；定时器（`setInterval`，`millisecond` 控制 1ms/帧粒度）；归零触发 `onFinish`（`props.events`）；卸载清理定时器。
- [ ] **Fix**：`notice-bar` 组件——展示型 renderer；`text`（string|string[]）/`scrollable`/`speed`/`direction`/`loop`/`closable`/`icon`/`variant`（info/warning/success/error）从 `props.props` 读；滚动动画（CSS transform / requestAnimationFrame）；`closable` 关闭触发 `onClose`；点击触发 `onClick`。

Exit Criteria:

- [ ] `countdown`、`notice-bar` 组件实现，遵循 `RendererComponentProps`。
- [ ] focused 单测通过（定时器/动画行为验证，不仅不报错）。

### Phase 5 - renderer definition + 注册 + playground + e2e

Status: planned
Targets: `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts`（新建，对齐 `flux-renderers-basic/src/basic-renderer-definitions.ts` 模式）；`src/index.ts`（导出组件 + definition + `registerMobileRenderers`）；`apps/playground/src/`（5 个演示页路由）；`tests/e2e/`（mobile 组件 e2e）

- Item Types: `Fix`

- [ ] **Fix**：新建 `mobile-renderer-definitions.ts`，声明 5 个 `RendererDefinition`（`type`/`displayName`/`category`/`sourcePackage:'@nop-chaos/flux-renderers-mobile'`/`defaultSchema`/`fields` region 声明：pull-refresh 的 body、infinite-scroll 的 body、swipe-cell 的 body/left/right），对齐 basic 包注册模式。
- [ ] **Fix**：`src/index.ts` 导出 5 个组件 + `mobileRendererDefinitions` + `registerMobileRenderers(registry)`（对齐 `registerBasicRenderers` 模式）。
- [ ] **Fix**：playground 增 5 个演示页（移动端视口，`<meta viewport>` + 窄屏样式），展示各组件交互。
- [ ] **Proof**：e2e——用 Playwright `setViewportSize`（如 375×667）+ `page.evaluate`/`locator` 验证：pull-refresh 下拉触发刷新文本、infinite-scroll 触底加载、swipe-cell 滑动露出操作区、countdown 倒计时推进、notice-bar 滚动/关闭。**不靠截图诊断**（遵循 AGENTS.md）。
- [ ] **Follow-up**：更新 `docs/components/mobile-roadmap.md` M5 子项（L178-182）的"代码未实现"标记为已实现 + M5 Phase Status（由 closure 阶段处理，非执行期自标）；仅在各组件 design.md 内已存在 status marker 时才翻转 design.md。

Exit Criteria:

- [ ] `mobileRendererDefinitions` + `registerMobileRenderers` 从 `src/index.ts` 导出，5 个 definition 的 region `fields` 声明正确。
- [ ] playground 5 个演示页可访问、渲染正常、移动端视口下交互可用。
- [ ] e2e 5 个组件关键交互验证通过（程序化断言，非截图）。
- [ ] 各组件 design.md 实现状态标记翻转。

## Draft Review Record

- Reviewer / Agent: `ses_110918b7dffeKvIv351pEsh3zK`（fresh session，verdict: pass-with-minors）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed（Minor，均已采纳以提升首执行体验；Minor 不阻塞共识）:
  - Minor（Phase 5 "翻转 design.md 实现状态标记" 为 phantom——标记实际在 `mobile-roadmap.md:178-182` 而非 design docs）→ 改为更新 roadmap M5 子项标记 + design.md 仅在已有 marker 时翻转。
  - Minor（Phase 2/3/4 的 Fix 列在 Proof 之前，与 `必须自动化` 档"Proof 先行"精神相左）→ 各 Phase 重排为 Proof 先于 Fix，并加执行顺序说明。
  - Minor（Phase 1 Target 给两个测试路径）→ 选定 colocated `src/hooks/use-touch.test.ts`。
  - Minor（未提醒操作/关闭按钮用 `@nop-chaos/ui` `Button`）→ Phase 3/4 Targets 加 UI 组件使用约束。
  - Minor 5（Phase 1 useTouch 已实现、Proof 标签略宽）→ 维持（guide rule 11 使该 backfill 必要），不改。
- 共识：零 Blocker / 零 Major，所有 live repo 引用（skeleton/schemas/useTouch/index 导出/design.md/注册模式/M0.1 缺位）经复核为真；single-plan-for-5-components 由 roadmap L70/L78 + guide §22/§26 强制。

## Closure Gates

- [ ] 5 个移动端原生组件（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）实现，遵循 `RendererComponentProps`（不直接访问 store）。
- [ ] `mobileRendererDefinitions` + `registerMobileRenderers` 导出，5 个 definition region 声明正确。
- [ ] useTouch + 5 个组件 focused 单测全部通过（验证行为，不仅不报错）。
- [ ] playground 5 个演示页存在且移动端视口下交互可用。
- [ ] e2e 5 个组件关键交互验证通过（Playwright 程序化断言，非截图）。
- [ ] `mobile-roadmap.md` M5 子项（L178-182）"代码未实现"标记更新为已实现、M5 标 `done`（由 closure 阶段，非执行期自标）；design.md 仅在已有 status marker 时翻转。
- [ ] 受影响 owner docs（design.md ×5、mobile-roadmap.md）已同步到 live baseline。
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### M0.1 haptics / z-index 栈消费

- Classification: `watch-only residual`
- Why Not Blocking Closure: M0.1 是软前置（roadmap 明确不硬阻塞）。若 M0.1 未先落地，本 plan 组件用本地按压反馈/z-index 兜底实现，5 个组件自身行为完整；M0.1 落地后回头替换为 `nop-haptic` / `useGlobalZIndex()` 属优化，不影响本 plan closure 成立。
- Successor Required: yes
- Successor Path: `docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md`（M0.1 plan）

### useTouch 桌面 Pointer/Mouse 兼容

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md 定位 useTouch 为触摸 Hook；桌面端测试用 Playwright touch events 注入即可验证。桌面 Pointer/Mouse 兼容属未来扩展，非移动端原生组件结果面。
- Successor Required: no
- Successor Path: —

## Non-Blocking Follow-ups

- Tabs 组件 swipe 手势接入（归 M1d，消费本 plan 的 useTouch）。
- pull-refresh/infinite-scroll 与 crud/list 数据源深度集成（crud 已有 `use-infinite-scroll`，见 e1d plan；本 plan 是独立容器 renderer，集成归后续组件响应式 work item）。

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<仅记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
