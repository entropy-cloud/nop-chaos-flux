# R2 第 6 轮递归扩展发现 — G3（round-06-g3）

> 轮次: Round 06（递归扩展 · **收敛终判轮，最严格价值判据**） · 审查日期: 2026-08-29 · HEAD `0f183874a`（与 R1–R5 同基线）
> 组号: G3（data / dashboard / pivot） · agent: general（fresh session，只读审查）
> 派发输入: `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + `dedup-baseline.md`（§1–§4） + round-01（按 `\[G3-` 定位精读）/ round-02-compact / round-03-compact 全文 / round-04（按 `\[G3-` 定位精读）/ round-05-g3 全文（含"核对过且不构成发现"清单）
> 本轮价值判据: 只有前 5 轮所有方法面都未触及的**全新根因**、通过真实用户影响检验、且与累积 269 条（G3 组 49 条，按 round-05 台账口径）逐根因比对为全新时才立案；新实例注明引根编号且修复互不覆盖。已有根因复述、纯视觉偏好、零散细节一律不立案。

## 检查范围（逐文件）

**目标包**: `packages/flux-renderers-data/src/`（82 非 test 文件）、`packages/flux-renderers-dashboard/src/`（14 非 test 文件，含 `editor/`）、`packages/flux-renderers-pivot/src/`（7 非 test 文件）。dashboard 注册面口径: `dashboard` + `dashboard-editor` 2 个 type（`type: 'value'` 是 fieldRules 非 renderer type，未误计）。`*.test.*`、`test-support*` 不入审。

**本轮亲自精读**（前 5 轮未逐行覆盖或需为终判补证的面）:

- data 包 table-renderer: `combine-cells.ts`（全文）、`table-body-rows.tsx`（全文）、`table-body-row-rendering.tsx`（全文）、`table-expanded-row.tsx`（全文）、`table-cell-chrome.tsx`（全文）、`table-cell-popover.tsx`（全文）、`table-flattened-items.ts`（全文）、`table-loading-overlay.tsx`（全文）、`table-summary-row.tsx`（全文）、`table-quick-edit-cell.tsx`（全文）、`table-header-tree.ts`（全文）、`table-pagination-bar.tsx`（全文）、`pagination-renderer.tsx`（全文，R1 已报条目的现状复核）、`fixed-columns.ts`、`column-width-measure.ts`、`use-table-filter.ts`、`use-table-handle.ts`
- data 包其余: `tree-renderer.tsx`（全文，前轮仅报过空态/aria-multiselectable/tree-search，主体验证为未逐行面）、`list-renderer.tsx`（全文）、`use-infinite-scroll.ts`（全文）、`crud-query-region.tsx`（全文）、`statistics-renderer.tsx`、`stat-tile-renderer.tsx`（全文）、`data-source-renderer.tsx`（全文）、`responsive.ts`（全文）、`tree-focus-nav.ts`、`sparkline-renderer.tsx` + `sparkline-path.ts`（全文）
- dashboard 包: `editor/editor-session-hook.ts`、`editor/use-dashboard-editor-handles.ts`（全文；其余 editor 五件套/layout-math/dashboard-renderer 依 R5 全文精读结论 + 本轮反查交叉核实）
- pivot 包: 依 R5 全文精读结论，本轮以 grep 反查（console/color/事件桥）确认无新实例

**方法面**: ① 以 R4"组合矩阵"方法的残余象限收口——系统枚举 `combineNum`（单元格合并）与其余 body 行插入源（expandable 展开行 / responsive 展开模式 / prefixRow/affixRow / 虚拟化）的配对；② 写入/渲染通道反查：rowSpan 计划的索引空间（纯数据行）vs DOM 行序列（含交错展开行）逐行比对；③ 经典缺陷类 grep 终扫（硬编码色 / Spinner / aria-label / console 直出 / i18n 字面量）确认 R1–R5 已报类无未立新实例。

## 发现汇总

| 严重程度 | 数量 | 编号     |
| -------- | ---- | -------- |
| HIGH     | 0    | —        |
| MEDIUM   | 1    | 视角8-01 |
| LOW      | 0    | —        |

共 **1 条**。G3 组累积（R1–R6）: 26 + 9 + 7 + 4 + 3 + 1 = **50 条**；全审查累积: 269 + 1 = **270 条**。
收敛趋势（G3）: 26 → 9 → 7 → 4 → 3 → 1。本轮唯一发现位于 R4 组合矩阵未闭合的 `combineNum × 展开行` 象限；派发指令列出的前 5 轮方法面（列契约/虚拟化组合、crud 多区块、chart 交互、dashboard 编辑器、树表/copyable）经本轮终扫**均无新根因**。**G3 组审查收敛，无继续递归价值。**

---

### [G3-R6-视角8-01] `combineNum` 单元格合并 × 展开行并用时 rowSpan 跨越交错的展开详情行：表格网格错位、详情行被合并单元格吞没（[G3-R4-视角4-01] 索引空间族的互补象限新实例）

- **文件**: `packages/flux-renderers-data/src/table-renderer/combine-cells.ts:41-53`（计划仅在 virtual 时降级）、`:63-95`（rowSpan 按纯数据行序列计数）；`packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:192-199`（非虚拟路径以 `virtualEnabled: false` 产出真实合并计划）、`:209-284`（数据行与展开详情行在同一 Fragment 内交错渲染）；`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:327-332`、`:517-529`（rowSpan 原样下发到 `<TableCell>`）；`packages/flux-renderers-data/src/table-renderer/table-expanded-row.tsx:29-31`（展开行 = 单个 `colSpan={columnCount}` 单元格）；对照 `docs/components/table/design.md:252`（E1b 仅登记 combine×virtual 限制）
- **证据片段**:
  ```ts
  // combine-cells.ts:51-53 —— 唯一的退化护栏只认 virtual，展开行交错不在判定内
  if (options.virtualEnabled) {
    return EMPTY_COMBINE_PLAN;
  }
  ```
  ```tsx
  // table-body-rows.tsx:227-283 —— 数据行 <tr> 后紧邻交错的展开详情 <tr>（同一 tbody）
  <React.Fragment key={rowKey}>
    {renderDataRow({ kind: 'data', entry, rowScope, rowKey, ... }, ..., combinePlan, rowIndex, ...)}
    {isExpanded && schemaProps.expandable?.expandedRowRegionKey
      ? renderExpandedRow({ kind: 'expanded', rowKey, columnCount }, ...)
      : ...}
  </React.Fragment>
  ```
  ```tsx
  // table-expanded-row.tsx:30-31 —— 展开行是占满全宽的单单元格行
  <TableRow data-slot="table-expanded-row">
    <TableCell colSpan={item.columnCount} data-slot="table-expanded-cell">
  ```
- **严重程度**: MEDIUM（组合触发 + 交互后显现，沿 [G3-R4-视角4-01]/[G3-R4-视角8-02] 的 MEDIUM 校准；同类全表错位的静态形态先例 [G3-视角5-01] 为 HIGH）
- **现状**: `combineNum` 合并计划在**纯数据行序列**上计算（rowSpan = 连续同值数据行数），且仅当 `virtualEnabled` 时整体退化为不合并（E1b 契约）。非虚拟表格同时配置 `expandable.expandedRowRegionKey`（或 responsive 展开模式产生 `responsiveHiddenColumns`）时，展开详情 `<tr>` 直接交错插在数据行之间；rowSpan 是**物理 DOM 跨行数**，于是起始于合并区内的 rowSpan=N 单元格会把 N 个 `<tr>`（含交错其间的展开行）全部覆盖。后果链：① 展开行的 `colSpan={columnCount}` 单元格发现其首部网格槽位已被进行中的 rowSpan 占用，内容整体右移并溢出表右缘（table-layout:auto 按最大需求重排列宽，**整表所有行的列边界随之错位**）；② 合并单元格视觉上"吞没"展开详情行，详情内容不再与表头对齐。`data-renderer-definitions.ts:248` 将 `combineNum` 暴露给 designer，`data-schema-validation.ts` 对该组合无互斥校验，design.md E1b 只登记 virtual 限制——用户按文档可合法配置出该组合。
- **行业惯例**: 主流表格库对"合并 × 展开行"均以不兼容即降级/文档化限制处理：AG Grid 文档明确 full-width detail row 与 row spanning 的互斥场景并在不兼容时禁用 spanning；Ant Design Table 官方 merged-cells demo 与 expandedRowRender demo 分立、组合无支持承诺；本项目自身已立 E1b 先例（combine×virtual → 退化为不合并）——同一"rowSpan 不能跨越非数据行"的退化契约未覆盖展开行这一同构场景。
- **用户影响**: 用户搭建分组报表（地区/部门列合并）+ 行展开详情（该两能力的自然组合）。点开合并区内任意行的展开箭头后：详情面板右移错位、合并单元格横跨详情行、整表列线抖动，操作列/固定列随重排偏移——表格呈现"散架"态，且仅当展开落点在合并区内才触发，用户与作者都无法直觉归因到两个合法配置的组合。
- **建议**: 镜像 E1b 的退化契约：`table-renderer.tsx` 调 `computeCombinePlan` 时把"可能插入展开行"作为第二个退化条件传入（`options.expandedRowsPossible = Boolean(schemaProps.expandable?.expandedRowRegionKey) || responsiveHiddenColumns.length > 0`），为真时返回 `EMPTY_COMBINE_PLAN`（或在 `computeCombinePlan` 内按展开边界切断 span 并 clamp 至下一展开行之前，最小闭环取退化即可）；同步在 `docs/components/table/design.md` §12/E1b 补 "combine + expandable/responsive 展开模式" 限制条目。补断言："combineNum=1 三行同值 + 展开 inside 合并区的第 2 行 → 展开行 colSpan 自第 1 列起、无列错位（或合并退化为不合并）"。
- **去重自检（条目级）**: ① 引根 [G3-R4-视角4-01]（虚拟化 × 展开行 × 拖拽排序索引错位，MEDIUM）——同属"纯数据行索引空间 vs 交错 DOM 行序列"分歧族，按 dedup §1"同类根因的新实例"上报：彼条是**虚拟路径**把含展开条目的 `virtualRow.index` 当数据行索引进**拖拽重排**（索引偏移），本条是**非虚拟路径**把数据行序数 rowSpan 当物理跨行数下到含交错展开行的 DOM（网格几何），触发条件互斥（虚拟化时本条退化、非虚拟化时彼条路径不激活），修复点（拖拽索引换算 vs 合并计划退化护栏）互不覆盖。② ≠ [G3-视角5-01]/[G3-R3-视角8-01]（body 额外列缺表头/colgroup 配对）：本条无任何"多余 td"，每个 body 单元格都有配对表头，错位源于 rowSpan 跨行，修复（合并退化）与列契约补齐互不覆盖。③ ≠ [G3-R4-视角8-02]（嵌套表头 sticky top:0 重叠）：彼为表头粘性偏移，本为表体 rowSpan 几何。④ 经 grep 核实 R1–R5 G3 组无任何 combineNum 相关条目。
- **复核状态**: 未复核

---

## 弃报留档（本轮核对过且不构成发现，防复核重复提问）

- **tree-renderer.tsx 主体验证**（前轮未逐行面）: 键盘导航完整（ArrowUp/Down/Home/End roving、ArrowRight 展开/进子级、ArrowLeft 折叠/回父级、Enter/Space 切换）、搜索态强制展开与折叠守卫、G17 焦点回迁、`aria-level`/`aria-expanded` 齐备——无新缺陷。`aria-selected={isTabbable}`（tree-renderer.tsx:277）以选中语义表达 roving 焦点、且组件无选择能力，与已立 [G3-视角9-03]（声明 aria-multiselectable 但无多选行为）同属"tree 选择语义空壳"家族的同一表现面，随该条一并修复，不另立。
- **table-cell-popover 溢出检测无 ResizeObserver**（table-cell-popover.tsx:90-102）: `showOnOverflow` 仅在挂载/rowValue 变化时测 `scrollWidth > clientWidth`，列宽拖拽/容器缩放后图标显隐可能滞后一拍；边缘场景、交互影响为一帧级不一致，低于终判门槛。
- **responsive.ts 主列回退命名索引错位**（responsive.ts:38-59）: 未命名列的 `left-${index}` 回退键在过滤子序列与全序列两处索引不一致，responsive 展开模式下未命名列可能落错 primary/hidden 集——仅 schema 未配 `name` 的退化形态可触发，属可配置范围外用法，弃报留档。
- **pagination-renderer prev/next 禁用形态**（pagination-renderer.tsx:239-249/312-324）: `aria-disabled` + JS `if (canGoPrev)` 双保险，无 `pointer-events-none` 样式退化——即 [G3-视角3-03]（独立 pagination 禁用态无视觉禁用样式）已立条目的同一文件同一表面，不重复计数。
- **list-renderer 无限滚动 loading/error 文案无 Spinner、无重试**: 即 [G3-视角5-02]/[G3-视角5-03] 已立条目（两条原文即引用 `list-renderer.tsx:467-473`/`:405-413`），本轮复读确认未修复但不另立。
- **data-source-renderer 返回 null / statistics-renderer 纯计数文本 / use-table-handle、capability-action-context、table-event-context、table-header-tree、column-width-measure、fixed-columns、use-table-filter、use-infinite-scroll（并发守卫/短页续载完善）、crud-query-region**: 均为无独立 UI 表面或实现正确的逻辑面，无发现。
- **pivot 包 / dashboard editor 五件套 / chart 三件套 / crud 主链**: 依 R5 全文精读结论维持原判（R5"核对过且不构成发现"清单 11 项全部复核有效），本轮 grep 终扫（硬编码色仅剩已立 stat-tile 条目、console 直出均为 dev 告警或内部 error log、无未立 i18n 字面量）零新实例。

## 去 重 自 检 声 明

本轮 1 条发现已与全部 269 条既有发现按根因比对（G3 组 49 条逐条、其余组按 round-02/03 compact + round-04/05 grep 定位核验）：无完全重复；唯一条目为已立"索引空间分歧"根因（[G3-R4-视角4-01]）的跨路径新实例，已注明引根编号并论证触发条件互斥、修复互不覆盖。dedup-baseline §1（ma5-ux 6 条已修复）、§2（16 项已登记缺口未作为发现）、§3（8 条误报对照未报）、§4（维度 09-12/20 边界未越界）全程合规。

## 结论

新发现 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。位于 R4 组合矩阵唯一未闭合象限（combineNum × 展开行）；派发重点与前 5 轮全部方法面经终扫无新根因，G3 组发现序列 26 → 9 → 7 → 4 → 3 → 1 已按收敛判据闭合。**G3 组审查收敛。**
