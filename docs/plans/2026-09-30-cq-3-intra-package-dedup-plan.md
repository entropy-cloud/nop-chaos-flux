# CQ-3 包内重复代码消除（六个包内克隆群）

> Plan Status: completed
> As-Built Note: 六 Phase 全部落地;as-built 裁定见各 Phase 回填(dialog-host 确认栏/JSDoc、replaceSheet 扩展至 clipboard/filter/search 共 25 处、array-editor 与 editor-canvas 同域保留、scheduling region 编排按 surface 保留)
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-D5、D6、D7、D8、D10、D12）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-2-core-shared-primitives-plan.md`（dialog-host surface hook 属核心包）

## Purpose

消除六个包内已逐行确认的克隆群（jscpd + diff 证据），全部为包内重构：公开导出面零变更、行为等价、既有 focused 测试零回归。总计收敛 ~1500L 克隆。

## Current Baseline

- `flux-react/src/dialog-host.tsx`：DialogView 198-399 ↔ DrawerView 401-587，handleClose（210-217↔411-418）、surfaceContext memo（219-236↔420-437）、regions 解析（237-242↔438-443）、confirmButtons（273-281↔468-476）逐行同文。差异点（留在 View 侧）：mobile 尺寸→full、drawer side→bottom、stack 锚定、DialogView 的 isTopmost 抑制块（:296-308）、`closeOnOutsideClick` vs `closeOnOutside` 两个不同 schema 字段。既有测试面充足（dialog-host 6 个 focused 文件：close-behavior 含 topmost/stackIndex、responsive 含 mobile、surface、lifecycle-contracts）。
- `spreadsheet-core/src/core/`：cell-operations 10 处内联三段式 + 6 处 `replaceSheet` 半收敛、structure-operations 4 处、sheet-operations 前 4 函数 4 处，合计 ~24 处。**已核实的关键语义**：未命中 sheetId 时 `ensureSheetCells`（document-access.ts:10-12）**throw**（`Sheet not found`，全仓零测试锁定）；`applyEditComment`（:462-464）/`applyDeleteComment`（:487-489）no-op 时**早退返回原 doc 引用**——report-designer-core `designer-core.test.ts:250`（seal 契约）与 :269（renderer short-circuit 引用追踪）证明引用身份 load-bearing；sheet-operations 的 map-only 族（applyRenameSheet/applyHideSheet/applyProtectSheet/applyFreezePanes 等）miss 时**静默 no-op**，与三段式族 throw 语义不同。
- `flux-renderers-form-advanced`：combo-renderer(630L) ↔ input-table-renderer(485L) 高度同构（itemScope/itemForm/itemValidationOwner/itemContent/itemLayout 逐行同文）；但**消费者有语义分歧**：combo 的 `handleRemove` 有 `isRemoveBlockedAt(index)` 门控（:399-401），input-table 同日早些 commit（da669de8d）已获父组件同类门控——两侧门控差异已收敛,行组件仍统一经 removeBlocked prop 接收；`array-editor` 是另一种 item 模型（ArrayEditorItem wrapper + 内嵌 id + pendingFocusRef/inputRefs 焦点管理 + syncItems 整组回写，无 itemEntries/stable keys）；`useCompositeFieldHandle` type 亦不同（'combo' vs 'input-table'）。
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

Status: completed
Targets: `packages/flux-react/src/dialog-host.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：抽 `useSurfaceView(props)`（closeOutsideField 参数吸收 closeOnOutsideClick/closeOnOutside 双字段名；confirmButtons 一并入 hook）；DialogView/DrawerView 只留布局壳与各自的 isTopmost 抑制/尺寸锚定/handleOpenChange 抑制规则
- [x] Proof：flux-react 全包 532 绿（dialog-host focused 文件在内）；两 View 间整段同文消除

Exit Criteria:

- [x] dialog-host.tsx 容器壳外无整段同文
- [x] flux-react focused 测试全绿（532）

### Phase 2 - spreadsheet-core withSheet 组合子

Status: completed
Targets: `packages/spreadsheet-core/src/core/`

- Item Types: `Proof | Fix`

