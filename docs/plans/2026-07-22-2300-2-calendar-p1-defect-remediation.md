# S17 — Calendar P1 缺陷修复

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/components/roadmap-scheduling.md` S17, `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §3, `docs/components/calendar/design.md`
> Related: `docs/plans/2026-07-22-2300-1-kanban-p1-defect-remediation.md`, `docs/plans/2026-07-22-2300-3-barcode-p1-defect-remediation.md`

## Purpose

修复 Calendar 组件 7 个已确认的 P1 缺陷（含显示 + 可操作性 + 契约漂移），使排班日历在 playground 演示态与 design 文档对齐。同时裁定 S13 修复后遗留的"日历死亡组件"（6 个组件/hook）的处置方案。

## Current Baseline

- Calendar 组件已完整注册（`scheduling-renderer-definitions.ts:111-162`），main renderer `calendar.tsx` 445 行
- S13（4 个 P0 缺陷）已于 `2026-07-22-1600-1` plan 修复：视图切换、事件宽度、月视图列数、虚拟器行定位
- 7 个 P1 缺陷全部来自 `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §3，经 3 轮独立 agent 共识确认
- 6 个日历组件/hook（`CalendarBatchScheduler`、`CalendarTimezoneSelector`、`CalendarResourceGroup`、`CalendarResourceHeader`、`useCalendarICal`、`useCalendarExport`）存在但未被主渲染器使用——自 `docs/plans/2026-07-22-2-scheduling-contract-drift.md` 起在 `watch-only residual` 状态
- 剩余 gap：

| ID         | 模块           | 一句话                                                          | 来源          |
| ---------- | -------------- | --------------------------------------------------------------- | ------------- |
| C-DISP-04  | 月份矩阵       | 邻月溢出天事件被静默丢弃（月视图列数与事件定位循环不一致）      | analysis §3.1 |
| C-DISP-05  | 时区日期       | `toISODateString`/`isToday`/`isSameDay` local/UTC getter 混用   | analysis §3.1 |
| C-OPS-02   | 拖拽创建       | pointerup 恒取 `start.date` 为 end，忽略拖过范围                | analysis §3.2 |
| C-OPS-04   | 导出接线       | `exportToPNG` 未接入 imperative handle；无 AbortSignal/并发守卫 | analysis §3.2 |
| C-OPS-07   | 无资源回退     | 合成默认资源时各 view 过滤逻辑不匹配 `'_default'`               | analysis §3.2 |
| C-OPS-08   | ownership 模型 | `viewOwnership`/`dateOwnership`/`statusPath` 声明但从不消费     | analysis §3.2 |
| C-DRIFT-01 | 事件源字段     | design 写 `data` 但实现/definitions/demo 全用 `events`          | analysis §3.3 |

## Goals

- 修复所有 7 个 Calendar P1 缺陷
- 裁定日历死亡组件/hook 的处置（移除保留或接线使用；`useCalendarExport` 在 Phase 2 已接线，其余 5 个待裁定）
- 为每个 P1 修复加上 focused 单测或修正断言
- 达成 `pnpm typecheck && pnpm build && pnpm lint && pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿

## Non-Goals

- 不处理 P2/P3 项（冲突检测 bug、跨日线单位、星期格 data-slot——详见 Deferred But Adjudicated）
- 不实现 design §12.3 完整的 CalendarResourceGroup 能力（嵌套层次、展开/折叠 scope 持久化）
- 不增加 E2E 测试
- 不为死亡组件接线（若裁定"保留"，则维持现状；接线属 feature 工作，单独计划）

## Scope

### In Scope

- Calendar main renderer `calendar.tsx`、month-view/week-view/day-view
- `utils/calendar-layout-utils.ts`、`utils/calendar-date-utils.ts`
- `hooks/use-calendar-drag-create.ts`、`hooks/use-calendar-export.ts`
- `hooks/use-calendar-state.ts`（ownership 模型落地）
- `calendar.types.ts`/`calendar.tsx` 事件源字段修正
- 对应 focused 单测

### Out Of Scope

- 三视图完整性核对（月视图是 P0 范畴，已修；周/日视图的 P2 冲突检测不在此 plan）
- `CalendarResourceGroup` 功能性接线（死组件裁定后若需接线，属新 feature plan）
- iCal 导入导出（`useCalendarICal` 属死亡组件；裁定保留则维持现存代码与测试，但不在本 plan 接线）

