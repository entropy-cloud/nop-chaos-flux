# 729 审计修复 R2·R2.7：契约补测+scheduling（P1-MA4.3-006 live defect 修复 / 007 / 009）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.7（MR2.0/plan 713 展开；MR4.0/plan 718 案 A：009 根因修复归 R3.4/5.2-002，本行守测试面）；`docs/audits/2026-10-21-1524-arm2-MA4.3-content-domain-tests.md` §P1-MA4.3-006/007/009（各含最小补强规格；006 判别前置「先证旁路存在」）；owner doc `docs/architecture/renderer-runtime.md`
> Related: MA5.5 IS-three-002 同块先例（727 双证回填）；4.3-007 与 MA5.2 改判注记（测试接线补强随行）；先例 plan 723-728（同构契约补测链）
> 编号 runway：728 为 R2.6（本线）；729 本 plan；ARC 线从 730 起避开

## Purpose

006 为 kanban WIP strict「整列排除」卡片粒度旁路 **live defect 修复**（card canDrop :130-133 仅查 source 类型无 wipSet 检查 + onDrop :61-105 解析后无防御——拖到超限列内卡片上即旁路整列排除；审计判别前置「先证旁路存在」：探针证实旁路 live 后按 727/005 先例修复+钉正确语义）；007 为 gantt 拖拽改期 undo 生产 push 点接线补测（生产 wiring live——gantt.tsx:205 已传 undoStack，use-gantt-drag.test.ts 15 处调用均未传第 4 参致 push 点零执行（review R1 M2 对账勘正））；009 为 kanban Ctrl+Z 键盘消费链 integration 守护（案 A：根因归 R3.4，本行守测试面）+ e2e 空壳函数体补完。三 finding 回填 `closed`（009 注记案 A 分工）。

## Current Baseline（2026-10-24 live，HEAD `952c3f809` 实测）

- **006**：`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts`——card canDrop :130-133 仅 `source.data.type !== 'kanban-card'`；column canDrop :164-167 含 `wipSet?.has(columnId)` 排除；onDrop :61-105（内层解析 :69-91）无超限防御。stateRef :45 每 render 更新（wipOverLimitColumns live 可读）。harness：`use-kanban-dnd.test.ts` vi.mock praxis adapter + capturedDropTargets/capturedMonitor（canDrop 函数直调、onDrop 直驱，零真实 DOM）。
- **007**：`use-gantt-drag.ts:24`（第 4 参 `undoStack?: UndoStack`）+:120/:129/:139（三处 `undoStack?.push(new UpdateTaskCommand(...))`）；生产 wiring live：`gantt.tsx:205` 传 undoStack；`use-gantt-drag.test.ts` 15 处调用均未传第 4 参（review R1 M2 勘正）。`undo-stack.ts:199` UndoStack 类 + `gantt-editor.test.tsx:126-143` undoStack={stack} 惯用法（editor-save 路径已有 undo 回滚测试）。
- **009**：Ctrl+Z 消费 `use-kanban-board-effects.ts:50-68`（window keydown，**boardRef.contains(document.activeElement) 门** + 非 editable + ctrl+z→undo / ctrl+shift+z→redo）；按钮路径全链已测（`kanban-handle.test.tsx:257` undo 按钮全链全包最强）；harness：KanbanBoard + registryMock handle（capabilities.invoke moveCard/getData）+ `data-card-id/data-column-id` DOM 断言；e2e 空壳 `tests/e2e/kanban-demo.spec.ts:66-81`（测试名 promises undo，函数体只读 id）。kanban demo 真实指针拖拽的已提交先例：tests/e2e/scheduling-visual-tokens.spec.ts 等 mouse 序惯用法（\_tmp 探针不入库）。
- roadmap R2.7 行 `todo`（:104）；arm2-index :151（006）/:152（007）/:154（009）状态 `open`、修复列 R2.7。

## Goals

- 006 探针证实旁路 → 修复（card canDrop 补 wipSet 检查，stateRef 内联读 live）+ 单元钉正确语义（canDrop false + onDrop 拒绝）。
- 007 integration：真实 UndoStack 传第 4 参 → 拖拽 commit push UpdateTaskCommand + undo() 回滚值。
- 009 integration：KanbanBoard 真 moveCard → window keydown ctrl+z（activeElement 聚焦板内）→ 列归属复原；e2e 空壳函数体补完（真实移动 + Ctrl+Z + 状态对比）。
- 三 finding 回填 `closed`；roadmap R2.7 翻转。

## Non-Goals

