# 666 Mobile M8 底部面板组计划

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/components/mobile-native-components-roadmap.md` M8（M8a FloatingPanel / M8b FloatingBubble / M8c Sheet 手势关闭 / M8d ActionSheet 形态决策）；算法依据 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.1（vant FloatingPanel 锚点 + DAMP + 滚动仲裁）、§4.6（f7 sheet swipeToClose）
> Related: `docs/plans/664-mobile-m6-gesture-infrastructure-plan.md`（M6 底座，completed）、`docs/plans/665-mobile-m7-wheel-picker-family-plan.md`（弹层壳/命名先例，completed）

## Purpose

交付底部面板组四能力：`floating-panel`（锚点多档拖拽面板 + 面板/内容滚动仲裁）、`floating-bubble`（可拖拽悬浮球 + 吸边）、`@nop-chaos/ui` Sheet 的移动端手势下拉关闭（ui 层增强）、`action-sheet` 形态决策记录 + 渲染器落地。

## Current Baseline

- M6/M7 已落地（commit 249821d7f / 09c177080）：`MomentumAnimator`、`rubberband/nearest`（gesture-math）、`useLockScroll`（局部模式 `localRef` 尚无消费方）、`wheel-picker-popup` 底部弹层壳先例（safe-bottom + 工具栏）。`useGlobalZIndex`（z-index 栈）系 M0.1 既有 ui 包 hook（commit 540cb8e40），非 M6/M7 交付，可直接消费；滚动锁复用 M6 `useLockScroll`。
- `@nop-chaos/ui` Sheet：shadcn/Base-UI 封装（`packages/ui/src/components/ui/sheet.tsx`），无触摸手势关闭；无 `floating-panel`/`floating-bubble`/`action-sheet` 任何既有代码（2026-10-19 全仓 grep 零命中）。
- 包测试基线 28 文件 / 321 用例全绿（plan 665 收口值）；包定义面 10 类型（MM-11 门禁钉死）。
- 包 CSS 键控规则先例：`[data-slot='…']` 选择器 + `--nop-wheel-*` 覆盖变量（styling 豁免通道，plan 665 登记）。

## Goals

- **M8a `floating-panel`**：可拖拽多档锚点面板（`anchors` px 高度数组 + `defaultHeight`）；拖拽跟手 + 松手 `nearest` 锚点吸附 + 惯性（复用 M6）；**滚动仲裁**「面板未满屏（未达最高锚点）拖面板 / 满屏后拖内容」——内容区可滚（`overflow-y:auto`），触摸仲裁：面板未达顶锚时垂直拖拽移动面板、到达顶锚后向上拖拽滚动内容、内容 scrollTop>0 时下拉先滚内容；面板拖拽期间局部滚动锁（M6 `useLockScroll` localRef 首个消费方）。
- **M8b `floating-bubble`**：可拖拽悬浮球；松手按 `nearest` 吸附最近左右边缘（磁吸 X 轴），越界 rubberband 阻尼；`magnetic`/`axis` schema；点击与拖拽区分（位移 <6px 在 touchend 正向派发 `onClick`——阈值常量导出复用 M6 `DRAG_CLICK_SUPPRESS_THRESHOLD_PX`，点击分支派发为本特性新增逻辑，非 M6 拦截语义）。
- **M8c ui Sheet 手势下拉关闭**：`packages/ui` 新增 `SheetGestureClose`（数据属性驱动的行为组件或 hook）：side=bottom 的 Sheet 内容面板触摸下拉，`(t<300 && d>20) || d>h/2` 速度判定关闭，否则回弹；拖拽进度映射面板 translateY 与 backdrop opacity（backdrop 随 progress 渐隐）；**breakpoints 半开档位裁定为不设**（半开档 = floating-panel 职责，M8a 锚点已覆盖——记录于 ui 变更说明与 design.md）。
- **M8d `action-sheet` 决策记录 + 渲染器**：决策记录（`docs/components/action-sheet/design.md` §2）——**mobile renderer 落地**（复用 M7 弹层壳模式：z-index 栈 + useLockScroll + safe-bottom），非 ui Sheet 派生（理由：items 数据模型 + badge/disabled/分组语义属渲染器契约，ui Sheet 是无语义 surface）；list/grid 两种形态、`onSelect` payload、取消按钮/取消遮罩。
- 单元层：滚动仲裁状态机、吸边 nearest、手势关闭判定函数 focused 测试；组件层交互测试。
- playground `/m8-bottom-panels` 演示页 + `tests/e2e/mobile-bottom-panels.spec.ts`。

## Non-Goals

- Sheet 的 breakpoints 半开档位（floating-panel 锚点已覆盖该交互，裁定记录于 M8c 实现）。
- Drawer（side=left/right）手势关闭——仅 bottom 形态纳入 v1（f7 swipeToClose 蓝本即垂直下拉）。
- floating-bubble 的自动贴边动画曲线定制（用 M6 吸附动画参数）。
- action-sheet 的异步 items 加载与分组 headers（v1 扁平 items + grid/list）。
- 不改 `@nop-chaos/ui` 既有 Sheet API 形状（仅新增可选增强，向后兼容）。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/`：`floating-panel.tsx`、`floating-bubble.tsx`、`action-sheet.tsx`、`panel-logic.ts`（锚点吸附/滚动仲裁纯函数）+ 各测试、schemas/定义/导出/styles 增补。
- `packages/ui/src/components/ui/sheet-gesture-close.ts`（hook）+ ui 包测试 + `packages/ui/src/index.ts` 导出 + `sheet.tsx` 可选 prop 接线（Protected Area ask-first 凭据链：roadmap 头部 2026-10-19 人确认指令 + roadmap M8c 行「ui 层增强」归属 + 本计划 + draft review——与 CX-16/plan 596 ui index +1 导出先例同口径；执行改动 index.ts 的 item 引用本条）。
- `docs/components/action-sheet/design.md`（含 §2 形态决策记录）、`docs/components/floating-panel/design.md`（含 M8c Sheet 手势契约小节）。
- playground 演示页 + e2e。

