# B3.3 table 高级能力边界（树/聚合/性能）

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md`（Wave B3，工作项 B3.3），`docs/components/amis-bug-driven-improvements/02-table-and-crud.md`（T11/T15/T18/T23/T24/T29 + 自 B3.1 deferred 接管的 T9/T10），`docs/components/table/design.md`，`docs/components/crud/design.md`
> Mission: amis-bug-driven-improvements
> Work Item: B3.3 table 高级能力边界（树/聚合/性能）
> Related: predecessor B3.1（`docs/plans/2026-06-26-0520-1-b31-...-plan.md`，done；B3.3 依赖 B3.1+B3.2，均 done）+ B3.2（done）；B3.1 Non-Blocking Follow-ups 显式把 T9/T10「归 B7/backlog 或 B3.3」，本计划接管。

## Purpose

把 roadmap 工作项 B3.3 收口。逐条对照 live repo 裁定并落地 `02-table-and-crud.md` 的 8 条 in-scope signal（T11/T15/T18/T23/T24/T29，外加自 B3.1 deferred 接管的 T9/T10）。三类工作交织：

- **特征缺口（Feature Gap，需裁定）**：**T11（tree-table 仅支持预加载 `children`，无 per-node lazy/on-expand fetch）**——table 树模式 `flattenTreeRows` 同步读 `record[rowChildrenField]`（`use-table-tree.ts:62`），无 `childrenSource`/on-expand 回调（grep 零命中），与 `input-tree` 的 `childrenSource` lazy（`tree-control-controllers.ts:165-264`）形成缺口。须裁定：实现 lazy-children 契约（Fix/feature）或显式 `DESIGN-ACK-NOT-IMPL` + doc（推荐后者，因本 roadmap 是「测试/文档边界债」非 feature roadmap，且 table 树模式按设计即预加载递归 flatten，见 `table/design.md:38,74`）。
- **确认的「行为正确但未验证/未文档化」（TEST-GAP / DOC-GAP）**：T24（嵌套 crud 隔离——ID 命名空间隔离 by construction，但无测试、无文档、无 id 冲突防御）、T29（hover/focus 不重渲染兄弟行——CSS-only 交互样式 + `React.memo` 行级缓存，无聚焦测试、无文档）、T15（列 resize 多次/溢出场景缺聚焦测试）、T18（summary 行运行时切列重对齐缺集成测试）、T9（fixed-left + 选择列缺组合测试）、T10（`setSelection` 跨页缺聚焦测试）。
- **已充分覆盖（确认锚）**：T23（upstream `source` 刷新传播已有测试 `data-table-pagination-selection.test.tsx:286`），补一条确认锚即可。

## Current Baseline

> 来源：2026-06-26 独立 explore 子 agent 对 `packages/flux-renderers-data/src/`（table-renderer/、crud）、owner doc 的 live-repo 审计。下列 file:line 引用均已核对。

### 逐条现状

- **T11（tree lazy-load per node）— FEATURE-GAP（feature 未实现，非 live defect）。** `use-table-tree.ts:36-109` `flattenTreeRows` 同步 `readChildren(entry.record, rowChildrenField)`（`:62`）；`handleToggleTreeExpand`（`:126-136`，于 `useTableTree` hook `:118-153` 内）仅翻本地 `Set`，**无** fetch/on-expand 回调。schema 仅 `rowChildrenField?: string`（`schemas.ts:143`），全 `flux-renderers-data` 无 `childrenSource`/`deferApi`/`hasChildrenField`（grep 零非测试命中）。对照：`input-tree`/`tree-select` 有 lazy（`childrenSource` + `loadChildren`→`executeTreeSource`，`tree-control-controllers.ts:165-264`）。测试 `table-e1c-tree-table.test.tsx` 仅覆盖预加载展开/收起。`table/design.md:38,74,202` 文档化树模式为「按字段递归 flatten 预加载 children」（`:202` 描述 `use-table-tree` 模块），**未**声明 lazy-children 所有权（`:216` 提「tree table + virtual perf 归 follow-up」）。
- **T15（列 resize 横向溢出可用 + 可多次 + clamp min/max）— ALREADY-COVERED（minor TEST-GAP）。** `use-column-resize.ts:194-195` clamp 到 `minWidth`/`maxWidth`；每次 drag 从当前 widths map 起算（`:186`，可多次）；delta-based（`:192`，与 scroll 位置无关）；容器 `overflow-x-auto`（`table-renderer.tsx:515`）。测试 `table-e1b-enhancements.test.tsx:107-156` 覆盖 clamp + 单次 drag。**缺**：连续第二次 drag（re-resize）与「溢出滚动中 resize」两个子场景聚焦测试。`table/design.md:34,67,130,213` 已文档化。
- **T18（summary 行切列后重对齐到可见叶列）— TEST-GAP（实现正确）。** `TableSummaryRowView`（`table-summary-row.tsx:62-120`）遍历传入 `columns`（`:100`，= `effectiveMainColumns`，`table-renderer.tsx:551,594`），可见列经 `tableColumns` `useMemo` 派生（`use-table-visible-columns.ts:83-90`），切列由 `toggleColumn`（`:92-126`）触发重算 → summary 响应式重对齐。测试 `table-e1b-enhancements.test.tsx:278` 证明按名对齐 + 跳缺失列；切列本身 `data-table-columns.test.tsx:182`。**缺**：summary + 运行时切列的集成断言。`table/design.md:36,69,200` 已文档化。
- **T23（upstream `source` 刷新传播到 table 行）— ALREADY-COVERED。** bare table 读 `source`（`table-renderer.tsx:160-162`）reactive；`filteredData` 为 `useMemo`（`:241-244`）。CRUD 读 `source`（`crud-renderer.tsx:101-104`）。测试 `data-table-pagination-selection.test.tsx:286`（table `source` 绑 data-source + `refreshSource` → 行刷新）、`data-crud-request-owned.test.tsx:8`。`table/design.md:167-170`、`crud/design.md:313` 已文档化。
- **T24（嵌套 crud-in-crud 隔离：刷新 A 不覆盖 B，B 分页独立）— TEST-GAP + DOC-GAP（可能 FEATURE-GAP：无 id 冲突防御）。** 每个 CRUD owner state 按 id/cid 命名空间：`createCrudOwnerPaths`→`$_crud.${id ?? cid ?? 'crud'}`（`crud-renderer-ownership.ts:54-61`），query/pagination/selection 各自独立 path。展开行内容经 `expandedRowRegionKey` region（`table-expanded-row.tsx:16`）。**风险**：隔离仅在嵌套 crud 有 distinct id/cid 且不复用父 `$crud` 绑定时成立；无 id 冲突防御 guard。**无**嵌套 crud 测试（grep 零命中）。`crud/design.md` 文档化单 crud 所有权（§7），**未**文档化嵌套 containment / id-uniqueness 契约。
- **T29（hover/focus 单元格不重渲染兄弟行）— ALREADY-COVERED for 字面信号（TEST-GAP + DOC-GAP）。** `DataRowView` 无 hover/focus state——交互样式纯 CSS（`table-body-row-rendering.tsx:124` `focus-visible:ring-2 …`，`data-interactive`/`data-striped` 静态属性）→ hover/focus 触发零重渲染。行级 `React.memo`（`table-body-row-rendering.tsx:362-394`）+ 稳定 row-scope（`use-table-row-scope-cache.ts`）。**缺**：聚焦的 sibling-render 计数测试；owner doc 未文档化 row-local render 契约。**附带发现（非本信号）**：`handleSelectRow` 的 `useCallback` 依赖 `selectedRowKeys`（`use-table-selection.ts:280-292`），选择变更使 `onSelectRow` identity 变 → 破坏所有行 memo（`table-body-row-rendering.tsx:384`）→ 选一行重渲染兄弟行。此为 selection-cascade 性能项，**非** hover/focus 信号，归 Non-Blocking Follow-up。
- **T9（fixed-left + 前导选择列横向滚动像素对齐，自 B3.1 deferred 接管）— ALREADY-COVERED（TEST-GAP，组合已在 layout 函数层断言）。** `createFixedColumnLayout`（`fixed-columns.ts:48-136`）：有左固定列时选择控制列前置 offset 0、宽 `CONTROL_COLUMN_WIDTH=40`（`:60-62`），sticky `left:0`（`:34-46`），首个左固定数据列 offset=40（`:76-84`）。同一 layout 喂 header（`table-header-row.tsx:382`）/body（`table-body-row-rendering.tsx:171`）/summary（`table-summary-row.tsx:93`）。测试 `table-data-and-layout.test.tsx:170-183` **已含** `rowSelection:{type:'checkbox'}`（`:172`）**并**断言 `getSelectionCellProps()`→`fixed:'left'`（`:183`）+ 首个左固定数据列 offset（expand+selection 合成 `left:'80px'`）——即「`rowSelection` + `fixed:'left'` 组合」在 layout 函数层**已覆盖**；`data-table-columns.test.tsx:7` 另测纯固定列（无选择列）。**残余缺口（窄）**：(a) 选择列单独 `left:0` / 数据列 `left:40px` 的「纯选择列」offset 变体（既有测试是 expand+selection 合成 80px）；(b) 渲染态横向滚动像素对齐（既有为 layout 函数层断言，非渲染态 scroll）。`table/design.md:24` 列「左/右固定列」已实现，`:217` 提多级表头+fixed 像素对齐归 follow-up；选择控制列 sticky 行为未显式文档化。
- **T10（`setSelection(['k1','k99'])` 跨页 + `keepOnPageChange`，自 B3.1 deferred 接管）— ALREADY-COVERED（TEST-GAP）。** `use-table-handle.ts:51-55` `setSelection`→`setSelectionExternal`（`use-table-selection.ts:294-324`）原样写 keys。保留依赖 `keepOnPageChange`：`true` 时跳过 render-time pruner（`:75-76`）→ k99 保留；`false`（默认）时按 `currentRowKeySet` prune（`:78-87`）。测试 `table-selection-invariants.test.tsx:118`（keepOnPageChange=true 保留，但经 `selectedRowKeys` seed、无分页）；`data-table-pagination-selection.test.tsx:230`（`setSelection(['1'])` 单页内 key）。**缺**：`setSelection(['k1','k99'])` + k99 在 page 2 + 分页 + keepOnPageChange 精确场景。`crud/design.md:34,295-298` 已文档化 `keepOnPageChange` 语义。

### 主要测试文件（`packages/flux-renderers-data/src/__tests__/`）

`table-e1c-tree-table.test.tsx`、`table-e1b-enhancements.test.tsx`、`table-e1c-column-widths-persistence.test.tsx`、`data-table-columns.test.tsx`、`table-data-and-layout.test.tsx`、`table-selection-invariants.test.tsx`、`use-table-controls.selection.test.tsx`、`data-table-pagination-selection.test.tsx`、`data-table-row-scope-identity.test.tsx`、`use-table-row-scope-cache.test.tsx`、`crud-renderer-state.unit.test.tsx`。

## Goals

- **T11**：裁定 tree-table lazy-children——**推荐裁定（Decision B：显式 `DESIGN-ACK-NOT-IMPL` + doc）**：table 树模式按设计即预加载递归 flatten（`table/design.md:38,74`），lazy-children 是 feature 非「已声称但未测试属性」；在 `table/design.md` 显式声明「当前仅预加载 `rowChildrenField`；per-node lazy/on-expand fetch 未实现，记为 candidate future（镜像 `input-tree` `childrenSource`）」；锁定已实现的预加载展开/收起行为。
- **T24**：加嵌套 crud 隔离聚焦测试（refresh A 不覆盖 B、B 分页独立）+ 文档化 id-uniqueness / containment 契约；裁定是否加 id 冲突防御 guard（推荐 Decision：dev-mode warning，若低成本则 Fix，否则 doc-only non-goal）。
- **T29**：加 hover/focus sibling-render 隔离聚焦测试 + 文档化 row-local render / `React.memo` 契约。
- **T15/T18/T9/T10**：各落一条聚焦回归锚钉住正确行为（预期 direct green）；T15 连续 re-resize + 溢出滚动、T18 summary+切列、T9 fixed-left+选择列、T10 setSelection 跨页。
- **T23**：补一条确认锚（已覆盖）。
- owner doc（`table/design.md`、`crud/design.md`）同步全部裁定，与 live code 一致，无「Proposed vs Current」叙事。

## Non-Goals

- 不在本计划实现 tree-table lazy-children/on-expand fetch（若裁定 B 则记 candidate future successor；若执行期裁定为 A-实现，则升级为独立 feature plan，不在本边界债 plan 内收口实现细节）。
- 不实现 T17（`autoFillHeight`×fixed-column，P3）——`autoFillHeight` 本身标 暂不实现（`02` NOT-ADOPTED 表 #4481），归 candidate future。
- 不处理 T29 的 selection-cascade 性能项（`handleSelectRow` identity 破坏 memo）——非 hover/focus 信号，归 Non-Blocking Follow-up / B7 perf backlog。
- 不重建 pagination / selection / row-identity 所有权模型（B3.1 已落地）。
- 不引入 amis 式组件级 `api`/`initFetch`/前端导出（NOT-ADOPTED）。
- 不覆盖 T2/T4/T7（P2，自 B3.1 显式归 B7 backlog）。

## Scope

### In Scope

- T11 lazy-children 裁定（推荐 DESIGN-ACK-NOT-IMPL + doc）+ 预加载展开 Proof。
- T24 嵌套 crud 隔离测试 + id-uniqueness doc + guard 裁定。
- T29 hover/focus sibling-render 隔离测试 + row-local render doc。
- T15/T18/T9/T10/T23 回归锚 + 必要 doc 显式化。

### Out Of Scope

- tree-table lazy-children 的实现（feature，successor）。
- T17 autoFillHeight（暂不实现）。
- selection-cascade memo 性能优化（Non-Blocking Follow-up）。
- T2/T4/T7（P2 → B7）。
- 组件级 api/initFetch/前端导出（NOT-ADOPTED）。

## Failure Paths

> 涉及嵌套 crud 状态隔离与树模式 lazy 边界，参考本节。

| 场景编号         | 触发                                                                       | 行为（依 Phase 裁定）                                                                                                                                                                       | 可重试 | 用户可见表现                                        |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| T24-id-collision | 嵌套 crud A/B 共享同一 `id`（authoring 失误）                              | 裁定：dev-mode warning（若低成本 Fix）OR doc-only non-goal（隔离不保证 id 冲突场景）                                                                                                        | n/a    | 依裁定：开发态告警 或 文档化「id 必须唯一」契约     |
| T11-lazy-expand  | 树表展开节点                                                               | 裁定 B（推荐）：仅切本地展开态、读预加载 children；无 fetch。doc 标 lazy-children 未实现。裁定 A：on-expand 经 `props.helpers.dispatch` fetch children（pattern #3 用户交互驱动，非 mount） | 依实现 | 依裁定：预加载子节点展开 或（若实现）异步加载子节点 |
| T10-cross-page   | `setSelection(['k1','k99'])`，k99 在 page 2，`keepOnPageChange` 默认 false | k99 被 render-time pruner 剪除（默认语义，文档化）；`keepOnPageChange:true` 时保留                                                                                                          | n/a    | 依标志：仅当前页选中 或 跨页保留                    |

## Test Strategy

本档选择：**建议有测**

理由：本工作项无确认 live defect（T11 为 feature 缺口非 defect，推荐 DESIGN-ACK-NOT-IMPL；T24/T29/T15/T18/T9/T10 实现已正确，补聚焦回归锚 + doc）。依 guide「建议有测」档：一般功能补测 + 验证。T11 若执行期裁定为 A-实现（feature Fix），则该分支升级为「必须自动化」（failing-test 先行）。

## Execution Plan

### Phase 1 - 缺口裁定与 Proof 先行

Status: completed
Targets: `docs/components/table/design.md`、`docs/components/crud/design.md`（裁定记录）、`packages/flux-renderers-data/src/__tests__/`（Proof）

- Item Types: `Decision`、`Proof`

- [x] (Decision, T11) 裁定 tree-table lazy-children：确认 table 树模式按设计即预加载递归 flatten（`use-table-tree.ts:62` 同步读、`table/design.md:38,74`），lazy-children 是 feature 非已声称属性。**裁定 B（推荐）：DESIGN-ACK-NOT-IMPL + doc**——`table/design.md` 显式声明「当前仅预加载 `rowChildrenField`；per-node lazy/on-expand fetch 未实现，candidate future（镜像 input-tree `childrenSource`，用户交互驱动 pattern #3）」。若执行期证据表明应实现，升级裁定 A 并拆 successor feature plan。
- [x] (Decision, T24) 裁定嵌套 crud id 冲突防御：确认 ID 命名空间隔离 by construction（`crud-renderer-ownership.ts:54-61`）。裁定是否加 dev-mode id-collision warning（若低成本 → Phase 2 Fix；否则 doc-only non-goal）。
- [x] (Proof, T24) 测试：嵌套 crud A（source S_A）+ 展开行 crud B（source S_B，distinct id）→ refresh A 不覆盖 B 行、B 分页独立。先证伪（若 live 失败即升级 Fix）。
- [x] (Proof, T29) 测试：100 行表，instrument 行 render 计数，hover/focus row 50 的单元格 → 仅 row 50（或零行）重渲染。先证伪。
- [x] (Proof, T15) 测试：连续第二次 resize 同一列（re-resize）+ 表宽于视口时（overflow-x-auto）resize。
- [x] (Proof, T18) 测试：affixRow 列 A/B/C，运行时 toggle B hidden → summary 重对齐到 A/C。
- [x] (Proof, T9) 测试：残余缺口——`rowSelection`（无 expand 列）+ `fixed:'left'` 数据列 → 选择控制列单独 `left:0`、首个左固定列 `left:40px`（纯选择列 offset 变体，既有测试为 expand+selection 合成 80px）；渲染态横向滚动像素对齐（header/body/summary 同 layout）。
- [x] (Proof, T10) 测试：`setSelection(['k1','k99'])`，k99 在 page 2，`keepOnPageChange:true` → 跨页保留、summary count=2；`false` → k99 剪除。
- [x] (Proof, T23) 确认锚：upstream `source` 绑 data-source + `refreshSource` → table 行刷新（复刻 `data-table-pagination-selection.test.tsx:286` 断言）。

Exit Criteria:

> 本 Phase 产出裁定 + Proof（多数预期 direct green；T24/T29 若失败即升级 Fix）。

- [x] T11/T24 两条 Decision 已记录到对应 owner doc（裁定结论，非叙事）。
- [x] T24/T29/T15/T18/T9/T10/T23 七条 Proof 已落地（direct green 或失败已标记待 Phase 2 Fix）。

### Phase 2 - Fix 落地（条件：Phase 1 Proof 失败项 / T24 guard 裁定）

Status: completed
Targets: `packages/flux-renderers-data/src/`（crud id-collision guard，若裁定 Fix）、相关 renderer 文件

- Item Types: `Fix`、`Proof`

> **Phase 1 全 direct green，无 Fix。** T24/T29/T15/T18/T9/T10/T23 七条 Proof 在 live 均 direct green（无失败项升级 Fix）；T24 id-collision guard 裁定为 doc-only non-goal（owner doc 显式化「CRUD id 必须唯一」authoring 契约，不引入运行时 guard）。本 Phase 不执行代码 Fix。

- [x] (Fix, T24，条件) 若裁定加 dev-mode id-collision warning：在 crud owner 注册路径加开发态重复 id 检测（console.warn），不破坏生产路径。 — 未执行：裁定 doc-only non-goal（见 Phase 1 T24 Decision + `crud/design.md` §7 B3.3）。
- [x] (Fix，条件) 若 T24/T29/T15/T18/T9/T10 任一 Proof 在 live 失败：定位根因，升级 Fix 并修复至 green（预期多数 direct green；T24 隔离若失败需排查 owner-path 命名空间泄漏）。 — 未执行：Phase 1 全 direct green，无失败项。
- [x] (Proof) 修复项的 Proof 转 green + 既有测试回归 green。 — N/A（无 Fix）；数据包全量回归 green（582 passed）。

Exit Criteria:

> 本 Phase 仅在 Phase 1 出现失败/裁定 Fix 时执行；否则跳过并标注「Phase 1 全 direct green，无 Fix」。

- [x] 条件 Fix 项落地且 Proof green；或显式标注无 Fix。 — 显式标注：Phase 1 全 direct green，无 Fix。

### Phase 3 - TEST-GAP 锁与 owner doc 显式化

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/`（锚）、`docs/components/table/design.md`、`docs/components/crud/design.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, T11) 新增测试：树表预加载 `children` 展开/收起 + 选择锁定（`flattenTreeRows` / `handleToggleTreeExpand`）；断言无 lazy fetch（锁定裁定 B）。
- [x] (Decision) 同步 owner doc：T11（lazy-children DESIGN-ACK-NOT-IMPL + candidate future）、T24（嵌套 crud containment + id-uniqueness 契约 + guard 裁定结论）、T29（row-local render / `React.memo` / sibling-isolation 契约）、T9（选择控制列 sticky 行为显式）与 live code 一致。
- [x] (Decision) 收口核对：T15/T18/T23/T10 owner doc 与 live baseline 一致（T15/T18/T23/T10 已文档化，仅补 T9 显式 + T11/T24/T29 新增条目）。

Exit Criteria:

> 本 Phase 交付 T11 预加载锚 + 全部 owner doc 显式化。

- [x] T11 预加载 Proof 通过（锁定裁定 B）。
- [x] `table/design.md`/`crud/design.md` 对 T11/T24/T29/T9 裁定已显式化且与 live code 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，ses_0fec9fbe3ffeypXS08MWxAG0c5 初审 + ses_0fec2425bffeHtdu29cbIulkJ4 复审）
- Verdict: `pass`
- Rounds: 2（初审 `revised` 标 2 Major → 起草者修正 → 复审 `pass`，零 Blocker / 零 Major）
- Findings addressed:
  - Major M1（T11 `table/design.md` 行号错：`:202` 实为 `use-table-tree` 模块描述，「perf 归 follow-up」在 `:216`）→ 已修正：`:202` 归模块描述、「perf 归 follow-up」改引 `:216`。
  - Major M2（T9 误述 `table-data-and-layout.test.tsx:170`「无 `rowSelection`」——该测试 `:170-183` 实含 `rowSelection`（`:172`）并断言 `getSelectionCellProps()`→`fixed:'left'`（`:183`）+ 首列 offset 80px，组合已在 layout 函数层覆盖）→ 已修正：baseline 承认既有覆盖、残余缺口收窄为「纯选择列 40px offset 变体 + 渲染态横向滚动像素对齐」；Phase 1 T9 Proof 同步对齐残余缺口。
  - Minor（`handleToggleTreeExpand` 行段、`use-table-visible-columns` 派生 vs toggle、`crud/design.md:313` loose anchor）已顺手修正前两条；不阻塞。
  - 复审确认：M1/M2 均经 live source（`design.md:202/216`、测试 `:170-191`）核对成立；T9/T11 在 baseline/goals/phase-proof/exit/closure-gates 五处一致；其余既有引用仍准确。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] T11 lazy-children 裁定已落地（裁定 B 则 DESIGN-ACK-NOT-IMPL + doc + 预加载 Proof；裁定 A 则升级 successor feature plan 并显式记录）。
- [x] T24 嵌套 crud 隔离测试通过 + id-uniqueness doc（+ guard 裁定落地）。
- [x] T29 hover/focus sibling-render 隔离测试通过 + row-local render doc。
- [x] T15/T18/T9/T10/T23 回归锚通过（或失败已升级 Fix 并 green）。
- [x] owner doc（`table/design.md`/`crud/design.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect（T11 为 feature 缺口非 defect，裁定 B 诚实）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### T11 per-node lazy/on-expand children fetch（若裁定 B）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: table 树模式按设计即预加载递归 flatten（`table/design.md:38,74`、`use-table-tree.ts:62` 同步读）；lazy-children 是 feature 非「Flux 已声称但未测试/未文档化属性」。本 roadmap 是测试/文档边界债（Framework/Platform Reuse 表：行身份/树表复用既有 runtime，本 roadmap 不重建）。裁定 B 显式 doc + candidate future 闭合边界。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（或独立 feature plan，若产品判断需 tree lazy-load；镜像 input-tree `childrenSource`，用户交互驱动 pattern #3）。