- 009 根因修复归 R3.4/5.2-002（案 A 分工——本行只守测试面，若 integration 暴露根因缺陷则升级 R3.4 输入不越权修复）；不处理 MA4.3 其余 finding；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts`（006 修复：card canDrop 补 wipSet 排除 + onDrop 解析后超限拒绝守卫〔review R1 M1：仅 canDrop 补丁下 B 用例恒红——onDrop :61-105 零防御无条件 changeBoard〕）
- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.test.ts`（扩展：006 两用例）
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.test.ts`（扩展：007 真实 UndoStack integration）
- `packages/flux-renderers-scheduling/src/kanban/kanban-undo-consumption.test.tsx`（新建：009 Ctrl+Z 消费链）
- `tests/e2e/kanban-demo.spec.ts`（009 e2e 空壳补完）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.7 翻转（激活/收口两提交）

### Out Of Scope

- 009 根因修复（R3.4）；R2.8-R2.15 与 R3.x 其余；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号 | 触发                                                      | 行为                                                                     | 可重试 | 用户可见表现 |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ------------ |
| contract-gap | 006 探针显示旁路**不存在**（card canDrop 已有守卫）       | 停：arm2-index 记录过时，就地勘误并钉现状正确语义                        | 否     | 不适用       |
| defect-found | 009 integration 暴露 Ctrl+Z 键盘链根因缺陷（undo 不复原） | 停：升级 R3.4 案 A 输入（finding 注记更新），本行钉现状+记录，不越权修复 | 否     | 不适用       |
| api-shape    | praxis mock/drag-commit 形状与规格不符                    | 以既有 harness 先例校正，plan 补记                                       | 是     | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：006 修复回退（card canDrop 与 onDrop 双守卫同撤）→ A/B 旁路钉子皆红（旁路复活）；007 删 :120 push → 栈断言红；009 消费链用例本身即「先证后钉」（若缺陷 live 则按 Failure Path defect-found 升级）。判别机制（Rule 13）：006 变异=旧实现本体（无守卫即旁路）；007 变异=删生产 push 行（审计原文「删光三处 push 全套仍绿」之反向构造——新测试使删行必红）。

## Execution Plan

### Phase 1 - 探针、修复与三测试落地

Status: completed
Targets: use-kanban-dnd.ts + 三测试文件

- Item Types: `Fix | Proof`

- [x] T0（006 探针，contract-gap 门）：capturedDropTargets 卡片目标 canDrop 直调（wipSet 含目标列）→ 断言现状 **true**（旁路 live 证实）→ 进修复；若 false 则 Failure Path contract-gap 停。
- [x] T1（006 修复+钉）：card canDrop 补 `stateRef.current.wipOverLimitColumns` 排除（columnId 同参）→（双重守卫：canDrop live 读 + onDrop 解析后超限拒绝，两守卫同落）**A** 卡片目标 canDrop（超限列）false；**B** onDrop 内层解析卡片目标（超限列）→ board 不变 + onCardMove 零调用。红证：**M-A** 回退双重守卫（两处同撤）→ A/B 皆红（旁路复活，判别面覆盖两守卫）。
- [x] T2（007，use-gantt-drag.test.ts 扩展）：真实 `new UndoStack()` 传第 4 参（renderHook 直传）+ **真实 store**（沿 gantt-editor.test.tsx:123-143 createStore/tasks.get 惯用法——review R1 m2：既有 harness mockStore.updateTask 为裸 vi.fn 无变更语义）→ 驱动拖拽 commit（pointerdown clientX 100 → pointerup 180，cellWidth 40 → dayDelta 2 命中 :120 move 分支）→ 断言：`vi.spyOn(stack,'push')` 捕获 `instanceof UpdateTaskCommand`（commands 私有无 peek——review R1 m1：canUndo 为 getter 非方法）+ `stack.undo` 后 `store.tasks.get` 值回滚。红证：**M-B** 删 :120 push → spy 断言红。
- [x] T3（009，kanban-undo-consumption.test.tsx 新建，沿 kanban-handle harness）：KanbanBoard + handle moveCard（card1 col1→col2）→ 聚焦板内元素（activeElement 门）→ `fireEvent.keyDown(window, {ctrlKey:true, key:'z'})` → 断言 card1 `data-column-id` 复原 col1。红证：**M-C** 键盘消费用例即判别器（若 undo 按钮路径在而键盘链断则本用例红——按 Failure Path defect-found 处置）。
- [x] T4（009 e2e 补完，kanban-demo.spec.ts:66——**B1 勘正**：test.fail 移入测试体内〔describe 级注解波及整组 7 用例，全文件实跑 4 用例误标 expected-fail 文件红〕；焦点门措辞降为主要假设 + R3.4 交接探 activeElement）：真实指针拖拽首卡至他列（新写代码，鼠标序沿已提交先例 tests/e2e/scheduling-visual-tokens.spec.ts 的 mouse.down/move 惯用法——review R1 m3：\_tmp 探针不入库不作出处引用）→ 断言 data-column-id 变更 → keyboard Control+Z → 断言复原；保留原 pageerrors 门。

Exit Criteria:

- [x] 探针留痕（旁路 live：卡片目标 canDrop true）+ 测试绿证（dnd 18/18、gantt 21/21、消费链 3/3）+ 三红证留痕：**M-A** 双守卫同撤红 2 / **M-B** 删 :120 push 红 1（resize 分支 :129 不受扰——分支级交叉判别）/ **M-C** T3 自证判别器（组件级 live 未触发 defect-found）——006 修复保留为唯一实现 diff
- [x] scheduling 116 文件/1094 用例全绿 + kanban-demo.spec.ts e2e 绿（test.fail() 棘轮计 expected-failure；**T4 证实 e2e 级焦点门断点**：拖拽生效但 Ctrl+Z 不复原——组件级 integration 过而页面级断，升级输入已入 arm2-index :154 注记 + test.fail 注释，归 R3.4）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 三行回填：:151（006）/:152（007）/:154（009）→ `closed` + 注记（009 含 defect-found e2e 级证实 + test.fail 棘轮 + R3.4 归属）；Last Updated 滚动（open 48→45）
- [x] roadmap R2.7 `planned`→`done` 翻转（IN closure commit；激活提交 19fe90bac 已先行翻转）

Exit Criteria:

- [x] arm2-index 三行状态与注记实测一致（open 48→45 grep 复核）；roadmap R2.7 行 `done`（收口提交内）
- [x] daily log R2.7 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82
- [x] `pnpm check` 零失败全链绿
- [x] e2e：kanban-demo.spec.ts **全文件实跑 exit 0**（全文件 7 用例实跑 exit 0：4 clean passed + 1 test.fail 体内棘轮 expected-failure〔Playwright 将 expected-failure 计入 passed 桶〕+ 2 既有慢加载 flaky 重试过——closure audit B1 勘正后 in-body 注解复跑；describe 级注解会波及整组已修正；review R2 m3 计数分解勘正）
- [x] 独立 closure audit（fresh sub-agent `agent_b5c515bf`，输入=plan+diff summary+验证输出）：首轮 **REJECTED**（B1 test.fail describe 级注解波及整组+全文件绿声称系子集运行假象；m1 焦点门措辞）→ in-body 移注+全文件实跑 exit 0+措辞同步 → 复审 **APPROVED**（0B/0M/2m 残留 m1'/m3 随收口提交）——checklist 1-8：M-A/M-B 独立重演 md5 byte-identical 复原、修复 diff 恰两守卫 9 行、open 45 程序化验证、案 A 分工不越权确认
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **009 根因归属**：MR4.0 案 A 已裁——kanban Ctrl+Z 消费链根因修复（若 integration/e2e 暴露）归 R3.4/5.2-002 canonical，本行守测试面（integration+e2e 补完）。Classification: watch-only residual。Why Not Blocking Closure: 案 A 分工在裁决区在案。Successor Required: 归 R3.4（非本 plan 新设行）。
- **007 组件级 Ctrl+Z**：gantt 键盘绑定消费面（若 gantt.tsx 有 ctrl+z 绑定）——最小补强限定「拖拽改期传真实 undoStack 断言栈+回滚」，组件级键盘测试不扩。Classification: out-of-scope improvement。Why Not Blocking Closure: 最小补强即全量规格。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_713af2a8，2026-10-24）：**FAIL** 0B/2M/5m——M1 006 修复面须扩至双守卫（仅 canDrop 补丁下 B 用例恒红：onDrop :61-105 零防御无条件 changeBoard）；M2 计数对账（15 处调用非 19，0 传 onCommit）；m1 UndoStack API（canUndo 为 getter、commands 私有→spy push 捕获 instanceof）；m2 真 store 惯用法（mockStore.updateTask 裸 vi.fn 无变更语义→createStore/tasks.get）；m3 T4 出处改已提交先例；m4 onDrop 行号 :61-105；m5 Item Types Fix | Proof。T0 探针/T3 键盘链（window listener + activeElement 门 + 同栈 wiring use-kanban-board-state.ts:117→:125/:132-140）裁定 sound。
- R2（同一评审 agent 复审，2026-10-24）：首轮确认 M1/M2 外全落 + 两个残留 minor（T1 动作句双守卫措辞、Test Strategy 变异面扩双守卫）+ M2 两字符串未实际落盘——终验：:11/:16 修正落盘核验（15 处=live）、双守卫措辞与变异面同撤核验——**共识 PASS**。准予 `active`。

## Non-Blocking Follow-ups

- 无（006/007/009 最小补强即全量规格；009 根因归 R3.4 案 A）。

## Closure

- [x] R2 终验共识（PASS）后激活提交（Status→`active` + roadmap R2.7 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
