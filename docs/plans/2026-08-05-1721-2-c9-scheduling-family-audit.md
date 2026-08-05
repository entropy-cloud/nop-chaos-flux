# C9 scheduling 族逐组件审计（gantt/kanban/calendar/barcode-input）

> Plan Status: active
> Mission: component-audit
> Work Item: C9
> Last Reviewed: 2026-08-05
> Source: `docs/backlog/component-audit-roadmap.md`（C9 Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`、`docs/logs/2026/08-04.md`（C0 e2e 裁定 + C6.3/C6.4 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C7/C8.x（`2026-08-05-1314-*`）/ C8.3（`2026-08-05-1721-1`）并行独立（均只依赖 C0）。前置基础：scheduling 包历史多轮密集审计（2026-07 全月 A0-A6 + 时区/契约/质量/性能 remediation，P0/P1 已闭包）——本轮按 roadmap C9 Phase Details 定位为**增量审计**：组件卡回填 + 组合宿主场景（dialog 内 gantt/kanban/calendar 等）+ DOM 契约回填，不重跑全量维度

## Purpose

对 `flux-renderers-scheduling` 族 4 个组件（gantt/kanban/calendar/barcode-input）完成增量 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（**calendar viewOwnership/dateOwnership/statusPath 状态分层、gantt 交互态/编辑态受控、barcode-input 表单参与与写回、kanban collapsedStatePath**）、5 DOM 契约（根 marker 类 nop-gantt/nop-kanban/nop-calendar/nop-barcode-input + data-slot/data-state/data-testid）、7 事件与 action 契约（**gantt/kanban/calendar 事件 payload shape 与 eventContracts 一致、loadAction 接线**）、12 组合宿主场景（**gantt/kanban/calendar 在 dialog 内使用、barcode-input 在 form 内扫描、bug 73 模式专项**）、18 注册/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——覆盖缺口核查**、barcode 摄像头/扫码为浏览器 API 非网络 IO 裁定）。

## Current Baseline

- **组件与文件**：`gantt.tsx`（355 行）+ `gantt-*` 子模块（bars/cellgrid/editor/grid/header/interactions/layout/links/markers/store/timescale/tree-utils/undo-stack 等）、`kanban-board.tsx`（497 行）+ `kanban-*`（column/card/column-header/dnd helpers）、`calendar.tsx`（432 行）+ components/hooks/utils、`barcode-input.tsx`（297 行）+ `barcode-scanner-overlay.tsx`。
- **注册定义**：`scheduling-renderer-definitions.ts`（174 行）——gantt `:11`（defaultSchema `{ type: 'gantt' }`；fields：tasks/links/resources/assignments/columns/zoom 系/draggable/editable/linkable prop + taskBar/toolbar/editor/empty/loading region + onTaskClick/onTaskDoubleClick/onTaskDragEnd/onLinkClick/onLinkDragEnd/onEmptyCellClick/onZoomChange/onScroll/onMount/onUnmount event + zoomIn/zoomOut/scrollToToday/scrollToTask reaction）、kanban `:58`（defaultSchema `{ type: 'kanban' }`；fields：data/configMap/columnsConfig/filter 系/columnDraggable/draggable/wipStrict/collapsedStatePath prop + columnHeader/columnHeaderToolbar/cardTemplate/columnFooter/empty/loading region + onMount/onUnmount/onCardMove/onCardClick/onColumnReorder/onColumnClick/onCardAdd/onCardRemove/onColumnAdd event）、calendar `:105`（defaultSchema `{ type: 'calendar', view: 'month' }`；fields：view/date/events/resources/firstDayOfWeek/showWeekends/maxConcurrent prop + eventTemplate/loading/empty/body region + onEventClick/onDateChange/onViewChange/onEventChange/onEventCreate/onBatchSchedule/onImport/onImportError/onTimezoneChange/onGroupToggle/onMount/onUnmount event + viewOwnership/viewStatePath/dateOwnership/dateStatePath/locale/statusPath prop + print/exportPNG/importICal/exportToICal reaction + loadAction event）、barcode-input `:162`（defaultSchema `{ type: 'barcode-input', name: 'barcode' }`；fields: barcodeInputFieldRules；wrap: false）。**注意 gantt/calendar 的 `kind:'reaction'` 字段（zoomIn/zoomOut/print/exportPNG 等）——CX-9 反应式结果捕获通道（completed，C4.2）后需核对 reaction 派发是否接线**。
- **schema 类型**：`schemas.ts` GanttSchema/KanbanSchema/CalendarSchema/BarcodeInputSchema 均存在；`barcode-input/barcode-input-schemas.ts`（fieldRules）。
- **设计文档**：`docs/components/{gantt,kanban,calendar,barcode-input}/design.md` + `example.json` 均存在（gantt 另有 design-editor/design-export/design-filter-sort-group/design-multi-select-batch/design-responsive；calendar 另有 design-batch-scheduling/design-conflict-detection/design-export/design-ical）。
- **playground**：`gantt-demo.tsx`/`kanban-demo.tsx`/`calendar-demo.tsx`/`barcode-demo.tsx` + perf-scale demo 页存在；**4 组件均无 component-lab lab 页**（`component-lab/renderers/` 无 gantt/kanban/calendar/barcode 条目——维度 18 缺口待核对）。
- **既有单测**：`gantt.test.tsx`（12 用例）+ `gantt-components.test.tsx` + `gantt-editor.test.tsx` + `gantt-interactions.test.tsx` + `gantt-interactions.integration.test.tsx` + `gantt-store.test.ts` + `gantt-store-proof.test.ts` + `gantt-timezone.test.ts` + `gantt-utils.test.ts` + `gantt.create-schema-renderer.test.tsx` + `gantt.integration.test.tsx` + `undo-stack.test.ts` + `undo-isolation.test.ts`；`kanban-renderer.test.tsx`（21 用例）+ `kanban-dnd-integration.test.tsx` + `kanban-helpers.test.ts` + `kanban.create-schema-renderer.test.tsx` + `kanban.integration.test.tsx`；`calendar.test.tsx`（14 用例）+ `calendar-timezone.test.ts` + `calendar.integration.test.tsx` + `calendar.create-schema-renderer.test.tsx`；`barcode-input.test.tsx`（33 用例）+ `barcode-scanner-overlay.test.tsx`；`scheduling-renderer-definitions.test.ts` + `scheduling-boundary-narrowing.test.ts`。
- **e2e**：`gantt-demo.spec.ts`（20）、`gantt-editor-and-keyboard.spec.ts`（12）、`gantt-bars-and-links.spec.ts`（含 `:132` 拖拽时序 flake——C0 基线裁定 machine-load watch-only residual，**successor 即本 C9**）、`kanban-demo.spec.ts`（7）、`calendar-demo.spec.ts`（6）、`gantt-perf.spec.ts`（3）、`kanban-perf.spec.ts`（3）、`calendar-perf.spec.ts`（2）；本族无 `tests/e2e/component-lab/c9-host-surfaces.spec.ts`（需新增）。
- **基线**：当前基线 unit 全绿（typecheck/build/lint 32/32、test 59/59 task 全绿——C0 原始基线为 31/31 + 58/58，C7/C8.x 收口后演进为 32/32 + 59/59）；**e2e pre-existing 债务**：`gantt-bars-and-links.spec.ts:132`（bar drag resize-right changes width）为 C0 基线裁定项（machine-load 拖拽时序，隔离重跑 3/3 绿、stash HEAD 对照复现，successor C9）——**本 plan 内需复验/尝试稳定化**；`calendar-demo.spec.ts` 导航按钮 locale 问题已在 C5.1 VERIFY 修复（选择器 locale 无关化 `Next|下一个`）——本 plan 回归确认；diff-perf（CV）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{gantt,kanban,calendar,barcode-input}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——gantt/kanban/calendar 在 dialog 内使用（交互 + 事件派发）、barcode-input 在 form 内扫码写回、calendar loadAction 数据加载。
- **C0 e2e 裁定项复验**：`gantt-bars-and-links.spec.ts:132` 拖拽时序 flake 在本族内复验（隔离重跑 + 负载归因），确认是否为机器负载 watch-only 或可稳定化修复。
- roadmap C9 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C7 mobile 族（`2026-08-05-1314-1` 覆盖）、C8.x ai 族（`2026-08-05-1314-2/-3`、`2026-08-05-1721-1` 覆盖）。
- 已收口的历史 scheduling 审计结论不重审（roadmap Cross-Cutting：上轮结论不重审，只在本轮发现与新证据冲突时提交跨维度裁决）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。
- diff-perf（CV 归属）不修复。

## Scope

### In Scope

- 4 组件 × 18 维增量审计卡（维度重点：1 Schema 契约（四 Schema 与注册 fields/propContracts/eventContracts 一致、gantt zoom/reaction 字段、calendar loadAction 接线、barcode-input fieldRules）、2 RendererComponentProps 合规、3 值所有权三态（**calendar viewOwnership/viewStatePath + dateOwnership/dateStatePath/statusPath 状态分层、kanban collapsedStatePath、barcode-input 表单 value 参与与写回、gantt 交互态/编辑态受控值**）、4 表单参与（**barcode-input 为表单字段（name + 校验 + 提交参与）；gantt/kanban/calendar 非表单——核对无泄漏**）、5 DOM 与选择器契约（**根 marker 类 nop-gantt/nop-kanban/nop-calendar/nop-barcode-input + data-slot/data-state/data-testid 透传**）、6 嵌套 schema 分类（taskBar/eventTemplate/cardTemplate 等 region、无 deepFields 残留、action 分类正确）、7 事件与 action 契约（**gantt/kanban/calendar 事件 payload shape 与 eventContracts 逐字段一致、loadAction/onMount/onUnmount、reaction 字段派发（CX-9 通道核对）**）、8 a11y（gantt 网格键盘导航、kanban 拖拽可达性降级、calendar 按钮 aria-label、barcode 输入焦点）、9 i18n（**gantt/kanban/calendar 文案 key、barcode 扫描提示文案硬编码核查**）、10 四态覆盖（空/加载/错误/禁用——gantt/kanban/calendar 空态 loading 态、barcode 扫描失败态）、11 异步生命周期（**barcode 扫码 abort/竞态/重试、calendar loadAction 异步、gantt 编辑保存**）、12 组合宿主场景（**四组件在 dialog 内使用（bug 73 模式）、barcode-input 在 form 内扫描写回**）、13 样式契约（widget renderer 自样式 + marker 类、无 BEM）、14 React 19（无冗余 memo/effect 镜像、gantt 网格渲染优化）、15 性能边界（gantt 大任务列表/kanban 大卡片列表/calendar 事件网格）、16 测试质量（既有测试断言正确行为而非 not-throw、错误路径、DOM 契约断言——假绿核查）、17 文档对照（四组件 design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——覆盖缺口核查**、barcode 摄像头 getUserMedia/扫码为浏览器 API 非网络 IO（INV-1 裁定，ai-voice-input 先例）））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（gantt/kanban/calendar dialog 内使用 + barcode form 内扫描）。
- **C0 e2e 裁定项复验**：gantt-bars-and-links:132 复验归因。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C7/C8.x 组件族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- diff-perf（CV 归属）。

## Failure Paths

| 可测场景编号      | 触发                                    | 行为（含错误码）                                         | 可重试 | 用户可见表现    |
| ----------------- | --------------------------------------- | -------------------------------------------------------- | ------ | --------------- |
| host-gantt-dialog | gantt 在 dialog 内渲染 + 任务点击/拖拽  | 网格/任务渲染正确、onTaskClick 派发、dialog 内交互不崩溃 | 是     | gantt 交互正确  |
| host-kanban-drag  | kanban 在 dialog 内卡片点击/跨列拖拽    | 卡片渲染、onCardClick/onCardMove 派发、焦点不逃逸        | 是     | kanban 交互正确 |
| host-cal-load     | calendar loadAction 加载事件 + 事件点击 | 事件渲染、onEventClick 派发、加载/错误态正确             | 是     | 日历数据正确    |
| host-barcode-form | barcode-input 在 form 内扫码/手动输入   | 值写回 form、校验/提交参与、扫码失败态可重试             | 是     | 条码值正确      |
| host-gantt-flake  | gantt-bars-and-links:132 拖拽时序复验   | 隔离重跑绿；归因 machine-load watch-only 或稳定化        | 是     | 拖拽时序稳定    |

## Test Strategy

本档选择：**必须自动化** —— scheduling 族的交互契约（gantt 拖拽/缩放、kanban 拖拽、calendar 事件导航）、值所有权三态（calendar viewOwnership/dateOwnership、barcode-input 表单参与）、事件 payload 形状（onTaskClick/onCardMove/onEventClick/onDateChange 等）与 loadAction 接线是核心回归路径；barcode 扫码异步生命周期属核心路径；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck/build/lint/test` + 相关 e2e 回归（gantt-demo/gantt-editor-and-keyboard/gantt-bars-and-links/kanban-demo/calendar-demo + perf 三件套）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-scheduling/src/`（gantt/kanban/calendar/barcode-input）、`scheduling-renderer-definitions.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：4 组件注册项（type/fields/propContracts/eventContracts）与各自 schema 一致（维度 1/18）；reaction 字段（zoomIn/zoomOut/print/exportPNG/importICal/exportToICal）派发接线核对（CX-9 通道）。
- [ ] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度 16 假绿核查：既有测试（gantt 12/kanban 21/calendar 14/barcode 33 等）是否断言正确行为、错误路径、DOM 契约。
- [ ] 维度 17 文档核对：四组件 design.md ↔ 实现 props/行为一致性。

