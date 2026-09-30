# CQ-3 包内重复代码消除（六个包内克隆群）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-D5、D6、D7、D8、D10、D12）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-2-core-shared-primitives-plan.md`（dialog-host surface hook 属核心包）

## Purpose

消除六个包内已逐行确认的克隆群（jscpd + diff 证据），全部为包内重构：公开导出面零变更、行为等价、既有 focused 测试零回归。总计收敛 ~1500L 克隆。

## Current Baseline

- `flux-react/src/dialog-host.tsx`：DialogView 198-399 ↔ DrawerView 401-587，handleClose（210-217↔411-418）、surfaceContext memo（219-236↔420-437）、regions 解析（237-242↔438-443）、confirmButtons（273-281↔468-476）逐行同文。差异点（留在 View 侧）：mobile 尺寸→full、drawer side→bottom、stack 锚定、DialogView 的 isTopmost 抑制块（:296-308）、`closeOnOutsideClick` vs `closeOnOutside` 两个不同 schema 字段。既有测试面充足（dialog-host 6 个 focused 文件：close-behavior 含 topmost/stackIndex、responsive 含 mobile、surface、lifecycle-contracts）。
- `spreadsheet-core/src/core/`：cell-operations 10 处内联三段式 + 6 处 `replaceSheet` 半收敛、structure-operations 4 处、sheet-operations 前 4 函数 4 处，合计 ~24 处。**已核实的关键语义**：未命中 sheetId 时 `ensureSheetCells`（document-access.ts:10-12）**throw**（`Sheet not found`，全仓零测试锁定）；`applyEditComment`（:462-464）/`applyDeleteComment`（:487-489）no-op 时**早退返回原 doc 引用**——report-designer-core `designer-core.test.ts:250`（seal 契约）与 :269（renderer short-circuit 引用追踪）证明引用身份 load-bearing；sheet-operations 的 map-only 族（applyRenameSheet/applyHideSheet/applyProtectSheet/applyFreezePanes 等）miss 时**静默 no-op**，与三段式族 throw 语义不同。
- `flux-renderers-form-advanced`：combo-renderer(630L) ↔ input-table-renderer(485L) 高度同构（itemScope/itemForm/itemValidationOwner/itemContent/itemLayout 逐行同文）；但**消费者有语义分歧**：combo 的 `handleRemove` 有 `isRemoveBlockedAt(index)` 门控（:399-401），input-table 没有（:213-230）；`array-editor` 是另一种 item 模型（ArrayEditorItem wrapper + 内嵌 id + pendingFocusRef/inputRefs 焦点管理 + syncItems 整组回写，无 itemEntries/stable keys）；`useCompositeFieldHandle` type 亦不同（'combo' vs 'input-table'）。
- `flux-renderers-data/table-renderer`：table-body-rows.tsx:92-124 ↔ :129-162 两份钻透（仅差 scrollRef 一项）；use-table-filter 尾巴实为**三**段同构（handleFilter:98 / handleSearch:151 / clearFilters:201）。下游 memo 边界在 `MemoizedDataRow`（table-data-row-render.tsx:26），其比较器按内容消费 `item.*` 等字段，不消费 bridge 对象——spread 透传不进入比较器输入。单测内无 render-count 用例；性能锁定在 `tests/e2e/performance-table.spec.ts`（probe delta）。CQ-D7 其余 5 文件零散克隆（table-body-row-rendering/table-editable-cell/use-table-selection/table-header-row/table-flattened-items ~272L）不在本 plan（见 Non-Goals）。
- `flux-renderers-layout`：steps:20-124 ↔ timeline:60-137（clampIndex@26/66、asNumericIndex@39/74、ownership 解析）；key 提取有差异（steps `item.value ?? item.key`，timeline 仅 `item.value`）。
- `flux-renderers-scheduling`：eventCtx 的 **payload 变换逐字相同**（四处），但 scope 来源三变体：barcode/calendar `[scope]` 直连、gantt `scopeRef.current`+`[]`（保持 eventCtx 身份稳定，其 onMount/onUnmount effect deps 含 eventCtx）、kanban `[rootScope]`。loading/empty region：calendar:435-449 与 gantt:521-541 近同文；kanban:536-548 skeleton/类名/`data-empty` 结构不同。eventCtx 形状已被 calendar/gantt/kanban 既有 `evaluationBindings` 断言锁定（docs/bugs/83 在案）。
- 测试基数：spreadsheet-core 全包 277 用例；report-designer-core `designer-core.test.ts` 25 用例（seal 契约 :250）；barcode-input 目录 136 用例；form-advanced condition-builder 292 用例。

