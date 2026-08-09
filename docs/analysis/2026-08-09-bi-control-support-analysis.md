# nop-chaos-flux BI 应用前端控件支持分析

> 生成日期：2026-08-09
> 范围：评估 flux 现有前端控件对 BI 应用的支持度，重点回答「是否需要新增 pivot-table」
> 关联：`docs/analysis/2026-08-04-control-gap-survey.md`（Tier 2 已列 pivot-table 候选）、`docs/plans/455-table-input-table-doc-gap-and-footer-plan.md`（「固定列 + 后端 pivot」先例）
> 结论前置：**需要 pivot-table，但不是 BI 支持的最大缺口；BI 控件族（编排层 + KPI + 筛选联动）应先于或与 pivot-table 并行补建。**

---

## 1. 现有 BI 相关控件盘点

### 1.1 已具备的控件（`flux-renderers-data` 为主）

| 控件                              | 能力                                                                                                                                                              | BI 场景定位                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `chart`                           | recharts 5 种类型（bar/line/pie/scatter/area），legend/stacked/grid/colors/referenceLines/band/markers，title/empty slot，空态硬契约                              | 图表展示层                    |
| `table`                           | 树表、多级表头、单元格合并（`combineNum` 分组报表）、聚合行（`prefixRow`/`affixRow`）、固定列、列显隐/排序/筛选/列宽拖拽、行拖拽排序、行级聚合表达式（`${expr}`） | 明细/汇总列表                 |
| `crud`                            | 查询表单 + 表格 + 分页 + 工具栏编排，polling/infinite-scroll                                                                                                      | 业务列表页                    |
| `data-source`                     | 数据加载编排（loader）                                                                                                                                            | 数据接入                      |
| `statistics`                      | 仅"总条数"数字显示                                                                                                                                                | KPI 雏形（功能极弱）          |
| `spreadsheet` / `report-designer` | Excel 式多 sheet 编辑、打印报表设计                                                                                                                               | 报表/填报（**无交叉表能力**） |

### 1.2 已具备的架构支撑

- `data-source` loader + CRUD 编排：服务端预聚合数据的消费通路已通（OLAP 引擎 SQL 结果 → JSON → chart/table）。
- `table` 的静态能力组合（多级表头 + 合并单元格 + 聚合行）**可以渲染服务端预聚合后的交叉结果**，即"静态透视"可用。

---

## 2. BI 应用的前端控件谱系 vs 现状差距

完整 BI 应用（对标 Superset/Metabase/DataEase）需要 4 层控件：

| 层             | 必需控件                                                                | Flux 现状                    | 差距                                |
| -------------- | ----------------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| 可视化层       | 柱/线/饼/散点/面积/双轴/热力图/地图/仪表盘                              | 5 种基础图表                 | 双轴、热力图、地图、brush/zoom 缺失 |
| 交叉分析层     | **pivot-table（透视表）**                                               | 仅静态交叉（table 组合模拟） | **交互式透视缺失**                  |
| 编排层（看板） | panel-chrome（面板外壳）、dashboard-filter（全局筛选联动）、grid layout | 无                           | **整层缺失**                        |
| KPI 层         | stat-tile（大数字 + 同比环比 + sparkline）、条件格式                    | statistics 仅总条数          | KPI 卡片、条件格式缺失              |

### 差距量化

- 传统 BI 页面构成（按仪表盘调研）：KPI 卡片 ~30%、图表 ~40%、表格 ~20%、筛选器 ~10%。
- 目前 Flux 只能覆盖"图表 + 明细表格"两个片段，**看板骨架（编排 + KPI + 筛选联动）完全没有**——这意味着即使有 pivot-table，也无法组装出一个像样的 BI 页面。

---

## 3. pivot-table 专项分析

### 3.1 为什么需要

- 透视表（行列维度和度量二维交叉 + 小计/总计 + 下钻）是 BI 经营分析、财务报表的标志性交互形态，无法用静态表格替代的用户诉求高频出现。
- 参考实现信号：pivot-table-uni（专业透视库）、tanstack table（table-core 已含 pivot 能力）、Excel 原生透视（spreadsheet 未内置）。

### 3.2 三条实施路径