- [ ] Proof：先补两条行为锁定测试（当前零锁定）：miss sheetId → throw `Sheet not found`；comment no-op → 返回原 doc 引用（身份断言）。先红或直接绿均可（锁定现状）
- [x] Proof：先补两条行为锁定测试（原零锁定）：miss sheetId → throw `Sheet not found`；comment no-op → 返回原 doc 引用（`toBe` 身份断言）——`operation-contracts.test.ts`,audit 确认真锁(实抛路径/早退路径)
- [x] Fix：**as-built 以既有私有 replaceSheet 为组合子本体**（上移 document-access.ts 导出，语义与 plan 的 withSheet 等价：fn 返回完整 nextSheet;no-op 早退由调用方 `return doc` 保持——两条锁定测试先绿钉住）；迁移 25 处内联重建（cell 10 + structure 4 + sheet 4 + clipboard 4 + filter 2 + search 1 = 25,超出 plan 三文件范围的同型站点一并收敛）；**map-only 族不迁移**（原样）
- [x] Proof：锁定测试 2 条先绿（miss→throw、comment no-op→原 doc 引用）；spreadsheet-core 279 绿 + report-designer-core 186 绿（含 seal 契约）+ spreadsheet-renderers 169 绿

Exit Criteria:

- [x] 三段式内联重建 grep 零残留（唯一 `const workbook = {` 残留在 ensureSheetCells 的数组拷贝语义内,不可用组合子表达,正当保留;组合子本体为内联 map 字面量）;map-only 族原样
- [x] 全包 + seal 契约测试绿

### Phase 3 - form-advanced array-item controller

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`（新增 array-item-controller + chrome，迁移 combo/input-table；array-editor 视分歧裁定）

- Item Types: `Proof | Fix`

- [x] Proof：分歧核实——removeWhen 门控差异在**父组件** handleRemove(保持原位未动),两个行组件均以 removeBlocked prop 接收门控结果;item 模型差异确认为 wrapper(array-editor) vs 原始值,故 array-editor 不迁
- [x] Fix：抽 `useArrayItemContext`（itemScope/itemForm/itemValidationOwner/itemContent/itemLayout 五 memo + input-table 的 registry 及微任务 dispose）与 `ArrayItemActionButtons`（dataSlot/noun 参数化 combo|input-table 双 chrome）；两消费组件迁移;**array-editor 保留**（wrapper+焦点模型,不强迁）;combo/input-table 父组件的 handleRemove 门控差异原样保留
- [x] Proof：form-advanced 全包 1144 绿（含 condition-builder 292）

Exit Criteria:

- [x] 五 memo 同文块与按钮 chrome 克隆消除（行级 memo 比较器不动）
- [x] 全包测试绿；语义分歧处零行为变更

### Phase 4 - table-renderer bridge props + commitFilters

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/`

- Item Types: `Proof | Fix`

- [ ] Proof：盘点 `use-table-controls.sort-filter-expand.test.tsx` 对 filter commit 三段（apply/search/clear）的 payload/事件序列断言强度，缺口先补
- [x] Fix：单桥对象（`const bridge: TableBodyRowsProps = {...}` + 两 Body spread——两 Body 本就共用 TableBodyRowsProps 类型,仅 virtual 消费 scrollRef）;`commitFilters(newFilters, payload)` 合并三段 scope 写入+事件尾（**执行更正一次**:handleFilter 真实签名为 (column,value,checked) 的 checkbox 语义,首版误读为 values 数组,已按原语义恢复并由 suite 拦截）
- [x] Proof：flux-renderers-data 1200 全绿；e2e probe 留待 cq-3 收口后 focused 跑（bridge 为纯 JSX 透传重构,无渲染路径变更）

Exit Criteria:

- [x] 两份钻透副本消失（单桥对象）；filter 三段合并为单管线
- [x] focused 单测绿（1200）

### Phase 5 - layout step-index 共享

Status: completed
Targets: `packages/flux-renderers-layout/src/`（新增 step-index.ts，steps/timeline 迁移）

- Item Types: `Proof | Fix`

- [ ] Proof：盘点 steps/timeline 既有测试对索引解析/ownership 的覆盖，缺口先补
- [x] Fix：抽 `step-index.ts`（clampIndex/asNumericIndex/resolveCurrentIndex/resolveFinalIndex,keyExtractor 吸收 key 差异）;**ownership hook 层保留**（steps 的 defaultValue fallback 链 vs timeline 的无激活态裁定系文档化语义分叉,不并）
- [x] Proof：layout 140 绿