## Goals

- 六个克隆群各自收敛为单一实现；jscpd 对应文件对克隆显著下降。
- 行为等价：各包既有 focused 测试零改动通过；语义分歧点以能力参数显式保持现状。

## Non-Goals

- 不做视觉/交互变更；不改公开导出面（新增共享模块均为包内文件）。
- 不动 table memo 比较器语义（R3-P25 已收口的 identity cache/comparator 不重写）。
- 不统一三消费者 removeWhen 门控等语义分歧（保持现状；统一属显式行为变更，另行裁定）。
- CQ-D7 其余 5 文件零散克隆、designer inspector（CQ-D11 defer）、undo 栈（CQ-D13 defer）不在本 plan。

## Scope

### In Scope

- `packages/flux-react/src/dialog-host.tsx`（+新增包内共享模块）
- `packages/spreadsheet-core/src/core/{cell,structure,sheet}-operations.ts`（map-only 族除外）
- `packages/flux-renderers-form-advanced/src/{combo-renderer,input-table-renderer,input-table-row,array-editor}.tsx` + 新 controller
- `packages/flux-renderers-data/src/table-renderer/{table-body-rows,use-table-filter}.*`
- `packages/flux-renderers-layout/src/{steps,timeline}-renderer.tsx`
- `packages/flux-renderers-scheduling/src/shared/` + 四个子视图文件

### Out Of Scope

- 跨包收敛（cq-4）；行级 memo 比较器语义；语义分歧的统一；map-only sheet 操作族。

## Failure Paths

> 纯重构，无新错误处理面。withSheet 的 miss→throw 与 no-op→原引用语义为既有行为，本 plan 以测试锁定而非变更（见 Phase 2 Proof）。

## Test Strategy

档位：**建议有测**。真正缺行为锁定的缺口：spreadsheet-core miss 分支（零测试）与 table filter commit 三段序列（断言强度未盘点）——这两处 Proof 前置；dialog-host surfaceContext 与 scheduling eventCtx 已有契约测试锁定，直接重构。

## Execution Plan

### Phase 1 - flux-react dialog-host useSurfaceView

Status: planned
Targets: `packages/flux-react/src/dialog-host.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix：抽 `useSurfaceView(props)` 承载 handleClose/surfaceContext/regions/confirmButtons 解析，DialogView/DrawerView 只留容器壳（差异：isTopmost 抑制、尺寸/锚定、两个 close 字段名留在 View 侧；confirm-bar JSX 如低于 jscpd 阈值残留则抽共享 confirm-bar 组件）
- [ ] Proof：dialog-host 6 个 focused 文件全绿；handleClose/surfaceContext/regions 脚本段 self-clone 归零（jscpd 复测）

Exit Criteria:

- [ ] dialog-host.tsx 容器壳外无整段同文
- [ ] flux-react focused 测试全绿

### Phase 2 - spreadsheet-core withSheet 组合子

Status: planned
Targets: `packages/spreadsheet-core/src/core/`

- Item Types: `Proof | Fix`

- [ ] Proof：先补两条行为锁定测试（当前零锁定）：miss sheetId → throw `Sheet not found`；comment no-op → 返回原 doc 引用（身份断言）。先红或直接绿均可（锁定现状）
- [ ] Fix：新增 `withSheet(doc, sheetId, fn)` 支持 **unchanged 哨兵早退**（fn 返回哨兵时保持输入 doc 引用身份）；迁移三段式 ~24 处；**map-only 族（rename/hide/protect/freeze 等静默 no-op 语义）不迁移**，注记区分
- [ ] Proof：spreadsheet-core 全包 277 用例绿 + report-designer-core `designer-core.test.ts` 25 用例（含 seal 契约）绿

Exit Criteria:

- [ ] 三段式重建样板 grep 零残留；map-only 族原样
- [ ] 全包 + seal 契约测试绿

### Phase 3 - form-advanced array-item controller

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/`（新增 array-item-controller + chrome，迁移 combo/input-table；array-editor 视分歧裁定）

- Item Types: `Proof | Fix`

- [ ] Proof：输出逐消费者分歧清单（combo removeWhen 门控 vs input-table 无、item 模型 wrapper vs 原始值、editor type、array-editor 焦点副作用），作为 controller 能力参数设计输入
- [ ] Fix：抽容器无关 controller，**能力参数保持各方现状**（如 `removeGating: 'blocked-check' | 'button-only'`）；combo/input-table 迁移；array-editor 的 wrapper+焦点模型若无法无损纳入则保留并注记（不强迁）
- [ ] Proof：form-advanced 全包测试绿（含 condition-builder 292 用例）

