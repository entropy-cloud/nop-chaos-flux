# R1 ERP 三域页面盘点（WMS / CRM / ITAM）

> Created: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R1；执行 plan `docs/plans/786-business-replication-r1-erp-inventory-plan.md`
> 输入: 上游 `~/app/nop-app-erp/docs/backlog/{wms-warehouse, crm-standalone-app, itam-it-asset}-roadmap.md`（均 Last Updated 2026-10-28）+ 上游模块 UI 页面 yaml 佐证
> 用途: 供 R4 能力差距矩阵与 M2-D2 ERP 线复刻设计消费。只登记"页面需要什么"，不裁定能力分级。

## 0. 盘点方法与输入源勘误

- 上游三份 roadmap 通读；`module-wms/`、`module-itam/` 目录**不存在**（roadmap 规划中），改用上游实存模块页面佐证：WMS→`module-inventory/erp-inv-web`，ITAM→`module-assets/erp-ast-web` + `module-inventory`（盘点链）+ `module-maintenance/erp-mnt-web`，CRM→`module-crm/erp-crm-web` + `module-master-data/erp-md-web`。
- **C2（客户 360）/ C3（销售驾驶舱）在上游 crm roadmap 无直接章节**（评审确认）：上游锚点仅为 L26 `getDashboardKpi` 销售漏斗 KPI 范式与 L57/L68 漏斗看板/预测/配额界面化条目。此 2 页出处按"复刻 roadmap M3 行定义 + 模块 UI/领域模型佐证"登记。
- flux 基线（live 核实 2026-10-30）：15 个 `flux-renderers-*` 包（3d/ai/basic/content/dashboard/data/form/form-advanced/graph/industrial/layout/map/mobile/pivot/scheduling）。关键归属：`barcode-input` 注册在 **scheduling** 包（含扫码 overlay 与离线队列提示）；`stat-tile`/`sparkline`/`query-filter` 在 **data** 包；`diff-view`/`image-compare`/`qrcode` 在 **content** 包；`timeline` 在 **layout** 包（process-display-definitions.ts L110）；`detail-view`/`condition-builder`/`input-table`（含合计行）在 **form-advanced** 包；`kanban`/`gantt`/`calendar` 在 **scheduling** 包；`pivot-table` 在 **pivot** 包。
- 标注约定：无标注 = 上游明示；**〔flux 侧预期〕** = 复刻目标引入、上游 roadmap 未明示。

## 1. WMS 域

### W1 WMS PDA 收货/上架作业页

- **上游出处**（`wms-warehouse-roadmap.md`）：§3 L24（flux-renderers-mobile 为 PDA 扫码页面载体）；§4 L35（缺口：无 PDA 作业面）；W2.3 L56（扫码原子接口+幂等）；W3.3 L67（PDA 收货/上架作业实现：扫码→ASN/上架任务→库存写入）；W1.3 L45 + §6 L89（PDA 形态注记：扫码 API、离线/断网约束）；W4.2 L77（幂等/并发 E2E）。佐证页：`module-inventory/erp-inv-web/.../pages/pda-stock-take/main.page.yaml`（表单式 PDA 扫码作业页 v2：扫单号→扫 SKU+库位→录数量→`scanSave` 单往返落行→清空续扫）。
- **页面形态**：手持端扫码驱动的表单式作业页，覆盖收货（ASN）与上架任务两条链路，扫码结果直写库存。
- **交互要素**：① 扫码/手输 ASN 号+SKU 条码+库位码；② 扫码原子接口校验+幂等键；③ 连续扫码逐行累计、成功清空续扫；④ 下拉刷新（L24）；⑤ 无限滚动作业记录（L24）；⑥ 滑动单元格行快捷操作（L24）；⑦ 数量录入（数字键盘）；⑧ 提交确认对话框；⑨ 单手操作流〔flux 侧预期〕；⑩ 离线提示条〔上游仅明示离线约束调研项 L89，提示条 UI 为 flux 侧预期〕；⑪ 滚轮选择库位/批次〔flux 侧预期〕；⑫ 重复扫码防重。
- **renderer 映射**：扫码=`barcode-input`（scheduling）；下拉刷新/无限滚动/滑动单元格=`pull-refresh`/`infinite-scroll`/`swipe-cell`（mobile）；离线提示条=`notice-bar`（mobile）+ barcode-input 自带 offline 队列提示；滚轮=`wheel-picker`/`wheel-cascader`（mobile）；数量=`number-keyboard`（mobile）+ input-number；确认/反馈=dialog+action confirmText。
- **缺口**：单手操作流专用 type（可用 floating-bubble/floating-panel/action-sheet 近似）；"扫码即远程校验回填"专用 type（需 action 编排；上游明示为提交时原子校验）。

