# B3.1 table 行身份、数据收缩钳制与排序/选择边界

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B3, work item B3.1), `docs/components/amis-bug-driven-improvements/02-table-and-crud.md` (T1/T3/T5/T6/T8/T27/F1), `docs/components/table/design.md`, `docs/components/crud/design.md`, `docs/architecture/table-row-identity-and-scope-performance.md`
> Mission: amis-bug-driven-improvements
> Work Item: B3.1 table 行身份、数据收缩钳制与排序/选择边界
> Related: predecessor B2.1（`docs/plans/2026-06-26-0234-2-b21-...-plan.md`，已 done；B3.1 依赖 B2.1 请求边界已落地）；同 wave B3.2（array/combo，独立推进）；successor B3.3（table 高级能力，依赖 B3.1+B3.2）

## Purpose

把 roadmap 工作项 B3.1 收口。本计划逐条对照 live repo 裁定并落地 `02-table-and-crud.md` 的 7 条 in-scope signal（T1/T3/T5/T6/T8/T27/F1）。三类工作交织：

- **确认的 live 缺陷**：**T5（数据收缩后页码不钳制，P0 锚点）**——删行/批量动作使总行数 < `(currentPage-1)*pageSize` 时，table/CRUD 不钳制 `currentPage`，渲染空页、用户卡死。必须 Fix。
- **行为分叉 / 特征缺口**：**T6（sort/cell 用 bracket access 而非 path binder，dotted 列名 `metadata.updatedAt` 不解析）**——sort 与 cell 显示彼此一致（都用 bracket），但都不支持 dotted/nested 路径；裁定升级到 `getIn` path binder（Fix）或文档化为 flat-key-only 限制（Decision）。
- **DESIGN-GAP（owner doc 沉默）/ TEST-GAP**：T1（复合/computed rowKey 故事缺失）、T3（page-change 不踩 pageSize）、T8（click dispatch 优先级）、T27（items/total nullish 归一化）、F1（filter 值 `0` 非空）——多数实现已正确，补聚焦回归锚 + owner doc 显式化。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-renderers-data/src/`（table-renderer、crud、pagination）、`docs/components/table/design.md`、`docs/components/crud/design.md`、`docs/architecture/table-row-identity-and-scope-performance.md` 的 live-repo 审计。下列 file:line 引用均已核对。

### 逐条现状

- **T1（复合/computed rowKey）— 单 dotted 路径 + `__rowKey`/`id` 回退已实现，复合/表达式缺失，DESIGN-GAP。** `normalizeRowKey`（`table-data.ts:15-32`）：`:20` `getIn(record, rowKeyField)`（单 dotted 路径如 `rowKey:'a.b'` 经 path binder 可用）、`:21` 回退 `record.__rowKey ?? record.id`。**无** expression `rowKey`、**无** 复合（ip+port）key。`__rowKey` 仅读回退，非文档化 hydrate 模式。CRUD 默认 `crud-schema.ts:223` `rowKey: schema.rowKey ?? 'id'`。测试 `data-table-row-scope-identity.test.tsx`、`table-selection-invariants.test.tsx` 覆盖身份稳定性/重复键，**无**复合/表达式键测试。`table-row-identity-and-scope-performance.md:222-269`（Stable Row Key / Authoring Contract）仅文档化单字段 `rowKey:'id'`/`'__rowKey'` + :233 hydrate 注记，**沉默**于复合/computed/expression 键。
- **T3（page-change 不踩 pageSize）— 实现正确，TEST-GAP。** `handlePageChange`（`use-table-pagination.ts:77-97`）：local `setLocalCurrentPage(page)`（:81）、scope `renderScope.update(paginationStatePath, { currentPage: page, pageSize })`（:83）写回**当前** pageSize；pageSize 独立读（:67-75），从不被默认值覆盖。测试 `use-table-controls.pagination.test.tsx:17-66` 测的是**反向**（pageSize-change 重置 page）；**无**「非默认 pageSize 上翻页 → pageSize 保持」的聚焦测试。`table/design.md` §7 / `crud/design.md` §7 未声明该不变量。
- **T5（数据收缩后页码钳制）— LIVE-DEFECT，P0 锚点。** `clampPage` helper 存在（`use-table-pagination.ts:122-164`，算 `totalPages=ceil(totalRows/pageSize)` 并钳制），但**仅被调用一次**：`table-renderer.tsx:217`（`useTableFilter` 回调内，恒以 `clampPage(1, nextFilteredRows.length)` —— 即**强制翻到 page 1**，非钳制到末页）。table 路径**无 render-time 钳制**：`currentPage`（`use-table-pagination.ts:57-65`）取原始 local/scope/controlled 值；`paginateTableData`（`table-data.ts:136-150`）只切片；**无 useEffect 监听 source/total 收缩**。**对照**：list renderer 每次渲染钳制——`list-pagination.ts:157` `currentPage = enabled ? clampPage(resolvedPage, totalPages) : 1`，`list/design.md:48` 文档化「`currentPage` 始终 clamp」。table/CRUD 无等价物。**确认缺陷 trace**：CRUD client-side source，`pageSize=10`，page 2；删行/批量动作使 scope 源数组收缩到总行数 < `(2-1)*10`；`currentPage` 仍为 2；`paginateTableData` 切片 `[10,20)` → **渲染空页 2，用户卡死**，无钳制、无重取。测试 `use-table-controls.pagination.test.tsx:124-168` 直调 `api.clampPage(1,1)`（helper 单元）、`data-pagination-rendering.test.tsx:16-57` 测初始越界钳制；**无** delete/收缩→钳制末页测试。`table/design.md`、`crud/design.md` §7 沉默。
- **T6（sort comparator 经与 cell 显示同一 path binder，含 dotted）— DESIGN-GAP + dotted-path FEATURE-GAP。** sort comparator `table-data.ts:107-115`：`:109` `compareValues(a.record[entry.column], b.record[entry.column])`（**bracket access**）。cell 显示 `table-cell-chrome.tsx:34` `record[column.name]`（**bracket**）；combine-cells `combine-cells.ts:17`、filter `table-data.ts:120,126` 同为 bracket。故 sort 与 cell **彼此一致**（同 bracket），但**两者都不解析 dotted/nested 路径**：`name:'metadata.updatedAt'` 当字面键查。**仅** rowKey 用 path binder（`getIn`，`table-data.ts:20`）。**无** dotted 列名 sort/display 测试。`table/design.md` §7 sort 沉默于路径解析。signal `02:60,63` 推荐 doc note，未加。
- **T8（click dispatch target-aware）— 实现（stopPropagation 全触发点），DESIGN-GAP + TEST-GAP。** 选择格 `table-body-row-rendering.tsx:173`、展开按钮 :151-153、tree toggle :215-217、operation/drag cell :249-253、copyable `table-cell-chrome.tsx:81`、popOver `table-cell-popover.tsx:146`、quick-edit `table-quick-edit-cell.tsx:130,179` 均 `event.stopPropagation()`；行处理器 `table-body-row-rendering.tsx:83-91` 发 `onRowClick`+`expandRowByClick`。故 checkbox/popOver/copyable 点击不冒泡 ✓。测试 `table-internal-components.test.tsx:190-236`（row click→onRowClick）、`table-data-and-layout.test.tsx:308-369` 点 expand+checkbox+cell 但**只断言** `onRowClick` `toHaveBeenCalled()`（≥1），**不断言负向**（checkbox 点击**不得**触发 onRowClick）；无 popOver/copyable 负向测试。`table/design.md:137` 仅提键盘激活，**沉默**于 click-dispatch 优先级。
- **T27（items:null→[]，total:null 无无限分页循环）— 实现，DESIGN-GAP + minor test gap。** `normalizeCrudSourceValue`（`crud-renderer-state.ts:201-231`）：items/rows/records/list 数组检查（:210-217），无则 `EMPTY_ROWS`（:218）→ `items:null/undefined` 得 `[]`；total（:220-225）回退 count 再 `rows.length` → `total:null` 得 `rows.length`；空行时 `totalPages=max(1,ceil(0/pageSize))=1` 无无限循环 ✓（注：此为 CRUD 消费路径；table 收已解析 source）。测试 `crud-renderer-state.unit.test.tsx:92-111` 覆盖 array/`{items,total}`/`{rows,count}`/`{records}`/`{list}`/top-level undefined；**无显式** `{items:null}`/`{total:null}` 用例。`crud/design.md` 决策表 :24 沉默于 nullish 归一化契约。
- **F1（client-mode filter 值 `0` 非「无 filter」）— 实现正确，TEST-GAP。** `applyQueryToRows`（`crud-renderer-state.ts:158-199`）：keep-filter 检查（:159-164）`value==null`→丢、string→trim>0、array→length>0、**else return true** → number `0` **保留**；match（:196）`cell===value` → `{count:0}` 过滤到 `count===0` 行 ✓。table header filter（`table-data.ts:120` `String(...)`、:123 `"0".trim().length>0`）亦处理 `0`/`"0"` ✓。测试 `crud-renderer-state.unit.test.tsx:67-90` 覆盖 scalar/array/keyword/whitespace，**无** `{field:0}` 用例。`crud/design.md` §6.5 沉默于 falsy-but-present filter 语义。

### 相关测试文件（主要）

`packages/flux-renderers-data/src/__tests__/`：`use-table-controls.pagination.test.tsx`、`use-table-controls.selection.test.tsx`、`use-table-controls.sort-filter-expand.test.tsx`、`data-table.test.tsx`、`data-table-pagination-selection.test.tsx`、`data-pagination-rendering.test.tsx`、`table-pagination-pages.test.ts`、`table-internal-components.test.tsx`、`table-data-and-layout.test.tsx`、`table-cell-popover.test.tsx`、`data-table-row-scope-identity.test.tsx`、`table-selection-invariants.test.tsx`、`crud-renderer-state.unit.test.tsx`、`crud-query-and-pagination.test.tsx`、`crud-lifecycle.test.tsx`。（对照）`list-pagination-infinite.test.tsx`。

## Goals

- **T5（P0）**：Fix 数据收缩后页码钳制——table/CRUD 路径引入 render-time `currentPage` 钳制到 `[1, totalPages]`（镜像 list renderer `list-pagination.ts:157`），使删行/批量收缩总行数 < `(currentPage-1)*pageSize` 时自动落到末页（非空）；failing-test 先行。
- **T6**：裁定 dotted 列名——**推荐裁定 A（Fix）**：把 sort comparator + cell 显示 + filter + combine 的 bracket access 升级为 `getIn(record, column.name)` path binder，使 dotted/nested 列名（`metadata.updatedAt`）解析、且 sort 与 display 共享同一 path binder；failing-test 先行。若裁定 B（文档化 flat-key-only 限制）则锁定当前行为 + doc。
- **T1**：裁定复合/computed rowKey——**推荐裁定**：文档化合成 `__rowKey` hydrate 模式（owner 在渲染前投影复合字段为 `__rowKey`）为 Flux-idiomatic 路径，expression rowKey 记为 candidate future；锁定已实现的 dotted 单路径 + `__rowKey`/`id` 回退。
- **T3/T8/T27/F1**：各落一条聚焦、可证伪回归锚钉住当前正确行为；T8/T27/F1 若 Proof 在 live 失败即升级 Fix（预期均 green）。
- owner doc（`table/design.md`、`crud/design.md`、`table-row-identity-and-scope-performance.md`）同步全部裁定，与 live code 一致，无「Proposed vs Current」叙事。

## Non-Goals

- 不实现 T2（字面含点/符号字段名经 bracket-key 路径解析，P2）——与 T6 的 dotted-path 关切正交（T6 升级 `getIn` 后字面含点键需独立 bracket-key 转义机制），归 B7。
- 不覆盖 tree/aggregate/perf 项（T11/T15/T18/T23/T24/T29 等）——归 B3.3（依赖本工作项）。
- 不重建 pagination 所有权模型（client/server 模式均已落地；T5 仅补 render-time 钳制钩子）。
- 不引入 amis 式组件级 `api`/`initFetch`/`syncLocation`/前端导出（NOT-ADOPTED，见 `02` NOT-ADOPTED 表）。

## Scope

### In Scope

- T5 数据收缩页码钳制 Fix（P0）+ doc。
- T6 dotted 列名 path-binder 裁定 + 必要 Fix + doc。
- T1 复合 rowKey 裁定 + doc + dotted 单路径/`__rowKey` 回退 Proof。
- T3/T8/T27/F1 回归锚 + doc 显式化。

### Out Of Scope

- T2 字面含点/符号键（P2 → B7）。
- B3.3 范围（tree/aggregate/perf，T11/T15/T18/T23/T24/T29）。
- 组件级 api/initFetch/syncLocation/前端导出（NOT-ADOPTED）。
- 重构 pagination 所有权或 client/server 模式切换。

## Failure Paths

> 涉及分页状态契约与列路径解析，参考本节。

| 场景编号          | 触发                                                               | 行为（依 Phase 裁定）                                                                                                                                                                         | 可重试   | 用户可见表现                                   |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| T5-data-shrink    | client-side table page 2，删该页唯一行 → 总行数 < `(2-1)*pageSize` | 裁定 A（已落地）：render-time 钳制 `currentPage` 到 `[1, totalPages]` → 显示末页（非空），不卡空页                                                                                            | n/a      | 自动跳到有数据的末页，无空页                   |
| T5-server-shrink  | server-side CRUD page 2，批量删除使 total 收缩                     | render-time 钳制使 table 显示末页（非空）且经 handle 暴露钳制后展示页；server-side 请求分页（钳制页码进下次请求）属请求 owner（data-source/action）职责，本工作项不重建请求 owner（Non-Goal） | 依 retry | 末页数据，无空页                               |
| T6-dotted-column  | 列 `name:'metadata.updatedAt'`，sortable                           | 裁定 A：sort 与 cell 显示经 `getIn` 解析 nested 路径；裁定 B：文档化 flat-key-only，dotted 名不解析（返回 undefined）                                                                         | n/a      | 依裁定：nested 值正确显示/排序 或 文档限制说明 |
| T27-nullish-items | source 返回 `{items:null}` / `{total:null}`                        | items nullish → `[]`（空网格无 toast）；total nullish → `items.length`，无无限分页                                                                                                            | n/a      | 空网格或正确末页                               |
| F1-zero-filter    | client-mode filter select option value `0`                         | 保留为有效 filter，匹配 `=== 0` 行（不当「无 filter」丢弃）                                                                                                                                   | n/a      | 仅显示匹配 0 的行                              |

## Test Strategy

本档选择：**必须自动化**

理由：T5 是确认的 live 缺陷（数据收缩不钳制页码），T6 是确认的特征缺口候选（裁定为 Fix 则需 failing-test 先行）。依 guide「必须自动化」档：T5（及裁定为 Fix 的 T6）Proof 必先于 Fix。T1/T3/T8/T27/F1 多为 TEST-GAP 锁定 + doc，预期直接 green（实现已正确），但 T5 必现红。

## Execution Plan

### Phase 1 - 缺口裁定与 failing-test 先行（T5 / T6 / T1）

Status: completed
Targets: `docs/components/table/design.md`、`docs/components/crud/design.md`、`docs/architecture/table-row-identity-and-scope-performance.md`（裁定记录）、`packages/flux-renderers-data/src/__tests__/`（failing test）

- Item Types: `Decision`、`Proof`

- [x] (Decision, T5) 确认 T5 为确认 live 缺陷（render-time 钳制缺失），裁定 Fix：table/CRUD 引入 render-time `currentPage` 钳制到 `[1, totalPages]`（镜像 `list-pagination.ts:157`），client-side 直接生效、server-side 钳制后页码进入下次请求。记录到 `table/design.md` §7 / `crud/design.md` §7。
- [x] (Proof, T5) failing test：client-side table `pageSize=10`、page 2、删该页唯一行使总行数 < 10 → 断言渲染**非空末页**（currentPage 钳制到 1）、非空页 2。先红。
- [x] (Decision, T6) 裁定 dotted 列名：**裁定 A（Fix）**——把 sort comparator（`table-data.ts:107-115`）、cell 显示（`table-cell-chrome.tsx:34`）、filter（`table-data.ts:120,126`）、combine（`combine-cells.ts:17`）的 bracket access 升级为 `getIn(record, column.name)`，使 dotted/nested 列名解析、sort 与 display 共享 path binder。记录裁定结论（含 T2 字面含点键的 P2/out-of-scope 边界）到 `table/design.md` §7。Blast-radius 审计：in-repo/playground 无 table 列依赖字面含点键（命中的 `record.status`/`record.name` 均为 quick-edit dialog form 字段名），故升级零回归，不退回裁定 B。
- [x] (Proof, T6) 裁定 A：failing test——列 `name:'meta.updatedAt'`（dotted）、sortable → 断言 sort 按 nested 值排序、cell 显示 nested 值、flat 名回归。先红。
- [x] (Decision, T1) 裁定复合/computed rowKey：文档化合成 `__rowKey` hydrate 模式（owner 渲染前投影复合字段为 `__rowKey`）为 Flux-idiomatic 路径；expression `rowKey` 记为 candidate future feature（successor）；锁定已实现 dotted 单路径 + `__rowKey`/`id` 回退。记录到 `table-row-identity-and-scope-performance.md` Stable Row Key / Authoring Contract。

Exit Criteria:

> 本 Phase 产出裁定 + 先红测试（T5，及裁定为 Fix 的 T6），不改实现。

- [x] T5/T6/T1 三条 Decision 已记录到对应 owner doc（裁定结论，非叙事）。
- [x] T5 failing test 已落地且当前为红；T6 failing test（裁定 A）已落地且为红。

### Phase 2 - Fix T5（P0 数据收缩钳制）+ T6（dotted path-binder，若裁定 A）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts`（render-time 钳制钩子）、`table-data.ts`（`processTableData` sort/filter + `paginateTableData` 钳制点）、`table-cell-chrome.tsx`（cell 显示）、`combine-cells.ts`

