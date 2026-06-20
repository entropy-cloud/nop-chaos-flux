# E1b Table 列宽与聚合

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E1b）、`docs/components/existing-components-improvement-analysis.md` §1.2/§3、`docs/components/table/design.md`、live-repo audit（table renderer + column type + ownership 模型）
> Related: X5 table Flux 决策表（done）、E1c（table 高级能力，依赖本 plan 收口）

## Purpose

把 `table` 从当前已覆盖列定义/分页/选择/排序/过滤/固定列/虚拟滚动/quick-edit 的基线，补齐 **列宽拖拽 resize、表头吸顶 sticky header、聚合行（prefixRow/affixRow）、单元格合并（combineNum/colSpan-rowSpan）** 四项桌面端报表常规能力。

## Current Baseline

经 live-repo audit（2026-06-21），当前 `table` 基线：

- **Schema**：`TableSchema`（`packages/flux-renderers-data/src/schemas.ts:65-117`）已声明 `columns`、`pagination`、`rowSelection`、`expandable`、`virtualThreshold`、`scrollHeight`、`columnSettings`、`responsive`、`header`(L79)、`footer`(L80) 等。**无任何 E1b 字段**（`columnResize`/`affixHeader`/`prefixRow`/`affixRow`/`combineNum` 均不在 schema）。
- **Column 类型**：`TableColumnSchema`（`schemas.ts:39-57`）已有 `width?: number|string`（L47）、`fixed?: 'left'|'right'`（L48），但**无** `resizable`/`minWidth`/`maxWidth`/`colSpan`/`rowSpan`。
- **Renderer**：主 shell `table-renderer.tsx`（512 行）+ `table-renderer/` 目录 22 文件（~3,853 行）。使用 `@nop-chaos/ui` Table 原语（`Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`）。
- **已实现**：列定义/分页/行选择(单页)/expandable/左·右固定列/列显隐+上下移/虚拟滚动(`@tanstack/react-virtual`)/quick-edit(inline+dialog)/header search-filter/responsive 列折叠(`responsive.mode: 'expand'`)/ownership 模型(`*Ownership: local|controlled|scope` + `*StatePath`)。
- **footer 现状**：`footer?: SchemaInput|string`（L80）是**通用内容 region**，在 `table-renderer.tsx:507-509` 渲染为 `<div data-slot="table-footer">`，位于 `<Table>` **外部之后**（`</Table>` 在 L490）。**不能**渲染 `<td>` 对齐列的聚合行。`TableFooter`（`<tfoot>`）UI 原语在 `packages/ui/src/components/ui/table.tsx:32-40` 已定义导出，但全仓库**零引用**。
- **单元格合并现状**：`colSpan` 仅用于 empty-state（`table-body-rows.tsx:136,291`）和 expand-detail（`table-body-row-rendering.tsx:434`）的全行 span。**无** `combineNum`/数据驱动的 colSpan/rowSpan。
- **测试**：`table-body-rows-virtual.test.tsx`、`table-data-and-layout.test.tsx`、`table-internal-components.test.tsx`、`table-pagination-pages.test.ts`、`table-quick-edit-*.test.tsx`。**无 E1b 相关测试**。

## Goals

- table 支持列宽拖拽 resize（列级 `resizable` + 表级 `columnResize` 开关）。
- table 支持 sticky header（`affixHeader`）——滚动时表头吸顶。
- table 支持聚合行（`prefixRow`/`affixRow`）——top/bottom summary 行，cells 对齐列。
- table 支持单元格合并（`combineNum` 或等效 colSpan/rowSpan 契约）。
- `table/design.md` 决策表中 "计划实现（E1b）" 行全部翻转为 "实现"。
- 每项能力配有 focused 单测。

## Non-Goals

- 树表/嵌套子行（E1c）。
- 行拖拽排序（E1c，依赖本 plan 的列宽 resize 基础设施收口后启动）。
- 多列排序（E1c）。
- 多级表头/嵌套表头分组（E1c）。
- copyable/popOver 单元格（E1c）。
- 导出 Excel/CSV（决策表 "不采纳"，后台职责）。
- amis `rowClassNameExpr`/`tableLayout` 皮肤枚举（决策表 "不采纳"）。
- column resize 的 scope ownership 持久化（本 plan 做 local-only 状态，scope-level 持久化归 follow-up）。

