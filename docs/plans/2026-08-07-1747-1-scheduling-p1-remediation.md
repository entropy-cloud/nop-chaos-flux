# 1 scheduling 组件 P1 修复（gantt reaction 派发 + 挂载时序 + kanban/calendar/barcode）

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（1-4/1-5/1-6/1-7/1-8/1-11）、`docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（22-13）
> Related: `docs/plans/2026-08-06-2306-3-scheduling-graph-wiring-phantom-contracts.md`（22-05/22-12 同族先例，已收口）

## Purpose

把 `flux-renderers-scheduling` 包本轮审计的 **7 条 P1 发现**一次收口：gantt 句柄 invoke 不派发 schema reaction（22-13）、gantt 键盘/滚动监听在 loading/empty 首挂载后永久丢失（1-7）、kanban `component:moveCard` 目标列不存在导致卡片孤儿化（1-4）、kanban 撤销删除恢复丢 `meta`（1-5）、kanban 过滤态 roving 键盘索引错位（1-11）、calendar 快速点击遗留长按定时器（1-8）、barcode torch 可用性检查仅挂载时执行一次（1-6）。全部 test-first 落地，消除「静默死功能 / 静默数据丢失」形态。

## Current Baseline

- `gantt.tsx:341-345` 四个 reaction（zoomIn/zoomOut/scrollToToday/scrollToTask）仅 `ready()` 激活；`gantt.tsx:358-374` handle invoke 四分支只做视觉行为零 `dispatch()`；仅工具栏路径（:463-465）派发 3/4——与 calendar 22-05 已建立的「句柄 invoke 即派发」家族标准不对称（multi-audit 22-13，独立复核保持 P1）。
- `use-gantt-keyboard.ts:130-139`（deps `[containerRef]`）与 `use-gantt-scroll.ts:31-51`（deps `[gridRef, timelineRef]`）依赖稳定 ref 对象，ref 为空时 early-return；`gantt.tsx:421-443` loading/empty 首渲染提前 return 不挂 ref 容器——首挂载处于 loading/empty 态时监听永不挂载（open-audit 1-7）。
- `kanban-helpers.ts:15-22` `moveCard` 先从旧列摘除卡片，目标列不存在时 `if (!targetColumn) return result` 直接返回；`kanban-board.tsx:393-407` `handleCardMoveViaHandle` 只校验 card 存在，句柄返回 `true` → 调用方无法区分成功与卡片消失（open-audit 1-4）。
- `kanban/utils/kanban-undo-stack.ts:73-77` undo 走 `addCard(currentBoard, columnId, cardData, index)`，`kanban-helpers.ts:46-60` `addCard` 重建 `meta: {}`——撤销恢复的卡片丢失 color/tags/members（open-audit 1-5）。
- `kanban-column.tsx:155-192` rovingIndex 基于 `displayCards` 显示索引，`kanban-card.tsx:67` `data-card-index` 取 `cardIndexMap` 真实 board 索引——过滤态 `querySelector('[data-card-index="N"]')` 落空，ArrowDown/Up 焦点不移动（open-audit 1-11）。
- `use-calendar-drag-create.ts:78-137` pointermove/pointerup 窗口监听只在 500ms 定时器触发（active=true）后挂载（:129-136）；普通快速点击（<500ms）pointerup 无监听 → 定时器（:151-164）照常触发置位 → 下一次任意 pointerup 弹出班次类型选择器；`cancelCreate` 未接线任何 UI 事件（open-audit 1-8）。
- `barcode-input/hooks/use-barcode-torch.ts:26-46` effect deps `[getStreamRef]`（稳定 ref），挂载瞬间 `getStream()` 返回 null → `if (!stream) return`（:29）且 `checkedRef` 未置位（:30）→ 永不重跑 → `isAvailable` 恒 false → torch 按钮（`barcode-scanner-overlay.tsx:281` 条件渲染）生产流程永不出现（open-audit 1-6）。
- 测试基线：scheduling 包 878 tests 全绿；上述 7 条发现对应路径测试覆盖为零（挂载即有数据/挂载即有流/存在列路径，全部绕过时序与异常假设）。

## Goals

- 7 条 P1 全部以 `Fix` 收口：句柄 invoke 即派发 reaction（gantt）、监听挂载不依赖首挂载时序（gantt）、moveCard 目标列不存在返回失败且不摘除卡片（kanban）、undo 恢复完整卡片含 meta（kanban）、过滤态 roving 焦点可达（kanban）、快速点击不遗留长按定时器（calendar）、torch 可用性在流就绪后可达（barcode）。
- 每条修复先红后绿：新增 focused 测试在修复前失败、修复后通过，锁定正确行为而非仅「不报错」。
- gantt design.md §8.2 过时表述（「非独立可调用 action」）与实现矛盾处同步为最终设计状态。

## Non-Goals

- 不处理 scheduling 包 P2 项（barcode 连续同值扫描 2-13、drag hook pointercancel 2-14、calendar 键盘未知 resourceId 2-15、gantt 键盘日期编辑走 onTaskDragEnd 2-19 等）——全部登记 roadmap Follow-up Backlog。
- 不改 `component:moveCard` 的公开 capability 契约（签名不变，只改失败语义）。
- 不引入新的 schema 字段或事件；不改变 22-07 onTaskEdit 既有契约。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`、`hooks/use-gantt-keyboard.ts`、`hooks/use-gantt-scroll.ts`
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`、`kanban-helpers.ts`、`kanban-column.tsx`、`kanban-card.tsx`、`utils/kanban-undo-stack.ts`
- `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag-create.ts`、`calendar.tsx`（必要时接线取消路径）
- `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-torch.ts`、`barcode-scanner-overlay.tsx`
- 上述路径对应测试文件（新测试先红后绿）
- `docs/components/gantt/design.md`（§8.2 表述同步）

### Out Of Scope

- 其余调度组件（scheduling ai、scheduling 其它 hooks）行为变更
- 事件 ctx 扫描器 `scripts/audit/find-event-dispatch-without-ctx.mjs` 别名 receiver 盲区（open-audit 2-7，P2，随 backlog）

## Test Strategy

本档选择：**必须自动化**。7 条均为已确认 live defect 且根因非显然（时序/组合假设），必须测试先行（Proof 项先于 Fix 项），并锁定正确行为断言。

## Failure Paths

| 可测场景编号            | 触发                                | 行为（含状态码/错误码）                                                         | 可重试       | 用户可见表现                                  |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| moveCard-missing-column | `component:moveCard` 目标列不存在   | 句柄返回 `{ok:false, error}`；board 原样返回（卡片不摘除）；不派发 onCardMove   | 是           | 卡片不消失，action 失败可见                   |
| moveCard-missing-card   | `component:moveCard` 卡片 id 不存在 | 句柄返回 `{ok:false, error}`（既有守卫保持）                                    | 是           | 无变化                                        |
| scrollToTask-no-taskId  | 句柄 `scrollToTask` 缺 taskId       | 返回 `{ok:false, error}`，不派发 reaction                                       | 是           | 无滚动、无 action                             |
| torch-stream-late       | 相机流在挂载后异步就绪              | 流就绪后 `isAvailable` 检查执行并置位；不支持 torch 时 `isAvailable` 保持 false | 否（一次性） | 支持 torch 的设备按钮出现；不支持则按钮不出现 |
| calendar-quick-click    | 点击 <500ms 松手                    | 定时器清除、无窗口监听残留、后续 pointerup 不弹选择器                           | 是           | 无误弹                                        |

## Execution Plan

### Phase 1 - Gantt：句柄 invoke 派发 reaction + 监听挂载不依赖首挂载时序

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/{gantt.tsx,hooks/use-gantt-keyboard.ts,hooks/use-gantt-scroll.ts}` + gantt 相关测试

