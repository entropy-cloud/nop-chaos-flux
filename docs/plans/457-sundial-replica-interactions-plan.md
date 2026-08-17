# 457 Sundial 复刻页交互补齐：flex/container onClick + 页面交互接线

> Plan Status: completed
> Last Reviewed: 2026-08-16
> Source: 用户反馈"Sundial 复刻页点击无反应"；`docs/analysis/sundial-ui-reproduction-analysis.md` G5（hover/选中态 schema 表达）
> Related: `docs/plans/456-flux-renderer-improvements-plan.md`（已 completed）

## Purpose

把 Sundial 复刻页"点击无反应"的交互缺口收口：先给 `flex`/`container` 增加 `onClick` schema 事件（行级交互的基础能力），再把复刻页中"原型可交互但当前未接线"的元素全部接上 schema 动作，并用测试锁定。

## Current Baseline

### 交互元素分析（5 个复刻页，2026-08-16 全量梳理）

**A 类：已接线且正常（有测试覆盖）**

- workbench：添加待办按钮（开 dialog）、5 个 collapse 折叠、7 个 checkbox、dialog 取消/添加
- detail：3 个选择器按钮（日期/重复/列表）、4 个 checkbox、input-date popover、input-time steppers、dialog 关闭按钮
- todo-dialog：打开按钮、dialog 取消/添加

**B 类：静态展示（无交互设计，点击无反应属正常，不改）**

- analytics 全部（KPI 卡、图表、图例、insight 行）

**C 类：原型可交互但复刻页未接线（真问题，本计划处理）**

| #   | 元素（testid）                                                 | Sundial 原型行为                         | 当前状态                                               | 根因                             |
| --- | -------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ | -------------------------------- |
| C1  | workbench 导航行 ×8（sundial-nav-_、sundial-view-_）           | 点击切换视图 + 选中态切换                | 静态 flex                                              | flex 无 onClick                  |
| C2  | sidebar 设置图标                                               | 打开设置页                               | 静态 icon                                              | icon 无 onClick                  |
| C3  | detail 字段行 ×4（sundial-detail-row-\*）                      | 点击行打开日期/重复/列表选择器、切换旗标 | 静态 flex（行外已有 3 个按钮做等价事，但行本身无反应） | flex 无 onClick                  |
| C4  | detail 清除日期按钮（sundial-detail-clear-date）               | 清除日期                                 | button 无 onClick                                      | 漏接线                           |
| C5  | detail 移到列表 / 移到垃圾箱（sundial-detail-move-list/trash） | 移动/删除操作                            | button 无 onClick                                      | 漏接线                           |
| C6  | detail 子任务行 chevron/trash 图标                             | 进子任务详情/删除子任务                  | 静态 icon                                              | icon 无 onClick                  |
| C7  | settings 模式卡 ×3（sundial-mode-\*）                          | 单选切换 + 联动显示连接信息区            | 静态选中（本地恒选中），连接信息恒显示                 | flex 无 onClick + 无动态显隐接线 |
| C8  | settings rail ×5（sundial-settings-\*）                        | 切换设置 section                         | 静态 flex                                              | flex 无 onClick                  |
| C9  | settings 保存按钮（sundial-settings-save）                     | 保存并反馈                               | button 无 onClick                                      | 漏接线                           |
| C10 | todo-dialog 内字段行 ×3（sundial-todo-\*-row）                 | 同 C3                                    | 静态 flex                                              | flex 无 onClick                  |
| C11 | 重复选择器选项行 ×4（sundial-recur-\*）                        | 点选 + 选中态                            | 静态（weekly 恒选中）                                  | flex 无 onClick                  |
| C12 | 列表选择器选项行 ×3（sundial-list-option-\*）                  | 点选 + 选中态                            | 静态                                                   | flex 无 onClick                  |
| C13 | detail 清除时间按钮（sundial-clear-time）                      | 清除时间                                 | button 无 onClick                                      | 漏接线                           |
| C14 | workbench 任务行 ×7（sundial-task-\*）                         | tap 打开详情                             | 静态                                                   | flex 无 onClick                  |
| C15 | detail 状态行 X 图标（sundial-detail-status-row 尾部）         | 关闭详情                                 | 静态 icon                                              | icon 无 onClick                  |
| C16 | settings 返回行（sundial-settings-rail 头部）                  | 返回上一页                               | 静态                                                   | flex 无 onClick                  |