### Out Of Scope

- `@nop-chaos/ui` Drawer/Dialog 的手势增强。
- floating-panel 的 backdrop 遮罩模式（v1 常驻面板，无模态语义）。
- action-sheet 分组/异步 items。
- 桌面端鼠标拖拽专门适配（自然回退可用）。

## Failure Paths

| 可测场景编号                    | 触发                  | 行为                             | 可重试 | 用户可见表现 |
| ------------------------------- | --------------------- | -------------------------------- | ------ | ------------ |
| `panel-content-arbitration`     | 面板满屏后向上拖      | 内容滚动而非面板移动（面板锁顶） | 是     | 内容滚动     |
| `panel-drag-below-max`          | 面板未达顶锚时拖拽    | 面板跟手移动，内容不滚           | 是     | 面板跟手     |
| `bubble-edge-magnet`            | 松手位置在两边缘之间  | 吸附最近边缘（nearest）          | 是     | 磁吸贴边     |
| `bubble-click-vs-drag`          | 位移 <6px 松手        | 派发 onClick，不触发吸边动画     | 是     | 点击生效     |
| `sheet-gesture-below-threshold` | 慢速小距离下拉        | 面板回弹不关闭                   | 是     | 回弹         |
| `sheet-gesture-fling`           | 快速下拉 d>20 或 >h/2 | 关闭 Sheet                       | 是     | 关闭         |
| `action-sheet-item-disabled`    | 点击 disabled item    | 不派发 onSelect、不关闭          | 是     | 无反应       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**。理由：滚动仲裁与手势关闭判定是交互正确性契约（arbitration 状态机判别测试先行）；ui 包改动属 Protected Area 需 focused 证明。

## Execution Plan