- Item Types: `Fix`、`Proof`

- [x] (Fix, T5) 在 table/CRUD 分页解析引入 render-time `currentPage` 钳制：算 `totalPages=ceil(totalRows/pageSize)`，把用于切片（client `paginateTableData`）与请求构造（server pagination DTO）的 resolved `currentPage` 钳制到 `[1, totalPages]`（空数据时 totalPages=1）。镜像 `list-pagination.ts:157` 模式；不破坏既有 filter-path 钳制（`table-renderer.tsx:217`），但将其「强制 page 1」收敛为「钳制到 [1, totalPages]」以保持单一语义。
- [x] (Proof, T5) Phase 1 的 T5 failing test 转 green；补 server-side 收缩用例（钳制后页码进下次请求）+ 空数据用例（totalPages=1，不卡死）。
- [x] (Fix, T6) 裁定 A：把 `table-data.ts`（sort + filter）、`table-cell-chrome.tsx`（cell 显示 + copyable + popOver rowValue）、`combine-cells.ts`（getCellValue）的 `record[column.name]`/`a.record[entry.column]` 统一改为 `getIn(record, column.name)` / `getIn(a.record, entry.column)`，使 dotted/nested 列名解析且 sort/display 共享 path binder。
- [x] (Proof, T6) 裁定 A：Phase 1 的 T6 failing test 转 green；补既有 sort/filter/display 测试确认 flat 名仍 green（回归）。