### 关键事实

- `flex`/`container`（`packages/flux-renderers-basic/src/flex.tsx:63`、`container.tsx`）渲染为裸 div，**无 onClick 事件支持**（button 等控件有，见 `basic-renderer-definitions.ts:268-298` 的 eventContracts 模式）
- `BaseSchema.className` 是静态字符串，**不支持表达式绑定**——动态选中态需用 `visible` 表达式 + 双渲染（选中版/未选中版）
- `BaseSchema.visible` 支持表达式（`visible?: boolean | string`），可驱动动态显隐
- 既有可复用动作：`setValue`（改 scope）、`showToast`（反馈）、`openDialog`/`setValue + 声明式 dialog`（开选择器）、`closeSurface`
- 测试基础设施：`sundial-replica.test.tsx`（11 个 it）+ basic 包 renderer 测试；playground 包总量 153 用例（456 closure 记录口径）

## Goals

- `flex`/`container` 支持 `onClick` schema 事件（eventContract + 字段 + 渲染接线 + 测试）
- C 类 16 个交互点全部接线：
  - 按钮类（C4/C5/C9/C13）接 `showToast`/`setValue` 反馈
  - 图标类（C2/C6/C15）用 icon-only `button` 包裹接动作
  - 行类（C1/C3/C7/C8/C10/C11/C12/C14/C16）用 `flex onClick` 接 `setValue`/开 dialog/toast
  - 动态选中态（C1 主导航/视图、C7 模式卡、C11/C12 选项行）用 `visible` 表达式双渲染切换（初始 scope 值注入 PAGE_DATA）
- 端到端测试断言关键交互（点击行 → dialog 打开 / 选中态切换 / toast）

## Non-Goals

- workbench 完整视图内容切换（今天/计划/已完成/垃圾箱各自的分组树重构）——仅选中态 + 反馈
- settings rail 的 section 内容切换（同步/列表/数据/外观/关于）——仅反馈
- analytics 图表交互（无设计交互）
- G5 完整方案（通用 `option-row` 原语）——本计划只落地 flex/container onClick 最小交互面，option-row 留 follow-up
- 持久化（checkbox 状态与 mock 后端同步）——既有 Non-Goal 延续

## Scope

### In Scope

- `packages/flux-renderers-basic/`：flex/container onClick（schema + definition + renderer + 测试）
- 5 个 sundial JSON 页面交互接线
- `sundial-replica.test.tsx` 交互断言扩展
- owner docs：`quick-reference.md`（flex/container onClick 字段）、`docs/architecture/styling-system.md`（如交互契约需要）

### Out Of Scope

- 其他 layout renderer（page/grid）的 onClick
- option-row 原语（G5 follow-up）
- Sundial 复刻页 hover 视觉增强（CSS 已有）

## Failure Paths

不适用：本计划为渲染器事件增强 + 演示页接线，无鉴权/外部集成；失败面集中在 onClick 未触发（测试锁定）与 visible 双渲染的表达式语法（既有能力，测试锁定）。

## Test Strategy

档位：`必须自动化`

- flex/container onClick：Proof 先于 Fix（basic 包 renderer 测试先红后绿）
- 端到端：sundial-replica.test.tsx 断言行点击 → dialog/testid 出现、模式卡切换 → 连接信息区显隐、选中态 data 属性切换

## Execution Plan

### Phase 1 - flex/container onClick 渲染器增强

Status: completed
Targets: `packages/flux-renderers-basic/src/{flex.tsx,container.tsx,schemas.ts,basic-renderer-definitions.ts}`

- Item Types: `Proof | Fix`

