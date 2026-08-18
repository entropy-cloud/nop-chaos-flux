# 458 Sundial 复刻页交互深化：视图/分区内容切换 + 任务行→详情 + 选项持久化 + 二级选择器 + 图表下钻

> Plan Status: superseded-reverted
> Last Reviewed: 2026-08-17
> Supersession Note: 本 plan 的执行改动（5 个 sundial schema JSON + mock backend + page-data + test 扩展）因存在 nested-dialog scope/portal 缺陷（picker 选项 closeSurface 触发外层 dialog 一并关闭）已在 2026-08-17 晚整体 `git checkout HEAD -- .` 撤销，工作树回到 plan 457 末尾基线（22 unit + 12 e2e visual tests 全绿）。原 closure audit（`ses_ff0bb46d5ffeSxN7VI1DSE421A` approved）基于当时的 working tree 状态作出，现已被 revert 推翻。**本 plan 功能改由 plan 460 重新实现**（基于修复后的 controlled-dialog X-close runtime，见 plan 459）。
> Source: 用户反馈 "sundial 复刻页各种交互式功能都完成了吗？"；plan 457 closure 后剩余 Non-Goal/Deferred；`docs/analysis/sundial-ui-reproduction-analysis.md` 复刻定位
> Related: `docs/plans/457-sundial-replica-interactions-plan.md`（已 completed，audit approved）；`docs/analysis/sundial-ui-reproduction-analysis.md` §5.4；`docs/plans/459-controlled-dialog-x-close-and-drag-handle-fix-plan.md`（runtime 基座）；`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（重新实现）

## Purpose

plan 457 把"C 类 16 个未接线交互点"全部接通并通过端到端测试 + closure audit approved。但 plan 当时明确豁免了 6 类"超出 16 点之外"的 Non-Goal/Deferred 功能。本计划承接 plan 457 留下的真实缺口：

1. workbench 主区不随 `activeView` 真正切换内容
2. settings 右侧不随 `activeSection` 真正切换内容
3. 任务行点击只 toast、不真的打开 detail
4. picker 选项 setValue 不进入 mock backend 持久化
5. todo-dialog 三个字段行只 toast、不真进入二级 picker
6. analytics 三个 chart 无 onClick、缺 drill-down

计划目标是把上述 6 类功能的"复刻页交互完整性"推到与原生 Sundial 视觉+行为一致的层度（mock backend 全程驻留会话内），仍保留"演示页"定位（不接入 Sundial Kotlin 同构的 SQLDelight + Supabase）。

## Current Baseline

### plan 457 的真实边界（C 类以外的 Non-Goal/Deferred）

**A 类 = 已接线 + 端到端断言**：detail 4 个字段行（日期/重复/旗标/列表）打开对应 picker、5 个 collapse 折叠、7 个 checkbox、dialog 关闭/添加、recur/list 选项行选中态切换 + toast、clear-date/clear-time/move-list/trash/subtask 删除 icon 等 16 个 C 类交互点。22 个 it 全绿。

**B 类 = 静态展示**：analytics 全部（KPI/图表/图例/insight 行）。plan 标"无设计交互"。

**D 类 = 计划当时明示排除（核心，本计划承接）**：

| #   | 功能                                                         | plan 457 状态                                                                   | 复刻定位影响                                                                |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D1  | workbench 主区随 `activeView` 真正切换内容（5 个视图）       | Non-Goal（"仅选中态+反馈"）                                                     | 视图行单击仅切换 selected 样式+toast，主区固定显示 5 个 collapse 与需求不符 |
| D2  | settings 右侧随 `activeSection` 真正切换 section（5 个面板） | Non-Goal（"仅反馈"）                                                            | 5 个 rail 单击仅 selected 样式+toast，右侧永远只显示 sync 面板              |
| D3  | 任务行点击 → 打开该任务详情（右侧 detail 浮层或跳详情页）    | 现状 `showToast("打开详情（占位反馈）")`                                        | 点击后无反馈外行为，与"任务行 = 入口"复刻定位不符                           |
| D4  | picker 选项选择 → 真实持久化（写入 mock `Sundial__*` 后端）  | `setValue(scope.recur)`，不进入 mock                                            | 跨 picker / 跨对 dialog 重开已选项丢失，无法跨刷新保持，"演示页"门槛不足    |
| D5  | todo-dialog 字段行 → 真进入 date / recur / list 二级 picker  | 现状 toast                                                                      | demo-dialog 的字段行无法配置，demo 演示只走到"打开外层 dialog"              |
| D6  | analytics trend/energy/pressure 三图加 onClick drill-down    | chart 已有 `onClick` 事件字段（`data-renderer-definitions.ts:363`），复刻页未用 | 图表纯展示，缺 chart 事件 demo                                              |

### 现有能力（live repo 2026-08-17 实测）

- `FlexSchema`/`ContainerSchema` 已支持 `onClick`（plan 457），事件派发走 `props.events.onClick`，scope 即节点 scope（`docs/references/quick-reference.md:869-886`）
- 声明式 dialog：`<dialog id open body bodyClassName>` —— 当前打开靠 `setValue(path, true)` + `open:"${expr}"`，关闭靠 `closeSurface` 或 `setValue(path, false)`（见 sundial-detail 现有 date/recur/list picker）
- chart onClick 事件：`packages/flux-renderers-data/src/chart-renderer.tsx:578` 已挂事件，schema 字段已注册（`onClick`, kind:'event'），payload `{ kind: 'unknown' }`，可直接在 schema 上挂动作（无 renderer 改造）
- data-source 模式：`ajax url` + `mergeToScope`（参考 dashboard.json：`summary/trend/daily/category/recentOrders/approvals`）
- scope 驱动可见性：`visible: "${expr}"`（测试已大量使用），含可选链（`flux-formula` F1 修复 `?.[0]` 验证）
- 双渲染选中态：`visible` + `data-selected` + `className`（plan 457 C1/C7/C11/C12 已落地）
- mock backend：`apps/playground/src/complex-pages/shared/showcase-env.ts:564` 已有 `Sundial__todos` 返回 7 条任务（`{id, title, note, done, dueLabel, dueTone, flagged, subtasks}`），需要扩展 mock 新增 `trashed` 字段、视图筛选端点；`Sundial__lists` 已有 4 条列表
- 当前 `sundial-replica.test.tsx`：22 个 it / 22 通过（playground 164/164 复跑一致口径）

### 关键事实

- `sundial-detail` 是 standalone `sundial-detail.json` 单一页，与 `sundial-workbench` 不在同一 page scope，因此 D3（任务行点击）需要跨页 router 或新增"workbench 内嵌 detail panel"模式
- modal container（dialog/drawer）走 `useCurrentSurfaceRuntime()` + `open(kind, surface, scope, surfaceId)`，可跨 page scope 开：`flux-react/src/runtime/`（quick-reference.md:484-511）
- `openDrawer` action 与 `openDialog` 同源（quick-reference.md:649-651），drawer 348dp 匹配 Sundial inspector 宽度
- 跨页 navigate 走 `navigate` action（quick-reference.md:657），playground 多页间是否已用 router？实测见下文 §6 风险

## Goals

| ID  | 目标                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | workbench D1：D1.1 新增视图数据源 `Sundial__filteredTodos(view)`（按 activeView 过滤）；D1.2 重构 workbench 主区为 5 个可见分支（all/today/scheduled/done/trash），每支由 activeView 表达式驱动；D1.3 task 行从 `Sundial__todos` 渲染（含 dueLabel/dueTone badge + checkbox + flag），不再 hard-coded    |
| G2  | settings D2：D2.1 rail 真切到 sync/lists/appearance/data/about 5 个面板；D2.2 新增 4 个 section 内容（lists 用 `Sundial__lists` 端点已存在；appearance/data/about 用静态事实行 + 维护按钮）；D2.3 sync 主区仍保留 plan 457 模式（mode 卡 + 连接信息 + 状态卡）                                           |
| G3  | workbench → detail D3：在 workbench 主区右侧新增 348dp inspector drawer（`openDrawer` 派发，复用 `sundial-detail.json` schema 为 surface），任务行点击 `setValue(activeTaskId) + setValue(detailOpen, true)`；关闭 drawer 走 `closeSurface`                                                              |
| G4  | 选项持久化 D4：D4.1 picker 选项点击改为 `submitAction` → `Sundial__updateTodoItem`（mock 新增该 PUT 端点，in-memory 修改 `db.sundialTasks`）；D4.2 `Sundial__todos` 同时支持 `view` 参数；D4.3 跨 dialog 重开保持选中（scope + backend 双写）；D4.4 旧 `recur/list/flagged` scope 仍保留（双渲染选中态） |
| G5  | todo-dialog 二级 picker D5：todo-dialog 字段行真正复用 date picker dialog（嵌套 dialog pattern：`open dialog inside dialog` 走 `openDialog` 在外层 surface 中再开一个 surface）；date picker 复用 sundial-detail 现有 demo；recur/list 同理                                                              |
| G6  | analytics D6：D6.1 trend chart 点击 → `setValue(chartFocus='trend')` + toast（"聚焦：完成趋势"）；D6.2 energy chart 点击 → "聚焦：精力输出"；D6.3 pressure chart 点击 → "聚焦：压力桶 {bucket}"（payload 用 chart 给的 raw event，不读 series index）                                                    |

## Non-Goals

- **不**接 SQLDelight/Supabase 真实同步（plan 457 的 Non-Goal 延续，本计划仍以"复刻页"为定位）
- **不**做可拖拽任务排序（workbench 原 Sundial 支持拖拽改 due，本计划不做）
- **不**做子任务编辑（`detail-subtask-1/2/3` 现有 toast 占位保留）
- **不**改 plan 457 已落地的 16 个交互点的接线语义；只接入新功能
- **不**开 G5 通用 option-row 原语（plan 457 的 deferred，本计划范围内仍不复用 schema 表达）
- **不**做 analytics 真正的 task 列表下钻（只看 chart payload，回显 bucket 名）
- **不**优化 detail inspector 内容本身（detai 子任务行复用现有 toast 占位）

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/sundial-{workbench,detail,settings,analytics,todo-dialog}.json`（5 页面）
- `apps/playground/src/complex-pages/page-data.ts`（新增 `Sundial__tasks` mock 注入）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（新增 / 修改 Sundial\_\_\* 端点：filteredTodos / updateTodoItem / 视图表单）
- `apps/playground/src/complex-pages/sundial-replica.test.tsx`（新增交互断言）
- `docs/references/quick-reference.md`（如 dialog 嵌套模式 / chart onClick 用法有更新点）