### W2 WMS 拣货路径看板与波次管理页

- **上游出处**：W2.1 L54（波次管理模型与释放策略）；W2.2 L55（拣货路径与分区策略/SLOT 化）；W3.1 L65（波次释放→拣货单分组）；W3.2 L66（拣货任务行路径排序+分区过滤）；§3 L28（nop-job 波次释放调度）；W4.1 L76（释放→分组→拣货确认全链测试）。佐证：`ErpInvPickingOrder(Line)/main.page.yaml` 实存但无波次/路径（与 L35 缺口一致）。
- **页面形态**：波次管理台+拣货路径可视化；kanban/gantt 为复刻页面形态〔上游未明示组件选型〕。
- **交互要素**：① 波次→拣货单分组展示与状态流转；② 波次释放触发（手工+定时）；③ 释放规则条件配置；④ 拣货任务行路径排序展示（库位 sequence）；⑤ 分区过滤（L66）；⑥ 波次明细行内编辑+合计行〔合计行为 flux 侧预期〕；⑦ 拖拽调整分组/优先级〔flux 侧预期〕；⑧ 路径时间轴缩放〔flux 侧预期〕。
- **renderer 映射**：分组看板=`kanban`（scheduling，含 dnd 集成与 WIP 列头）；路径时间线=`gantt`（scheduling，bars/links/zoom/CPM）；明细+合计行=`input-table`（form-advanced，input-table-summary）；规则条件=`condition-builder`（form-advanced）；只读分组汇总=`table`（data，grouping/expanded-row）。
- **缺口**：库位 2D 平面动线图（无现成 type；map/3d 包适用性待核）；job 调度监控专用 type。

### W3 WMS 库存台账页

- **上游出处**：W2.4 L57（库位级收发存汇总视图+批次/序列合并追溯视图）；W3.5 L69（台账细化实现）；W4.3 L78（台账对账一致性断言）；§3 L27（报表/看板 nop-report+getDashboardKpi 范式）。佐证：`ErpInvStockLedger/main.page.yaml`+`ref-move.page.yaml`（台账+关联移动单）、`report/inventory-trace-report.page.yaml`（批次追溯报表+XLSX/PDF 下载）。
- **页面形态**：库位级收发存查询+批次追溯；透视/指标卡/drill-down 为复刻组件化形态〔上游未明示组件名〕。
- **交互要素**：① 仓库×库位×物料×批次收发存多维透视；② KPI 指标卡（getDashboardKpi 数据范式）；③ 批次追溯 drill-down（点透视单元格→追溯明细弹窗）；④ 台账行→关联单据跳转（ref-move 实存）；⑤ 过滤查询（批次/物料/仓库）；⑥ 导出 XLSX/PDF；⑦ 对账一致性提示〔flux 侧预期〕。
- **renderer 映射**：透视=`pivot-table`（pivot；`pivot:cell-click`/`pivot:drill-click` 事件）→ `dialog`/`drawer`（basic）；指标卡=`stat-tile`（data）或 dashboard `value`；明细/追溯列表=`table`/`crud`（data）；过滤=form + `query-filter`（data）；导出=download action（上游佐证页同款）。
- **缺口**：对账校验结果可视化专用 type（用 status/card 组合）。

**WMS 候选补充页**（M3 未覆盖，按复杂度降序）：① PDA 拣货/移库/盘点作业页（W3.4 L68，三类作业复用扫码面、状态机各异）；② 收货→上架→波次→拣货→发运全流程演示页（W4.4 L79）；③ 发运/包裹与承运商网关管理页（§4 L34，运费双路径过账）；④ 库存移动/调拨单审批过账页（L33+L25 三轴状态机+L26 审批流）；⑤ 波次释放/补货任务调度监控页（L28）。

## 2. CRM 域

### C1 CRM 商机漏斗看板页