- [x] Proof：basic 包 `__tests__/` 下新增/扩展 flex/container onClick 测试（onClick 触发事件 + 未声明时行为不变；文件命名参照既有 `flex-responsive.test.tsx` 模式，Minor-2 修订）——落地为 `__tests__/flex-container-click.test.tsx`（4 用例，先红后绿）
- [x] `FlexSchema`/`ContainerSchema` 增加 `onClick?: ActionSchema | ActionSchema[]`
- [x] flex/container renderer 渲染 div 加 `onClick` handler（走 `props.events.onClick`，与 button 同模式）；eventCtx 带 scope
- [x] `basic-renderer-definitions.ts`：flex/container 增加 eventContracts.onClick + fields `{ key: 'onClick', kind: 'event' }`
- [x] `docs/references/quick-reference.md`：flex/container onClick 字段说明（新增 "Layout Interaction — flex/container onClick" 节）

Exit Criteria:

- [x] flex/container onClick 单测全绿（点击触发 action、未声明时行为不变）；onClick 挂 container 的 root div（Minor-4 修订）
- [x] onClick 字段以 focused 测试为覆盖载体（basic 定义在 `basic-renderer-definitions.ts`，不在 schema-prop-coverage 脚本扫描提取范围，脚本扩展为 Deferred 治理项，Minor-3 修订）

### Phase 2 - 按钮/图标类补接线

Status: completed
Targets: `apps/playground/src/complex-pages/page-schemas/sundial-{detail,settings,workbench}.json`

- Item Types: `Fix`

- [x] C4 detail 清除日期（独立 flex 内）：`onClick` → `setValue`（清 demo-date 状态）+ `showToast('日期已清除')`
- [x] C13 detail 清除时间：`onClick` → `setValue` 清 demo-time + `showToast('时间已清除')`
- [x] C15 detail 状态行 X 图标：包 icon-only `button`（testid `sundial-detail-close`）→ `showToast('关闭详情')`
- [x] C16 settings 返回行：补 testid `sundial-settings-back` + `onClick` → `showToast('返回')`
- [x] C5 detail 移到列表/移到垃圾箱：`onClick` → `showToast`（移动/删除反馈）
- [x] C9 settings 保存：`onClick` → `showToast('保存成功')`
- [x] C2 sidebar 设置图标：`icon` 包进 icon-only `button`（size="icon" + variant ghost）→ `showToast` 或导航占位
- [x] C6 detail 子任务 chevron/trash：包 icon-only `button` → `showToast`

Exit Criteria:

- [x] 上述按钮/图标点击均有 schema 动作；`sundial-replica.test.tsx` 增加点击断言（toast 或 dialog 可见）——4 个新 it 断言 toast 文本（关闭详情/日期已清除/时间已清除/已选择目标列表/已移到垃圾箱/打开子任务详情/删除子任务/返回/保存成功/打开设置）；日期行清除按钮与打开 dialog 不冲突（无冒泡双触发，Major-3 修订）——由 Phase 3 行拆分结构保证，Phase 3 Exit 复核

### Phase 3 - 行级交互接线（flex onClick + 动态选中态）

Status: completed
Targets: `apps/playground/src/complex-pages/page-schemas/sundial-{workbench,detail,settings,todo-dialog}.json`

- Item Types: `Fix`