## Failure Paths

不适用——纯内部缺陷修复，不涉及外部 API/鉴权/集成。

## Test Strategy

档位选择：`必须自动化`

原因：analysis §3 每个 P1 有明确 live code path；已有测试覆盖但断言弱。必须增加 focused 测试确认修复。

## Execution Plan

### Phase 1 — 时区日期运算 + 事件源字段 + 无资源回退

Status: completed
Targets: `utils/calendar-date-utils.ts`, `calendar.tsx`, `calendar-month-view.tsx`, `calendar-week-view.tsx`, `calendar-day-view.tsx`, `utils/calendar-layout-utils.ts`

- Item Types: `Fix | Fix | Fix`

- [x] C-DISP-05: `toISODateString`/`isToday`/`isSameDay` 统一使用 `getUTC*` 方法；补非 UTC 时区测试（如 UTC+8 的 `toISODateString` 行为）
- [x] C-DRIFT-01: `calendar.tsx` 从 `resolved.events` 读事件数据；definitions 中 `source` 字段说明改为 `events`；更新 `docs/components/calendar/design.md` §4 数据源字段从 `data`→`events`
- [x] C-OPS-07: 合成默认资源 `displayResources=[{id:'_default'}]` 时，归一化各 view 过滤逻辑，使 `undefined`/`'_default'`/`''` 均匹配

Exit Criteria:

- [x] `toISODateString('2026-07-22T00:00:00Z')` 在 UTC+8 时区返回 `'2026-07-22'`
- [x] 默认非 UTC 时区 CI 测试覆盖
- [x] 不传 `events` 字段按 design 旧路径 `resolved.data` 有至少 warning（向后兼容）
- [x] `{type:'calendar',events:[...]}`（无 resources）在三视图中都显示事件

### Phase 2 — 邻月溢出天事件 + 拖拽创建范围 + 导出接线

Status: completed
Targets: `utils/calendar-layout-utils.ts`, `hooks/use-calendar-drag-create.ts`, `hooks/use-calendar-export.ts`, `calendar.tsx`

- Item Types: `Fix | Fix | Fix`

- [x] C-DISP-04: `positionEventsInMonth` 遍历与渲染相同的 `days`（配 C-DISP-02/P0 修过的当月天数矩阵）
- [x] C-OPS-02: `confirmCreate` pointerup 取 `currentDate` 为 end，取 min/max；补对应测试
- [x] C-OPS-04: `useImperativeHandle` 设置 `CalendarHandle.exportToPNG`；加 AbortSignal + `exportingRef` 守卫；补 focused 测试

Exit Criteria:

- [x] 跨月多日事件在边界处完整显示
- [x] 拖拽创建事件能跨多格，end≠start 且 ≥start
- [x] `CalendarHandle.exportToPNG` 可被调用且含并发守卫

### Phase 3 — Ownership 模型落地 + 死亡组件裁定

Status: completed
Targets: `calendar.tsx`, `hooks/use-calendar-state.ts`, `schemas.ts`, `utils/calendar-layout-utils.ts`, dead components

- Item Types: `Fix | Decision | Proof`

- [x] C-OPS-08: 实现 `viewOwnership`/`dateOwnership` 三层模型（local/controlled/scope）；`viewStatePath`/`dateStatePath` 接 scope state；`view` 仅作初值（`viewOwnership:'local'` 默认）
- [x] 死亡组件裁定：对 `CalendarBatchScheduler`、`CalendarTimezoneSelector`、`CalendarResourceGroup`、`CalendarResourceHeader`、`useCalendarICal` 逐组件做 Decision（`useCalendarExport` 已在 Phase 2 C-OPS-04 接线到 imperative handle，排除出死亡裁定范围）：
  - 检查各组件/hook 的测试完整性
  - 若组件符合 design 契约且无 branch/feature flag 计划，保留并记录 `watch-only residual` 升级为 `explicit maintain`
  - 若检测到明显的 dead test（测试了未接线组件），用 `@deprecated` 标记或移至 `__deprecated__` 子目录
- [x] `docs/components/calendar/design.md` §7 同步 C-OPS-08 ownership 模型接线记录（事件源字段修正已在 Phase 1 完成）

