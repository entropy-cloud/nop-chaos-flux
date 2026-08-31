# 460 Sundial 复刻页交互全量实现（占位 → 真实行为）

> Plan Status: completed
> Last Reviewed: 2026-08-19
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

- [x] `SundialTask` 接口 + `MockDatabase.sundialTasks`（10 条：含 done/trashed/recur/list/flagged/subtasks 字段）
- [x] `Sundial__todos?view=all|today|scheduled|done|trash` 过滤
- [x] `Sundial__updateTodoItem`（POST {id, ...patch} → 内存更新）
- [x] `Sundial__subtasks`（GET 子任务列表，用于 P8 子任务详情）
- [x] 新增 `__tests__/sundial-mock-filters.test.ts`（5 视图 + update 端点；现名 sundial-mock-backend.test.ts，6 例）

### Phase 2 - workbench 视图切换（G3/P5）

Status: completed
Targets: `sundial-workbench.json`

- [x] 主区 5 collapse + pressure card 包 `sundial-board-default`（visible: activeView 非 completed/trash）
- [x] 新增 done panel / trash panel（activeView 驱动）
- [x] 视图行选中态已存在（plan 457），补主区切换

### Phase 3 - 任务详情 dialog（G2/P4）

Status: completed
Targets: `sundial-workbench.json`

- [x] 任务行 onClick → `setValue(taskDetailOpen, true)` + `setValue(activeTaskId, N)`
- [x] 新增 `sundial-task-detail-dialog`（复用 detail 字段行结构：日期/重复/旗标/列表/子任务 + footer 移动按钮）
- [x] 详情 dialog 内字段行可开对应 picker（嵌套）

### Phase 4 - todo-dialog 字段行 picker（G1/P1-P3）

Status: completed
Targets: `sundial-todo-dialog.json`

- [x] 日期行 → 嵌套日期 picker dialog（复用 detail 日期 picker 结构）
- [x] 旗标行 → setValue 切换 + 显示更新
- [x] 列表行 → 嵌套列表 picker dialog
- [x] 选择写入外层 dialog 表单 + 字段行显示更新
- [x] 验证嵌套关闭只关内层（不连带外层）——上次 plan 458 缺陷点

### Phase 5 - settings section 切换 + 保存（G4/G5/P6/P7）

Status: completed
Targets: `sundial-settings.json`

- [x] rail 5 行 onClick 保留选中态 + 主区 5 panel visible 切换（B 批次落地，P6 测试断言）
- [x] 新增 lists/appearance/data/about panel 内容（B 批次落地）
- [x] 保存按钮：真实写 mock backend（`Sundial__updateSettings` POST {mode} + `db.sundialSettings` 内存更新）+ 反馈（B8：ajax + `messages.success` toast，单测断言 db 状态）

### Phase 6 - detail 真实化（G6/P8-P10）

Status: completed
Targets: `sundial-detail.json`

- [x] 子任务 chevron → 打开子任务详情 dialog（B 批次，e2e 20）
- [x] 子任务 trash → 删除（`Sundial__deleteSubtask` POST 内存删除 + 行隐藏 + 反馈；dialog 内删除同样走后端 + `closeDialog{surfaceId}` 关闭——dialog 内无法回写页面 scope 驱动行隐藏，行隐藏由行级 trash 承载，G5 类缺口记入观察）
- [x] 移到列表/垃圾桶 → `Sundial__updateTodoItem` mock 更新（列表经 picker submit 回调 POST {id,list}；垃圾箱 POST {id,trashed:true} + banner）+ 独立页为静态复刻无 dialog 可关（banner 表达状态）；workbench 侧 dialog 关闭见 Phase 3/P9
- [x] 状态行 X → 真实关闭：独立详情页 X 改为 `navigate` 回 workbench（原为 toast 占位）

### Phase 7 - 导航 + analytics（G7/G8/P11-P13）

Status: completed
Targets: `sundial-workbench.json`、`sundial-analytics.json`

- [x] 设置图标 → navigate 打开 settings（B 批次）
- [x] settings 返回 → navigate 回 workbench（B 批次，单测断言 hash）
- [x] analytics 三 chart onClick → drill-down（chartFocus + focus card，B 批次，e2e 19）

### Phase 8 - 收口验证

Status: completed
Targets: 全仓