| 路径                          | 做法                                                                                                                                              | 成本                                                 | 能力                                      | 建议                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| A. 静态透视（先做）           | `table` 增加"透视映射"schema 模式（`rowGroup`/`columnGroup`/`value` 声明 + 服务端已聚合数据），复用现有多级表头/聚合行/合并渲染                   | 低（table 增强）                                     | 只读交叉展示，列固定                      | **一期落地**，与 455 号 plan「固定列 + 后端 pivot」策略一致      |
| B. 交互式 pivot-table（后做） | 独立 renderer（新 type `pivot-table`），基于 **VTable `PivotTable` 基座**（命令式封装，参照 Chat2DB 模式），前端维度/度量建模 + 展开下钻 + 动态列 | 中（独立包 + schema 适配，transform 由 VTable 承担） | 完整透视交互（含小计/总计/下钻/编辑聚合） | **二期立项**，首选 VTable；pivot-table-uni / tanstack 作对照参考 |
| C. 依赖重型库（ag-grid 等）   | 引入商业许可网格库                                                                                                                                | 中高（许可风险 + 依赖隔离）                          | 完整                                      | 不推荐：ag-grid pivot mode 需商业许可，VTable MIT 无此问题       |

### 3.3 落点建议

- 一期（路径 A）：`table` 能力增强，落 `flux-renderers-data`，无需新包。
- 二期（路径 B）：建议独立包（参照 `graph`/`gantt` 独立包先例，透视引擎依赖隔离），或并入 `flux-renderers-data`。
- 数据变换管线（维度 → 行/列/值映射、多度量聚合）建议下沉 `flux-runtime` 或复用 `data-source` 后处理层，保持 renderer 为表现层。

### 3.4 VTable（字节 VisActor）专项调研

> 调研对象：`~/sources/vtable`（v1.26.6，MIT）+ `~/sources/Chat2DB`（chat2db-community-client）实际应用方式。

**结论：VTable 原生支持透视表，且是路径 B 的现成基座候选（比 pivot-table-uni 完整度更高）。**

| 项       | 事实                                                                                                                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透视能力 | `PivotTable` / `PivotTableSimple` 主类；`IPivotTableDataConfig`：`aggregationRules`（聚合）、`sortRules`、`filterRules`、`totals`（小计/总计）、`derivedFieldRules`、`calculatedFieldRules`（计算字段）、`updateAggregationOnEditCell`；另有 `PivotChart` 透视图 |
| 许可     | MIT（Bytedance），无商用风险                                                                                                                                                                                                                                     |
| 渲染     | Canvas，百万行级性能；配套 `react-vtable`/`vue-vtable`/`openinula-vtable` 封装、`vtable-editors`（编辑）、`vtable-export`（导出）、`vtable-sheet`、`vtable-gantt`、`vtable-search`、`vtable-plugins`                                                             |
| 双轨注意 | Canvas 渲染与 flux 现有 DOM table 体系分离，须独立包隔离依赖（graph/gantt 先例）                                                                                                                                                                                 |

**Chat2DB 的应用模式（`chat2db-community-client`，对 flux 集成最有借鉴价值）**：

- **定位**：Chat2DB 用 VTable 做 SQL 查询**结果集表格**（`ListTable`，非透视），封装为 `blocks/CanvasTable`（`CanvasTable/index.tsx`）供 `SearchResult/ResultSetTable` 使用；`blocks/Abstract` 另有抽象层。
- **封装模式**：**不用 react-vtable**，命令式 `new VTable.ListTable(tableRef.current, tableOption)` + `forwardRef` 自封装。props 契约：`records`、`columns`、`options`（原生 option 透传）、`onInit`（实例回调）、`onCopy`/`onPaste`、`tooltip`。
- **单向数据流 + 命令式更新**（React 包 Canvas 组件的标准适配）：
  - `records` 变化 → `tableInstance.setRecords(records)`；`columns` 变化 → `tableInstance.updateColumns(...)`（保留旧 headerIcon）
  - 主题变化 → `tableInstance.theme = tableTheme`；销毁 → `tableInstance.release()`
- **主题适配层**：`useTableTheme({ antdTheme, options, customOptions })` 将宿主 antd 主题 token 映射为 VTable theme——对应 flux 需做"design token / CSS 变量 → VTable theme"映射层（`docs/architecture/theme-compatibility.md` 原则）。
- **交互全部挂实例事件**：右键菜单（contextMenuRef）、单元格编辑（vtable-editors + 自定义 InputIEditor + onChangeCellValue 事件）、复制/粘贴（快捷键拦截 + `getCopyValue`/`selectCells`）、选区变化（`getSelectedCellInfos` → `onSelectionChange`，rAF 节流）、过滤排序（useFilterAndSort）。
- **关键 option**：`dragHeaderMode: 'all'`（列拖拽）、`widthMode: 'autoWidth'`、`defaultRowHeight: 28`、`select.highlightMode: 'row'`、`keyboardOptions`（接管内置快捷键）、`enableLineBreak`、`frozenColCount: 1`（冻结列）。
- **数据整形**：`dataTreating({ data, theme, dataTableSettings })` 把 SQL 结果转成 columns/records（列类型/样式/用户设置项）——对应 flux 的 `data-source` 后处理层。