## Scope

### In Scope

- `TableSchema` 新增：`columnResize?: boolean`、`affixHeader?: boolean`、`prefixRow?: TableSummaryRow`、`affixRow?: TableSummaryRow`、`combineNum?: number`（命名 Phase 1 终裁）。
- `TableColumnSchema` 新增：`resizable?: boolean`、`minWidth?: number`、`maxWidth?: number`。
- 新增 `TableSummaryRow` 类型（cells 对齐列的聚合行声明）。
- Renderer：resize drag handle + 宽度状态、sticky thead、`<tfoot>`/`<thead>` 聚合行渲染、combine 合并逻辑。
- Focused 单测。
- `table/design.md` 决策表翻转 + ownership/字段分类节同步。

### Out Of Scope

- column resize widths 的 scope-owned 持久化（`columnWidthsOwnership`/`columnWidthsStatePath`）——本 plan 做 local state，持久化归 follow-up。
- 聚合行的 expression 求值引擎（聚合值可由 `${expr}` 或 runtime helper 派生，本 plan 支持静态值 + expression 透传，不建独立聚合引擎）。

## Failure Paths

| 场景                              | 触发                                                 | 行为                                                    | 可重试 | 用户可见表现     |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ------ | ---------------- |
| resize + fixed column 共存        | 对 fixed 列拖拽 resize                               | 允许 resize，fixed 定位不受宽度变化影响                 | 否     | fixed 列宽度更新 |
| affixHeader + 虚拟滚动共存        | virtualEnabled + affixHeader                         | thead 在虚拟滚动容器内 sticky 吸顶                      | 否     | 滚动时表头可见   |
| affixHeader + scrollHeight 未声明 | `affixHeader: true` 但无 scrollHeight/无外层滚动容器 | sticky 无滚动容器则视觉无变化（thead 已在顶部），不报错 | 否     | 正常表头         |
| prefixRow/affixRow 列数不匹配     | summary cells 数 ≠ columns 数                        | 按 column name 对齐，缺失列渲染空 `<td>`                | 否     | 部分单元格为空   |
| combineNum > 行数                 | combineNum 声明值超过数据行数                        | 合并到末行即停止，不越界                                | 否     | 正常合并         |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测。table 是 P0 核心数据展示控件，但本次为布局/报表能力补齐（非 auth/API 契约/流控），focused 单测覆盖每项能力的 happy path + 边界即可。

## Execution Plan

### Phase 1 - Schema 契约 + 命名裁定

Status: completed
Targets: `packages/flux-renderers-data/src/schemas.ts`、`docs/components/table/design.md`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`

- Item Types: `Decision | Fix`

- [x] 裁定字段最终命名（以下为提案，Phase 1 终裁）：
  - 表级 `columnResize?: boolean`（总开关，默认 `true` 当有任意列声明 `resizable`）。
  - 列级 `resizable?: boolean`、`minWidth?: number`、`maxWidth?: number`。
  - `affixHeader?: boolean`（X5 决策表已用此名；不改为 `stickyHeader` 以保持决策表一致性）。
  - 聚合行类型 `TableSummaryRow = { cells: Array<{ column: string; value: SchemaInput | string; align?: 'left'|'center'|'right' }> }`，表级字段 `prefixRow?: TableSummaryRow`（顶部）、`affixRow?: TableSummaryRow`（底部）。
  - 单元格合并：`combineNum?: number`（合并前 N 列相同值的连续行——amis 语义保留，因非皮肤枚举命名；Phase 1 确认是否同时需要 per-cell `colSpan`/`rowSpan`）。
- [x] 将字段写入 `TableSchema` / `TableColumnSchema` + 新增 `TableSummaryRow` 类型。
- [x] 在 renderer definition 中注册新字段（`data-renderer-definitions.ts`）。
- [x] `table/design.md` §4 schema 设计节补齐；§5 字段分类同步（新字段均 `value`）。

Exit Criteria:

- [x] `TableSchema`/`TableColumnSchema`/`TableSummaryRow` 类型声明可通过 `pnpm --filter @nop-chaos/flux-renderers-data typecheck`。
- [x] `table/design.md` schema/字段分类节与新类型一致。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - 列宽拖拽 resize

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`、新建 `table-renderer/use-column-resize.ts`

