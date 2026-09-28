# 2026-09-29-1 scheduling 渲染器性能优化

> Plan Status: active
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-P2/P3/P6/P7/P8/P9/P18/P20-gantt-shift/P20-kanban-surface）
> Related: 2026-09-28-5（scheduling token 化，已收口）

## Purpose

收口 flux-renderers-scheduling（calendar/kanban/gantt）在第一轮未被 perf 审计的性能热点：拖拽 tick 全板重渲染、整板深拷贝、日历 O(R×D×E) 冲突检测、gantt 全量 header/CPM 重算。结果面 = scheduling 包的交互路径在中等规模数据（数百事件/卡片/任务）下不再有 O(n²)/全量级每帧成本。

## Current Baseline

- `packages/flux-renderers-scheduling/src/` 2026-09-28 完成视觉 token 化（gray-\* → 语义 token），未做过 perf 审计。
- kanban：`kanban-column.tsx`/`kanban-card.tsx` 无 React.memo（grep 0 命中）；drop-state 板级（`use-kanban-dnd.ts:134-143` → `kanban-board.tsx:640-641`）；`kanban-helpers.ts:3-5` 全部变更走 `structuredClone(board)`；`kanban-board.tsx:450-480` surface ref effect 无 deps。
- calendar：`calendar-month-view.tsx:71-84` conflictMap 三重循环内联组件体；`:105-107` 展开时第二遍全量 `positionEventsInMonth`；`use-calendar-drag.ts:106-133` pointermove 每次两次 setDragState；`calendar-layout-utils.ts:78-89` comparator 内 parseISODate；`splitMultiDayEvents` 每 render 两遍（:69+:346）；每 cell `toLocaleDateString` 新建 Intl（:259）。
- gantt：`gantt-timescale.tsx:14-37`/`gantt-cellgrid.tsx:20-46` 全量 scale cells 无窗口化；`smartScaling`（`scale.ts:130-162`）仅导出零调用；`gantt.tsx:470` 每 render 重跑 CPM；`gantt-store.ts:215-231` updateTask 触发 3 次顺序全 Map setState；BFS `Array.shift`（`gantt-tree-utils.ts:62`、`cpm.ts:67`）。
- 虚拟化先例：`gantt-grid.tsx:44-50`（padding rows）、`use-kanban-virtualizer.ts`/`use-calendar-virtualizer.ts`（per-pane）。
- 既有测试：scheduling 108 文件/1046 用例全绿（2026-09-28 基线）。

## Goals

- kanban 拖拽 hover tick 成本收敛到单个悬停列（列/卡 memo + 回调稳定化 + 板级派生 memo 化）。
- kanban 结构性变更从整板 structuredClone 改为结构共享拷贝。
- calendar month view 冲突检测/事件定位从 O(R×D×E) 降为按 (resource,date) 桶的一次性预计算；拖拽 ghost 不再逐帧重渲染网格。
- gantt timescale/cellgrid 按 `smartScaling` 可见窗口渲染；CPM 按 revision 缓存；updateTask 三次 setState 合一；BFS 去 shift。
- 行为零回归：全部既有 scheduling 测试保持绿，新增 focused 单测证明成本路径。

## Non-Goals