- **上游出处**（`crm-standalone-app-roadmap.md`）：L57 C2.4 + L68 C3.4（漏斗看板界面化为显式工作项）；L33（Lead 三轴状态：docStatus/stageId/leadType，商机=leadType=OPPORTUNITY 判别非两表）。**实页佐证**：`module-crm/erp-crm-web/.../pages/ErpCrmLead/opportunity-kanban.page.yaml`（商机看板，阶段动态列 `ErpCrmStage__findPage` orderBy sequence；行级 dialog→`@mutation:ErpCrmLead__moveStage` 流转；**L6 明确裁决"不使用拖拽"**，赢单列只读）；漏斗统计实态为 `report/lead-conversion-funnel.page.yaml`（renderHtml+下载）。
- **页面形态**：商机按漏斗阶段（ErpCrmStage 动态列）分组看板+漏斗转化统计；上游当前实态是"每列 crud+dialog 换阶段"，拖拽为其明确降级项。
- **交互要素**：① 阶段动态列（sequence 排序）；② 阶段流转 moveStage（后端单向递增守卫、赢单守卫）；③ **拖拽阶段流转〔flux 侧预期；上游 opportunity-kanban.page.yaml L6 曾明确降级"不使用拖拽"，flux kanban 拖拽属增强复刻〕**；④ 行内编辑金额 expectedRevenue〔flux 侧预期，上游列仅 number 展示〕；⑤ 刷新级联两个 data-source（上游实存）；⑥ 概率徽章条件三色（上游实存）；⑦ 空阶段告警；⑧ 漏斗统计图。
- **renderer 映射**：看板+拖拽=`kanban`（scheduling dnd；**拖拽落点→moveStage mutation 的 action 绑定需在 D2 设计时验证**）；行内编辑=table quick-edit（data，table-quick-edit-cell）；刷新联动=`data-source`+`refreshSource`；徽章=`status`/`mapping`（content）；漏斗图=`chart`（data echarts）。
- **缺口**：funnel 图类型（chart-schemas 仅 area/bar/heatmap/line/pie/scatter，可用水平 bar 近似）；表格 footer 统计带绑定方式待核（有 table-summary-row；R4 处置：D2 设计验证项，未单列 G 编号）。

### C2 CRM 客户 360 详情页（上游无直接章节）

- **佐证来源**：roadmap L23（客户主数据=module-master-data Party/客户）；`module-master-data/erp-md-web/.../pages/ErpMdPartner/`（+Address/Contact/picker、party-search）；`ErpCrmLead.view.xml` L45/L49（partnerId 字段+tabs 布局范式）；`ErpCrmActivity/timeline.page.yaml`（timeline 类型按 activityDate DESC+类型着色，直接佐证）；`ErpCrmActivity/ref-lead.page.yaml`（按外键过滤的关联列表范式）；`ErpCrmActivity/calendar.page.yaml` L4（calendar 当时渲染报错降级为分组卡片）；roadmap L22（活动历史/日历/团队协作能力）。
- **页面形态**：以客户（ErpMdPartner）为主键的聚合详情页：头部基本信息+tabs 分区（跟进时间线/关联线索商机/联系人地址/团队）。
- **交互要素**：① tab 分区切换（tabs 布局上游 Lead 表单已用，客户 360 整页〔flux 侧预期〕）；② 时间线跟进记录（上游直接佐证）；③ filterForm→filter_leadId/partnerId 注入联动（上游 timeline/calendar 页同范式）；④ 关联列表主从联动（行点击刷新关联列表〔联动编排 flux 侧预期〕）；⑤ 客户搜索选择（party-search+picker）；⑥ 新增跟进记录表单〔flux 侧预期〕；⑦ 活动日历视图（上游因渲染问题降级；flux calendar 组件已具备，复刻即回归验证）。
- **renderer 映射**：tabs=`tabs`（**basic** 包）；时间线=`timeline`（layout）；主从联动=`table`/`crud`+`data-source`+selection（data）；筛选=`query-filter`/inline form；日历=`calendar`（scheduling）；子卡列表=`cards`（content）；详情基本信息区=`detail-view`（form-advanced，live 核实存在）。

### C3 CRM 销售驾驶舱页（上游无直接章节）

- **佐证来源**：roadmap L26（getDashboardKpi 范式；**CRM 模块内无实现**，全模块 grep 零命中——接口属"待补齐"，范式先例 `module-finance/.../ErpFinDashboardBizModel.java` L63）；报表三页 `report/{lead-conversion-funnel, forecast-accuracy, campaign-attribution}.page.yaml`（renderHtml+XLSX/PDF）；指标实体页族 `ErpCrmFunnelStageMetrics/`、`ErpCrmForecast(+Line/Period/Accuracy)/`、`ErpCrmQuota/`、`ErpCrmLeadScore/`。
- **页面形态**：销售管理驾驶舱聚合页（上游实态为三个独立 html 报表页+待补 KPI 接口，聚合驾驶舱为 flux 复刻目标）。
- **交互要素**：① KPI 指标卡阵列（漏斗总额/转化率/预测达成/配额完成，接口〔flux 侧预期，上游仅范式引用〕）；② 交互式 echarts 图（上游实态为后端 renderHtml 整块，〔flux 侧预期〕）；③ 全局条件筛选（periodId/territoryId/teamId）联动多 data-source〔flux 侧预期，参数范式有 fin 先例〕；④ 报表区块下载 XLSX/PDF（上游直接佐证）；⑤ 漏斗分布图；⑥ 指标卡钻取跳转〔flux 侧预期〕。
- **renderer 映射**：布局=`dashboard`（dashboard 包，x/y/w/h 网格）；KPI 卡=`stat-tile`（data 包，live 核实存在）或 dashboard `value`；图表=`chart`（data echarts）；筛选=`query-filter`+refreshSource 级联（C1 kanban 页已示范级联刷新）；报表区块=`html`（content）+download action。
- **缺口**：funnel/gauge 图型；chart 点击钻取→action/跳转绑定待核。

