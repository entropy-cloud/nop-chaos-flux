# nop-chaos-flux BI 应用前端控件支持分析

> 生成日期：2026-08-09
> 范围：评估 flux 现有前端控件对 BI 应用的支持度，重点回答「是否需要新增 pivot-table」
> 关联：`docs/analysis/2026-08-04-control-gap-survey.md`（Tier 2 已列 pivot-table 候选）、`docs/plans/455-table-input-table-doc-gap-and-footer-plan.md`（「固定列 + 后端 pivot」先例）
> 结论前置：**需要 pivot-table，但不是 BI 支持的最大缺口；BI 控件族（编排层 + KPI + 筛选联动）应先于或与 pivot-table 并行补建。**
> 状态标注（2026-08-09）：**`stat-tile` 已落地**——plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1 完成（renderer `flux-renderers-data/src/stat-tile-renderer.tsx` + `StatTileSchema` + 单测 + `docs/components/stat-tile/design.md` + `example.json`）；`statistics` 维持保留（分页总数语义，与 stat-tile 不重叠，裁定见 stat-tile design.md §2）。其余 BI 骨架项（dashboard-filter 约定 / date-range 相对预设 / card 刷新约定 / chart 双轴·brush·heatmap）随同一 plan 推进。
>
> 状态标注（2026-08-09 晚间）：**编排层（看板）缺口已闭环**——plan `2026-08-09-dashboard-editor-with-editor-core-plan.md` 落地 `@nop-chaos/editor-core`（领域无关编辑器内核）+ `@nop-chaos/flux-renderers-dashboard`（运行态 `dashboard` + 编辑态 `dashboard-editor`：拖拽/缩放/吸附/undo/保存），看板组装能力就绪（见 `docs/components/dashboard-editor/design.md` + `example.json`）。§4.2 中「编排层整层缺失」的结论自此更新：`panel-chrome`（card 组合）与 `dashboard-filter`（约定）仍按原裁定不新增组件，看板骨架由 dashboard editor 承载。

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
| 编排层（看板） | panel-chrome（面板外壳）、dashboard-filter（全局筛选联动）、grid layout | 看板骨架已闭环（见下方注记） | ~~整层缺失~~                        |
| KPI 层         | stat-tile（大数字 + 同比环比 + sparkline）                              | statistics 仅总条数          | KPI 卡片缺失（sparkline 独立组件）  |

> 注记（2026-08-09 晚间）：编排层「整层缺失」已闭环——`dashboard-editor`（`@nop-chaos/flux-renderers-dashboard`，基于 `@nop-chaos/editor-core`）提供看板网格布局编辑/运行（拖拽/缩放/吸附/undo/保存），面板内容复用 chart/table/stat-tile 等现有 renderer；`panel-chrome`/`dashboard-filter` 维持「不新增组件」原裁定（card 组合 + 编排约定）。

> 修正（2026-08-09 复核）：~~条件格式~~ —— table 已有 `classNameExpr`（cell 级条件样式表达式），能力已覆盖；"规则编辑器 UI"仅面向业务用户自助配置时才需要，属可选编辑器非控件缺口。~~data-grid~~ —— 非新控件，降级为 table 能力增强候选（选区聚合、右键菜单，按需评估）。

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

#### 3.4.1 VTable PivotTable 应用案例调研（2026-08-09）