- Item Types: `Proof | Fix`

- [x] `Proof` 先红两条：① handle invoke 四条路径（zoomIn/zoomOut/scrollToToday/scrollToTask）各一用例——mock `props.reactions.*.dispatch`，invoke 后断言 dispatch 被调用（对照 `gantt.test.tsx:298-323` 既有 ready+工具栏用例）；② 首挂载 loading/empty 态下渲染（`resolved.loading` 或任务异步到达），再过渡到有数据，断言 keydown 监听生效（keydown 触发 gantt 键盘行为）且 grid↔timeline onScroll 同步可用——修复前红。
- [x] `Fix` 22-13：`gantt.tsx:358-374` handle invoke 四分支补 `void props.reactions[key]?.dispatch()`（scrollToTask 滚动后派发，对齐 `calendar.tsx:232,240` 22-05 先例；scrollToTask 缺 taskId 失败路径不派发）。
- [x] `Fix` 1-7：`use-gantt-keyboard.ts`/`use-gantt-scroll.ts` 改为对「就绪信号」响应——引入由 gantt.tsx 下传的 ready 状态（loading/empty 之外的挂载完成信号）或 ref 回调挂载，使 loading/empty 首挂载后 refs 非空时监听必挂；不得依赖稳定 ref 对象 + early-return 形态。
- [x] `Proof` 修复后上述用例全绿；gantt 既有 878 测试零回归。