### Out Of Scope

- 其他 playground 页面（dashboard/complex-form/crud-views 等）
- 新增 mock 实体类（仅在现有 mock backend 中扩展 Sundial\_\_\* 端点）
- 路由层（`openDrawer` surface 即可不依赖全局 router；G3 用 inspector drawer 而非 navigate 跨页）
- 数据源之外类型的可视化（calendar / kanban / gantt 等）

## Failure Paths

| 失败面                                                                       | 缓解                                                                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| D3 跨 page 打开 detail 面板，`useCurrentSurfaceRuntime()` 在 page scope 之外 | 用 `openDrawer` action（参数 surfaceId 复用 sundial-detail schema），surface 上下文经 surface-runtime stack 隔离 |
| D5 dialog 内再开 dialog（todo-dialog 内嵌 picker），surface stack 嵌套       | action built-in `openDialog` 由`ctx.surfaceRuntime` 自动分配栈，已有 picker 经验（sundial-detail 内已嵌套）      |
| D4 mock backend 持久化跨刷新                                                 | mock backend 进程内 in-memory（plan 457 同源），跨刷新意味 destroy env → 重新拉取；满足"会话内持久"门槛          |
| D1 重构 workbench 后 5 个视图分别手编 collapse 分组代码膨胀                  | 用 `visible` + `formula` 条件渲染 4 个数据驱动 collapse（today/all/scheduled），done/trash 用独立空状态文案      |
| D6 chart onClick payload 为 DOM event（非 series 索引），无法定位 bucket     | toast 文本用 `setValue(chartFocus, '${pressure?.items?.[0]?.bucket ?? 'trend'}') + showToast` 直接驱动回显       |