### Phase 1 - M8a floating-panel（panel-logic + 渲染器）

Status: completed
Targets: `packages/flux-renderers-mobile/src/{panel-logic,floating-panel}.{ts,tsx}`、`panel-logic.test.ts`、`floating-panel.test.tsx`、schemas/定义注册

- Item Types: `Proof`、`Fix`

- [x] Proof: `panel-logic.test.ts` 先行——`snapToAnchor(offset, anchors)`（nearest + 越界 clamp）、`shouldScrollContent({ panelAtTop, contentScrollTop, deltaY })` 仲裁真值表（**8 格显式钉死，deltaY>0 为下拉**：panelAtTop=false → 恒 false（4 格，面板跟手）；panelAtTop=true ∧ 上拉 → true（内容下滚，2 格，scrollTop 是否>0 不影响）；panelAtTop=true ∧ 下拉 ∧ scrollTop>0 → true（内容上滚）；panelAtTop=true ∧ 下拉 ∧ scrollTop=0 → false（面板下拉收起）。仲裁按逐 touchmove 重评：满屏下拉中 scrollTop 打到 0 的**同手势续拖**切换为面板拖拽——钉为独立测试格）、`bubbleSnapX(x, width, containerWidth)`（nearest 边缘）
- [x] Fix: `floating-panel.tsx`——锚点拖拽（MomentumAnimator + nearest 吸附）、内容区 overflow-y 滚动仲裁（面板根非 passive touchmove 监听按 shouldScrollContent 逐 move 条件 preventDefault 接管/放行——与 useLockScroll local 锁并存，锁管穿透、面板监听管归属）；touch-action 分时声明：未满屏面板根 `none`、满屏内容区 `pan-y`；`data-height`/`data-anchor` 断言通道；`FloatingPanelSchema`（anchors/defaultHeight/body region/onChange…）+ 注册
- [x] Proof: 组件测试——锚点拖拽落位、仲裁两分支、局部锁 class

Exit Criteria:

- [x] `panel-logic.test.ts` 仲裁真值表全格覆盖且全绿
- [x] `floating-panel.test.tsx` 全绿（锚点吸附/仲裁/局部锁）
- [x] 包测试全绿零回归

### Phase 2 - M8b floating-bubble

Status: completed
Targets: `packages/flux-renderers-mobile/src/floating-bubble.tsx`、`floating-bubble.test.tsx`、注册

- Item Types: `Proof`、`Fix`

- [x] Proof: `floating-bubble.test.tsx` 先行——拖拽跟手、松手磁吸最近边缘（transform 断言）、点击/拖拽 6px 阈值区分（onClick 恰在点击分支派发）、越界 rubberband 视觉阻尼
- [x] Fix: `floating-bubble.tsx`——`FloatingBubbleSchema`（axis/magnetic/initialX/initialY/onClick）+ 注册；磁吸动画复用 MomentumAnimator

Exit Criteria:

- [x] `floating-bubble.test.tsx` 全绿（跟手/磁吸/点击区分/越界阻尼）
- [x] 包测试全绿零回归

### Phase 3 - M8c ui Sheet 手势下拉关闭

Status: completed
Targets: `packages/ui/src/components/ui/sheet-gesture-close.tsx`、`packages/ui/src/index.ts`、`packages/ui` 测试

- Item Types: `Proof`、`Fix`