- gantt 条/网格的进一步视觉改动、calendar 打印样式（watch-only 遗留）。
- kanban/calendar pane 虚拟化的新增（已有 hook 在位，非本轮 finding）。
- scheduling 包以外任何文件。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/kanban/**`（memo、dnd state 结构、helpers 结构共享、surface ref deps）
- `packages/flux-renderers-scheduling/src/calendar/**`（冲突预分组、单遍定位、drag ghost、日期工具）
- `packages/flux-renderers-scheduling/src/gantt/**`（timescale/cellgrid 窗口化、CPM 缓存、updateTask 合并、BFS）

### Out Of Scope

- `flux-renderers-scheduling` 之外的包；schema 面/props 兼容性变更。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| kanban-drag-across-columns | 拖卡跨列悬停 | 仅悬停列重渲染；drop 语义与现状一致 | 是 | 无 |
| calendar-expand-cell | 展开任一日 cell | 事件定位单遍完成，冲突标记不变 | 是 | 无 |
| gantt-window-scroll | 横向滚动大跨度时间轴 | header/cellgrid 仅渲染可见窗口，滚出窗口无残留 DOM | 是 | 无 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（性能优化，行为契约不变）。每个 phase 附 focused 单测：memo 生效断言（渲染计数）、结构共享断言（未触碰列引用不变）、窗口化断言（渲染 cell 数 ≤ 窗口 + overscan）、CPM 缓存断言（选中点击不重算）。无鉴权/对外契约，不选必须自动化。

## Execution Plan

### Phase 1 - kanban 拖拽成本与整板拷贝

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/`

- Item Types: `Fix`、`Proof`

- [ ] KanbanColumn/KanbanCard 包 React.memo；传参回调（filterCardFn、handlers）latest-ref/useCallback 稳定化（list-renderer handleSelect 先例）。**顺序约束**：先完成回调稳定化，再收口 surface ref effect——`kanban-board.tsx:438-439` 的无 deps effect 是有意的 latest-mirror（句柄 invoke 经镜像间接调用），先加 deps 会拿到过期闭包
- [ ] 列内派生（`cardIndexMap` :97、`filteredCards` 三段 filter 链 :102-123）随 React.memo 在列 scope 收敛；板级派生仅 `collectAllTags`（:231）与 `wipOverLimitColumns`（:237-242）memo 化
- [ ] `cloneBoard` 结构共享：仅复制 root.children + 源/目标列 children + 被移动条目（changeCard/addCard 等同理最小拷贝）
- [ ] kanban surface ref effect 在回调稳定化之后补 deps（或 latest-ref），消除每 render 重建
- [ ] focused 测试：memo 渲染计数断言（hover 非目标列零重渲染）、结构共享引用断言、拖拽语义回归
- [ ] Proof: kanban 全部既有用例绿

Exit Criteria:

- [ ] kanban-column/card memo 生效有渲染计数测试；非悬停列 hover tick 零重渲染断言成立
- [ ] moveCard/moveColumn 后未涉及列的数组引用与旧板相同的结构共享测试成立
- [ ] scheduling 包 focused 测试绿（含全部既有 kanban 用例）

### Phase 2 - calendar 冲突检测与拖拽

Status: planned
Targets: `packages/flux-renderers-scheduling/src/calendar/`

- Item Types: `Fix`、`Proof`

- [ ] events 按 (resourceId, date) 预分组（复用 splitMultiDayEvents/groupEventsByResourceDate），conflictMap 按桶计算，消除组件体内三重循环
- [ ] 展开 cell 场景合并为单遍 positionEventsInMonth（消除 ：105-107 双遍）
- [ ] drag ghost 改 ref 直改 transform（use-gantt-drag 先例），pointermove 不再整树 setDragState 重渲染网格。**消费者覆盖**：drop-target 高亮链路（`calendar.tsx:370-396` 基于 `dragSwap.dragState` 的 effect 设置 data-drop-target/drag-ok/drag-conflict + `:547-557` ghost 读 currentX/currentY）必须一并迁移到 ref/DOM-direct 路径，或保留低频 cell-crossing 状态更新并相应收窄断言（`calendar-drag-drop-visual.test.tsx` 固化了视觉契约，迁移不完整会被它拦下）
- [ ] 次级：排序前预计算 epoch（去 comparator 内 parseISODate）、splitMultiDayEvents 单遍、Intl.DateTimeFormat 按 locale 提升
- [ ] focused 测试：冲突标记结果与旧实现一致（等价性用例）、ghost 拖拽时网格组件渲染计数断言
- [ ] Proof: calendar 全部既有用例绿

Exit Criteria:

- [ ] 冲突检测等价性测试成立（预分组结果与全量 filter 结果一致）
- [ ] 拖拽 pointermove 期间 month grid 重渲染计数为 0 的测试成立
- [ ] calendar focused 测试绿（含既有用例）

### Phase 3 - gantt 窗口化与重算收敛

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/`

- Item Types: `Fix`、`Proof`

- [ ] `smartScaling` 接入 gantt-timescale/gantt-cellgrid：仅渲染可见窗口 cells（offsetX 对齐）。**前置**：当前 `store.setScrollLeft`（gantt-store.ts:149）只写私有字段无通知，timescale/cellgrid 仅订阅 layoutRevision/treeRevision——需先接一条 scroll 事件驱动的 revision/state 通道（滚动节流）
- [ ] CPM 结果按 (taskRevision, linkRevision) 缓存；选中点击零重算断言
- [ ] updateTask 的三次 setState（levels/branch/source-target）合并为一次提交；computeCoordinates/links clone 维持行为不变前提下评估收敛
- [ ] BFS 去 Array.shift（head 指针）
- [ ] focused 测试：窗口化 cell 数上限断言、CPM 缓存断言、单次 setState 提交断言
- [ ] Proof: gantt 全部既有用例绿

Exit Criteria:

- [ ] timescale/cellgrid 渲染 cell 数 ≤ 可见窗口 + overscan 的测试成立；滚动换窗无残留
- [ ] 选中变更不触发 CPM 重算的测试成立
- [ ] updateTask 单次 store 通知的测试成立
- [ ] gantt focused 测试绿（含既有用例）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 4 Minor 全部折入正文——① surface ref effect 必须在回调稳定化之后收口（:438-439 latest-mirror 语义）；② drag 高亮链路（calendar.tsx:370-396/:547-557）纳入 ghost 迁移范围否则断言不可达；③ smartScaling 需先接 scroll→revision 通道（setScrollLeft 无通知）；④ cardIndexMap/filteredCards 为列级派生（随列 memo 收敛），板级仅 collectAllTags/wipOverLimitColumns

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本 plan 为性能优化，无 live defect；finding 均为热点）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（不适用，无契约变更）
- [ ] 行为/契约结果已达成（scheduling 交互行为与现状语义一致，等价性测试证明）
- [ ] 必要 focused verification 已完成（各 Phase focused 测试）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（执行期如出现无法落地项，在此逐条裁定）

## Non-Blocking Follow-ups

- kanban/calendar pane 虚拟化为独立优化项，不阻塞本 plan（已有 hook 基础设施）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立审计>>
- Evidence: <<待填>>

Follow-up:

- <<待填或 no remaining plan-owned work>>