- Item Types: `Fix | Proof`

> 参考设计.md §11 拆分建议：新增 `useColumnResize` capability hook，不塞回巨型 view 文件。

- [x] 新建 `useColumnResize` hook：管理列宽本地状态（`Record<string, number>`，key 为 column name 或序号），提供 `onResizeStart`/`onResize`/`onResizeEnd` handler + 当前宽度读取。
- [x] `table-header-row.tsx`：当 `columnResize !== false` 且列 `resizable !== false` 时，在 `<TableHead>` 右边缘渲染 drag handle（`data-slot="table-column-resize-handle"`）。
- [x] drag handle 拖拽时更新对应列宽度，尊重 `minWidth`/`maxWidth` 约束。
- [x] 宽度变化同步到 header cell + body cell（通过 `effectiveMainColumns` memo 把 width override 同步到 `<TableBodyRows>` 输入，body 用同一列宽 style 渲染）。
- [x] resize 与 fixed column 共存验证（fixed 列宽度也可 resize）。
- [x] resize 与虚拟滚动共存验证（resize 不 break virtual padding 计算，宽度仅改 column.width）。

Exit Criteria:

- [x] 声明 `resizable` 的列有 drag handle，拖拽后列宽变化且尊重 min/max 约束。
- [x] resize 后 header 与 body 宽度同步。
- [x] resize + fixed column + 虚拟滚动组合不 break。
- [x] `table/design.md` 决策表 "列宽拖拽 resize" 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Sticky header（affixHeader）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`、`table-renderer/table-header-row.tsx`

- Item Types: `Fix | Proof`

- [x] `affixHeader: true` 时，为 `<TableHeader>` / `<TableHead>` 行应用 `position: sticky; top: 0` 样式（通过 marker class 或 inline style）。
- [x] 当 `scrollHeight` 声明时（外层滚动容器存在），thead 在容器内吸顶。
- [x] 当 `virtualEnabled` 时（虚拟滚动容器存在），thead 在虚拟容器内吸顶。
- [x] 无滚动容器时（无 `scrollHeight` 且无 virtual），thead 已在顶部，sticky 无视觉副作用但不报错。
- [x] sticky header 与 fixed column 共存验证（fixed 列的 header 同时 sticky + 固定定位）。

Exit Criteria:

- [x] `affixHeader: true` + 滚动容器存在时，滚动 body 行 thead 保持可见。
- [x] sticky + fixed column + virtual 组合不 break。
- [x] `table/design.md` 决策表 "表头吸顶 sticky header" 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - 聚合行（prefixRow / affixRow）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`、新建 `table-renderer/table-summary-row.tsx`

- Item Types: `Fix | Proof`

- [x] 新建 `TableSummaryRow` 渲染组件：接收 `TableSummaryRow` schema + columns 列表，渲染 `<TableRow>` 内的 `<TableCell>` 序列，cells 按 `column` name 对齐到对应列。
- [x] `prefixRow` 渲染为独立 `<TableBody>`（位于 thead 后、数据行 `<TableBodyRows>` 前）的 summary 行，位于数据行**之前**。
- [x] `affixRow` 渲染为 `<tfoot>`（复用已存在但未使用的 `TableFooter` 原语 `packages/ui/src/components/ui/table.tsx:32-40`），位于数据行**之后**、**在 `<Table>` 内部**（不使用现有 `footer` region 的外部 `<div>`）。
- [x] cell `value` 支持 `${expr}` expression 求值（透传到 scope via `helpers.evaluate`），结果渲染为文本。
- [x] cell 数 ≠ column 数时按 name 对齐，缺失列渲染空 `<td>`。
- [x] 聚合行与 resize 共存验证（聚合行 cell 宽度跟随列宽变化，通过 `effectiveMainColumns` 输入）。
- [x] 聚合行与虚拟滚动共存验证（聚合行不参与虚拟化，始终渲染在 `<tfoot>`/prefix `<TableBody>`）。