| 应用/项目                             | 是否用 PivotTable | 说明                                                                                                                                                                                                                     |
| ------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **火山引擎 DataWind（智能数据洞察）** | ✅ 生产级         | 字节自家增强型 ABI 平台（亿级数据/亚秒查询），官方明确"重度使用 VChart + VTable，实现二维表、**透视表**、透视图能力"（`developer.volcengine.com/articles/7317468158817173531`）；是 VTable PivotTable 最大的真实生产案例 |
| VisActor 官方 demo 集                 | ✅ 示例级         | 仓库 `docs/assets/demo` 有 **62 个 pivot 相关 demo**：透视聚合/下钻/小计总计/计算字段/派生字段/排序/过滤/自定义 rowTree-columnTree/sparkline 指标/PivotChart 等，覆盖真实业务场景（销售分析、趋势表）                    |
| Superset-VisActor（官方 BI 示例）     | 待确认            | VisActor 官方示例项目，用 VisActor 图表替换 Superset 图表层（`github.com/VisActor/Superset-VisActor`，10★，实验性）                                                                                                      |
| Chat2DB                               | ❌ 仅 ListTable   | 用 VTable 做 SQL 结果集表格（高性能网格），**未用 PivotTable**——其封装模式（命令式 + 实例事件）仍是路径 B 的首选集成范本                                                                                                 |
| 社区开源项目                          | ❌ 极少           | GitHub 仓库搜索 `@visactor/vtable` 仅命中 demo 项目（`jackywq/react-vtable-demos` 等）；公开生产使用 PivotTable 的开源项目未见                                                                                           |

**调研结论**：

1. VTable 的 **PivotTable 生产案例集中于字节生态内部**（DataWind 是其最大的落地场景），社区侧普遍用 `ListTable` 做高性能表格（Chat2DB 即代表）。
2. PivotTable 能力文档化程度高（62 个 demo + 完整 option 文档 + 源码分析文档 `docs/assets/contributing/zh/source-code-details/7.*PivotTable*`），风险主要在**封装层**而非能力层。
3. 对 flux 的启示不变：**基座可信（MIT + 生产验证），自研重点是 schema 映射、命令式封装、主题适配、事件桥接**；可将 DataWind 的"透视表 + 指标组 + 下钻"交互形态作为 schema 设计的参照。

---

## 4. 结论与建议

### 4.1 结论

1. **需要新增 pivot-table 控件**——交叉分析是 BI 应用的标志性能力，当前"静态模拟"无法覆盖交互式诉求（维度拖拽、动态列、下钻小计）。
2. **但 pivot-table 不是 BI 支持的第一优先级**。编排层骨架（看板组装 + KPI + 筛选联动）是更大阻塞，而该骨架大多可通过已有控件组合落地（详见 4.2 裁定）：仅 `stat-tile` 需新增，`panel-chrome`/`dashboard-filter` 为组合 + 约定 + 少量增强。
3. **chart 层也有增强空间**（双轴、热力图、地图），地图受 geojson 资源管理约束（chart 设计已裁定不纳入，需独立评估）。

### 4.2 分阶段建议

> 编排层三件套的「组合 vs 新组件」裁定（2026-08-09 复核）：
> 判断标准 = 功能能否全部用已有控件表达；重复 >3 次且样式语义无原语则提取新组件。