- [x] `pnpm typecheck`/`build`/`lint` 37/37 全绿（环境注意：包脚本 `tsc` 依赖环境解析，本 worktree 需 PATH 前置 `node_modules/.pnpm/node_modules/.bin`（lockfile 钉定的 TS 6.0.2）；master 工作区仅因旧安装残留 `.bin/tsc` 而通过——已记日志观察项）
- [x] `pnpm test` 全绿（66/66 tasks，playground 171 含 sundial 29；含新增断言：settings 保存写后端 / dialog 字段行 picker 回写 / 移动写后端+关闭 / 子任务删除写后端 / X 导航）
- [x] `pnpm check` 零新增红（既有登记预存红 2 项不变：oversized `wizard-renderer.tsx:716`、`audit-event-dispatch-ctx` industrial 6 hits；B8 自引新命中 `mock-backend.ts:519` 已当场拆分修复为 463 行 + `mock-backend-sundial.ts`）
- [x] e2e sundial-replica-visual.spec.ts 全绿（24 例，新增 21-24：字段行 picker 回写 / move-to-list 关闭 / 子任务删除隐藏行 / 保存 toast；注意 4175 端口可能被 master worktree 残留 dev server 占用需换端口）
- [x] 独立 sub-agent closure audit（approved，见 Closure Audit Evidence）

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

### 待完成（已全部由下方 B8 记录取代——2026-08-19 恢复执行时收口）

- ~~Phase 5 settings section 切换 + 保存（P6/P7）~~
- ~~Phase 6 detail 真实化（P8-P10）~~
- ~~Phase 7 导航 + analytics drill-down（P11-P13）~~
- ~~Phase 8 收口验证 + closure audit~~

## Execution Record B8 (2026-08-19，ui-review worktree 恢复执行)

> 恢复时 live 审计发现：Phase 5-7 主体已随 B4-B7 批次落地（P6 面板切换/P11-P13 导航与 drill-down 均有测试），plan 文本滞后。本批次收口真实剩余缺口：P7 保存写后端、P8 删除写后端、P9 移动写后端+关闭、P10 X 真实关闭、Phase 3 遗留的 dialog 字段行 picker。test-first：8 个新断言先红后绿。

- **P7 settings 真实保存**：`SundialSettings`（`db.sundialSettings` seed {mode:'local', savedAt:'从未'}）+ `Sundial__updateSettings` POST（mode 白名单校验 + savedAt='刚刚'）；保存按钮改 `ajax`（`includeScope:["mode"]` + `messages.success` toast）。单测断言 db 状态真实变更
- **P8 子任务真实删除**：`deleteSundialSubtask`（内存 splice）+ `Sundial__deleteSubtask` POST；行级 trash 与 dialog 内删除均走后端
- **P9 真实移动**：独立页 move-list picker submit → `Sundial__updateTodoItem {id,list}`；move-trash → `{id,trashed:true}`；workbench 任务行补 `setValue activeTaskId`（7 行映射 db id 1-6/10），dialog 内移动按钮真实 POST + 关闭
- **P10 X 真实关闭**：独立详情页 X 从 toast 占位改 `navigate` 回 workbench
- **Phase 3 遗留补齐**：task-detail-dialog 4 字段行（日期/重复/旗标/列表）真实 picker 化——radio picker + `$formData` 回写 + 值绑定（`${taskDetailDate ?? '8/18'}` 等），外层 dialog 存活断言

### B8 runtime 语义发现（复刻作为能力发现器的直接产出）

1. **`closeDialog`/`closeSurface` 定向关闭走 action 顶层 `surfaceId`（targeting 字段），不是 `args.surfaceId`**——dispatcher（`built-in-actions.ts`）只读 `action.targeting.surfaceId/dialogId`，`args` 内的同名字段被忽略；受控 declarative dialog 被定向关闭后由 use-surface-renderer B1 机制自动把 `open:` 绑定变量写回 false。hook（onSubmitSuccess）链内同样适用
2. **declarative dialog body 内 `setValue` 写 dialog 自身 declarativeScope（影子写），不会回落页面 scope**——`ScopeRef.update` 只写 own store。读经父链正常。因此「从 dialog 内部改页面状态」必须走：`closeDialog{surfaceId}`（关+同步）、或页面级 openDialog 的 `$formData` hook 回写（dispatchInOwner 写 owner scope）
3. **onSubmitSuccess hook 时刻的裸 scope 变量（如 `${activeTaskId}`）求值不可靠**（实测被求值为 undefined 且键被丢弃）——跨 dialog 传参的正确姿势：openDialog `data: {taskId: "${activeTaskId}"}`（点击时求值，父链读 OK）→ form `data` 镜像 → hook 内只用 `${$formData.taskId}`。todo-dialog P1-P3 只用 `$formData` 因此未被此问题命中
4. **嵌套 picker portal 内的点击对未设 `closeOnOutsideClick:false` 的外层 dialog 是 outside-press**——会连带关闭外层（plan 458 撤销根因的完整版）；task-detail-dialog 本批次补设
5. 环境观察项：包脚本 `tsc` 依赖环境解析（仓库无根级 typescript 依赖）；新 worktree 需 PATH 前置 `node_modules/.pnpm/node_modules/.bin`（lockfile TS 6.0.2）并先 `pnpm build` 产出 dist 类型，否则 playground typecheck 误报 TS5103/TS2307。已记入当日日志