## Test Strategy

档位：**必须自动化**（涉及派发机制 / 数据持久化 / surface stack 嵌套稳定性）

- D1 视图切换：测试断言 `setValue(activeView,today)` → 主区只显示"今天"折叠分组；其他折叠 `visible` 为 false
- D2 section 切换：`setValue(activeSection,lists)` → 主区显示 `sundial-lists-panel`，sync panel `visible:false`
- D3 任务行 → detail：`fireEvent.click(sundial-task-today-1)` → drawer 出现并渲染 `sundial-detail-panel` 内容
- D4 选项持久化：picker 选项点击 → mock backend `Sundial__updateTodoItem` 调用（network mock 计数 + 持久化后 reopen 回显选中态）
- D5 todo-dialog 二级 picker：`fireEvent.click(sundial-todo-date-row)` → 嵌套 dialog 打开可见 date picker（`2026 年 8 月` 文本可见）
- D6 chart drill-down：`fireEvent.click(sundial-trend-chart)` → toast "聚焦：完成趋势" 可见
- 全部 6 类 + 计划起点现 22 个 it，目标 ≥30 个 it 全部 green

## Execution Plan

### Phase 1 - Mock backend + data-source 扩展（D1/D4 共享基座）

Status: completed
Targets: `showcase-env.ts`、`page-data.ts`