Exit Criteria:

- [ ] 4 张审计卡产出，18 维表带 `文件:行` 证据，P0/P1/P2/P3 裁决留痕，卡状态 `open`。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: `packages/flux-renderers-scheduling/src/**/*.tsx`、`scheduling-renderer-definitions.ts`、`schemas.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] 对 Phase 1 确认的每个 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复。
- [ ] 契约/定义修复（propContracts/eventContracts/schema 漂移、loadAction/reaction 接线）：test-first。
- [ ] P2 低成本（≤15 分钟）项当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因，按 roadmap「自动修复机制」§7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [ ] 每次修复后跑 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && build && lint && test`。

Exit Criteria:

- [ ] 本族 P0/P1 全部修复落地（`fixed-pending-closure`）；回归测试断言正确行为；受影响包验证门禁全绿。

### Phase 3 - 组合宿主真实浏览器场景 + C0 裁定项复验

Status: planned
Targets: `tests/e2e/component-lab/c9-host-surfaces.spec.ts`、`apps/playground/src/component-lab/`（lab 页 ×4，若缺）、`renderer-lab-registry.ts`、`scheduling-renderer-routes.ts`（新增，按 C6.x/C7/C8.x 先例）与 `route-model.ts`（接入）、`multi-scenario-lab-page.tsx`、`tests/e2e/component-lab/coverage-manifest-entries.ts`（+`coverage-manifest.ts`）