Exit Criteria:

- [x] 视图切换在 `viewOwnership:'local'` 下正常工作并持久化到 scope state
- [x] 各死亡组件的裁定结论写入本 plan 的 Deferred But Adjudicated（或 `docs/architecture/flux-runtime-module-boundaries.md` 等架构文档）
- [x] `docs/components/calendar/design.md` §7（ownership 模型）已同步到当前实现（§4 data→events 已在 Phase 1 完成）

## Draft Review Record

> 由独立子 agent 在起草后 review 填写。

- Reviewer / Agent: fresh sub-agent (current session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major: Phase 3 death component adjudication no longer includes `useCalendarExport` (revived in Phase 2 C-OPS-04)
  - Major: Phase 3 design doc sync scoped to §7 ownership only (phase 1 already handles §4 event source field)

## Closure Gates

- [x] 所有 7 个 Calendar P1 缺陷已修复（Phase 1-3 exit criteria 全勾）
- [x] 死亡组件裁定结论已记录（保留/标记/移除），无模棱两可的"先留着"
- [x] 必要 focused verification 已完成（每个修复项对应单测确认行为，含非 UTC 时区覆盖）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] 受影响 owner docs 已同步（`docs/components/calendar/design.md` §4 和 §7）
- [x] 由独立子 agent 执行的 closure-audit 已完成并记录证据（fresh sub-agent session: MISSION_DRIVER closure audit）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test`

## Deferred But Adjudicated

### Calendar P2/P3 残留（C-DISP-06/07/08/09, C-OPS-03/05, C-DRIFT-02/03/04/05/06）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 7 个 P1 修复后 Calendar 在默认配置下可用：三视图显示正确、视图切换正常、事件渲染不变形、导出可用、无资源场景有 fallback。P2/P3 项（冲突检测误报、跨日线 SVG 单位、星期格 data-slot 污染、print/drag ghost CSS 细节）不影响演示态的正确性。
- Successor Required: `no`

### Calendar 死亡组件（6 组件/hook，useCalendarExport 已复活接线，其余 5 个裁定见下）

- Classification: `explicit maintain`
- **裁定结论**：5 组件/hook 均保留并标记 `@deprecated`（unwired），代码与测试完整，符合 design 契约。在 `calendar/index.ts` 和各组件源文件添加了 `@deprecated` JSDoc，说明 unwired 原因及对应 design 章节。不转入 `__deprecated__` 子目录（完整实现，仅未接线，非死代码）。
- 接线属于 feature 级工作（wire-to-main-renderer），需单独计划，超出当前 P1 收口范围。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无——所有 in-scope P1 项均需在本 plan 落地；P2/P3 及死亡组件已移入 Deferred But Adjudicated

## Closure

Status Note: 所有 7 个 Calendar P1 缺陷确认修复，三视图显示正确、视图切换正常、事件渲染不变形、导出可用、无资源场景有 fallback。死亡组件裁定完成（5 组件标记 @deprecated，useCalendarExport 已接线）。独立子 agent closure 审计通过。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session (MISSION_DRIVER closure audit)
- Evidence: Live repo audit via grep/glob/read — 全部 Phase exit criteria 逐条验证通过:
  - Phase 1: `toISODateString` 使用 `getUTC*` 方法；`resolved.data` 向后兼容 `console.warn`；`_default` 资源回退逻辑在三视图中一致
  - Phase 2: `positionEventsInMonth` 遍历与渲染相同的 `days`；`confirmCreate` 使用 min/max 支持跨格拖拽；`useImperativeHandle` 暴露 `exportToPNG` 含 AbortSignal + `exportingRef` 并发守卫
  - Phase 3: 三层 ownership 模型 (local/controlled/scope) 正确实现并接入 scope.merge()；5 死亡组件有 `@deprecated` JSDoc；design.md §7 与实现一致
  - 全量验证: `pnpm typecheck` 56/56, `pnpm build` 30/30, `pnpm lint` 0 errors, `pnpm test` 8203/8203 全绿

Follow-up:

- 无剩余 plan-owned work
- P2/P3 项（冲突检测误报、跨日线 SVG 单位、星期格 data-slot 污染等）已裁定为 `watch-only residual`，不影响演示态正确性
- 死亡组件接线属 feature 级工作，需单独 plan