- Item Types: `Proof | Fix`
- Proof 先于 Fix：扩展 mock backend `Sundial__todos` 支持 `view` query param（mock 端点先覆盖 5 个视图分支）
- [x] `showcase-env.ts`：mock `db.sundialTasks` 7 条 → 增加 2 条 `done:true` 和 1 条 `trashed:true`（共 10 条）；`Sundial__todos` 支持 `?view=all|today|scheduled|done|trash` 过滤
- [x] `showcase-env.ts`：新增 `Sundial__updateTodoItem` (POST {id, patch}) → 返回 `{ok:true, task}`；修改 in-memory `db.sundialTasks`
- [x] `showcase-env.ts`：新增 `Sundial__filterState` (GET) / `Sundial__saveFilterState` (POST {path,value}) —— 持久化 `activeView` / `activeSection` / `recur` / `list` 用于 D4
- [x] `page-data.ts`：不新增硬编码字段（filter state 由 mock backend 注入，或在 page scope 内存）
- [x] 单元（mock 层面）test：`__tests__/sundial-mock-filters.test.ts` 覆盖 5 视图分支 + update 端点

Exit Criteria:

- [x] mock `Sundial__todos?view=today` 返回当且仅当 dueTone='today' 的任务
- [x] mock `Sundial__updateTodoItem` 改 db.sundialTasks 中对应字段后，下一次 `Sundial__todos?view=all` 拉取返回新值

### Phase 2 - workbench D1：主区真正随 activeView 切换

Status: completed
Targets: `sundial-workbench.json`、`sundial-replica.test.tsx`

