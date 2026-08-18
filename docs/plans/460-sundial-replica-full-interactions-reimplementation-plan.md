# 460 Sundial 复刻页交互全量实现（占位 → 真实行为）

> Plan Status: drafting
> Last Reviewed: 2026-08-17
> Source: 用户反馈 "sundial示例中有一系列占位页面，为什么没有实现？都要实现"；plan 458 改动因 nested-dialog 缺陷整体撤销后遗留占位
> Related: `docs/plans/458-sundial-replica-interaction-deepening-plan.md`（superseded-reverted，功能清单仍有效）；`docs/plans/459-controlled-dialog-x-close-and-drag-handle-fix-plan.md`（completed，runtime 基座）；`docs/analysis/sundial-ui-reproduction-analysis.md`（复刻定位）

## Purpose

把 sundial 复刻页中所有"占位反馈"（`showToast("xxx（占位反馈）")` / 纯 toast 无真实行为）升级为真实交互。plan 458 已设计过 6 类功能（D1-D6）但实现因 nested-dialog 缺陷被撤销；本 plan 基于 plan 459 修复后的 controlled-dialog runtime（X-close 真实关闭 + scope 同步 + 可重开）重新实现，并修复 nested-dialog 的正确工作方式。

## Current Baseline（HEAD = 1cb700c07，plan 457 末尾）

### 占位交互盘点（需实现）

| #   | 位置                                             | 当前行为                                   | 目标行为                                                        |
| --- | ------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| P1  | todo-dialog 日期字段行                           | `showToast("选择日期（占位反馈）")`        | 打开嵌套日期选择 dialog（真实选择）                             |
| P2  | todo-dialog 旗标字段行                           | `showToast("切换旗标（占位反馈）")`        | 切换 flag 状态 + 字段行显示更新                                 |
| P3  | todo-dialog 列表字段行                           | `showToast("选择列表（占位反馈）")`        | 打开嵌套列表选择 dialog（真实选择）                             |
| P4  | workbench 7 个任务行                             | `showToast("打开详情（占位反馈）")`        | 打开任务详情 dialog（含字段行/picker）                          |
| P5  | workbench 视图行（全部/今天/计划/已完成/垃圾箱） | 仅选中态+toast                             | 主区内容按 activeView 切换                                      |
| P6  | settings rail 5 行                               | 仅选中态+toast                             | 右侧 section 内容切换（同步/列表/数据/外观/关于）               |
| P7  | settings 保存按钮                                | `showToast("保存成功")`                    | 真实保存 + 反馈                                                 |
| P8  | detail 子任务 chevron/trash                      | `showToast("打开子任务详情/删除子任务")`   | 打开子任务编辑/真实删除                                         |
| P9  | detail 移到列表/垃圾桶                           | `showToast("已选择目标列表/已移到垃圾箱")` | 真实移动 + 关闭详情                                             |
| P10 | detail 状态行 X                                  | `showToast("关闭详情")`                    | 关闭（真实关闭——plan 459 已修 runtime，此处仅确保 schema 正确） |
| P11 | workbench 设置图标                               | `showToast("打开设置")`                    | 打开设置（nav）                                                 |
| P12 | settings 返回行                                  | `showToast("返回")`                        | 返回 workbench                                                  |
| P13 | analytics 图表                                   | 无 onClick                                 | chart drill-down（trend/energy/pressure）                       |
| P14 | workbench 添加待办                               | 打开 todo-dialog（已工作）                 | 保持                                                            |

### 关键事实（plan 459 之后的 runtime）

- controlled dialog X-close 真实关闭 + scope 变量同步 false + `setValue(openPath,true)` 幂等重开（plan 459 修复验证通过）
- nested dialog：dialog 内再开 dialog 走 surface stack（外层为 surface 1，内层 surface 2），closeTop 只关 top
- 上次 plan 458 缺陷：picker 选项 `closeSurface` 会关掉整个外层 dialog（当时分析为 closeTop 连带）；需用嵌套结构正确实现
- mock backend：`Sundial__todos`（7 条 hardcode）、`Sundial__lists`、`Sundial__summary/trend/energy/pressure/outputStructure` 已存在；`Sundial__updateTodoItem` 等 plan 458 新增端点已被撤销，需重加

## Goals