- [x] Proof: 判定函数 focused 测试先行——`shouldCloseOnRelease({ durationMs, distancePx, panelHeight })`：`(t<300 && d>20) || d>h/2` 真值表（快+短→true、慢+半屏→true、慢+短→false、快+向上→false）
- [x] Fix: 形态钉死为 **ui 内部 hook + Sheet `gestureClose?: boolean` 可选 prop**（独立「包裹内容」组件不可行：SheetOverlay/Popup 为 Portal 下兄弟节点且 backdrop 在 SheetContent 内部渲染，包外不可达）——SheetContent 内部 hook 直连 popup translate + backdrop opacity；`--sheet-progress` 落在 Portal 公共祖先（css 变量不跨兄弟继承），拖拽期禁用 backdrop 既有 `transition-opacity`、释放回弹时还原；释放按 `(t<300&&d>20)||d>h/2` 判定走 Base-UI close 或回弹；breakpoints 不设裁定注释
- [x] Proof: ui 包组件测试——拖拽 progress 变量、判定关闭、回弹；**判别测试**：`gestureClose` 缺省/false 时拖拽不产生 transform、不注册手势监听（实现误开默认则挂）

Exit Criteria:

- [x] 判定真值表 + 组件测试全绿；`git diff packages/ui` 仅含本特性文件与 index 导出
- [x] 既有 Sheet 用例零回归（ui 包测试全绿）

### Phase 4 - M8d action-sheet 决策 + 渲染器