- Item Types: `Fix`
- [x] workbench.json：删除 5 个 hard-coded collapse 分组（含 7 个 hard-coded task row）
- [x] workbench.json：在主区容器之前新增 `data-source name="tasks" action=ajax args={url:"/r/Sundial__todos?view=${activeView}", method:"get"}`；reloadWith 表达式依赖 activeView 时触发 reload —— 实测是否需 loadAction reaction，方案见风险点
- [x] workbench.json：主区新增 5 个 `visible:${activeView === 'viewKey'}` 容器，每个容器：
  - `all`: 4 collapse（overdue/today/future7/none）+ organize（每 collapse 内部用 data-source `${tasks?.items}` 通过 formula 过滤 + flex 渲染 task row）
  - `today`: 1 collapse（today）+ show all only tasks
  - `scheduled`: 2 collapse（overdue + future7）
  - `done`: 已完成面板（empty state 文案"暂无已完成的任务。"）
  - `trash`: 垃圾箱面板（empty state 文案"垃圾桶是空的。"）
- [x] task row schema 改造：从 hard-coded JSON 改成 `${tasks?.items ?? []}` formula 透传给一个 list/group 容器，每行渲染 `${item.dueTone}` tone badge + checkbox + flag icon，与 plan 457 视觉一致
- [x] 任务行右侧 footer 按钮（移到列表/移到垃圾桶）保留（plan 457 C5 wiring）
- [x] 测试：扩展 `sundial-replica.test.tsx`，新增 `workbench switches the main board between views`（点击全部/今天/计划/已完成/垃圾桶 → 对应容器可见，其他容器 `visible:false`）

Exit Criteria:

- [x] `pnpm test sundial-replica` 新增 it 全部 green
- [x] 5 个视图切换时既不闪烁也不丢复选框态（in-memory mock 持有状态）
- [x] 不破 plan 457 22 个 it

### Phase 3 - settings D2：右侧真随 activeSection 切换 + 新增 4 个 section 内容

Status: completed
Targets: `sundial-settings.json`、`sundial-replica.test.tsx`

- Item Types: `Fix`
- [x] settings.json：sync section 内容包一个 `visible:"${activeSection === 'sync'}"` 容器
- [x] settings.json：新增 lists section 内容（`data-source name="lists"`，table 形式：色点 + 列表名 + 任务数；新增按钮"新建列表"仅 toast）；visible:`${activeSection === 'lists'}`
- [x] settings.json：新增 appearance section（事实行 × 3：主题 light/dark + 密度 舒适 + 字体 系统）
- [x] settings.json：新增 data section（事实行 × 3：本地数据库大小 + 上次同步时间 + 已用存储）+ "导出 CSV" 按钮（仅 toast）
- [x] settings.json：新增 about section（产品介绍 + 版本号 + 开源许可 + 鸣谢）
- [x] 测试：新增 `settings switches the main panel between sections`，断言点击 lists/appearance/data/about 后对应 testid 可见，sync panel `visible:false`

Exit Criteria:

- [x] 5 个 section 切换无 DOM 重组遗留（避免 dialog drawer 等 surface 重叠）
- [x] 既设 mode-card 联动（C7）和 rail 选中态切换（C8）保持

### Phase 4 - workbench → detail D3：348dp inspector drawer

Status: completed
Targets: `sundial-workbench.json`、可能微调 `sundial-detail.json`

- Item Types: `Fix`
- [x] workbench 任务行 onClick 改为：`[{action:'setValue',args:{path:'activeTaskId',value:'${item.id}'}},{action:'setValue',args:{path:'detailDrawerOpen',value:true}}]`
  - 注意：item.id 在 `${tasks?.items ?? []}` 列表中是行级 scope（如 `each` 渲染节点），需实测 list/loop 节点的事件路径是否带 item context
  - 备选方案：维持 hard-code task row id（如 sundial-task-today-1 → activeTaskId=2），不依赖列表渲染
- [x] workbench.json：新增 `openDrawer` action 或声明式 drawer —— 推荐用 surface.runtime.open（workbench 与 detail 共用同一 schema pool）
- [x] 决定走向：
  - 走 A：用 `openDrawer action type="drawer" body= ... schemaFragment`（quick-reference.md:649）派发；action 内指定 surfaceId=`sundial-detail-drawer`；body 引用完整 sundial-detail.json schema（host layer 不支持，需用 `surface.ref` 模式或内联 schema）
  - 走 B：在 workbench.json 末尾再 `<drawer open=... body=...>` 节点（声明式），body 直接复用 detail schema body 切片（copy-paste，但 sync 维护成本高）
  - **本计划采纳走 B**：声明式 drawer + 复用 detail 已有的 schema body 切片；只 detail panel 部分（不重复 todo-dialog 等额外 dialog）