Exit Criteria:

> 本 Phase 交付 T5 必修 + T6 条件 Fix。

- [x] T5 数据收缩后 render-time 钳制生效，failing test green + server/空数据补测 green。
- [x] T6（裁定 A）dotted 列名 sort/display 经 getIn 解析、failing test green + flat 名回归 green。

### Phase 3 - TEST-GAP 锁与 doc 显式化（T1 / T3 / T8 / T27 / F1）

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/`（锚）、`docs/components/table/design.md`、`docs/components/crud/design.md`、`docs/architecture/table-row-identity-and-scope-performance.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, T1) 新增测试：`rowKey:'a.b'`（dotted 单路径）经 `getIn` 解析正确身份 + 选择；`__rowKey` 回退（record 无 rowKey 字段但有 `__rowKey`）生效；锁定 `table-data.ts:20-21`。
- [x] (Proof, T3) 新增测试：`pageSize=20`、翻到 page 2 → 断言 `pageSize` 保持 20、（server 模式）请求携带 pageSize=20。锁定 `use-table-pagination.ts:77-97`。
- [x] (Proof, T8) 新增负向测试：click checkbox → **仅** toggle 选择、**不**触发 `onRowClick`；click popOver icon → **仅** 开 popOver、不触发 onRowClick；click copyable → 不冒泡；click 纯 cell → 触发 onRowClick。锁定 `table-body-row-rendering.tsx` stopPropagation 链。
- [x] (Proof, T27) 新增测试：`{items:null}` → `[]`（空网格无 toast）；`{total:null}` → total=`rows.length`、空行 totalPages=1 无无限循环；`{items:undefined}` 同理。锁定 `crud-renderer-state.ts:201-231`。
- [x] (Proof, F1) 新增测试：client-mode filter select option value `0` → 仅显示匹配 `===0` 行（不当「无 filter」丢弃）。锁定 `crud-renderer-state.ts:158-199`。
- [x] (Decision) 若任一 Proof 在 live code 失败：定位根因，升级 Fix 并修复至 green。（T3/T8/T27/F1/T1 均 direct green，无 Fix 升级。）
- [x] (Decision) 同步 owner doc：T8（click-dispatch 优先级显式）、T27（nullish 归一化契约显式）、F1（falsy-but-present filter 语义显式）、T3（pageSize 保持不变量显式）、T1（复合 rowKey hydrate 模式 + expression candidate）与 live code 一致。