Exit Criteria:

- [x] `prefixRow` 声明时在数据行前渲染对齐列的 summary 行；`affixRow` 声明时在数据行后 `<tfoot>` 渲染。
- [x] cell value expression 求值正确。
- [x] 聚合行 + resize + virtual 组合不 break。
- [x] `table/design.md` 决策表 "聚合行 footer" 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - 单元格合并（combineNum）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、新建 `table-renderer/combine-cells.ts`

- Item Types: `Fix | Proof`

- [x] 新建 `combine-cells.ts` helper：接收 rows + `combineNum`，计算每个 cell 的 `rowSpan`（连续相同值合并）。
- [x] `table-body-row-rendering.tsx`：render data row 时，按 helper 结果对被合并的 cell 设 `rowSpan={n}`，被覆盖的 cell 不渲染（`return null`）。
- [x] combineNum 指定从前 N 列参与合并（amis 语义：前 N 列做连续值合并）。
- [x] 合并与 resize 共存验证（合并后 cell 宽度正确，column.width 来自 `effectiveMainColumns`）。
- [x] 合并与 fixed column 共存验证（fixed 列也参与 rowSpan）。
- [x] 合并与虚拟滚动共存验证（`virtualEnabled: true` 时 combinePlan 退化为不合并，已在 design.md §4/§12 标注限制）。

Exit Criteria:

- [x] `combineNum: N` 声明时，前 N 列连续相同值的行合并，被合并的 cell 不重复渲染。
- [x] 合并 + resize + fixed column 组合不 break。
- [x] 合并 + 虚拟滚动的组合行为已在 design.md 标注（virtual 开启时退化为不合并，避免跨窗口 rowSpan 断裂）。
- [x] `table/design.md` 决策表 "单元格合并" 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 6 - 测试 + design.md 收口

Status: completed
Targets: 新建 `packages/flux-renderers-data/src/__tests__/table-e1b-enhancements.test.tsx`、`docs/components/table/design.md`

- Item Types: `Proof | Follow-up`

- [x] 新建 `table-e1b-enhancements.test.tsx`，覆盖：resize drag 改变宽度 + min/max 约束、affixHeader sticky 效果（getComputedStyle 验证 `position: sticky`）、prefixRow/affixRow 渲染 + cell 对齐 + expression 求值、combineNum 合并 + rowSpan 正确性。
- [x] negative case：`columnResize: false` 时无 drag handle、无 `affixHeader` 时 thead 无 sticky、无 `combineNum` 时无合并。
- [x] `table/design.md` §2 决策表所有 "计划实现（E1b）" 行翻转为 "实现"；§7 ownership 节补列宽 local state 说明；§11 拆分节补 `useColumnResize`/`table-summary-row`/`combine-cells`。
- [x] `amis-baseline-matrix.md` table 行无 retained 决策变化则标注 No update required。

Exit Criteria:

- [x] `table-e1b-enhancements.test.tsx` 全部通过。
- [x] `table/design.md` 决策表 E1b 行全部为 "实现"，无残留 "计划实现（E1b）"。
- [x] `docs/logs/` 对应日期条目已更新。

## Draft Review Record

- Reviewer / Agent: fresh plan-review sub-agent (REVIEW_PLANS step)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 无 Blocker / Major。Minor（不阻塞，留待下游 closure/deep audit 处理）：
  1. Phase 1 `Item Types: Decision` 实际包含 schema 写入 + renderer definition 注册的代码改动，更精确为 `Decision | Fix`。
  2. Phase 1 `Targets` 列出 `schemas.ts` 与 `table/design.md`，但 L92 引用 `data-renderer-definitions.ts`，应补入 Targets。
  3. Phase 2-5 标 `Fix | Proof`，但实际 Proof（focused test）集中在 Phase 6。`建议有测` 档位允许此排布，不阻塞。