- Item Types: `Fix | Proof`

- [ ] 补齐 4 个 lab 页（维度 18 缺口，P2 低成本裁决）+ RENDERER_LAB_REGISTRY / route 常量模块 / coverage-manifest 同步（C6.x/C7/C8.x 先例）。
- [ ] 新增 `tests/e2e/component-lab/c9-host-surfaces.spec.ts`：≥4 场景 programmatic DOM 断言（host-gantt-dialog/host-kanban-drag/host-cal-load/host-barcode-form）。
- [ ] bug 73 模式专项检查：四组件在 dialog 内使用（scope 求值 + 事件派发不串扰）。
- [ ] **C0 裁定项复验**：`gantt-bars-and-links.spec.ts:132` 隔离重跑 3 次 + 全量跑归因——确认 watch-only 或稳定化修复（若为可修复的时序断言问题，test-first 修复）。
- [ ] 回归：本族相关 e2e（gantt-demo 20 + gantt-editor-and-keyboard 12 + gantt-bars-and-links + kanban-demo 7 + calendar-demo 6 + perf 三件套）+ component-lab 全量 + smoke 零新增失败。

Exit Criteria:

- [ ] c9-host-surfaces.spec.ts 场景全绿（programmatic DOM 断言）；lab 页 ×4 与 route/registry/manifest 接线完成；gantt-bars-and-links:132 复验归因完成；相关 e2e 回归零新增失败。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-05.md`、`docs/backlog/component-audit-roadmap.md`（C9 行）

- Item Types: `Proof`

- [ ] 全卡复查：4 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-scheduling test` + 相关 e2e spec 全绿；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、gantt-bars-and-links:132 复验结论、CX-n 插入（若有）与决策。
- [ ] roadmap C9 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