**CRM 候选补充页**（按复杂度降序）：① 线索转化三步向导（`lead-conversion/main.page.yaml`，跨实体转化+分步状态机）；② 销售预测主从工作台（ErpCrmForecast 四实体页族，roadmap L57"预测"锚点）；③ 营销序列编排（ErpCrmSequence+Step/Assignment/Progress，最接近流程设计器形态）；④ 评分规则主从配置（ErpCrmLeadScoreConfig+Line，行级条件表达式）；⑤ 组合定价主从（ErpCrmBundlePricing+Line）。

## 3. ITAM 域

### I1 ITAM 资产台账与盘点页

- **上游出处**（`itam-it-asset-roadmap.md`；注意上游 I1/I2 是调研/设计里程碑编号，页面实体在 I3.x）：L54 I2.1（IT 视角字段面：型号/序列号/归属人/位置/租期，ext 字段零 ORM）；L56 I2.3（盘点/维保场景：StockTake 场景化+维保请求入口）；L35（缺口：无 ITAM 台账视图、盘点无 ITAM 场景化页面）；L65 I3.1（台账页面实现）；L67 I3.3（盘点/维保页面实现）；L76 I4.1（审计事件断言）。佐证：`module-assets/erp-ast-web/.../pages/ErpAstAsset/main.page.yaml`、`module-inventory/.../pages/pda-stock-take/main.page.yaml`（84 行）+`stock-take-flow/main.page.yaml`（143 行，三阶段+差异移动单二次确认）。
- **页面形态**：IT 设备台账（erp-ast 资产卡片+ext 字段挂载 ITAM 视角）+ 场景化盘点作业面（复用 StockTake 三阶段链：DRAFT→CONFIRMED（startTake）→DONE（completeTake），完成自动生成盘盈/盘亏差异移动单，停 CONFIRMED 待二次确认）。
- **交互要素**：① 台账列表+筛选（字段面=型号/序列号/归属人/位置/租期）；② ext 字段集挂载展示；③ 批量操作〔flux 侧预期，上游仅明示批量标签打印为前置〕；④ 扫码盘点录入（ITAM 版扫资产标签码）；⑤ 盘点三阶段流程；⑥ 盘点差异对比（上游实态="差异行清单+差异移动单确认"，非文本 diff；文本级账面 vs 实盘并排对照〔flux 侧预期〕）；⑦ 盘点中报修入口（跨域转 maintenance ErpMntRequest）；⑧ 审计事件。
- **renderer 映射**：台账=`crud`+`query-filter`（data）；行选择/批量=`table` selection+`batch-bar`（data）；扫码=`barcode-input`（scheduling，batchMode 连续扫码队列/onScan/qr_code，直接对口）；差异行=`table` differenceQuantity 列+`status`/`mapping` 盘盈盘亏标色；文本对照=`diff-view`（content，split 视图）；差异确认=`crud` 行按钮+dialog+confirmText；报修=button+form+drawer；二维码标签=`qrcode`（content）+flux-print-renderers。
- **缺口**：无（全部要素有现成 type 组合；diff-view 用法为 flux 侧预期形态）。

### I2 ITAM 折旧仪表盘页