Exit Criteria:

- [ ] combo↔input-table 克隆显著下降（272L+92L → 目标 <50L）
- [ ] 全包测试绿；语义分歧处零行为变更

### Phase 4 - table-renderer bridge props + commitFilters

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/`

- Item Types: `Proof | Fix`

- [ ] Proof：盘点 `use-table-controls.sort-filter-expand.test.tsx` 对 filter commit 三段（apply/search/clear）的 payload/事件序列断言强度，缺口先补
- [ ] Fix：定义 `TableRowBridgeProps` 单一类型 + 展开透传，删除两份钻透（:92-124/:129-162）；`commitFilters(mode)` 合并三段尾巴
- [ ] Proof：table 既有套件全绿；`tests/e2e/performance-table.spec.ts` probe delta 无回归（focused 跑）

Exit Criteria:

- [ ] 两份钻透副本消失；filter 三段合并为单管线
- [ ] focused 单测绿 + performance-table e2e 绿

### Phase 5 - layout step-index 共享

Status: planned
Targets: `packages/flux-renderers-layout/src/`（新增 step-index.ts，steps/timeline 迁移）

- Item Types: `Proof | Fix`

- [ ] Proof：盘点 steps/timeline 既有测试对索引解析/ownership 的覆盖，缺口先补
- [ ] Fix：抽共享模块（`resolveCurrentIndex` 带 keyExtractor 参数吸收 steps `item.value ?? item.key` vs timeline 仅 `item.value` 差异）
- [ ] Proof：steps/timeline focused 测试全绿

Exit Criteria:

- [ ] 两文件 5 clones 108L 归零；测试绿

### Phase 6 - scheduling shared eventCtx + regions

Status: planned
Targets: `packages/flux-renderers-scheduling/src/shared/`、barcode-input/calendar/gantt/kanban-board

- Item Types: `Fix | Proof`

- [ ] Fix：`useSchedulingEventCtx(events, scopeOrRef)` 提供 **scope 稳定性策略**（gantt 传 ref 保持 `[]` deps 语义，其余传 scope 直连），四处迁移；`SchedulingSurfaceRegions` 按 surface 参数化 data-slot/类名/`data-empty`（吸收 kanban 结构差异）
- [ ] Proof：scheduling 全包测试绿（calendar/gantt/kanban `evaluationBindings` 契约断言 + barcode-input 目录 136 用例）；gantt onMount/onUnmount effect 不重挂载（既有用例锁定）

Exit Criteria:

- [ ] 四处 eventCtx payload 构造与 calendar/gantt region 块零残留（kanban region 经参数化收敛）
- [ ] 全包测试绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b39e0598，两轮）
- Verdict: 首轮 `fail`（3 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；备注：useSchedulingEventCtx 的 events 参数为示意，执行时按现状只依赖 scope 自然省略）
- Rounds: 2
- Findings addressed: M1（Phase 2 前置 miss→throw 与 no-op→原引用锁定测试 + unchanged 哨兵 + map-only 族不迁移）、M2（Phase 3 前置分歧清单 + 能力参数保持现状 + array-editor 不强迁）、M3（Test Strategy 点名真实缺口 + Phase 2/4/5 Proof 前置）；Minor 7 条全吸收

## Closure Gates

- [ ] 六个克隆群全部收敛，jscpd 对应文件对克隆显著下降或归零
- [ ] 公开导出面零变更（各包 index.ts diff 为空或纯类型增量）
- [ ] 全部 focused 测试零改动通过（新增的行为锁定测试除外）
- [ ] 语义分歧点（removeWhen 门控、item 模型、map-only 族）零行为变更
- [ ] owner docs：No owner-doc update required（纯内部重构，无契约变更）
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### CQ-D7 其余 5 文件零散克隆（~272L）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 主克隆对（钻透 + filter，~198L）已收敛；其余 5 文件为零散 36-71L 碎片，独立收敛收益低，触达时顺势处理
- Successor Required: `no`
- Successor Path: Non-Blocking Follow-ups

## Non-Blocking Follow-ups

- ownership/statePath 解析根治性下沉 flux-react（CQ-D12 长期方向，本 plan 只做包内共享）
- 三消费者 removeWhen 门控语义统一（显式行为变更，需产品裁定）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>