- [ ] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 sub-agent fresh session（2026-08-05 plan review）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major-1：Phase 2 缺「共性缺陷裁决（CX-n）」执行项、Closure Gates 缺对应门禁——按 roadmap「自动修复机制」§7 与 C7 先例补齐（已处理）
  - Minor（不阻塞）：基线数字 32/32 + 59/59 标注为 C0 实为当前基线（措辞修正）；Phase 3 Targets 补 scheduling-renderer-routes.ts / multi-scenario-lab-page.tsx / coverage-manifest-entries.ts（先例补全）；Phase 4 workspace 全量字样已自注以 Closure Gates 为准（保留）

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`（guide `When Closing The Plan` + `Closure Audit Rule`）。

- [ ] 4 张审计卡全部 `closed`（P0/P1 清零），18 维表结论与最终代码一致
- [ ] 本族所有 in-scope confirmed live defects 已修复（test-first + 回归测试）
- [ ] 值所有权三态（calendar view/date ownership、barcode-input 表单参与）与事件 payload 契约收敛一致
- [ ] 真实浏览器宿主场景 ≥1（含 bug 73 模式专项）programmatic DOM 断言通过
- [ ] gantt-bars-and-links:132 复验归因完成（watch-only 裁定或稳定化修复落地）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 共性缺陷已按 roadmap §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs（四组件 design.md 等）已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 历史 scheduling 审计结论不重审

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap Cross-Cutting 明确"上轮结论不重审，只在本轮发现与新证据冲突时提交跨维度裁决（CR）"。
- Successor Required: `no`

### 各审计卡 P2 backlog（>15 分钟项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 自动修复机制 §2 明确 P2 高成本项登记卡内 backlog 由 CR 统一处理，不阻塞本族 P0/P1 清零的 closure。
- Successor Required: `yes`
- Successor Path: CR 跨族集中修复与裁决（roadmap `todo`，待全部 C\* 完成后执行）

### diff-perf.spec.ts 阈值项

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 基线裁定 diff-perf 200ms 阈值机器相关；C5.1 VERIFY 已校准 demo 与测试（全量渲染 + <5000ms 预算）。归属 CV 专项评估，非本族引入。
- Successor Required: `yes`
- Successor Path: CV 全量验证（含性能阈值专项）

## Non-Blocking Follow-ups

- 若 Phase 3 复验确认 gantt-bars-and-links:132 为可稳定化的时序断言问题：在 Phase 3 内修复；若为 machine-load watch-only，记录复验证据后由 CV 终检。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: 待定（mission-driver CLOSURE_VERIFY fresh session）
- Evidence: 待定

Follow-up:

- 待执行后填写。
