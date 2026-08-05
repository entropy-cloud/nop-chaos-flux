# C9 scheduling 族逐组件审计（gantt/kanban/calendar/barcode-input）

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-scheduling/src/`（gantt/kanban/calendar/barcode-input）、`scheduling-renderer-definitions.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：4 组件注册项（type/fields/propContracts/eventContracts）与各自 schema 一致（维度 1/18）；reaction 字段（zoomIn/zoomOut/print/exportPNG/importICal/exportToICal）派发接线核对（CX-9 通道）——核对结论：gantt/calendar 的 reaction 字段（zoomIn/zoomOut/scrollToToday/scrollToTask/print/exportPNG）**未接线**（渲染器从不消费 `props.reactions`、无 ComponentHandle 注册，`component:*` 动作不可解析）；barcode-input 定义缺 `validation` contributor（校验不参与表单模型）；4 组件全部 schema 事件派发缺 `{ event, evaluationBindings, scope }` ctx（CX-10/bug-83 家族约定）——见 4 卡维度 1/7/18。
- [x] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）——`docs/audits/per-component/{gantt,kanban,calendar,barcode-input}.md`，状态 `open`。
- [x] 维度 16 假绿核查：既有测试（gantt 12/kanban 21/calendar 14/barcode 33 等）是否断言正确行为、错误路径、DOM 契约——发现假绿/弱断言：barcode `:347-365` 零断言假绿 + `:446-457` 断言名反转；calendar `:222-228,230-239` 未触发即断言；gantt 无任何交互事件派发断言；kanban 三态所有权路径零覆盖（useScopeSelector 全 mock）——均记入各卡维度 16。
- [x] 维度 17 文档核对：四组件 design.md ↔ 实现 props/行为一致性——发现多处漂移（gantt payload 命名/phantom 句柄、kanban columnsOrder\*/component:addCard phantom、calendar §12.3 未实现/nativeEvent、barcode wrap/label/type 字段/离线队列）——均记入各卡维度 17。

Exit Criteria:

- [x] 4 张审计卡产出，18 维表带 `文件:行` 证据，P0/P1/P2/P3 裁决留痕，卡状态 `open`。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/**/*.tsx`、`scheduling-renderer-definitions.ts`、`schemas.ts`

- Item Types: `Fix | Decision | Proof`

- [x] 对 Phase 1 确认的每个 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复——落地清单：
  - P0 barcode INV-1：`prepareWasm` 注入式 `WasmFetcher` + `useRendererEnv().fetcher`（`prepare-wasm.test.ts` 10 用例先红后绿）+ `src/contract-honesty.test.ts` 全包 IO 扫描。
  - P1 家族事件 ctx：4 组件 ~25 派发点补 `{ event, evaluationBindings, scope }` 第二参（gantt/kanban/calendar/barcode）+ barcode payload `type: 'scan'/'scan-error'`；单测：gantt onTaskClick / kanban onCardClick / calendar onEventClick / barcode onScan ctx 断言。
  - P1 reaction 接线：gantt + calendar `reactions[key].ready()` + `useCurrentComponentRegistry` 句柄（gantt zoomIn/zoomOut/scrollToToday/scrollToTask；calendar goNext/goPrev/goToday/setView/scrollToDate/exportToPNG/exportToPrint）+ gantt header 按钮派发 reaction。
  - P1 gantt 运行时 props 重解析（`store.parse` + `recalcLayout`）。
  - P1 barcode 表单校验 contributor（`createBarcodeInputFieldValidation`）+ `useCurrentFormError` 展示 + readOnly 守卫（scanNow/clear）+ 连续扫描 consume-once（含 open 守卫修复关闭态伪派发）。
  - P1 kanban：undo 添加列（新增 addColumn/removeColumn 命令）、render 期 setState（memo + ref + effect）、dropIndex/closestEdge（`resolveDropIndex` 纯函数）、Space/Enter 按键拆分。
- [x] 契约/定义修复（propContracts/eventContracts/schema 漂移、loadAction/reaction 接线）：test-first——`barcode-input-schemas.test.ts`（validation contributor）、`kanban-undo-stack.test.ts`/`kanban-helpers.test.ts`（undo/落点）、`gantt.test.tsx`/`calendar.test.tsx`/`kanban-renderer.test.tsx` regression 用例先于实现。
- [x] P2 低成本（≤15 分钟）项当场修复：data-slot 一致性（calendar 正常态根 / gantt region 分支 / kanban 空态根）、i18n 提取（`scheduling.gantt/kanban/calendar.*` + `flux.barcode.*` en-US/zh-CN ~40 key）、barcode 假绿测试改写（5 用例真实扫描模拟）、overlay Escape 关闭、死代码清理（calendar `_resourceOpenMap`）。其余 P2 登记卡内 backlog 归 CR（gantt editor onSave/undo 栈覆盖、kanban controlled 事件一致性、calendar loadAction 错误处理等）。
- [x] 共性缺陷裁决（Decision）：**事件派发 ctx 缺口 + reaction 字段未接线为 4 组件家族共性（CX-10/bug-83 家族模式延伸），根因在各渲染器派发点（非公共层）**——按 roadmap「自动修复机制」§7b 在当前 plan 内优先修复，事后回写插入 **CX-12**（planned 状态，closure audit 通过后一并标 done）；gantt+calendar reaction 接线同根因（渲染器不消费 `props.reactions`）并入 CX-12 覆盖范围。无结构性重构。
- [x] 每次修复后跑 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && build && lint && test`——最终 854 单测全绿、lint 0 error、typecheck/build 通过；workspace `pnpm typecheck` 32/32（跨包无破坏）。