| ID  | 目标                                                                                         |
| --- | -------------------------------------------------------------------------------------------- |
| G1  | P1-P3 todo-dialog 三字段行进入真实嵌套 picker（日期/旗标/列表），选择写入表单并更新字段行    |
| G2  | P4 workbench 任务行打开任务详情 dialog（复用 detail 结构），字段行可交互                     |
| G3  | P5 workbench 主区随 activeView 切换（全部=5 collapse / 今天 / 计划 / 已完成 / 垃圾箱 panel） |
| G4  | P6 settings rail 切换右侧 section 内容（5 个 panel）                                         |
| G5  | P7 settings 保存真实执行（写 mock backend + 反馈）                                           |
| G6  | P8-P10 detail 子任务/移动/关闭真实化（子任务详情 dialog、删除确认、移动后关闭）              |
| G7  | P11-P12 workbench↔settings 导航真实化（打开设置/返回）                                       |
| G8  | P13 analytics chart drill-down                                                               |
| G9  | 所有交互有 unit/e2e 断言覆盖；无 `（占位反馈）` 残留                                         |

## Non-Goals

- 不做真实后端持久化（仍为 mock backend，会话内内存）
- 不做拖拽排序 / 完整子任务 CRUD（子任务编辑以 dialog 形式占位，不做递归子任务）
- 不改 base-ui `<Dialog>` 组件本身
- 不重做 plan 457 已完成的交互（flex/container onClick、选中态双渲染、picker dialog 等）

## Execution Plan

### Phase 1 - mock backend 扩展（G 依赖基座）

Status: completed
Targets: `shared/mock-backend.ts`、`shared/showcase-env.ts`

- [ ] `SundialTask` 接口 + `MockDatabase.sundialTasks`（10 条：含 done/trashed/recur/list/flagged/subtasks 字段）
- [ ] `Sundial__todos?view=all|today|scheduled|done|trash` 过滤
- [ ] `Sundial__updateTodoItem`（POST {id, ...patch} → 内存更新）
- [ ] `Sundial__subtasks`（GET 子任务列表，用于 P8 子任务详情）
- [ ] 新增 `__tests__/sundial-mock-filters.test.ts`（5 视图 + update 端点）

### Phase 2 - workbench 视图切换（G3/P5）

Status: completed
Targets: `sundial-workbench.json`

- [ ] 主区 5 collapse + pressure card 包 `sundial-board-default`（visible: activeView 非 completed/trash）
- [ ] 新增 done panel / trash panel（activeView 驱动）
- [ ] 视图行选中态已存在（plan 457），补主区切换

### Phase 3 - 任务详情 dialog（G2/P4）

Status: completed
Targets: `sundial-workbench.json`

- [ ] 任务行 onClick → `setValue(taskDetailOpen, true)` + `setValue(activeTaskId, N)`
- [ ] 新增 `sundial-task-detail-dialog`（复用 detail 字段行结构：日期/重复/旗标/列表/子任务 + footer 移动按钮）
- [ ] 详情 dialog 内字段行可开对应 picker（嵌套）

### Phase 4 - todo-dialog 字段行 picker（G1/P1-P3）

Status: completed
Targets: `sundial-todo-dialog.json`

- [ ] 日期行 → 嵌套日期 picker dialog（复用 detail 日期 picker 结构）
- [ ] 旗标行 → setValue 切换 + 显示更新
- [ ] 列表行 → 嵌套列表 picker dialog
- [ ] 选择写入外层 dialog 表单 + 字段行显示更新
- [ ] 验证嵌套关闭只关内层（不连带外层）——上次 plan 458 缺陷点

### Phase 5 - settings section 切换 + 保存（G4/G5/P6/P7）

Status: pending
Targets: `sundial-settings.json`

- [ ] rail 5 行 onClick 保留选中态 + 主区 5 panel visible 切换
- [ ] 新增 lists/appearance/data/about panel 内容（复用 plan 458 设计）
- [ ] 保存按钮：真实写 mock backend（如 mode/连接信息）+ 反馈

### Phase 6 - detail 真实化（G6/P8-P10）

Status: pending
Targets: `sundial-detail.json`

- [ ] 子任务 chevron → 打开子任务详情 dialog
- [ ] 子任务 trash → 删除（mock backend 更新 + 反馈）
- [ ] 移到列表/垃圾桶 → mock 更新 + 关闭详情
- [ ] 状态行 X → 关闭详情（runtime 已修）

### Phase 7 - 导航 + analytics（G7/G8/P11-P13）

Status: pending
Targets: `sundial-workbench.json`、`sundial-analytics.json`