Exit Criteria:

> 本 Phase 交付 T1/T3/T8/T27/F1 回归锚 + owner doc 显式化。

- [x] T1/T3/T8/T27/F1 五条 Proof 测试存在并通过（或失败已升级 Fix 并 green）。
- [x] `table/design.md`/`crud/design.md`/`table-row-identity-and-scope-performance.md` 对应 DESIGN-GAP 已显式化且与 live code 一致。

### Phase 4 - owner doc 收口同步

Status: completed
Targets: `docs/components/table/design.md`、`docs/components/crud/design.md`、`docs/architecture/table-row-identity-and-scope-performance.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步三 owner doc：T5（render-time 钳制契约）、T6（path-binder 裁定结论）、T1（复合 rowKey）、T8（click-dispatch 优先级）、T27（nullish 归一化）、F1（falsy filter）、T3（pageSize 不变量）与 live code 一致，无「Proposed vs Current」叙事。
- [x] (Proof) 抽查修改后的 owner doc 与 live code（`use-table-pagination.ts` 钳制钩子、`table-data.ts` sort/getIn、`normalizeRowKey` dotted 回退、`normalizeCrudSourceValue` nullish）一致。

Exit Criteria:

- [x] 三 owner doc 全部裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0ff4bde53ffeJxVXCND77Whz0g`）
- Verdict: `pass`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor 1（Phase 4 Exit Criteria 缺 Phases 1–3 的 `>` guidance blockquote，纯格式一致性问题）→ 不阻塞。
  - Minor 2（T6「高 blast radius 退回裁定 B」逃生口无具体阈值）→ 不阻塞；建议执行者在 Phase 1 Decision 时以「≥1 个 in-repo/playground 表依赖字面含点键」为客观阈值。
  - Minor 3（T6 Phase 1 Proof / Phase 2 Fix+Proof 以「若裁定 A」分支，建议 Phase 1 即 commit A/B）→ 不阻塞；执行者在 Phase 1 Decision 落定单一裁定。
  - 审阅者确认：所有 file:line 经 live repo 核对准确（T5 缺陷 trace 真实非夸大、T6 bracket access 两处一致、T1/T27/F1 实现、CRUD 默认 rowKey `crud-schema.ts:223`）；owner doc 均存在；roadmap B3.1 `todo`/依赖 B2.1 `done`/signal 集 T1/T3/T5/T6/T8/T27/F1 一致；P0 缺陷 T5 为 Fix（不延期）、T6 诚实裁定（Decision + lean）、Test tier「必须自动化」+ Phase 1 failing-test 先于 Phase 2 Fix 成立；模板完整（必需 markers、4 Phase、Failure Paths 表、Closure Gates 含 4 pnpm + 独立 audit 门、Deferred、Follow-ups）。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] T5 数据收缩页码钳制已 Fix（render-time 钳制到 `[1, totalPages]`），聚焦测试（含 server/空数据）通过。