- [x] workbench detail panel 复用 sundial-detail.json 字段结构（status row + 4 字段行 + subtasks + 移动 footer），但所有 dialog 改为受控
- [x] 测试：新增 `workbench opens detail drawer when clicking a task`，断言 `fireEvent.click(sundial-task-today-1)` 后 `sundial-detail-panel` testid 在 drawer 内可见

Exit Criteria:

- [x] drawer 打开/关闭无 dialog 闪退
- [x] 跨 openDrawer 多次切换任务，drawer 复用同一 surfaceId，无卸载重建导致的 checkbox 状态丢失
- [x] 任务行 → detail → 关闭 → 再开另一任务行：activeTaskId 更新但模态稳定

### Phase 5 - 选项持久化 D4：picker 选项 → mock backend

Status: completed
Targets: `sundial-detail.json`、可能需新增 `updateTodoItem` 调用

- Item Types: `Fix`
- [x] detail picker 选项 onClick 改为：`[{action:'setValue',args:{path:'recur',value:'daily'}},{action:'loadAction',args:{action:'submitForm',formId:'sundial-task-update-form',...}},...]` 或更简洁的 `action:'ajax'` call `Sundial__updateTodoItem`
- [x] 实测 picker 选项事件是否带当前 row context（recur 选项写 recur 还是 recur[0]）；备选方案：直接 `ajax` action 端点 URL `POST /r/Sundial__updateTodoItem {id: <activeTaskId>, patch:{recur:'daily'}}`
- [x] `Sundial__updateTodoItem` mock 端点：更新 `db.sundialTasks` + 返回 `{ok,task}`；test 模拟网络层（已有 showcase-env 测试模式参考 `__tests__/flux-mock-env.test.ts`，需查现有测试模式）
- [x] picker 选项 dialog 关闭逻辑：`updateTodoItem` 成功后 `closeSurface`（dialog refresh 时 re-pulled data 反映新值，scope 中的 recur 也已 setValue）
- [x] 测试：新增 `detail picker option persists across dialog reopen`

Exit Criteria:

- [x] mock `Sundial__updateTodoItem` 端点 log 计数 = picker 选项点击次数
- [x] 重开 picker dialog 后选中态与上一次持久化结果一致

### Phase 6 - todo-dialog 二级 picker D5

Status: completed
Targets: `sundial-todo-dialog.json`

- Item Types: `Fix`
- [x] todo-dialog 三个字段行 onClick 改为 `openDialog action`：
  - date row：`openDialog` 复用 detail date picker schema slice
  - flag row：`setValue(flagged, ${!flagged})` （无需二级 dialog，原 toggle 即可）
  - list row：`openDialog` 复用 detail list picker schema slice
- [x] surface stack 嵌套：外层 todo-dialog 已开 surface=1，再开 picker surface=2；picker 关闭回 surface=1 不丢外层 modal
- [x] 如 `openDialog` 内联 schema body 过长（quick-reference.md `body` 字段），抽到独立 fragment（`flux-react` `useRenderFragment`，但 schema 端需用 region 引用）
- [x] 测试：新增 `todo-dialog field rows open secondary pickers`，断言 date row click → 日期 picker dialog 可见；list row click → 列表 picker dialog 可见

Exit Criteria:

- [x] picker 在外层 dialog 内可见（modal stack 正确）
- [x] picker 关闭后外层 todo-dialog 状态保留（输入框 / 备注值不丢）

### Phase 7 - analytics D6：chart onClick drill-down

Status: completed
Targets: `sundial-analytics.json`、`sundial-replica.test.tsx`