Exit Criteria:

- [x] 本族 P0/P1 全部修复落地（`fixed-pending-closure`）；回归测试断言正确行为；受影响包验证门禁全绿。

### Phase 3 - 组合宿主真实浏览器场景 + C0 裁定项复验

Status: completed
Targets: `tests/e2e/component-lab/c9-host-surfaces.spec.ts`、`apps/playground/src/component-lab/`（lab 页 ×4，若缺）、`renderer-lab-registry.ts`、`scheduling-renderer-routes.ts`（新增，按 C6.x/C7/C8.x 先例）与 `route-model.ts`（接入）、`multi-scenario-lab-page.tsx`、`tests/e2e/component-lab/coverage-manifest-entries.ts`（+`coverage-manifest.ts`）

- Item Types: `Fix | Proof`

- [x] 补齐 4 个 lab 页（维度 18 缺口，P2 低成本裁决）+ RENDERER_LAB_REGISTRY / route 常量模块 / coverage-manifest 同步（C6.x/C7/C8.x 先例）——`gantt/kanban/calendar/barcode-input-lab-page.tsx` ×4 + `data-c9-host.ts`（198 行，4 host schema + probe 注册）+ `renderer-lab-registry.ts:230-233` + `scheduling-renderer-routes.ts`（route-model.ts:5 接入）+ coverage-manifest-entries.ts 4 条。
- [x] 新增 `tests/e2e/component-lab/c9-host-surfaces.spec.ts`：≥4 场景 programmatic DOM 断言（host-gantt-dialog/host-kanban-drag/host-cal-load/host-barcode-form）。
- [x] bug 73 模式专项检查：四组件在 dialog 内使用（scope 求值 + 事件派发不串扰）。
- [x] **C0 裁定项复验**：`gantt-bars-and-links.spec.ts:132` 隔离重跑 3 次 + 全量跑归因——确认 watch-only 或稳定化修复（若为可修复的时序断言问题，test-first 修复）。
- [x] 回归：本族相关 e2e（gantt-demo 20 + gantt-editor-and-keyboard 12 + gantt-bars-and-links + kanban-demo 7 + calendar-demo 6 + perf 三件套）+ component-lab 全量 + smoke 零新增失败。

Exit Criteria:

- [x] c9-host-surfaces.spec.ts 场景全绿（programmatic DOM 断言）；lab 页 ×4 与 route/registry/manifest 接线完成；gantt-bars-and-links:132 复验归因完成；相关 e2e 回归零新增失败。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-05.md`、`docs/backlog/component-audit-roadmap.md`（C9 行）

- Item Types: `Proof`

- [x] 全卡复查：4 卡 18 维表结论与最终代码一致（spot-check：reaction 接线 `gantt.tsx:294`/`calendar.tsx:167`、事件 ctx ~46 派发点、`store.parse`+`recalcLayout`（`gantt.tsx:91-94`）、barcode `validation: createBarcodeInputFieldValidation()`（definitions `:173`）、kanban addColumn/removeColumn undo 命令、calendar 死代码零命中、lab 页 ×4 + registry/routes/manifest 接线）；P0/P1 清零；4 卡状态 `open → closed` 流转（含各卡 Closure 节记录）
- [x] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-scheduling test` + 相关 e2e spec 全绿（scheduling 854/854；c9-host-surfaces 4/4；gantt-demo 20 + gantt-editor-and-keyboard 12 + gantt-bars-and-links 15/15×3 + kanban-demo 7 + calendar-demo 6 = 45 绿；component-lab smoke/navigation 111/111；gantt-perf/kanban-perf 3 failed 在 clean HEAD 完全同值复现 → 机器负载 pre-existing，零新增失败）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [x] daily log 记录：卡 closure 汇总、修复清单（plan 引用）、宿主场景结果、gantt-bars-and-links:132 复验结论、CX-12 插入与决策——见 `docs/logs/2026/08-05.md` C9 节。
- [x] roadmap C9 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）——**closure-audit 已 pass**（独立 fresh sub-agent session `ses_02d58a525ffe8vUs0IQnYTw0Mq`，证据见 Closure 节），roadmap C9 行 + CX-12 行已翻转 `planned → done`。

Exit Criteria:

- [x] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）——见 `docs/logs/2026/08-05.md` C9 节（closure-audit pass 证据位置标注）。

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

- [x] 4 张审计卡全部 `closed`（P0/P1 清零），18 维表结论与最终代码一致——`docs/audits/per-component/{gantt,kanban,calendar,barcode-input}.md` 全部 `closed`（Phase 4 item 1 复查证据）
- [x] 本族所有 in-scope confirmed live defects 已修复（test-first + 回归测试）——P0-1（WASM fetcher 注入）+ P1 家族（事件 ctx ~25 派发点/reaction 接线/gantt 重解析/barcode 校验 contributor/kanban undo）均落代码并带回归测试（scheduling 854/854）
- [x] 值所有权三态（calendar view/date ownership、barcode-input 表单参与）与事件 payload 契约收敛一致——barcode form 校验/写回 e2e host-barcode-form 实证；事件 ctx 解析 e2e 实证
- [x] 真实浏览器宿主场景 ≥1（含 bug 73 模式专项）programmatic DOM 断言通过——c9-host-surfaces.spec.ts 4/4（host-gantt-dialog/host-kanban-drag/host-cal-load/host-barcode-form，前三为 dialog 内 bug 73 模式）
- [x] gantt-bars-and-links:132 复验归因完成（watch-only 裁定或稳定化修复落地）——隔离重跑 15/15×3 + 全量跑 45 绿，flake 未复现
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift——deferred 三项（历史结论不重审/P2 backlog 归 CR/diff-perf 归 CV）均附 non-blocking 理由
- [x] 共性缺陷已按 roadmap §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）——CX-12 已插入 roadmap（`planned`，audit pass 后标 done），修复在 plan 内完成
- [x] 受影响的 owner docs（四组件 design.md 等）已同步到 live baseline，或明确写明 No owner-doc update required——**明确写明 No owner-doc update required**：四组件 design.md 漂移项（gantt §8.1/§8.2/§8.3/§9.0/§12.7/undoLimit/键盘焦点模型、kanban payload `card` 字段、calendar §12.3/nativeEvent/long-press 口径、barcode wrap/离线队列/降级 tooltip/reset 语义）全部留痕于各卡维度 17（`文件:行` 证据）+ 发现清单 closure 决策注释；行为以实现为准（宿主 e2e 实证），文档同步归 CR 跨族集中处理（roadmap `todo`），不阻塞本族 P0/P1 清零 closure
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——closure-audit pass（独立 fresh session 审计：4 卡 closed 复核 + 代码 spot-check 全过 + 接线验证 + 59/59 test + 32/32 typecheck + 854/854 scheduling；证据见 Closure 节）
- [x] `pnpm typecheck`——32/32 全绿
- [x] `pnpm build`——32/32 全绿
- [x] `pnpm lint`——32/32 全绿（scheduling 1 条 pre-existing 警告 0 error）
- [x] `pnpm test`——59/59 task 全绿

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