- [ ] 设置图标 → 打开 settings（nav）
- [ ] settings 返回 → 回 workbench（nav）
- [ ] analytics 三 chart onClick → drill-down（chartFocus + toast）

### Phase 8 - 收口验证

Status: pending
Targets: 全仓

- [ ] `pnpm typecheck`/`build`/`lint` 37/37
- [ ] `pnpm test` 全绿（含新增断言）
- [ ] `pnpm check` 无新增红
- [ ] e2e sundial-replica-visual.spec.ts 全绿（含新交互截图）
- [ ] 独立 sub-agent closure audit

## Test Strategy

档位：必须自动化（交互行为 + mock 契约）

- unit：mock 过滤/update 端点、dialog 嵌套关闭行为
- e2e：sundial-replica-visual.spec.ts 扩展（视图切换截图、任务详情、settings section、todo 嵌套 picker、analytics drill-down）
- 断言：真实状态变化（textContent/scope）而非仅 toast

## Execution Record (2026-08-17 晚)

### 已完成

- **Phase 1 mock backend**：`SundialTask`（10 条，含 done/trashed/recur/list/flagged）+ `SundialSubtask` + `Sundial__todos?view=` 5 视图过滤 + `Sundial__updateTodoItem`（POST 内存更新）+ `Sundial__subtasks`；`__tests__/sundial-mock-backend.test.ts` 4 例全绿
- **Phase 2 workbench 视图切换**：5 个 collapse 按 activeView 加 visible（overdue=all|scheduled、today=all|today、future=all|scheduled、nodate=all、organize=all）；done/trash 独立 panel（`sundial-board-completed`/`sundial-board-trash`）
- **Phase 3 任务详情 dialog**：7 个任务行 onClick → `setValue(taskDetailOpen, true)`；`sundial-task-detail-dialog`（标题/备注/4 字段行/移动按钮）
- **Phase 4 todo-dialog picker（架构重做）**：
  - **runtime 缺陷修复（编译侧按 kind 处理）**：`flux-compiler/action-compiler.ts` `preserveSchemaArgs` 现按 `BUILT_IN_ACTION_DEFINITIONS.fieldRules` 把 `kind: 'action'/'event'` 的字段（onClose/onSubmitSuccess/onSubmitError）也用 `__nopPreserveLiteral` 静态化——此前这些字段的嵌套 `${$formData.x}` 模板被急切编译，openDialog 执行时对 dispatch scope 求值抛错（"Cannot access member of null"），整个 openDialog 失败。这是 C8.3 P1-2 修 schema `body` 时漏掉的同类隐患（dispatcher 侧 preservation 循环因求值先抛错而永远执行不到）
  - **todo-dialog 三字段行真实化**：日期行/列表行 onClick → `openDialog` action（body = form + radio-group + 确定按钮 submitForm，form `submitScope:'surface'`，openDialog `onSubmitSuccess: setValue(path, ${$formData.x})` + `closeOnSubmit: true`）；旗标行直接 setValue toggle。选择经 dispatchInOwner 在 owner scope（外层 dialog declarative scope）回写 → 字段行显示更新
  - **outside-press 隔离**：外层 dialog `closeOnOutsideClick: false`——picker（独立 surface，portal 渲染）的点击对外层是 outside press，此前会连带关闭外层（plan 458 撤销的"嵌套 dialog 关闭连带外层"真正根因）
  - **回归测试**：`flux-runtime/src/__tests__/surface-hook-formdata-binding.test.ts`（openDialog + ${$formData} onSubmitSuccess 全链路：打开成功 + hook 写 owner scope）；`sundial-replica.test.tsx` P1-P3 it（radio 选择 → submit → 字段行更新 → 外层存活）
- **回归全绿**：compiler 551 / action-core 210 / runtime 1423 / basic 499 / react 481 / playground 169

### 待完成

- Phase 5 settings section 切换 + 保存（P6/P7）
- Phase 6 detail 眰实化（P8-P10）
- Phase 7 导航 + analytics drill-down（P11-P13）
- Phase 8 收口验证 + closure audit

## Closure Gates

- [ ] 所有 P1-P13 占位消除（无 `占位反馈` 残留）
- [ ] unit + e2e 断言覆盖每个实现
- [ ] typecheck/build/lint/test/check 全绿
- [ ] 独立 sub-agent closure audit approved

## Closure

Status Note: drafting

Closure Audit Evidence: 待启动

Follow-up: 待完成