## Non-Blocking Follow-ups

- T29 selection-cascade 性能项（`handleSelectRow` `useCallback` identity 依赖 `selectedRowKeys` → 选一行破坏所有行 `React.memo`，`use-table-selection.ts:280-292` + `table-body-row-rendering.tsx:384`）：非 hover/focus 信号，归 B7 perf backlog 或独立 perf plan 评估。
- T17（`autoFillHeight`×fixed-column，P3 #4481）：`autoFillHeight` 本身暂不实现，归 candidate future。

## Closure

Status Note: B3.3 边界债收口。8 条 in-scope signal（T11/T15/T18/T23/T24/T29/T9/T10）全部裁定并落地：T11 tree lazy-children 裁定 B（DESIGN-ACK-NOT-IMPL + doc + 预加载锚，feature 缺口诚实 deferred 至 B7）；T24 嵌套 crud ID-namespace 隔离 by construction（隔离锚 + id-uniqueness 契约 doc，guard 裁定 doc-only non-goal）；T29 hover/focus sibling-render 隔离（CSS-only + React.memo，Profiler 零 commit 锚）；T15 re-resize/delta 锚、T18 summary 运行时切列重对齐锚、T9 fixed-left+选择列 offset 锚、T10 setSelection 跨页 keepOnPageChange 锚、T23 source 刷新确认锚——均 direct green。owner doc（`table/design.md`/`crud/design.md`）B3.3 裁定显式化且与 live code 一致。无 in-scope live defect 被静默降级。全量验证 green（typecheck/build/lint/test）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，ses_0fea8cd58ffezpFbwJiINFXmWK，general-purpose，不复用执行者上下文）。
- Evidence: verdict `approved`（零 Blocker / 零 Major）。审计独立重跑 4 个新/改测试文件 → 27 passed；数据包全量 584 passed（与执行者报告一致）；typecheck + lint clean。interface-vs-semantics 抽查：T11 测试断言「展开无预加载 children 的节点不产生新行」（真无 lazy fetch）、T24 unit 证明 `createCrudOwnerPaths` 按 id 命名空间隔离 + 集成证明 A 选择/翻页不泄漏到 B。owner doc file:line 引用核对准确（`use-table-tree.ts:62/126-136`、`fixed-columns.ts:4`、`use-table-selection.ts:75-76/280-292`）。deferred 诚实（T11 out-of-scope improvement + successor B7；T29 selection-cascade 在 Non-Blocking Follow-ups + owner doc，未静默丢弃）。文本一致性 5 处核对通过。

Follow-up:

- T11 per-node lazy / on-expand children fetch（feature successor）：归 `docs/components/amis-bug-driven-improvement-roadmap.md` B7 或独立 feature plan（镜像 input-tree `childrenSource`，用户交互驱动 pattern #3）。
- T29 selection-cascade 性能项（`handleSelectRow` `useCallback` identity 依赖 `selectedRowKeys` → 选一行破坏所有行 `React.memo`）：归 B7 perf backlog 或独立 perf plan。
- T17 `autoFillHeight` × fixed-column（P3）：`autoFillHeight` 本身暂不实现，candidate future。
- T2/T4/T7（P2 table-heavy 信号）：自 B3.1 显式归 B7 backlog。