Status: completed
Targets: `packages/flux-renderers-mobile/src/action-sheet.tsx`、`action-sheet.test.tsx`、`docs/components/action-sheet/design.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] Decision: design.md §2 形态决策记录——mobile renderer（复用 M7 弹层壳模式）vs ui Sheet 派生的对比与裁定（items 数据模型/事件 payload/safe-area 归渲染器契约；ui Sheet 无语义 surface 不承载 items）
- [x] Proof: `action-sheet.test.tsx` 先行——list/grid 形态渲染、item 点击派发 `{ type:'select', index, value }` 并关闭、disabled item 不派发、取消按钮/遮罩取消、safe-bottom class
- [x] Fix: `action-sheet.tsx`——`ActionSheetSchema`（items list/grid、cancelText、closeOnMask）+ 注册 + i18n 取消键

Exit Criteria:

- [x] 决策记录落 design.md §2（含 ui Sheet 派生对比与理由）
- [x] `action-sheet.test.tsx` 全绿（list/grid/select/disabled/cancel）
- [x] `pnpm check:i18n-keys` 与 definition-fields 门禁零新增红

### Phase 5 - 集成面：演示页、e2e、roadmap 勘误

Status: completed
Targets: `apps/playground/src/pages/m8-bottom-panels-demo.tsx`、路由/卡片注册、`tests/e2e/mobile-bottom-panels.spec.ts`、roadmap M8 行勘误

- Item Types: `Fix`、`Proof`

- [x] Fix: playground `/m8-bottom-panels` 演示页（floating-panel 锚点演示 + 内容滚动、floating-bubble 磁吸、action-sheet 触发、gestureClose Sheet 触发）
- [x] Proof: e2e——floating-panel 拖拽锚点落位（data-anchor 断言）、bubble 磁吸位置断言、action-sheet 选择回显、Sheet 手势关闭（CDP 快速下拉 → 关闭）；`setViewportSize` 冒烟
- [x] Fix: roadmap M8 行就地勘误（状态回写 + M8c breakpoints 裁决注记）——随收口提交

Exit Criteria:

- [x] e2e 全绿
- [x] `pnpm check` 除既有 knip xlang 红外零新增红

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 2；Round 1 fail 1 Major）
- Rounds: 2
- Findings addressed:
  - R1-Major M-1 仲裁真值表规格矛盾/方向写反 → 8 格显式钉死 + 逐 touchmove 重评 + 同手势中段交接独立测试格
  - R1-Minor m-1 touch-action 分时声明与锁共存；m-2 --sheet-progress 落 Portal 公共祖先 + backdrop transition 接管；m-3 形态钉死 ui 内部 hook + gestureClose prop；m-5 bubble 阈值措辞改「导出复用常量、正向派发新增」；m-6 gestureClose 缺省判别测试；m-8 bottom-sheet owner doc 入 Closure Gates；ask-first 凭据链显式落字（CX-16/plan 596 同口径）
  - R2-残留 m-7（useGlobalZIndex 归因勘误）与扩展名 nit 本轮顺手收敛

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope contract drifts 已收敛（design.md 与实现一致；M8c/M8d 裁定记录在案）
- [x] 行为/契约结果已达成（Phase 1–5 Exit Criteria 全勾）
- [x] 必要 focused verification 已完成（仲裁真值表/判定真值表/交互测试/e2e）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（action-sheet/floating-panel design.md + roadmap M8 行勘误 + `docs/components/bottom-sheet/design.md` 基座描述与 ui Sheet gestureClose 行为一致性核对）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照既有红集合：knip xlang 一项；零新增）

## Deferred But Adjudicated

### 弹层家族测试文件合并（bottom-panels.test.tsx）

- Classification: `out-of-scope improvement`（相对计划点名的 3 个独立测试文件）
- Why Not Blocking Closure: Phase 1/2/4 的 Proof 用例合并交付于单文件（三组件共享弹层交互形态），断言覆盖完整（审计逐条核实）；文件名漂移不构成覆盖缺口。执行期该文件曾因体量触发 oversized-700 纪律拆分先例（665），本计划合并交付经审计接受。
- Successor Required: `no`
- Successor Path: —

### ui 手势落点扩展名与关闭语义

- Classification: `out-of-scope improvement`（相对计划 Targets 的 .tsx 与"判定走 Base-UI close"措辞）
- Why Not Blocking Closure: ①`sheet-gesture-close.ts`（hook，非 .tsx——无 JSX）；②关闭语义实装为 app 自持 `onGestureClose` 回调（`gestureClose` 无 `onGestureClose` 时不生效），Base-UI close 通道从 ui 包内部不可达（Root onOpenChange 为 app 受控态）——裁定已落 `floating-panel/design.md` §4；③bubble 阈值常量 `DRAG_CLICK_SUPPRESS_THRESHOLD_PX` 保持模块私有（导出会碰 MM-11 精确面），floating-bubble 以本地 `CLICK_THRESHOLD_PX = 6` + 注释同值实现。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- Sheet Drawer（left/right）手势关闭、Sheet breakpoints 档位（如真实需求出现，floating-panel 锚点为候选实现）
- action-sheet 分组 headers / 异步 items
- floating-bubble 贴边动画曲线定制

## Closure

Status Note: M8a–M8d 全部交付——floating-panel（8 格仲裁真值表 + 原生非 passive touchmove 仲裁 + useLockScroll localRef 首消费方）、floating-bubble（磁吸/rubberband/6px 点击区分）、ui Sheet opt-in gestureClose（f7 swipeToClose 判定 + backdrop progress 渐隐 + body 级委托）、action-sheet（list/grid + 决策记录）；13 定义注册面 + 拆分 extended 定义文件（max-lines 门禁）。全量门禁：typecheck/build/lint 绿、test 82/82（mobile 30 文件 342 用例、ui 73/366）、check 唯一红 = 既有 knip xlang（master 同红）、e2e bottom-panels 6/6 + 回归 8/8。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），两轮：R1 `issues`（1 Blocker + 3 Major 退回）→ 回修 → R2 `approved`（附 4 项收口 commit 生效条件，全部随本提交载入）
- Evidence: R1 发现 B1（ui 包 lint 红未用导入下"lint 全绿"虚假声称）+ M1（plan 文本全面脱节：Phase 未勾/改判未记账）+ M2（daily log 缺失）+ M3（基线注解归因错误）；回修后 R2 逐项亲证（lint exit 0、plan 37 勾/1 未勾 audit 项、日志 M8 节、注解三值与实况一致、bubble/e2e 增补用例），并记录一处回修报告与实况不符的注释声称（Lessons 2.0 模式 1，随生效条件 1 订正）。审计会话 id（agent_92e03db5-fb15-464a-90cf-83281336371e）。

Follow-up:

- 见 Non-Blocking Follow-ups 节；除此之外 no remaining plan-owned work