- [x] T6 dotted 列名裁定已落地（裁定 A 则 getIn 升级 + 测试 green；裁定 B 则锁定 + doc）。
- [x] T1 复合 rowKey 裁定已文档化 + dotted/`__rowKey` Proof 通过。
- [x] T3/T8/T27/F1 回归锚通过（或失败已升级 Fix 并 green）。
- [x] owner doc（`table/design.md`/`crud/design.md`/`table-row-identity-and-scope-performance.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（T5 为确认缺陷必须 landed；T6 若裁定为缺陷必须 landed）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本工作项 in-scope signal（T1/T3/T5/T6/T8/T27/F1）均不延期。以下为显式 out-of-scope 项，记录 successor 归属。

### T2 字面含点/符号字段名经 bracket-key 路径解析

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: T2（P2，#3189）关切字面含点/符号键（如 `hello-world`、字面 `a.b` 键）经 bracket-key 路径解析。与 T6 的 dotted-nested-path 关切正交：T6 升级 `getIn` 后，字面含点键需独立 bracket-key 转义/所有权机制，属独立设计面。本工作项不引入该机制。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（P2 backlog 评估）。

## Non-Blocking Follow-ups

- T4（total 异步 late-binding 更新 pager 不 remount，P2 #4487）归 B7 backlog 评估，不阻塞本工作项契约收口。
- T7（header filter 保留 active sort，P2 #4469）、T9（fixed-left + 选择列横向对齐，P2 #5222）、T10（跨页 setSelection，P2 #4636）归 B7/backlog 或 B3.3。

## Closure

Status Note: 全部 4 Phase 完成。T5（P0 数据收缩 render-time 页码钳制）Fix 落地——`table-renderer.tsx` 引入纯渲染期 `resolvedCurrentPage = clamp(currentPage, [1, totalPages])`（镜像 `list-pagination.ts:157`），用于切片/分页条/组件句柄；filter-path「强制 page 1」收敛为同一 clamp 语义。T6（裁定 A）dotted 列名经 `getIn` path-binder 升级 sort/cell/filter/combine，flat 名零回归。T1/T3/T8/T27/F1 五条回归锚落地（均 direct green，无 Fix 升级）。三 owner doc 收口同步、与 live code 一致。全工作区 full-green（test 55/55、typecheck 55/55、build 29/29、lint 29/29；flux-renderers-data 569 tests passed）。独立 closure-audit 通过（pass，0 blocker/0 major）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_0ff2cd4a1ffe4w2uQwKv9XWQqM`）
- Evidence: Verdict `pass`。独立复核 T5 clamp 为纯渲染派生（无 scope 回写，镜像 list）、T6 getIn 升级在声明 scope 内完整（剩余 `record[field]` 命中为 B3.3 tree 聚合 / quick-edit form 字段绑定，正交 out-of-scope）、T1/T3/T8/T27/F1 锚断言正确、owner doc 无 drift、Deferred 仅 T2（显式 out-of-scope → B7）。独立重跑 flux-renderers-data = 69 files / 569 passed，typecheck/build clean，无 src 产物泄漏。2 条 Minor（plan Failure Path T5-server 措辞 + T5-server-shrink 测试实为 client-side CRUD）均已处理：Failure Path 行已按 owner doc 收口表述；server-side 请求分页显式归请求 owner，属 Non-Goal。

Follow-up:

- T2 字面含点/符号字段名经 bracket-key 路径解析（P2 → B7 backlog 评估，显式 out-of-scope）。
- T4/T7/T9/T10（P2 #4487/#4469/#5222/#4636）归 B7/backlog 或 B3.3，non-blocking。
- B3.3（table 高级能力：tree/aggregate/perf，T11/T15/T18/T23/T24/T29）依赖本工作项，可推进。