Exit Criteria:

- [x] `gantt.tsx` handle invoke 四分支含 reaction dispatch 调用（live grep `reactions.` 在 invoke switch 内可查证）；`scrollToTask` 有 dispatch 通道。
- [x] 新增测试文件（或扩展 gantt.test.tsx）先红后绿记录：修复前首跑失败、修复后通过（写入 daily log 与 plan 收口记录）。
- [x] scheduling 包 typecheck 通过、gantt 相关 focused 测试全绿。

### Phase 2 - Kanban：moveCard 失败语义 + undo 恢复 meta + 过滤态 roving

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/{kanban-board.tsx,kanban-helpers.ts,kanban-column.tsx,kanban-card.tsx,utils/kanban-undo-stack.ts}` + kanban 相关测试

- Item Types: `Proof | Fix`

- [x] `Proof` 先红三条：① `component:moveCard` 目标列不存在——断言句柄返回 `{ok:false}` 且卡片仍在原列 children（现有 `kanban-handle.test.tsx:142-234` 只覆盖存在列路径）；② 删除卡片后 undo——断言恢复卡片 `meta`（color/tags/members）与删除前一致；③ 过滤器激活 + ArrowDown/ArrowUp——断言焦点移动到 `displayCards` 相邻卡片（jsdom 中 focus 断言 `cardEl?.focus()` 落点，或断言 rovingIndex 对应元素获得 focus）。
- [x] `Fix` 1-4：`kanban-helpers.ts:15-22` `moveCard` 改为先校验目标列存在（不存在返回原 board 不变、不摘除）；`kanban-board.tsx:393-407` `handleCardMoveViaHandle` 目标缺失返回 `false`（句柄层 `{ok:false}`），不落位不派发 onCardMove。
- [x] `Fix` 1-5：undo 恢复完整卡片——捕获点在 `kanban-board.tsx:383`（`{ ...boardData[cardId].data }` 只存 data 字段，meta 从未捕获），`kanban-undo-stack.ts:73-77` replay 走 `addCard` 重建 `meta: {}`；修复为 removeCard 命令捕获完整卡片（data + meta）并还原 meta（`addCard` 扩展接受 meta 或 undo 直接落位完整卡片）；`kanban-helpers.ts:46-60` `addCard` 保持契约（正常新增仍 `meta: {}`）。
- [x] `Fix` 1-11：`kanban-column.tsx:155-192` roving 聚焦查询与 `data-card-index` 对齐——以 `displayCards[rovingIndex]` 的真实 board 索引（cardIndexMap）查询，或改为按 card id（`data-card-id`）查询；过滤态与非过滤态行为一致。
- [x] `Proof` 修复后三条用例全绿；既有 kanban 测试（含 1023-3 类型契约、2306-3 七句柄）零回归。

Exit Criteria:

- [x] `moveCard` 目标列不存在时 board 原样返回（helper 单测断言）；句柄返回 `{ok:false}` 且无 onCardMove 派发。
- [x] undo 恢复用例断言 meta 完整还原（data 与 meta 双断言）。
- [x] 过滤态 ArrowDown/Up 用例断言焦点落在正确卡片（修复前红记录）。
- [x] scheduling 包 typecheck 通过、kanban 相关 focused 测试全绿。

### Phase 3 - Calendar 长按定时器 + Barcode torch 可用性时序

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag-create.ts`、`calendar.tsx`、`barcode-input/hooks/use-barcode-torch.ts`、`barcode-input/barcode-scanner-overlay.tsx` + 对应测试