### B8 附带回归修复（plan 460 B1 逃逸回归）

- `flux-renderers-basic/src/__tests__/surface-event-ctx.test.tsx`「resolves the same ${surfaceId} in dialog onConfirm and onClose」在 master HEAD（B1 提交 d5214cc48 之后）确定性失败（两 worktree 对照确认，与本批次 playground 改动无关）：测试假设「X 关闭受控 dialog 后保持挂载」，而 459/460-B1 的 userClosed 闩锁语义是字面量 `open:true` 的受控 dialog X 关闭即卸载且无法翻转重开。等价强度重写：confirm 提交 → surface 自动关闭 → 同一 lifecycle 内 onConfirm/onClose 两个 ajax URL 携带相同非空 surfaceId（断言强度不变，仅采集路径改为 confirm-first）。3/3 绿
- **文件治理拆分**：B8 新增代码把 `shared/mock-backend.ts` 推到 519 行（>500 红线，`pnpm check` 拦截）——Sundial 类型/种子/过滤/更新/删除助手整体抽出为 `shared/mock-backend-sundial.ts`（89 行），主文件 re-export 维持公共 API 不变（463 行），消费方零改动；sundial 28 测试复验绿

### B8 验证

- playground 单测 171（含 sundial 29：新增 P7 后端写/字段行 picker 回写/移动写后端+关闭/子任务删除写后端/X 导航断言）
- sundial e2e 24/24（新增 21-24）；e2e 端口注意：4175 可能被 master worktree 残留 dev server 占用，需 `PLAYWRIGHT_PORT` 换端口避免复用旧 schema
- 全量 typecheck/build/lint/test/check：见 Phase 8 勾选状态

## Closure Gates

- [x] 所有 P1-P13 占位消除（无 `占位反馈` 残留；grep 复核 5 个 sundial schema 零命中，仅存 3 处明示 "demo 占位" 的 demo 级按钮非 P 清单项）
- [x] unit + e2e 断言覆盖每个实现（playground 单测 171 含 sundial 29；e2e spec 24 含新交互 21-24）
- [x] typecheck/build/lint/test/check 全绿（37/37 + 66/66 + check 零新增红，预存登记红 2 项不变）
- [x] 独立 sub-agent closure audit（approved，见 Closure Audit Evidence） approved

## Closure

Status Note: 所有 P1-P13 占位交互升级为真实行为且逐项有断言；Phase 1-8 全部完成；全量验证绿（typecheck/build/lint 37/37、test 66/66、check 零新增红、sundial e2e 24/24）；B1 逃逸回归与 B8 自引超限均已当场修复。经独立 sub-agent closure audit（两轮）approved 后关闭。

Closure Audit Evidence:

- Auditor / Agent: fresh-session general-purpose sub-agent（agent_d6b790bc，不复用执行者上下文）
- Round 1 verdict: `issues`（1 Blocker：P11 设置图标导航零测试覆盖；3 Minor：日志缺 B8 条目 / plan 文本行数与滞留列表漂移 / 错字）→ 整改（+P11 单测 13/13 绿、文本与日志修正）
- Round 2 verdict: `approved`（"Plan 460 is approved for closure. No open Blockers or Majors; all five closure gates are genuinely met on live-repo evidence."）
- 证据链：live repo grep（占位反馈零残留）、逐 P1-P13 断言映射（审计报告）、断言强度核对（B1 回归修复等强度）

Follow-up:

- 无剩余 plan-owned 缺口（deferred 项为零；dialog 影子写限制已在 plan 内文档化为 G5 类缺口证据，归 ui-review roadmap C2 裁决线）
- 环境治理候选（非本 plan scope，已记 docs/logs/2026/08-19.md）：包脚本 tsc 环境解析脆弱性；playwright 端口复用陷阱