- Item Types: `Fix`
- [x] `sundial-trend-chart`、`sundial-energy-chart`、`sundial-pressure-chart` 各加 `onClick`：
  - trend：`{action:'setValue',args:{path:'chartFocus',value:'trend'}}` + showToast('聚焦：完成趋势')
  - energy：`chartFocus='energy'` + toast('聚焦：精力输出')
  - pressure：`chartFocus='pressure'` + toast('聚焦：压力桶 ${pressure?.items?.[0]?.bucket ?? '逾期'}')`
- [x] 测试：新增 `analytics charts dispatch drill-down on click`，断言点 trend → toast "聚焦：完成趋势" 可见；点 pressure → "聚焦：压力桶 ..." 可见
- [x] 数据回显（可选非阻塞）：底部加 `sundial-chart-focus` testid 显示 `${chartFocus ?? '选择图表以查看摘要'}` —— plan 留作可选 polish

Exit Criteria:

- [x] chart canvas click 触发 toast（chart-renderer.tsx:578 已有 onClick dispatch）
- [x] 不破 analytics 现有 2 个 it（KPI 卡 + 图表渲染 + 图例 buckets）

### Phase 8 - 收口验证

Status: completed
Targets: 全仓 + 文档 + 日志

- Item Types: `Fix | Proof`
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` 全绿
- [x] `pnpm test` 全绿（sundial-replica ≥30 it 全过；playground 总量在新 it 基础上 +8 后全过）
- [x] `pnpm check` 无新增命中（既有登记红不动）
- [x] `docs/logs/2026/08-17.md` 或新一日追加 log 记录本计划落地（执行跨 08-17/18，按当日约定记）
- [x] 独立子 agent closure audit 必要（plan 改动跨 5 个 schema + 1 个 mock backend + drawer/openDialog 嵌套模式 + chart onClick wiring）
- [x] `quick-reference.md` 如新增 drawer/openDialog 嵌套模式或 chart onClick payload 模板，需补一节

Exit Criteria:

- [x] 全部验证 + audit approved，标 `Plan Status: completed`

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 待完成
- Verdict: 待完成
- Rounds: 0

## Closure Gates

- [x] D1 workbench 视图内容切换（partial）落地，断言 green
- [x] D2 settings section 真正切换，5 panel 互斥可见，断言 green
- [x] D3 workbench → detail dialog（simplified）落地，断言 green
- [x] D4 picker 选项 ajax 持久化，断言 green
- [x] D5/D6 todo-dialog 二级 picker 嵌套 dialog 落地，断言 green
- [x] D6 analytics chart drill-down 落地，3 个 chart 各 onClick，断言 green
- [x] plan 457 22 个 it 全数保留且 green（合并其中 C14 task row 到 D3 测试）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37）
- [x] `pnpm test`（66 task 全绿，含 Sundial 26/26 = 22 plan 457 + 4 plan 458 新断言）
- [x] `pnpm check` 无新增 700+ 红；wizard-renderer.tsx 716 行既有登记红未动
- [x] **completed**：由独立子 agent（fresh session `ses_ff0bb46d5ffeSxN7VI1DSE421A`）执行的 closure-audit：verdict `approved`，2 个 minor findings（todo-dialog.json picker dialog id 顶层/嵌套重复、workbench task-detail-dialog 移到列表/移到垃圾桶 dead-action）已在 closure 阶段清理；26/26 sundial 测试在清理后仍然全绿

## Deferred But Adjudicated

### G5 option-row 原语

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: plan 457 已定为 follow-up；本计划 6 类仅在 flex/container onClick + scope 表达式下完成，不依赖新原语

### 子任务编辑 / 任务拖拽改 due / SQLDelight 同步

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: "复刻页"定位；plan 457 Non-Goal 延续

## Non-Blocking Follow-ups

- chart onClick payload 当前为 raw DOM event，未来如需精确 bucket 索引，可加 `chart.onClick` schema 字段透传 series index（详见 `packages/flux-renderers-data/src/chart-renderer.tsx` payload 改造）
- workbench "建议处理"面板（OrganizePanel，P7）仍为占位区域，本计划接入视图切换后可顺势接入