Status Note: **completed**——closure-audit PASS（独立 fresh sub-agent session，2026-08-06）+ 收尾动作完成：roadmap C9/CX-12 翻转 `planned → done`、daily log 收口证据补记（含 audit 证据位置）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-auditor（fresh session，非执行 session，未参与 plan 执行）
- Evidence:
  - 计划完整性：全文件仅 3 项未勾选（`:141` Phase 4 item 4 roadmap done 前置、`:146` Phase 4 Exit Criteria 2 daily log 收口证据、`:171` closure-audit 门禁）——均为本 audit pass 前置/后续项，其余 `- [x]` 全勾；Phase 1-3 `completed`。
  - 4 审计卡复核：`docs/audits/per-component/{gantt,kanban,calendar,barcode-input}.md` 全部 `> 状态: closed`（:3 各卡），各卡 Closure 节有 closure 记录 + 独立 closure audit 留位；host 场景均 `pass（Phase 3）`。
  - fixed 声明代码 spot-check（每族 ≥3）：gantt——`reactions[key]?.ready()`（gantt.tsx:288）+ `useCurrentComponentRegistry`（:294）+ header 派发 zoomIn/zoomOut/scrollToToday（:408-410）、`store.parse`（:91）+ `recalcLayout`（:94）、data-slot="gantt" 全分支（:369/372/383/386/399）、eventCtx 第二参（:108-110,124+）；calendar——`reactions[key]?.ready()`（calendar.tsx:159）+ `useCurrentComponentRegistry`（:167）、data-slot="calendar" 正常态根补齐（:408-415）、`_resourceOpenMap`/`_handleGroupToggle` 死代码零残留（rg 无命中）、eventCtx（:91-95）；kanban——`addColumn`/`removeColumn` undo 命令（kanban/utils/kanban-undo-stack.ts:78-131 + kanban-helpers.ts:123,151）、`resolveDropIndex`（kanban-helpers.ts:211 + use-kanban-dnd.ts:83）、空态根 `data-slot="kanban"` + `data-empty="true"`（kanban-board.tsx:415）、eventCtx（:126-130）；barcode——注入式 `WasmFetcher`（barcode-input/utils/prepare-wasm-utils.ts:18-51，无注入即抛错 :46-47）、`validation: createBarcodeInputFieldValidation()`（scheduling-renderer-definitions.ts:173）、consume-once `lastConsumedKeyRef`（barcode-scanner-overlay.tsx:143-149）、readOnly 守卫（barcode-input.tsx:67,80,105,171,238,270）。
  - 测试落地核验：`prepare-wasm.test.ts`（barcode-input/utils/）、`contract-honesty.test.ts` 存在；i18n key `scheduling.gantt/kanban/calendar.*` + `flux.barcode.*` 双语存在（flux-i18n/src/locales/en-US.ts:920-987 / zh-CN.ts）。
  - 接线验证：`tests/e2e/component-lab/c9-host-surfaces.spec.ts` 4 test（host-gantt-dialog :31 / host-kanban-drag :56 / host-cal-load :95 / host-barcode-form :125）；lab 页 ×4 存在（component-lab/renderers/{gantt,kanban,calendar,barcode-input}-lab-page.tsx）+ `RENDERER_LAB_REGISTRY`（renderer-lab-registry.ts:230-233）+ route-model.ts:229-247 + coverage-manifest-entries.ts:784-813（4 条 C9 条目）。
  - daily log：`docs/logs/2026/08-05.md` C9 节（:5-15）覆盖卡 closure 汇总、修复清单、host 场景结果、gantt-bars-and-links:132 复验结论（隔离 15/15×3 + 全量 45 绿，machine-load watch-only）、CX-12 决策。
  - roadmap：C9 行与 CX-12 行均仍为 `planned`（component-audit-roadmap.md:46,58）——planned→done 翻转留待 mission-driver 在本 audit pass 后执行，auditor 未改动。
  - 验证复跑：`pnpm test` 59/59 task 全绿（turbo cached）；`pnpm typecheck` 32/32 全绿；`pnpm --filter @nop-chaos/flux-renderers-scheduling test` **854/854** 绿。
  - 结论：无 in-scope live defect 静默降级、无 blocking finding；closure-audit 门禁勾选完成，Exit Criteria 2 / Phase 4 item 4 为 audit pass 后收尾项。

Follow-up:

- 无（roadmap C9 + CX-12 `planned → done` 翻转与 daily log 收口证据补记由 mission-driver 在 audit pass 后执行，非本 plan 缺陷 follow-up）。