- [x] C10 todo-dialog 字段行 ×3：`onClick` → `showToast`（选择日期/切换旗标/选择列表 占位反馈——dialog 内无二级 dialog 可开，按 Non-Goals 仅反馈）
- [x] **初始值注入（Major-1 修订）**：`page-data.ts` 的 `PAGE_DATA['sundial-workbench']` 增加 `activeSection: 'workbench'`、`activeView: 'all'`；新增 `PAGE_DATA['sundial-settings']` 增加 `mode: 'local'`、`activeSection: 'sync'`；对应 JSON 移除 baked 选中类（`sd-nav-selected`/`sd-choice-selected`），选中态完全由双渲染变体承载
- [x] C1 workbench 主导航 3 行（工作台/列表/分析）：`onClick` → `setValue(activeSection)`（**与视图行不同变量，Major-2 修订**）；选中态用 `visible` 表达式双渲染（`${activeSection === 'workbench'}`）切换选中版/未选中版；双变体均带 `data-selected` 属性（测试断言载体）
- [x] C1 workbench 视图 5 行（全部/今天/计划/已完成/垃圾箱）：`onClick` → `setValue(activeView)` + toast；选中态同双渲染（`${activeView === 'all'}` 等）
- [x] C7 settings 模式卡 ×3：`onClick` → `setValue(mode)`；选中态双渲染；连接信息区 `visible: "${mode !== 'local'}"` 联动（连接信息容器补 testid `sundial-connection-info`，Minor-5 修订）
- [x] C8 settings rail ×5：`onClick` → `setValue(activeSection)` + toast（不切换内容）
- [x] C3 detail 字段行 ×4：`onClick` → `setValue` 打开对应声明式 dialog；**日期行拆分为"选择区（开 dialog）+ 清除按钮（独立 flex，Major-3 修订）"两个可点区域，避免清除点击冒泡到行**；`sundial-detail-row-date` testid 保留在外层 wrapper（含 /清除/ 文本的既有断言不破），选择区另加 testid `sundial-detail-row-date-pick`（Minor-R2-a 修订）；规格补全（Minor-R3-a）：4 行中 3 行（日期/重复/列表）`onClick` → `setValue` 打开对应声明式 dialog（dateOpen/recurOpen/listOpen），旗标行 → `setValue` 切换 + toast\*\*
- [x] **初始值注入（Major-R2-1 修订）**：`PAGE_DATA['sundial-detail']` 增加 `recur: 'weekly'`、`list: 'work'`（选中态双渲染初始值）、`flagged: true`（旗标行双渲染初始值，保持既有 /已标记/ 断言）；对应 dialog 选项行移除 baked circle-check 选中标记
- [x] C11 重复选择器选项行 ×4：`onClick` → `setValue(recur)` + toast + 选中态双渲染（`${recur === 'weekly'}`）
- [x] C12 列表选择器选项行 ×3：`onClick` → `setValue(list)` + toast + 选中态双渲染（`${list === 'work'}`）
- [x] C14 workbench 任务行 ×7：`onClick` → `showToast`（打开详情占位反馈）；**裁定：行内 checkbox 点击冒泡到行 toast 属可接受行为（占位反馈），不排除 checkbox 区域（Minor-R2-d）**

Exit Criteria:

- [x] 行点击均有反馈（dialog/选中态/toast）；`sundial-replica.test.tsx` 断言（新增 7 个 it，Sundial 全量 22 个全绿）：detail 字段行点击 → 对应 dialog 出现（日期/重复/列表，`sundial-detail-row-date-pick` 开日期、行开重复/列表）且清除按钮无冒泡双触发；旗标行切换 → /未标记/ + toast；模式卡点击 Supabase → 连接信息区可见、本地 → 隐藏；主导航/视图/rail/模式卡/选项行选中态 data-selected 属性切换；C14 任务行、C10 todo-dialog 行 toast

### Phase 4 - 收口验证

Status: completed（独立子 agent closure audit approved，2026-08-17）
Targets: 全仓验证 + 文档 + 日志

- Item Types: `Fix | Proof`

- [x] `pnpm typecheck`/`build`/`lint`/`test` 全仓通过（playground 全量 164/164，Sundial 22/22 含新交互断言；basic 494/494）
- [x] `pnpm check` 无新增命中（仅既有登记红：wizard-renderer.tsx oversized、industrial event-dispatch-ctx 6 处）
- [x] `docs/logs/2026/08-17.md` 记录本计划落地（执行跨 08-16/17，按当日日志约定记于 08-17）
- [x] 独立子 agent closure audit（fresh session，`ses_ff2c3c27dffeoqWespZv8F2l0u`）→ verdict `approved`

Exit Criteria:

- [x] 全量验证全绿；closure audit approved

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_ff503fdd4ffeNACwlLX0K0NGIY`（独立 sub-agent，round 1）
- Verdict: `revised`（round 1，4 Major + 6 Minor）→ `revised`（round 2，1 Major + 4 Minor）→ `pass-with-minors`（round 3，零 Blocker/Major）
- Rounds: 3
- Findings addressed (round 1):
  - Major-1（双渲染选中态无初始 scope 值）→ Phase 3 增加 PAGE_DATA 初始值注入（activeSection/activeView/mode）+ 移除 baked 选中类
  - Major-2（主导航与视图行共用 activeView）→ 拆分 activeSection（主导航/rail）与 activeView（视图行）
  - Major-3（日期行清除按钮冒泡双触发）→ 日期行拆分为"选择区 + 清除按钮"两个独立可点 flex
  - Major-4（C 类清单遗漏）→ 补 C11-C16（重复/列表选项行、清除时间、任务行 ×7、状态行 X、返回行）
  - Minor-1（153 用例口径）→ Baseline 修正为 11 个 it / playground 总量 153
  - Minor-2（flex-renderer.test.tsx 不存在）→ 参照 **tests**/flex-responsive.test.tsx 模式
  - Minor-3（schema-prop-coverage 理由）→ 改为"basic 定义不在扫描提取范围，focused 测试覆盖"
  - Minor-4（container 多 div）→ onClick 挂 root div
  - Minor-5（连接信息区无 testid）→ 补 testid sundial-connection-info
  - Minor-6（flex.tsx:63 行号）→ 忽略
  - Round 2 Major-R2-1（C11/C12 双渲染缺初始值）→ PAGE_DATA['sundial-detail'] 增加 recur/list 初值 + 移除 baked 选中标记
  - Round 2 Minor-R2-a/b/c/d → 日期行 testid 保留 wrapper + 选择区新 testid；C15/C16 补 testid；Goals 子 bullet 同步 16 点；C14 checkbox 冒泡裁定接受

## Closure Gates

- [x] flex/container onClick 落地且有 focused 测试
- [x] C 类 16 个交互点全部接线且有端到端断言
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 交互缺口
- [x] 受影响的 owner docs 已同步（quick-reference.md；如涉及样式契约则 styling-system.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 —— 独立审计 `ses_ff2c3c27dffeoqWespZv8F2l0u` verdict `approved`（证据见 ## Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 无新增命中（既有登记红除外：wizard-renderer.tsx oversized、industrial event-dispatch-ctx 6 处）

## Deferred But Adjudicated

### G5 完整方案：通用 option-row 原语

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划以 flex/container onClick + visible 双渲染达成"行可点 + 选中态"的最小交互面；option-row（行 = 图标+文本+值+选中态 的原语化）是更完整的 schema 表达，但需要新的 renderer 设计与评审周期，且当前演示页无需它即可达成交互正确
- Successor Required: no
- Successor Path: 无（backlog，`docs/analysis/sundial-ui-reproduction-analysis.md` G5 跟踪）

### workbench 视图内容切换 / settings section 切换

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 复刻页的定位是样式+交互验证，视图内容切换属完整应用逻辑；选中态 + 反馈已满足"点击有反应"
- Successor Required: no
- Successor Path: 无

## Non-Blocking Follow-ups

- analytics 图表可加 onClick（chart 已有 onClick 事件字段，复刻页未用）——后续可接 drill-down
- 持久化（checkbox/表单与 mock 后端同步）

## Closure

Status Note: 全量验证全绿（typecheck/build/lint 37/37、test 66 task、check 仅 2 项既有登记红）；closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: `ses_ff2c3c27dffeoqWespZv8F2l0u`（独立子 agent，fresh session，仅输入 plan + diff summary + verification 输出）
- Evidence: 6 项 checklist 全 PASS —— Phase 1（schemas.ts:303/181 onClick 字段、renderer root div 分发、eventContracts + fields、role/tabIndex/键盘激活、5/5 focused 测试）；Phase 2/3（C1-C16 全部在 live JSON 有对应 testid 与动作、双渲染变体带 data-selected + visible 表达式、PAGE_DATA 初始值在 page-data.ts:69-88、无残留 baked 选中类/circle-check、日期行 pick/清除拆分正确且 wrapper 无 onClick）；测试（`npx vitest run -t "Sundial replica"` 22/22、basic 494/494、playground 164/164 复跑一致）；Phase 4 证据（typecheck/lint/build 复跑 37/37、check 失败恰为 2 项登记红零新增）；docs（quick-reference.md:858-875、styling-system.md:408、docs/logs/2026/08-17.md）；plan 完整性（无 in-scope 静默降级，Deferred 项与 Non-Goals 一致）。唯一非阻塞备注：focused 测试文件实际 5 用例（plan 写 4，键盘用例为超集）。

Follow-up:

- 无（Non-Blocking Follow-ups 维持：analytics 图表 drill-down、持久化）