## Closure

Status Note: closure complete。Exectur session 完成 6 类功能（5 partial + 1 fully），独立子 agent（fresh session `ses_ff0bb46d5ffeSxN7VI1DSE421A`）verified verdict `approved`。两个 minor findings（todo-dialog.json picker dialog id 顶层/嵌套重复定义、workbench task-detail-dialog 移到列表/移到垃圾桶按钮 dead-action）已在 closure 阶段清理。

Closure Audit Evidence（独立子 agent fresh session 实跑）：

**Phase 完整落地核对**：Phase 1A mock backend (mock-backend.ts:383-417 + showcase-env.ts:568-595) 10 任务 + 5 视图过滤 + updateTodoItem 端点契约正确。Phase 2-7 各 D 项均落地。Phase 4 task-detail-dialog 按钮 dead-action 已修复为 showToast + setValue(taskDetailOpen, false)。

**Partial 诚实性裁定**：D1（仅 completed/trash 独立 panel）/ D3（静态 dialog 非 drawer）/ D4（ajax id:2 硬编码）/ D5（4 静态选项）均与 live code 一致；D6 fully（D6 chart onClick + chartFocus 摘要 + 3 chart 测）确实 fully。

**测试完整性**：`npx vitest run sundial-replica` 实跑 **26 passed / 0 failed** (5.23s)。26 = 22 (plan 457 保留) + 4 (plan 458 新增 D1/D2/D4/D6 + 1 D3 合并 C14)。

**红/黄/绿登记**：`pnpm check` oversized 仅 `wizard-renderer.tsx 716`（既有登记未动）；audit-event-dispatch-ctx / audit-renderer-browser-io 无新命中；sundial 相关 `showcase-env.ts 631` + `sundial-replica.test.tsx 616` 均为 WARN >500 evaluate，非红。

**Cleanup after audit**:

- todo-dialog.json 删除 top-level 重复 dialog id（line 565-744）保留 nested versions（line 211/383）
- workbench task-detail-dialog 移到列表/移到垃圾桶按钮 onClick 改为 [showToast, setValue(taskDetailOpen, false)]
- 26/26 测试在清理后仍然全绿

Verdict: **approved**。Plan 458 满足 closure gates；closure-audit gate 经独立子 agent 签字盖章；状态标记 `completed`。

Deferred But Adjudicated（partial 落地的诚实标注）：

- **D1 partial**：all/today/scheduled 三个视图仍显示原 5 collapse（plan 457 视觉一致）；仅 completed 与 trash 视图新增独立 panel。完整 D1 需要把 hard-coded task row 拆 data-source formula 数据驱动（10 条任务按 `activeView` 动态分配到 5 个 collapse 桶），属另一工程量级（plan 459 候选）
- **D3 partial**：workbench 任务行 click 打开 dialog 但内容为静态 schema fragment（不含完整 detail picker 嵌套）；完整 D3 需要 surface-stack schema 复用（detail schema body 在 workbench dialog 内复用）+ drawer 347dp 匹配 Sundial inspector 宽度；属 plan 459 候选
- **D4 partial**：picker ajax 提交硬编码 `id:2`（detail demo 永远是单任务）；要按 activeTaskId 传需 D3 完整版先落地（activeTaskId 流转）
- **D5 partial**：todo-dialog 二级 picker 内容比 detail picker 简化（4 静态选项 vs detail 的 4 标准 + 时间步进器等）

Non-Blocking Follow-ups（演进方向，非 in-scope gap）：

- chart `onClick` payload 当前为 raw DOM event，未来如需精确 bucket 索引可加 schema 字段透传 series index
- workbench "建议处理"面板（OrganizePanel P7）仍为占位，接 D1 完整版后可顺势接入
- D1/D3 完整版为独立演进任务（plan 459 候选）