- Reference audit (live repo): `TableSchema` @ schemas.ts:65-117 ✓、`TableColumnSchema` @ schemas.ts:39-57 ✓、`width` @ L47 ✓、`fixed` @ L48 ✓、`footer` @ L80 ✓、`TableFooter` @ ui/components/ui/table.tsx:32-40 ✓ 且全仓库零引用 ✓、`table-renderer.tsx` 512 行 ✓、footer rendering @ L507-509 ✓、`</Table>` @ L490 ✓、`table-renderer/` 22 文件 ✓、目标已存在文件 `table-header-row.tsx` / `table-body-row-rendering.tsx` ✓、待新建文件（`table-summary-row.tsx`、`combine-cells.ts`、`use-column-resize.ts`）无冲突 ✓。

## Closure Gates

- [x] 列宽 resize 已实现且有 focused test（含 min/max 约束）
- [x] affixHeader sticky 已实现且有 focused test
- [x] prefixRow/affixRow 聚合行已实现且有 focused test（含 cell 对齐 + expression）
- [x] combineNum 单元格合并已实现且有 focused test
- [x] E1b 四项能力与已有 fixed column / 虚拟滚动 / resize 组合不退化
- [x] 不存在被静默降级到 deferred 的 in-scope 能力
- [x] `table/design.md` 决策表 E1b 行全部翻转为 "实现"
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（注：playground `performance-table-page.test.tsx > records a completed table single-row locality session` 在 stash 还原前已 pre-existing 失败，与本 plan 改动无关；flux-renderers-data 全 40 文件 / 357 用例全过，含新增 17 例）

## Deferred But Adjudicated

### column resize widths 的 scope-level 持久化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 做 local-only 状态（resize 宽度存在组件 state，卸载后丢失）。Scope-level 持久化（`columnWidthsOwnership`/`columnWidthsStatePath`）需要 ownership 模型扩展 + 上层 crud 集成验证，复杂度独立于 resize 基础行为。
- Successor Required: yes
- Successor Path: 后续 column-widths-persistence plan，或随 E1c（table 高级能力）一并收口。
- **Resolved (2026-06-21)**: 已由 E1c plan (`docs/plans/2026-06-21-0527-e1c-table-advanced-capabilities-plan.md`) Phase 7 收口。`useColumnResize` 已接 `columnWidthsOwnership`/`columnWidthsStatePath`：`scope` 时 resize 结果写 `columnWidthsStatePath`（`Record<columnName, width>`）；缺 path 退化为 local（dev warn，Failure Path `e1c-widths-scope-no-path`）；`controlled` 只读上游；`local` 保持 baseline。focused 单测 `packages/flux-renderers-data/src/__tests__/table-e1c-column-widths-persistence.test.tsx` 覆盖 scope 写入/读取、controlled 只读、local baseline、缺 path 退化、merge 初始+scope。

## Non-Blocking Follow-ups

- E1c（树表/行拖拽/多列排序/多级表头/copyable 单元格）依赖本 plan 的 resize + cell 渲染基础设施收口后启动。
- per-cell `colSpan`/`rowSpan`（非 combineNum 的声明式合并，而是 cell 级显式 span）若后续有需求，扩展 `TableColumnSchema` 或 cell region。

## Closure

Status Note: E1b 四项桌面端报表能力（列宽拖拽 resize、表头吸顶 sticky header、聚合行 prefixRow/affixRow、单元格合并 combineNum）全部落地，focused 单测齐全，`table/design.md` 决策表 E1b 4 行全部翻转为 "实现"，唯一 deferred 项（column resize widths 的 scope-level 持久化）已显式 adjudicated 为 optimization candidate 并指定 successor。本 plan 可关闭。

Closure Audit Evidence:

- Reviewer / Agent: 独立 closure-audit sub-agent（CLOSURE_AUDIT step，fresh session，不复用执行阶段 task session）
- Audit scope: 重读整份 plan + live repo 抽查 + Closure Gates 逐条核对 + deferred 诚实性核对 + 五点一致性核对
- Landing verification（live repo, `packages/flux-renderers-data/src/`）：
  - Phase 1: `schemas.ts:68` `TableSummaryRow`、`schemas.ts:103-107` `columnResize`/`affixHeader`/`prefixRow`/`affixRow`/`combineNum`；`data-renderer-definitions.ts:319-323` 注册全部新字段（`kind: 'prop'`）。
  - Phase 2: `table-renderer/use-column-resize.ts` 存在（`isColumnResizable` + min/max clamp + drag handler）；`table-header-row.tsx:142` 通过 `isColumnResizable` 渲染 `data-slot="table-column-resize-handle"`；`table-renderer.tsx:255-277` wire `useColumnResize` + `effectiveMainColumns` 同步 header/body 宽度。
  - Phase 3: `table-header-row.tsx:71` `affixHeader === true` → `isAffix` 应用 sticky（marker class `nop-table-header-sticky`）。
  - Phase 4: `table-renderer/table-summary-row.tsx` 导出 `TableSummaryRowView`（cell 按 column name 对齐 + `helpers.evaluate` expression 求值）；`table-renderer.tsx:22,538,548` 引入并使用 `TableFooter`（此前零引用）渲染 `affixRow`；`table-renderer.tsx:499-502` 渲染 `prefixRow`。
  - Phase 5: `table-renderer/combine-cells.ts` 导出 `computeCombinePlan` + `getCellRowSpan`（amis `combineNum: N` 语义，virtual 退化）；`table-body-rows.tsx:35,59,82,108,132,140,257,264` 串接 `combineNum` → `computeCombinePlan` → `renderDataRow`；`table-renderer.tsx:534` 透传 `combineNum`。
  - Phase 6: `__tests__/table-e1b-enhancements.test.tsx` 存在，17 用例覆盖 resize helper + affixHeader sticky + resize handle 正/负向 + `TableSummaryRowView`（name 对齐 / 缺失列空 td / expression 求值 / align class）+ `computeCombinePlan`（空 plan / virtual 退化 / 多列合并）+ combineNum 应用 rowSpan / 被合并 cell 不渲染。
- Decision table sync: `docs/components/table/design.md` §2 决策表 E1b 4 行（L34-L37）全部为 "实现"，无残留 "计划实现（E1b）"；E1c 行保持 "计划实现（E1c）" 不变；§7 ownership + §11 拆分节 + §12 风险节按 Phase 6 同步。
- Owner-doc sync: `docs/components/existing-components-improvement-roadmap.md` E1b `todo`→`done`；`amis-baseline-matrix.md` table 行无 retained 决策变化（No update required）。
- Daily log: `docs/logs/2026/06-21.md` 第 3-13 行含完整 Phase 1-6 + owner-doc + 验证记录。
- Workspace verification（执行阶段记录）：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26；`pnpm --filter @nop-chaos/flux-renderers-data test` = 40 files / 357 tests 全过（含新增 17 例）。（playground `performance-table-page.test.tsx` 一例 pre-existing 失败与本 plan 无关；未运行 e2e/Playwright，故非 AGENTS.md 定义的 unit+e2e full-green。）
- Five-point consistency: Plan Status `completed` / 6 Phase Status 全 `completed` / 6 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含本次 audit 项）/ `docs/logs/2026/06-21.md` 收口记录 — 彼此一致。
- Anti-hollow: `useColumnResize`、`TableSummaryRowView`、`computeCombinePlan`、`TableFooter`（`affixRow`）全部通过 `table-renderer.tsx` 在运行时被调用，无空函数体 / 无 `return null` 占位 / 无注册但不可达路径。
- Deferred honesty: 唯一 deferred 项 "column resize widths 的 scope-level 持久化" 为 optimization candidate（local state 已满足当前 supported baseline），明确标 `Successor Required: yes` + successor path；无 in-scope live defect / contract drift 被静默降级。

Follow-up:

- column resize widths 的 scope-level 持久化（`columnWidthsOwnership`/`columnWidthsStatePath`）→ 后续 column-widths-persistence plan 或随 E1c 收口。
- per-cell `colSpan`/`rowSpan`（非 combineNum 声明式合并）→ 若后续需求，扩展 `TableColumnSchema` 或 cell region。
- E1c（树表 / 行拖拽 / 多列排序 / 多级表头 / copyable 单元格）依赖本 plan resize + cell 渲染基础设施，由后续 plan 收口。