Exit Criteria:

- [x] 索引函数克隆归零;测试绿（140）

### Phase 6 - scheduling shared eventCtx + regions

Status: completed
Targets: `packages/flux-renderers-scheduling/src/shared/`、barcode-input/calendar/gantt/kanban-board

- Item Types: `Fix | Proof`

- [x] Fix：`shared/scheduling-event-ctx.ts`（buildSchedulingEventCtx + `useSchedulingEventCtx`(直连 deps[scope]) + `useSchedulingEventCtxStable`(getter 经 ref 同步,保持 [] 恒等——首版 [getScope] 依赖被 gantt mount-timing 测试拦截,已修正);四处迁移;**SchedulingSurfaceRegions 不抽**:loading/empty 块与各 surface 根属性(data-slot/inert/testid)强耦合,kanban 结构亦不同,强并即行为风险——as-built 仅收敛 eventCtx 与 Skeleton 簇的共性(2 行),region 编排保留
- [x] Proof：scheduling 全包 1070 绿（含 gantt-mount-timing 对 eventCtx 恒等的锁定、CX-10/bug-83 契约断言、barcode 136 用例）

Exit Criteria:

- [x] 四处 eventCtx 构造零残留（单源 shared 模块）;region 编排按 as-built 保留(注记在位)
- [x] 全包测试绿（1070）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b39e0598，两轮）
- Verdict: 首轮 `fail`（3 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；备注：useSchedulingEventCtx 的 events 参数为示意，执行时按现状只依赖 scope 自然省略）
- Rounds: 2
- Findings addressed: M1（Phase 2 前置 miss→throw 与 no-op→原引用锁定测试 + unchanged 哨兵 + map-only 族不迁移）、M2（Phase 3 前置分歧清单 + 能力参数保持现状 + array-editor 不强迁）、M3（Test Strategy 点名真实缺口 + Phase 2/4/5 Proof 前置）；Minor 7 条全吸收

## Closure Gates

- [x] 六个克隆群全部收敛（dialog-host 同文消除；spreadsheet 25 处重建归组合子；form-advanced 五 memo+按钮单源；table 单桥+commitFilters；layout 索引层单源；scheduling eventCtx 单源）
- [x] 公开导出面零变更（新增共享模块均为包内文件，未进各包 index；knip 基线门禁在链核验——拦截并修正了 4 处内部符号误导出）
- [x] 全部 focused 测试零改动通过（新增 2 条 spreadsheet 行为锁定测试；kanban/data 的 12 个部分 mock 测试转 importOriginal 展开属 cq-2 Phase 4 同族基建承接，断言未动）
- [x] 语义分歧点（removeWhen 门控在父组件、array-editor wrapper 模型、map-only 族、ownership hook fallback 链、scheduling region 编排）零行为变更——保留裁定均在 plan 回填
- [x] owner docs：No owner-doc update required（纯内部重构，无契约变更）
- [x] 不存在被静默降级的 in-scope live defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

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

Status Note: 六 Phase 全部落地。独立 fresh-session closure audit 首轮 verdict `issues`（2 Major + 5 Minor）:M1（handleFilter payload `?? ''` 归一化偏差,audit 同时定位到 handleFilter payload 零断言的测试缺口）与 M2（三项 Proof 未闭环）已全部 remediation——keyword 原语义恢复 + payload 深断言补齐（该断言可拦截 M1 回归）+ 盘点结论回填 + 锁定测试勾选;Minor 5 条全修。聚焦复审通过后标记 completed。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_56d5c176，首轮 → remediation → 复核）
- Verdict: 首轮 `issues`（2 Major + 5 Minor，无 Blocker）→ remediation → 复核确认
- Evidence: 审计七包 focused 复跑全绿（spreadsheet-core 279 / flux-react 532 / form-advanced 1144 / data 1200 / layout 140 / scheduling 1070 / report-designer-core 186 / spreadsheet-renderers 169）;clipboard dual-site 优先级等价性、replaceSheet 25 处、export 面零变更、knip/duplicates 门禁均经独立复核;remediation 后全量 typecheck/lint/check/test exit 0。

Follow-up:

- CQ-D7 其余 5 文件零散克隆（Non-Blocking Follow-ups 既有）
- ownership/statePath 解析下沉 flux-react;removeWhen 门控语义统一需产品裁定（既有）
