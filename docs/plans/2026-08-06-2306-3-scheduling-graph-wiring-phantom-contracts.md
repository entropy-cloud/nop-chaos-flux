# 3 scheduling/graph 接线与 phantom 契约裁决（22-04/22-05/22-06/22-07/22-08/22-10/22-12）

> Plan Status: completed
> Mission: component-audit
> Work Item: scheduling/graph 集成接线与 phantom 契约（follow-up backlog 家族：22-04 / 22-05 / 22-06 / 22-07 / 22-08 / 22-10 / 22-12）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P2] 22-04 / 22-05 / 22-06 / 22-07 / 22-08 / 22-10 / 22-12，含 R2 深挖）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-05-1721-2-c9-scheduling-family-audit.md`（completed，CX-12）、`docs/plans/2026-08-04-2030-1-g1-graph-viewer-plan.md`（completed，G1 graph 独立闭环）、`docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md`（22-09 graph ctx 归 plan 1）

## Purpose

收口 scheduling 家族（kanban/gantt/calendar）与 graph 的集成接线缺口与「文档承诺 + 代码缺失」phantom 契约：①kanban controlled 模式 `onColumnAdd` 漏守卫（22-04）；②calendar print/exportPNG reaction ready() 后无派发点（22-05）；③graph layout prop 运行时不同步 store（22-06）；④gantt 数据变更路径无事件外抛（22-07）；⑤kanban columnsOrder* 设计契约零代码消费（22-08）；⑥gantt 配置 prop 运行时变化不生效（22-10）；⑦kanban 7 个 `component:*` 句柄零注册（22-12）。每条裁决为「实现 or 文档降级」二选一，已确认缺口实现修复 + 回归测试，phantom 文档契约显式收敛（实现或标注 @reserved），消除 design.md 承诺与 live 代码的双向漂移。

## Current Baseline

- **22-04 kanban onColumnAdd 漏守卫**（live 核对）：`kanban-board.tsx:366-392`——onCardAdd/onCardRemove/onColumnReorder 等 mutation 均带 `if (!isControlled)` 守卫（:285/:308/:330/:353/:366），`:392` `void events.onColumnAdd?.(colAddPayload, eventCtx(colAddPayload))` 无守卫；文件自身契约注释（:52-55）声明 controlled 模式 mutation 被丢弃时 mutation 事件不得声称已发生。
- **22-05 calendar reaction 无派发**（live 核对）：`calendar.tsx:175-181`——`for (const key of ['print','exportPNG','importICal','exportToICal']) props.reactions[key]?.ready()` 仅 ready；全包 grep 无 `reactions.*.dispatch()`（对照 gantt.tsx:417-419 有派发先例）；print/exportPNG 未标注 @reserved（importICal/exportToICal 已标注）。
- **22-06 graph layout 单向初始化**（live 核对）：`graph-renderer.tsx:80,98`——`const layout = isGraphLayout(resolved.layout) ? resolved.layout : 'flow'` 仅用于 `useState(() => createGraphStore({ layoutMode: layout }))` 一次性初始化；无 prop→store 同步 effect（:331 effect 只依赖 dataRevision/layoutMode，不写 store.layoutMode）。
- **22-07 gantt 编辑变更零事件**：`gantt-editor.tsx:33-53`（保存只 commitTask+closeEditor）、`gantt-grid.tsx:67-70`（行内提交只 store.updateTask）、`use-gantt-keyboard.ts:100-114`（Delete/Backspace 分支只 onDeleteTask/deleteTask）——三处数据变更路径不派发 schema 事件；`gantt.types.ts:179-191` 事件契约无 onTaskEdit/onTaskChange。
- **22-08 kanban columnsOrder phantom**：`docs/components/kanban/design.md:128,131,227-229,265` 声明 columnsOrderOwnership（:131/:229）与 columnsOrderStatePath（:128/:229）三态，全仓 `packages/*/src` grep `columnsOrder` 零代码消费（types/definitions/board 均无字段）。
- **22-10 gantt 配置 prop 仅挂载生效**（live 核对）：`gantt.tsx:36-39`——cellWidth/taskBarHeight/zoomLevels 仅 `createInitialStore` 一次性读取；re-seed effect（:79-101）只覆盖 tasks/links/resources/assignments。**注意**：`gantt-store.ts:123` 有 `cellWidth` setter，但 `taskBarHeight`/`zoomLevels` 为 getter-only（:126-127）——同步这些字段需要补 store setter（本 plan Targets 含 `gantt-store.ts`）。
- **22-12 kanban component:\* 句柄零注册**：`docs/components/kanban/design.md:286-292` 声明 7 个 `component:*` 句柄（scrollToCard/scrollToColumn/addCard/removeCard/moveCard/collapseColumn/getData）；`kanban-board.tsx` 全文件 `rg "componentRegistry|ComponentHandle|register\("` 零命中；同族 gantt（gantt.tsx:303-345）/calendar（calendar.tsx:194-252）均经 useCurrentComponentRegistry 注册；`docs/components/kanban/example.json:40,74` 仍使用 `component:addCard`。
- **既有测试**：kanban-renderer.test.tsx（无 onColumnAdd 守卫用例、无 component:\* 注册断言）、calendar.test.tsx:282-294（只断言 ready() 被调）、gantt.test.tsx（无配置 prop 运行时同步用例、无 onTaskEdit 用例）、graph-renderer 测试（无 layout 运行时同步用例）。
- **验证基线**：CV full-green（2026-08-06）；scheduling 包 872 单测绿；graph 包 42 单测绿。

## Goals

- 7 条发现全部裁决为「实现 or 文档降级」并落地：已确认的接线缺口（22-04/22-06/22-10/22-07/22-05/22-12）实现修复 + 回归测试；phantom 契约（22-08）实现或 design.md 显式 @reserved 收敛。
- design.md 与 live 代码双向漂移清零（kanban/gantt/calendar/graph 各自文档契约与实现一致）。
- `docs/components/kanban/example.json` 中 `component:addCard` 用法可运行或同步移除。

## Non-Goals

- 22-09（graph 事件 ctx）已归 plan 1（`2026-08-06-2306-1`），不重复。
- 22-01/22-02/22-03（scheduling P1）已由 `2026-08-06-0711-1` 修复（completed），不重复。
- 05-01/05-02/05-03（useScopeSelector 门控）后续轮次，不入本 plan。
- 不做 scheduling 家族其他功能增强（如 columnsOrder 三态完整实现——若裁决为 @reserved 文档降级，则不在本 plan 实现）。

## Scope

### In Scope

- kanban：22-04 守卫 + 22-12 ComponentHandle 注册（至少 addCard/removeCard/moveCard/collapseColumn/getData，按 gantt/calendar 模式）+ 22-08 裁决（实现 or @reserved 文档降级）。
- calendar：22-05 print/exportPNG reaction 派发接线（句柄 invoke 路径补 dispatch，对齐 gantt 先例）或 @reserved 标注。
- graph：22-06 layout 同步 effect + 测试。
- gantt：22-07 裁决（新增 onTaskEdit 事件三处派发 or design doc 显式声明「编辑变更不对外派发」）+ 22-10 re-seed effect 补配置字段同步 + 测试。
- design.md/example.json 同步（kanban/gantt/calendar/graph）。

### Out Of Scope

- 05-xx useScopeSelector 门控（后续轮次）。
- 其余 2026-08-06-0711 P2 条目（02-xx/04-01/09-xx/10-xx/11-xx/12-xx/13-xx/18-xx/20-xx）。
- 22-01/22-02/22-03 复验（已 closed）。

## Failure Paths

> 不适用：纯组件接线与文档契约收敛，无外部 IO/鉴权/错误码契约。风险形态为「句柄注册后 capability 解析失败」或「事件派发行为不一致」——由组件级 focused 测试覆盖。

## Test Strategy

本档选择：`必须自动化`（组件公共契约——`component:*` 句柄可解析性、事件派发、prop→store 同步均为可断言契约行为；Proof 先于 Fix）。

## 裁决记录（Phase 1 Decision 留痕，2026-08-07 执行）

| Finding                               | 裁决                   | One-line 理由                                                                                                                                                 | 落地    |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 22-04 kanban onColumnAdd 漏守卫       | **实现**               | 同文件 :285/:308/:330/:353 四处 mutation 均带守卫，:392 遗漏构成同一契约自证违反；补 `if (!isControlled)`                                                     | Phase 2 |
| 22-05 calendar print/exportPNG 无派发 | **实现**               | 句柄 invoke 路径已存在（calendar.tsx:224-234），补 dispatch 对齐 gantt.tsx:417-419 先例即可闭合「声明即死」；importICal/exportToICal 维持 @reserved           | Phase 3 |
| 22-06 graph layout prop 单向初始化    | **实现**               | schema 驱动源与 store 双向可写（句柄 setLayout 已存在），prop 变化不同步构成 schema 驱动切换静默失效；补值不等才同步 effect                                   | Phase 3 |
| 22-07 gantt 编辑变更零事件            | **实现**               | 宿主同步依赖编辑型变更；新增 onTaskEdit（`{ _taskId, changes? , deleted? }`）三路径派发（editor 保存 / grid 行内提交 / keyboard Delete），全量 ctx 对齐 CX-12 | Phase 4 |
| 22-08 kanban columnsOrder\* phantom   | **文档降级 @reserved** | 列排序随 boardData（kanbanStatePath）整体 scope-owned 已覆盖持久化需求；独立三态属超前面增强，design.md 标注 @reserved（Deferred But Adjudicated 已登记）     | Phase 2 |
| 22-10 gantt 配置 prop 仅挂载生效      | **实现**               | 宿主动态下发缩放配置是真实场景；re-seed effect 补 cellWidth/taskBarHeight/zoomLevels 同步（store 补后两者 setter）                                            | Phase 4 |
| 22-12 kanban component:\* 零注册      | **实现**               | 同族 gantt/calendar 均注册，kanban 是唯一零句柄组件；`component:addCard` example.json 用法恢复可运行                                                          | Phase 2 |

## Execution Plan

### Phase 1 - 裁决表与测试先红（Proof + Decision）

Status: completed
Targets: `docs/audits/cr-inventory-adjudication.md`（或本 plan 内裁决记录）、各组件 `__tests__/`

- Item Types: `Proof | Decision`

- [x] **Decision**：对 7 条逐条给出「实现 or 文档降级」裁决并留痕（写入本 plan 或裁决记录）：
  - 22-04 → 实现（补守卫）
  - 22-05 → 实现（reaction dispatch 接线，对齐 gantt.tsx:417-419）或 @reserved 标注（二选一裁决，默认实现——comment 声称 actions fire）
  - 22-06 → 实现（layout 同步 effect）
  - 22-07 → 实现（新增 onTaskEdit schema 事件 3 处派发）或 design doc 显式声明不派发（默认实现——宿主同步需要）
  - 22-08 → 裁决：columnsOrder\* 随 boardData 整体 scope-owned，独立三态属超前面 → 默认 design.md 标注 @reserved（与 22-12 一并裁决）；若裁决实现则补 Phase 5 工作量
  - 22-10 → 实现（re-seed effect 补配置字段同步）
  - 22-12 → 实现（ComponentHandle 注册，gantt/calendar 模式）
- [x] **Proof（test-first）**：为「实现」裁决项写失败测试——kanban onColumnAdd controlled 不派发用例；calendar print/exportPNG 句柄 invoke 派发用例；graph layout prop 变化同步 store 用例；gantt onTaskEdit 三路径派发用例 + 配置 prop 运行时同步用例；kanban component:\* 注册可解析用例（`component:addCard` 等经 registry 解析）。

Exit Criteria:

- [x] 7 条裁决记录完整（每条含 one-line 理由），零未裁决。
- [x] 全部「实现」项测试先红（修复前失败），@reserved 裁决项记录文档降级范围。

### Phase 2 - kanban 接线（22-04 + 22-12 + 22-08）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`、`packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] 22-04：`onColumnAdd` 派发补 `if (!isControlled)` 守卫；controlled 模式只读反馈（沿用同文件 :285/:308/:330/:353 先例）。
- [x] 22-12：按 gantt/calendar 模式经 `useCurrentComponentRegistry` 注册 ComponentHandle（scrollToCard/scrollToColumn/addCard/removeCard/moveCard/collapseColumn/getData），scheduling-renderer-definitions.ts kanban 条目补 componentCapabilityContracts；`component:addCard` 经 registry 可解析。
- [x] 22-08：按 Phase 1 裁决落地（默认 design.md 标注 @reserved + 同步 `docs/components/kanban/example.json` 移除 `component:addCard` 用例或改为可运行用法）。
- [x] kanban-renderer.test.tsx 扩展（守卫 + 句柄 + 契约）+ scheduling 包 typecheck/test。

Exit Criteria:

- [x] kanban 测试绿（onColumnAdd controlled 不派发、component:\* 可解析）；design.md/example.json 与 live 一致（22-08 收敛）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && test` 绿。

### Phase 3 - calendar + graph 接线（22-05 + 22-06）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`、`packages/flux-renderers-graph/src/graph-renderer.tsx`、各自 `__tests__/`

- Item Types: `Fix | Proof`

- [x] 22-05：print/exportPNG 句柄 invoke 路径补 `props.reactions.print?.dispatch()`/`exportPNG?.dispatch()`（对齐 gantt.tsx:417-419），或按 Phase 1 裁决标注 @reserved；日历包内保证「ready 即有派发」或「@reserved 显式标注」二态闭合。
- [x] 22-06：graph layout prop 同步 effect（值不等才 `setLayoutMode`）+ 测试（layout 从 flow 切 hierarchy 时布局实际变化）。
- [x] scheduling/graph 包 typecheck + 测试绿。

Exit Criteria:

- [x] calendar print/exportPNG 派发（或 @reserved 标注）与注释一致；graph layout 运行时同步用例绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-{scheduling,graph} typecheck && test` 绿。

### Phase 4 - gantt 接线（22-07 + 22-10）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`（gantt-editor.tsx / gantt-grid.tsx / use-gantt-keyboard.ts / gantt.tsx / gantt-store.ts）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] 22-10：re-seed effect（gantt.tsx:79-101）补 zoomLevels/cellWidth/taskBarHeight 配置字段同步（taskBarHeight/zoomLevels 需先在 `gantt-store.ts` 补 setter）+ 测试（运行时改 prop → store 更新）。
- [x] 22-07：按 Phase 1 裁决——默认新增 onTaskEdit schema 事件（gantt.types.ts 事件契约 + scheduling-renderer-definitions.ts + gantt-editor 保存 / gantt-grid 行内提交 / use-gantt-keyboard Delete 三处派发，带全量 ctx 对齐 CX-12），或 design doc 显式声明「编辑变更不对外派发」。
- [x] gantt 测试扩展 + scheduling 包 typecheck/test。

Exit Criteria:

- [x] gantt 配置同步用例绿；onTaskEdit（或文档声明）三路径闭合；gantt design.md 与 live 一致。
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && test` 绿。

### Phase 5 - 文档同步与收口

Status: completed
Targets: `docs/components/{kanban,gantt,calendar,graph}/design.md`、`example.json`、`docs/logs/`

- Item Types: `Fix | Proof`

- [x] kanban/gantt/calendar/graph design.md 事件契约/句柄/ownership 描述与 live 实现逐一对齐（含 22-08 @reserved、22-07 契约、22-05 派发或 @reserved、22-12 句柄清单）；`docs/components/kanban/example.json` `component:addCard` 用法同步。
- [x] 全仓 grep 复验 phantom 清零（`columnsOrder` 仅 design.md @reserved 语境；`component:addCard` 有注册）。
- [x] daily log 收口记录。

Exit Criteria:

- [x] design.md 契约描述 ↔ live 代码无 phantom 漂移（grep 可复现）；受影响 e2e（c9-host-surfaces 等）零新增失败。
- [x] daily log 记录裁决表与验证结果。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh session（task `ses_0285ef8e6ffejMwT5tyOYDf3Lo` 轮 1 + `ses_02855dd2effe6jFbWBTvDVcgpE` 轮 2）
- Verdict: pass（两轮：轮 1 Major「example.json 路径错误」+ 5 Minor，已全部修订；轮 2 复审 pass，0 Blocker / 0 Major，3 Minor 已处理）
- Rounds: 2
- Findings addressed: Major-1 example.json 路径改为 `docs/components/kanban/example.json`（全文件 6 处）；Minor-1 kanban 守卫清单补 :366 + 契约注释 :52-55；Minor-2 keyboard Delete 块 :100-114；Minor-3 gantt-store.ts 无 taskBarHeight/zoomLevels setter（补 store Targets + baseline 说明）；Minor-4 design.md :128/:131/:227-229；Minor-5 calendar.test.tsx:282-294 + Phase 2 Targets 补 scheduling-renderer-definitions.ts

## Closure Gates

- [x] 7 条发现全部裁决并落地（实现 or @reserved 文档降级），phantom 契约清零
- [x] 全部「实现」项回归测试绿（onColumnAdd 守卫、component:\* 可解析、print/exportPNG 派发、graph layout 同步、onTaskEdit、gantt 配置同步）
- [x] design.md/example.json 与 live 代码双向一致
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响的 owner docs 已同步（kanban/gantt/calendar/graph design.md + example.json + daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### columnsOrder\* 三态完整实现（若 22-08 裁决为 @reserved 文档降级）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 列排序随 boardData（kanbanStatePath）整体 scope-owned 已覆盖持久化需求；独立 columnsOrder 三态是超前面增强，design.md 标注 @reserved 后不构成误导
- Successor Required: `no`
- Successor Path: n/a

### gantt 编辑事件若裁决为文档声明（22-07 备选）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 若 Phase 1 裁决「编辑变更不对外派发」为文档化契约（design.md 显式声明），则非缺口；默认裁决为实现 onTaskEdit
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- 审计文档 22-04/22-05/22-06/22-07/22-08/22-10/22-12 条目修复后回写 fixed。
- `docs/audits/per-component/{kanban,gantt,calendar}.md` 卡 dim 17 文档漂移结论若受影响，同步更新留痕。
- 05-xx useScopeSelector 门控 + 其余 P2 条目登记后续轮次。

## Closure

Status Note: 2026-08-07 收口——7 条发现全数裁决落地（22-04/22-05/22-06/22-07/22-10/22-12 实现 + 回归测试 16 条先红后绿；22-08 @reserved 文档降级，全仓 grep 零代码命中）；5 Phase 全 completed；scheduling 864/864、graph 45/45 单测绿；全量 typecheck/build/lint/test 绿（`pnpm check` 仅 14 个既有 pre-existing oversized 登记文件零新增）；design.md/example.json 与 live 双向一致；closure-audit 独立 fresh session pass 后关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session（task `ses_0274fe9a6ffeU6sohpRW8oaWO6`，不复用执行上下文）
- Evidence: 逐条 live 核对 7 发现（22-04 kanban-board.tsx:429-431 守卫 / 22-05 calendar.tsx:232,240 dispatch / 22-06 graph-renderer.tsx:330-335 同步 effect / 22-07 gantt.tsx:281,481-483,532-534 三路径 / 22-08 design.md @reserved + packages grep 零命中 / 22-10 gantt.tsx:82-140 配置同步 / 22-12 kanban-handle.ts 注册 + 7 contracts）；fresh 复跑 scheduling 864/864 + graph 45/45 + 受影响 e2e 43 passed 零失败；plan 文本一致性（Phase 全 completed、checklist 全勾、Deferred 分类诚实）；1 条 Minor（roadmap 22-10 残留重复 `[ ]` 行）已由执行 session 清除。Verdict: **approved**。

Follow-up:

- 无剩余 plan-owned work。05-xx useScopeSelector 门控 + 其余 P2 条目（02-xx/04-01/09-xx/10-xx/11-xx/12-xx/13-xx/18-xx/20-xx）按 roadmap 后续轮次路由。