- Item Types: `Proof | Fix`

- [x] `Proof` 先红两条：① 快速点击（pointerdown 后 <500ms pointerup）——断言 500ms 后不进入 active 态、无窗口 pointermove/pointerup 监听残留、后续任意 pointerup 不触发 `setShowTypeSelector(true)`；② torch——挂载时无流（`getStream()` 返回 null）、流在异步 `start()` 后到达——断言 `isAvailable` 最终为 true（现有 harness 挂载即有流，属假绿，需改写）。
- [x] `Fix` 1-8：`use-calendar-drag-create.ts` 长按定时器在 pointerup/pointercancel 到达时无条件清除（无论 active 与否），窗口监听挂载后 pointerup 清除定时器与监听；确认无遗留「active 已置位、监听悬挂」中间态；必要时 calendar.tsx 接线取消路径（`cancelCreate` 显式清理）。
- [x] `Fix` 1-6：`use-barcode-torch.ts` 可用性检查改为对「流就绪」响应——deps 依赖流可用性（如流存在轮询重查、或检查延后到流可读信号），`checkedRef` 在真实检查完成后才置位；不得再依赖挂载瞬间的流快照。
- [x] `Proof` 修复后两条用例全绿；barcode-input 既有测试（含 mock `isAvailable: false` 的 overlay 测试）零回归。

Exit Criteria:

- [x] 快速点击用例断言 500ms 后无 active 态、无窗口监听、无后续误弹选择器（修复前红记录）。
- [x] torch 用例断言流异步就绪后 `isAvailable === true`、torch 按钮可见（`barcode-scanner-overlay.tsx:281` 条件成立）。
- [x] scheduling 包 typecheck 通过、calendar/barcode focused 测试全绿。

## Draft Review Record

> 由独立子 agent（fresh session）填写，见 `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule。

- Reviewer / Agent: 独立 review sub-agent `ses_0240dd454ffeaobEUVELjRxAkw`（fresh session，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 全部处理——① Related 路径修正为 `2026-08-06-2306-3-scheduling-graph-wiring-phantom-contracts.md`；② `use-barcode-torch.ts` 行号修正为 :26-46；③ `use-calendar-drag-create.ts` 行号修正为 :78-137；④ Fix 1-5 补充捕获点 `kanban-board.tsx:383`；⑤ 补 `## Failure Paths` 表（moveCard/scrollToTask/torch/calendar 失败语义）

## Closure Gates

- [x] 7 条 in-scope P1 发现全部修复并 test-first 落地（Proof 先红记录可查）
- [x] 无 in-scope live defect 被静默降级到 deferred / follow-up
- [x] gantt design.md §8.2 已同步最终设计状态（句柄 invoke 即派发）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（scheduling 包 focused + 全量）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

无（所有 in-scope 发现均为已确认 live defect，全部入 Fix，无延期项）。

## Non-Blocking Follow-ups

- scheduling 包 P2 项（2-13/2-14/2-15/2-19 等）已登记 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog，不影响本 plan 收口。

## Closure