| 控件               | 组合可行性      | 裁定                                     | 依据                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel-chrome`     | ✅ 可行         | **不新增**，用 card regions 组合         | card 已有 title + header/body/footer/actions regions + variant；刷新/展开/菜单 = header 内 Button + onClick action。顶多给 card 加「刷新动作」约定字段                                                                                                                                                                                                                 |
| `dashboard-filter` | ✅ 可行         | **不新增**，建编排约定 + 1 个控件增强    | crud queryForm 已示范「表单→query summary→联动」模式；`data-source` 已订阅 `useRenderScope()`，scope 变更自动重载——全局筛选 = 一个共享 scope 的 query-form 约定 + `date-range` 相对时间预设增强（既有控件增强）                                                                                                                                                        |
| `stat-tile`        | ⚠️ 可拼但重复高 | **新增轻量组件（2026-08-09 已落地 ✅）** | card+text+chart 能拼外形，但：每卡 ~30 行重复 schema；大数字样式语义（特大字号/涨跌色/同比环比布局）无样式原语；sparkline 需把 chart 缩到 40px。轻量封装（1 schema + 样式 + 数据绑定约定）投入产出比高——已按 plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1 落地（`stat-tile` renderer + 自绘 SVG sparkline，见 `docs/components/stat-tile/design.md`） |

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

---

## 6. 地图组件封装调研（2026-08-09）

> 依据：`docs/analysis/2026-08-04-control-gap-survey.md`（map 中高价值，参考 nocobase/leaflet/maplibre）+ 本次本地源码调研。

### 6.1 已有项目地图做法调研矩阵

| 项目                                    | 地图技术                                                                                        | geojson/数据源方式                                                                                              | 特点                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **ECharts**（`~/sources/bi/echarts`）   | 原生 `MapChart` + `GeoComponent`（geo 坐标系，Canvas/SVG 渲染）                                 | `registerMap(name, geojson)` 应用侧注册；geojson 静态导入                                                       | **最轻**：无地图 SDK、无 token；内置世界/中国省市 map JSON 可打包；支持区域着色/散点/飞线/热力/标注 |
| **Superset**（`~/sources/bi/superset`） | deck.gl 9.x（`DeckGLOverlayMapLibre`/`Mapbox` 双后端）+ echarts 地图 + legacy country/world map | geojson 作为**数据集列**（`Geojson/buildQuery.ts`：数据表带 geojson 列，`IS NOT NULL` 过滤）+ mapbox token 底图 | 重方案：点聚合/弧线/热力 9+ 图层；依赖大、需底图服务                                                |
| **Metabase**（`~/sources/bi/metabase`） | **leaflet**，`MapRenderer.tsx` 单独 chunk **懒加载**（避免进初始 bundle）                       | 内置世界/美国 geojson + 自定义 geojson URL                                                                      | 轻-中；懒加载策略值得借鉴；需瓦片底图源                                                             |
| **Grafana**（`~/sources/bi/grafana`）   | **OpenLayers**（geomap 面板）                                                                   | 内置 basemap + geojson/xyz 图层                                                                                 | 重（OL 全量）；基线地图/跟踪类场景                                                                  |
| **nocobase**（`~/sources/nocobase`）    | **AMap（高德）** + GoogleMaps（plugin-map）                                                     | 坐标字段（经纬度）→ 地图 SDK 渲染                                                                               | **字段级地图**（表单/详情展示坐标点），非图表级；商用 SDK 需 key                                    |
| **amis**（`~/sources/amis`）            | **无地图组件**                                                                                  | —                                                                                                               | 低代码平台可无地图而成立                                                                            |

### 6.2 封装路径对比（2026-08-09 复核修正 v2）

> 修正 v1：ECharts map/geo 是**矢量区域图形**（geojson 渲染），无详细底图 → 弃 leaflet 主方案。
> 修正 v2（选型复核）：Leaflet vs OpenLayers——**OpenLayers 更活跃更现代**（GitHub 2026-08-09：OL v10.10.0 月更发布 vs Leaflet 1.9.4 停更 3 年；OL v7 起 TypeScript 官方重写、ES modules 按需导入、cluster/矢量瓦片/投影内置），主方案改 OpenLayers；Leaflet 降为备选（插件生态丰富）。

| 路径                                   | 底层                                                                       | 能力边界                                                                                                                                                                                                                                                                                                                    | 建议                                                 |
| -------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A. ECharts geo/map（轻）               | echarts 6.1.0 `MapChart`/`GeoComponent`（`~/sources/bi/echarts` 源码验证） | ✅ 区域着色/散点/飞线/热力/roam 缩放平移/区域选中；❌ **无瓦片底图**（源码无 tileLayer）、无街道/POI/地名标签/卫星图；geojson 资源完全自管                                                                                                                                                                                  | 备选：仅"纯统计型地图"（无底图需求）场景             |
| B. **OpenLayers（首选）**              | **OpenLayers v10**（官方 TS、ES modules）                                  | ✅ 瓦片底图（OSM/自定义 xyz/天地图）、GeoJSON 层区域着色（choropleth）、**内置 cluster 聚合**、矢量瓦片（MVT）、投影体系、绘制/热力内置、交互（缩放/弹窗）；**模块化按需导入天然契合懒加载 + tree-shaking**；生产先例：**Grafana geomap 面板**（`~/sources/bi/grafana`）；⚠️ 中国场景 OSM 瓦片访问性一般，天地图/高德需 key | **首选**：详细底图 + 点位 + 区域着色的 BI 地图主场景 |
| B'. leaflet（Metabase 模式）           | leaflet 1.9 + 瓦片底图（**维护模式**：2023-05 后无 release）               | ✅ 瓦片底图/geoJSON/marker + 插件生态丰富（markercluster 等）；❌ TS 类型社区维护、聚簇等能力靠插件                                                                                                                                                                                                                         | 备选：插件生态依赖场景；Metabase 懒加载做法仍可借鉴  |
| C. deck.gl + MapLibre（Superset 模式） | deck.gl 9 + maplibre                                                       | 点聚合/弧线/轨迹等复杂图层                                                                                                                                                                                                                                                                                                  | 不推荐首版：大依赖 + 底图 token                      |

**双模式蓝本**：Metabase `MapRenderer.tsx` 的 `map.type = 'region' | 'pin'`（区域着色 + 点位）语义保留，底层以 OpenLayers 实现（GeoJSON 层着色 + 内置 cluster 点位）。

### 6.3 推荐封装方案（路径 B，OpenLayers）

- **type**: `map`（独立包 `flux-renderers-map`：ol 依赖隔离 + **懒加载**——`import('ol/Map')` 等按需模块动态加载，OL ES modules 天然支持；参照 Grafana geomap 先例）。
- **schema 草案**：
  - `mapType: 'pin' | 'region'`（点位/区域着色双模式，对齐 Metabase 语义）
  - `basemap?: { url: string; attribution?: string; type?: 'xyz' | 'wms' }`（瓦片源：缺省 OSM；中国场景可配天地图/高德，key 由应用注入）
  - `regionData?: SchemaValue`（区域着色：`[{ name: '北京', value: 123 }]`，geojson 内建或 `geojsonUrl`/`geojson?: SchemaValue` 自定义）
  - `pinData?: SchemaValue`（点位：`[{ name, lat, lng, value? }]`）
  - `cluster?: boolean`（**OL 内置 cluster** 源）、`zoom?`/`center?`、`height`、`empty`、`visualMap?`（色阶）
  - 事件：`onClick`（区域/点位点击，payload `{ name, value }`）→ flux action
- **geojson 资源管理**：
  - 内建：`map-data` 数据包（世界/中国/省市 geojson 静态 JSON，应用侧 import；参照 echarts 生态的行政区划数据源）
  - 自定义：`geojsonUrl`（运行时 fetch + 缓存）或 `geojson` 表达式（scope/data-source 传入）
- **样式**：区域色/边框/高亮经 schema + CSS 变量映射（theme-compatibility 原则）；瓦片底图明暗主题由 url 切换（OSM 标准层/暗色层）。
- **字段级地图**（nocobase 参考：AMap 坐标字段展示）作后续 follow-up，非首版。
- **中国场景注意**：OSM 瓦片访问性依赖部署环境；生产建议天地图（需 key）/高德 JS API（需 key）/自建瓦片，key 经 RendererEnv 或应用配置注入（INV-2 边界内，无新 IO 类型）。

### 6.4 与既有计划的关系

- BI 骨架计划 Phase 5「地图独立评估」由本调研闭环：**建议落地为独立 `map` renderer（路径 B，OpenLayers）**，并入 BI 骨架计划或独立计划立项。
- 触发条件：出现真实地域分析需求（区域销售/门店分布/轨迹）时按 `complex-component-design-process.md` 立项。