- **上游出处**：L57 I2.4（ITAM 风格仪表盘+KPI 口径对齐既有度量目录）；L35（缺口：折旧展示无 ITAM 仪表盘）；L68 I3.4（KPI 卡片+折旧曲线实现）；L28（getDashboardKpi 既有 10 域 KPI 范式）；L77 I4.2（KPI 数值断言 E2E）。KPI 口径佐证：`module-assets 文档 docs/design/dashboards.md` §5 资产看板（L125-138 八项指标）与资产域度量目录（L298-307：originalValue/accumulatedDepreciation/netBookValue/periodDepreciation/cipBalance/类别分布）。**既有实现直接佐证**：`module-assets/erp-ast-web/.../pages/dashboard/main.page.yaml`（207 行，flux 原生重写：data-source→KPI 卡+chart+crud 预警，四接口 getDashboardKpi/getAssetCategoryDistribution/getDashboardTrend/findDepreciationMissingAlert）。
- **页面形态**：KPI 概览卡+资产类别分布+折旧趋势曲线+预警列表；ITAM 版为按 ITAM 视角重组的展示变体。
- **交互要素**：① KPI 卡片组（原值/累计折旧/净值/本期折旧/在建工程）；② 类别分布 pie；③ 近 12 月折旧趋势 line；④ 折旧未计提预警列表（IN_SERVICE 无 EXECUTED 计提）；⑤ 会计期间过滤+一键刷新四 data-source（上游既有页实存）；⑥ 年度折旧透视〔flux 侧预期，上游仅有近 12 月趋势；做透视需口径对齐度量目录〕；⑦ 导出〔flux 侧预期，上游 ITAM 未明示；ERP 先例为服务端报表下载〕。
- **renderer 映射**：KPI=`stat-tile`（data）；图表=`chart`/`echarts`（data pie/line）；透视=`pivot-table`（pivot）；过滤+刷新=form submitOnChange+refreshSource 链；预警=`crud`（上游既有页同款）；口径说明=`alert`/`status`（content）。
- **缺口**：table/crud/pivot schema 无 exportCsv/exportExcel 内建字段（已 grep 核实）——导出需 button+服务端报表下载或 link blob 透传。

**ITAM 候选补充页**（按复杂度降序）：① 二维码标签生成与打印页（I2.2 L55/I3.2 L66：批量选择→生成→打印模板→扫码落地，对应 flux-print-renderers+qrcode）；② ITAM 报修/维保请求页（跨域 assets→maintenance 状态机+表单流，L116 域边界约束）；③ demo 聚合入口页（I3.5 L69 菜单聚合+种子数据）；④ 资产处置工作台（处置/拆分/合并+凭证生成联动，L22/L33）；⑤ 资产审计轨迹页（ErpAstAssetActionLog 7 事件类型，L24）。

## 4. ERP 线缺口汇总（登记待 R4 裁定）

| #   | 缺口                                                   | 涉及页 | 性质             |
| --- | ------------------------------------------------------ | ------ | ---------------- |
| G1  | funnel/gauge 图类型（chart 仅 6 种基础图型）           | C1/C3  | 新图型           |
| G2  | kanban 拖拽落点→后端 mutation 的 action 绑定语义       | C1/W2  | 既有能力深化验证 |
| G3  | "扫码即远程校验回填"编排形态（现仅提交时校验）         | W1     | action 编排模式  |
| G4  | 单手操作流专用形态（floating-panel/action-sheet 近似） | W1     | 近似组合         |
| G5  | 库位 2D 平面动线图                                     | W2     | 潜在新 type      |
| G6  | 导出内建（table/crud/pivot 无 export 字段）            | W3/I2  | 既有控件扩展     |
| G7  | job 调度监控 / 对账断言可视化专用 type                 | W2/W3  | 组合可覆盖       |
| G8  | chart 点击钻取→跳转/action 绑定                        | C3     | 待核             |

## 5. 关键引用清单

- 上游 roadmap：`~/app/nop-app-erp/docs/backlog/wms-warehouse-roadmap.md`（129 行）、`crm-standalone-app-roadmap.md`（124 行）、`itam-it-asset-roadmap.md`（124 行）
- 上游佐证页面：`module-inventory/erp-inv-web/.../pages/{pda-stock-take, stock-take-flow, ErpInvPickingOrder, ErpInvStockLedger, report/inventory-trace-report}`；`module-crm/erp-crm-web/.../pages/{ErpCrmLead/opportunity-kanban, ErpCrmActivity/{timeline,calendar,ref-lead}, report/*, ErpCrmStage, ErpCrmForecast*, ErpCrmQuota, lead-conversion}`；`module-assets/erp-ast-web/.../pages/{ErpAstAsset, dashboard}`；`module-master-data/erp-md-web/.../pages/{ErpMdPartner*, party-search}`
- KPI 口径：`~/app/nop-app-erp/docs/design/dashboards.md`（L125-138、L298-307）
- flux 包/type 归属核实：`packages/flux-renderers-{scheduling,mobile,data,content,layout,basic,form-advanced,pivot,dashboard}/src/`（本文 §0 归属表）