Status Note: 3 Phase 全部 completed（2026-08-07 执行 run）。7 条 P1 全部 test-first 落地：新增 15 条 focused 用例先红后绿（gantt-handle.test.tsx ×2 + gantt-mount-timing.test.tsx ×3 + kanban-helpers.test.ts ×1 + kanban-handle.test.tsx ×2 + kanban-undo-stack.test.ts ×2 + kanban-renderer.test.tsx ×2 + use-calendar-drag-create.test.ts ×2 + use-barcode-torch.test.ts ×1）。修复过程中发现并收口 2 个同族连带缺陷：① kanban `handleUndo`/`handleRedo` 依赖 setState updater 副作用捕获结果（React 19 updater 仅在渲染期调用，是否急切执行依赖时序）——撤销静默偶发失效，改为确定性读取当前栈；② barcode-input/scanner-overlay 两个测试文件缺显式 `afterEach(cleanup)`（vitest globals 关闭时 RTL 不自动 cleanup），overlay portal 节点残留 document.body 与旧手动 `.remove()` hack 竞争 React 提交删除——间歇性 removeChild DOMException（机器负载放大），显式 cleanup 根除。scheduling 包 893 tests 全绿（基线 878 + 15 新增）；工作区 `pnpm typecheck`/`build`/`lint` 32/32、`pnpm test` 59/59 全绿；`pnpm check` exit 0（check:oversized-code-files 2 个 over-limit 均为 registered 豁免清单，零新增）。gantt design.md §8.2 已同步「两条触发路径都派发」最终设计状态。closure-audit 由独立 fresh session 执行后勾选上方审计门禁并填证据。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent `2026-08-07-174752-mission-driver`（fresh session，不复用执行者上下文，2026-08-07）
- Evidence: live repo 复核全部通过——① 22-13：`gantt.tsx:364-391` invoke switch 四分支均含 `void props.reactions[key]?.dispatch()`（scrollToTask 缺 taskId 失败路径不派发），handle 注册 effect deps 含 `props.reactions`；`gantt-handle.test.tsx:71-126` 4 句柄 dispatch + 缺 taskId 负例。② 1-7：`use-gantt-keyboard.ts:132-146`/`use-gantt-scroll.ts:15-57` 改对 `active` 就绪信号响应（deps `[containerRef, active]`/`[gridRef, timelineRef, active]`），`gantt.tsx:189` `ganttReady = !resolved.loading && store.tasks.size > 0` 下传至 :196/:288；`gantt-mount-timing.test.tsx` 3 用例（loading→data / empty→data keydown / grid↔timeline 滚动同步，真实 hooks 不 mock）。③ 1-4：`kanban-helpers.ts:12-15` 先校验目标列再摘除、缺失 board 原样返回；`kanban-board.tsx:386` 目标缺失返回 false 不派发 onCardMove；`kanban-helpers.test.ts:107` + `kanban-handle.test.tsx:200` 断言。④ 1-5：`kanban-board.tsx:370` 捕获 `cardMeta`、`kanban-undo-stack.ts:73-78` replay 注入 id + 第 5 参 meta；`kanban-undo-stack.test.ts:223-252` + `kanban-handle.test.tsx:217` meta 双断言。⑤ 1-11：`kanban-column.tsx:155-195` roving 改按 `data-card-id` 查询；`kanban-renderer.test.tsx:510-548` 过滤态 ArrowDown/Up 焦点用例。⑥ 1-8：`use-calendar-drag-create.ts:84-165` 窗口监听 pointerdown（pressing）即挂、pointerup/pointercancel 无条件清定时器；`use-calendar-drag-create.test.ts:221/257` 快速点击 + pointercancel 用例。⑦ 1-6：`use-barcode-torch.ts:31-65` 自重试链（250ms 周期重查，真实检查后才置位 checkedRef）；`use-barcode-torch.test.ts:91` 异步流就绪用例。验证：scheduling 包 79 files/893 tests 全绿（复跑确认）；daily log `docs/logs/2026/08-07.md:5-12` 记录执行收口；`docs/components/gantt/design.md:290` §8.2「两条触发路径都派发」已同步。findings：零（仅补勾 auditor 门禁项 + 填证据）。

Follow-up:

- 无 remaining plan-owned work（P2 已归 backlog；本 run 连带修复的 kanban undo 确定性 + barcode 测试 cleanup 已在 Status Note 记录）。