**对路径 B 的修订**：`PivotTable` 数据契约（`rows`/`columns` 维度 + `indicators` 指标 + `aggregationRules`）可直接映射为 flux schema（`rowDimensions`/`columnDimensions`/`indicators`），数据变换由 VTable 内部承担；React 封装参照 Chat2DB 命令式 + 实例事件模式，与现有 renderer 事件体系（selection/copy/edit）对接。

---

## 4. 结论与建议

### 4.1 结论

1. **需要新增 pivot-table 控件**——交叉分析是 BI 应用的标志性能力，当前"静态模拟"无法覆盖交互式诉求（维度拖拽、动态列、下钻小计）。
2. **但 pivot-table 不是 BI 支持的第一优先级**。编排层骨架（看板组装 + KPI + 筛选联动）是更大阻塞，而该骨架大多可通过已有控件组合落地（详见 4.2 裁定）：仅 `stat-tile` 需新增，`panel-chrome`/`dashboard-filter` 为组合 + 约定 + 少量增强。
3. **chart 层也有增强空间**（双轴、热力图、地图），地图受 geojson 资源管理约束（chart 设计已裁定不纳入，需独立评估）。

### 4.2 分阶段建议

> 编排层三件套的「组合 vs 新组件」裁定（2026-08-09 复核）：
> 判断标准 = 功能能否全部用已有控件表达；重复 >3 次且样式语义无原语则提取新组件。

| 控件               | 组合可行性      | 裁定                                  | 依据                                                                                                                                                                                                            |
| ------------------ | --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel-chrome`     | ✅ 可行         | **不新增**，用 card regions 组合      | card 已有 title + header/body/footer/actions regions + variant；刷新/展开/菜单 = header 内 Button + onClick action。顶多给 card 加「刷新动作」约定字段                                                          |
| `dashboard-filter` | ✅ 可行         | **不新增**，建编排约定 + 1 个控件增强 | crud queryForm 已示范「表单→query summary→联动」模式；`data-source` 已订阅 `useRenderScope()`，scope 变更自动重载——全局筛选 = 一个共享 scope 的 query-form 约定 + `date-range` 相对时间预设增强（既有控件增强） |
| `stat-tile`        | ⚠️ 可拼但重复高 | **新增轻量组件**                      | card+text+chart 能拼外形，但：每卡 ~30 行重复 schema；大数字样式语义（特大字号/涨跌色/同比环比布局）无样式原语；sparkline 需把 chart 缩到 40px。轻量封装（1 schema + 样式 + 数据绑定约定）投入产出比高          |

| 阶段               | 内容                                                                                                                                                                                                     | 工作量级                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 一期（BI 骨架）    | 新增 `stat-tile`（KPI 卡片，statistics 升级）；`dashboard-filter` = 全局 scope query-form 编排约定 + `date-range` 相对预设增强；`panel-chrome` = card regions 组合（不新增）；`grid` 布局复用现有 layout | 低-中                                                    |
| 一期（静态透视）   | `table` 透视映射模式（路径 A），配合 OLAP 服务端预聚合                                                                                                                                                   | 低-中                                                    |
| 二期（完整 pivot） | 独立 `pivot-table` renderer（路径 B）：VTable `PivotTable` 基座 + 命令式封装（Chat2DB 模式），schema 映射 `rowDimensions`/`columnDimensions`/`indicators`/`aggregationRules`                             | 中（VTable 承担 transform，自研 schema/事件/主题适配层） |
| 二期（图表增强）   | 双轴、热力图、brush/zoom；地图独立评估                                                                                                                                                                   | 中                                                       |

### 4.3 触发条件（何时立即立项）

- 若 nop-app 系出现真实 BI 看板/经营分析页面需求（如 ERP 销售分析、财务交叉报表），按 `complex-component-design-process.md` 立项 pivot-table 并产出 `docs/components/pivot-table/design.md` + `example.json`。
- 若仅需"报表导出交叉结果"，一期路径 A 已够用，不立项新控件。

---

## 5. 参考项目（本地已下载）

- 交叉表参考：**VTable**（`~/sources/vtable`，字节 VisActor，MIT，`PivotTable` 原生透视）、**Chat2DB**（`~/sources/Chat2DB`，命令式 ListTable 封装先例）、pivot-table-uni 设计、tanstack table（grouping/aggregation，无动态列）
- 编排层参考：Grafana/Metabase/Superset/Redash（panel-chrome、dashboard-filter、stat-tile）
- 静态交叉配合：Doris/StarRocks/ClickHouse/Calcite（服务端聚合）
