# R3 智能单据 / IoT 页面盘点

> Created: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R3；执行 plan `docs/plans/788-business-replication-r3-entropy-iot-inventory-plan.md`
> 输入: 上游 `~/app/nop-entropy/docs/backlog/{smart-document-platform, semantic-dataset}-roadmap.md`、`~/app/nop-app-iot/docs/backlog/iot-value-added-roadmap.md` + 上游设计目录/实体/既有页佐证
> 用途: 供 R4 能力差距矩阵与 M2-D4 设计消费。只登记"页面需要什么"，不裁定能力分级。缺口编号续接 R1/R2（G19 起）。

## 0. 盘点方法与输入源勘误

- 上游实况（live 核实 2026-10-30）：`~/app/nop-entropy/docs/design/` 目录不存在；smart-doc roadmap 规划的 `ai-dev/design/smart-doc/` 不存在；对 nop-entropy `docs/` 全文 grep "OCR" 除 base64 图片数据与压缩库假阳性外仅命中 roadmap 本身——**上游无任何 OCR 实现代码/页面**。IoT 侧 `docs/design/{ota-upgrade, video-surveillance, geofence-tracking}-design.md` 均不存在（M2/M6/M10 未启动）；`module-ota/` 不存在（OTA 面在 `module-device`）；iot roadmap 所有 WI checkbox 未勾选（P2 规划态）。**意外收获**：`~/app/nop-entropy/ai-dev/design/{maker-checker, nop-wf, nop-ai-agent}/` 真实存在，是 O2 审批收件箱最强的上游佐证。
- **"上游无直接章节"的页面**（显式标注）：V1 设备遥测详情页（iot roadmap Non-Goals L19-22 明确将遥测核心链路与前端 UI 面排除、归既有 roadmap/dashboard-ui-roadmap 通道）。
- flux 侧关键归属（live 核实，含评审修正）：`wizard`/`steps`/`timeline` 在 **layout** 包（index.ts L26/L31）；`image`/`image-compare`/`diff-view`/`video`/`json-view`/`alert` 在 **content** 包；**iframe 无注册实现**——仅 `flux-renderers-dashboard/src/editor/editor-palette.tsx` L26 调色板条目登记，渲染器对未注册 panel type 直接 skip（roadmap §4 L117 已将"视频墙面板"列为已知缺口）；`map` 包仅注册唯一 `map` type（OpenLayers 底座，pinData/cluster/geojsonSource/feature-click）；`ai-tool-call` 的 HITL 语义（state.approval pending → approve/reject 按钮 → onApproval 事件、engine 不自改状态）在 `renderers/ai-tool-call.tsx`；`detail-view`（form-advanced）带草稿态+逐字段提交+再校验（detail-draft-controller/projected-validation-runtime）；`wizard`（layout）是 step 级门禁。
- 标注约定：无标注 = 上游明示；**〔flux 侧预期〕** = 复刻目标引入、上游 roadmap 未明示。

## 1. 智能单据域（nop-entropy）

### O1 OCR 校正工作台页

- **上游出处**（`smart-document-platform-roadmap.md`，直接章节）：L35 §3.3（置信度模型与人工校正工作台：低置信字段高亮、逐字段确认、校正样本回流）；L174-178 §3.3 详情（阈值策略、逐字段确认/修改、原图区域对照、结果回流为映射规则/样本）；L162 §3.1（结构化输出：区域、字段、置信度——bbox 坐据）；L134 §2.1（置信度数据结构与人工校正交互契约）；L253（置信度+人工校正兜底）、L258（测试策略含校正工作台）、L230（e2e 全链路含人工校正）。
- **页面形态**：左侧单据原件扫描图（发票/合同），右侧按目标 ORM 实体字段生成的确认表单；识别结果带字段级置信度，低置信高亮，人工逐字段核对/修改，明细行逐行确认；确认后回写草稿并回流样本。
- **交互要素**：① 原件图片展示/放大；② 原图区域对照（字段↔识别区域 bbox）；③ 字段确认表单（逐字段识别值可改，绑定目标实体元数据）；④ 置信度高亮+阈值策略；⑤ 原值/识别值悬浮对照〔flux 侧预期〕；⑥ 逐字段确认/校验推进；⑦ 类型转换校验（L170）；⑧ 明细行确认（发票明细数组，L170）；⑨ 提交+样本回流；⑩ "跳到下一低置信字段"导航/置信度筛选〔flux 侧预期〕。
- **renderer 映射**：图片=`image`（content L231-258）；区域对照=`image-compare`（content L204-230，before/after 滑块）——**仅两张整图对比，不支持 bbox 覆盖层/缩放/字段→区域联动**；表单=`form`+input 系（form 包）；字段高亮/悬浮=`labelRemark`（FieldRemarkSchema）+`inputClassName`（flux-core schema L154/L158）；置信度分档=`badge`/`status`/`mapping`；逐字段确认=`detail-view`（form-advanced，草稿态+逐字段提交+再校验齐备）；明细行=`input-table`；分步推进=`wizard`（layout）。
- **缺口**：OCR 区域框 overlay（bbox 高亮/zoom/点击字段定位图上区域）（G19）；字段粒度"确认门禁+推进"编排（wizard 是 step 级）（G20）。

### O2 HITL 审批收件箱页

- **上游出处**：roadmap L39 §3.7（审批 HITL：nop-ai-agent AI 预审+人工复核/HITL 交接）+ L198-202 §3.7 详情（建议与风险标注、低置信/高风险自动转人工、结论回流 Agent 上下文）+ L38/L192-196 §3.6（单据状态机/回退与会签）+ L96（HITL 能力未沉淀为单据审批模式的 gap）。**强佐证**（实存设计目录）：`ai-dev/design/maker-checker/04-review-ui-diff-contract.md`（审核前端直接契约：`getReviewDetail` 返回 beforeData/expectedAfter/changedPaths/diffTree/rawRequest；Inbox 列定义=审批编号/业务对象+业务键/动作/maker/提交时间/剩余时限/changeSummary/高危标记、按剩余时限升序；staleness 红色横幅+禁用批准；reject 意见必填；掩码；按钮状态联动）、`00-vision.md`（SoD: checker≠maker、七类事件留痕）、`ai-dev/design/nop-wf/approval-flow-design.md`（串签/并签/会签/驳回/转交/抄送）、`nop-ai-agent/04-tool-invocation.md` L169（ask-human 工具语义）。批量通过动作本身〔flux 侧预期，上游仅有"批量操作标注影响行数"§八.3〕。
- **页面形态**：审批人待办收件箱：CRUD 列表（时限升序+高危标记）+ 多选批量通过 + 单条审批 dialog（AI 建议/风险卡+变更对比+意见）+ HITL 交接卡。
- **交互要素**：① 待办列表（八列逐字段有据）；② 筛选〔常规推导〕；③ 多选+批量通过（影响行数提示）；④ 审批 dialog（staleness 预检横幅+禁用批准、高危红底横幅）；⑤ AI 预审建议卡+风险标注；⑥ HITL 交接卡（pending→人工决断→结论状态化）；⑦ 变更对比三视图（Mode A 控件级标注/Mode B diffTree 树表/Mode C 原始 JSON，04 文档 §一.2/§四）；⑧ 审批意见（reject 必填）；⑨ 批准/驳回/撤回（仅 maker）/retry/force-cancel；⑩ SoD 呈现（checker≠maker 服务端强制）；⑪ 敏感字段掩码；⑫ 高级审批动作视图化〔flux 侧预期〕。
- **renderer 映射**：列表=`crud`（selection/multiple/`$crud.selectionCount`/onRowClick）；筛选=`query-filter`；批量=`batch-bar`（countTemplate"影响 N 行"）；dialog=`dialog`/`drawer`（basic）；意见表单=`form`+`textarea`+必填；AI 建议=`ai-suggestions`；HITL 卡=`ai-tool-call`（onApproval，engine 不自改状态——交互语义完全吻合，但它是 AI 会话语境卡，inbox 复用需宿主构造 toolCall/state 并接管持久化，适合做"AI 预审结论+人工决断"卡）；对比 Mode A=`labelRemark`+`inputClassName`（零渲染器改动）；Mode B=`table`/`tree` 承载 diffTree（`diff-view` 是文本行 diff，对字段级 diff 树仅近似）；Mode C=`json-view`；横幅=`alert`；按钮联动=`button`+`reaction`（basic）。
- **缺口**：结构化 DiffTree（字段路径+to-many 三组分组）专用组件（G21）；字段渲染器 compare 变体（新值+旧值删除线行内标注，上游 04 文档 §三自证为二期项）（G22）。

**智能单据候选补充页**（两份 roadmap，按复杂度降序，均未纳入 1.0 复刻）：① 自助分析配置页（semantic-dataset §3.6/§3.8：拖拽透视分析+Panel 字段选择器+行列权限裁剪）；② 台账归档与统计报表导出工作台（smart-doc §3.8/§3.9：全文检索+duckdb 降级双路径+套打模板）；③ ChatBI 对话查数页（semantic-dataset §3.7：NL2Query 受口径约束+describe 输出+权限管线，flux ai-chat 族可对标）；④ 单据模板管理工作台（smart-doc §3.5：模板 DSL/版本化/字段绑定）；⑤ 存量 SQL 数据集迁移等价校验页（semantic-dataset §3.9：双结果集对照+差异定位）；（备选：计算字段编辑器，semantic-dataset L37/L183-187）。

## 2. IoT 增值域（nop-app-iot）

### V1 IoT 设备遥测详情页（上游无直接章节）

- **佐证来源**：iot roadmap L19-22 Non-Goals（遥测核心链路/前端 UI 面排除，归既有 roadmap 与 dashboard-ui-roadmap 通道）；`docs/backlog/dashboard-ui-roadmap.md` L36 WI4（时序折线/最新值卡片/聚合柱状渲染页，已勾选）+L37 WI5（预置看板）；`docs/design/telemetry-data-design.md` L25-38（ITelemetryStore 六方法）+L275-301（遥测订阅 VF-WI1：进程内即发即弃、无前端推送 API）；实体 `_IotTelemetryRecord`（deviceId/metricName/ts/valueDouble/quality/tags）、`_IotAlarm`（severity/status/triggerValue/thresholdValue/ackAt/escalationTier）；动作 `AlarmLifecycleService`（acknowledge L76/startProcessing L80/close L84/batchTransition L303）；既有页实证：`module-dashboard/iot-dash-web/.../pages/{IotDashTrendChart, IotDashLatestValue, DeviceOverview, AlarmOverview}/main.page.yaml`（`@query:IotTelemetryData__raw` + form + chart，多处 `interval: 30000` 轮询实证）。
- **页面形态**：单设备焦点页：deviceKey+metric+时间窗 → 实时曲线+最新值概览卡，周期轮询；下方联动活动告警列表（ack/处理/关闭）。
- **交互要素**：① 查询表单（deviceKey/metric/start/end）；② 实时曲线（queryRaw/aggregate 周期刷新）；③ 最新值概览卡（多 metric+迷你趋势）；④ 告警列表联动（行点击→ack/开始处理/关闭+统计条）；⑤ 质量位/数据类型映射展示〔实体有字段，呈现形态 flux 侧预期〕；⑥ 实时推送〔上游订阅为进程内即发即弃，无前端 API；flux 侧以轮询替代，预期〕。
- **renderer 映射**：表单=`form`+input 系+`query-filter`；曲线=`echarts`（data，8 类事件）或 `chart`；轮询=`data-source` interval/stopWhen（flux-core schema L305-306）+`use-crud-polling`；概览卡=`stat-tile`（value/delta/sparkline）+`sparkline`；告警联动=`table`/`crud`（onRowClick）+`dialog`+`status`/`mapping` 严重度。
- **缺口**：无 WebSocket/SSE renderer，实时推送只能轮询模拟（G23）。

### V2 IoT OTA 灰度管理页

- **上游出处**（直接章节）：L40 WI7（固件包仓库：上传/校验/版本列表/废弃）；L41 WI8（分批灰度推送执行：批次策略+批间门控——批完成率/失败率阈值自动推进或暂停，对接 `ICommandDownlinkSender`）；L42 WI9（升级任务状态机补全与失败回滚：回退至上一稳定版本，复用 `IotOtaPackageAssignmentStateMachine`）；L43 WI10（断点续传与分块传输）；L28 WI1（对标六维矩阵）。佐证：`_IotOtaPackage`（title/versionNo/checksum/fileUrl）、`_IotOtaPackageAssignment`（status/statusTime/lastError/batchNo）；状态机八态 QUEUED→INITIATED→DOWNLOADING→DOWNLOADED→VERIFIED→UPDATING→UPDATED+FAILED（dict `iot-dev/ota-update-status`，lastError=ROLLED_BACK 区分回滚）；`OtaRolloutService`（assignBatched L95/activateNextBatch L144/rollbackPackage L179/verifySignature L64）；既有页 `module-device/iot-dev-web/.../pages/{IotOtaPackage, IotOtaPackageAssignment}/`（CRUD 主表页）。
- **页面形态**：固件包仓库+指派任务双视角：固件列表→分批灰度向导→批次进度总览（八态分布+门控）→失败回滚。
- **交互要素**：① 固件 CRUD+verifySignature+废弃；② 灰度指派向导（选设备→分批→确认下发）；③ 批间门控（阈值显示+推进/暂停）；④ 状态机步骤条（八态+FAILED 分叉）+statusTime 时间线；⑤ 失败回滚（rollbackPackage 二次确认）+markFailed；⑥ 进度矩阵表（设备×批次×状态+lastError）；⑦ 断点续传进度上报展示〔上游 WI10 未实现，无数据契约；进度条形态 flux 侧预期〕。
- **renderer 映射**：列表=`crud`+行按钮；上传=`input-file`/`upload-field`（form-advanced）；向导=`wizard`（layout，steps/value/statusPath/linear/onStepCommit/onStepError）内嵌 `table` 多选；步骤条=`steps`（layout）；时间线=`timeline`（layout）；门控=`button-group`+`dialog`+`progress`；回滚=`dialog`+`button`+`alert`（ROLLED_BACK）；进度表=`table`+`mapping`+`query-filter`。
- **缺口**：无硬缺口（wizard/steps/timeline/input-file 全部现成；断点续传属上游未实现而非 renderer 缺口）。

### V3 IoT 围栏地图与视频墙页

- **上游出处**（直接章节）：L83 WI32（`IotDeviceGeoFence`+`DeviceGeoService` Haversine 圆形围栏已在位；多边形围栏/进出事件引擎/轨迹存储为缺口）；L89 WI35+L95-98 WI38-41（多边形 point-in-polygon/进入/离开/滞留三类事件/轨迹时间窗检索/告警联动）；L55 WI16+L70 WI25（视频五维矩阵：SIP 信令/通道管理/实时预览/回放/录像计划；点播起流/停流；**当前无任何 GB28181/RTSP/流媒体实现——全量缺口**）；L125-126（当前基线：视频全量缺口、地理围栏 Deferred 含"AMIS 地图渲染（跨仓）"）。佐证：`_IotDeviceGeoFence`（fenceName/centerLat/centerLng/radiusMeters 圆形三要素）、`_IotDevice` L148-154（latitude/longitude）、`DeviceGeoService`（updatePosition/createFence/removeFence/haversineMeters）；**既有围栏页** `IotDeviceGeoView/main.page.yaml`（设备位置用 chart 经纬度投影 workaround+围栏 crud+行级 checkFence rpc）。视频域无任何佐证。
- **页面形态**：左图右墙工作台：地图渲染设备 pin+围栏（现状仅圆形），pin 点击联动详情/告警，事件列表滚动更新；右侧视频墙面板阵列。上游后端（多边形/事件/轨迹/视频）完全缺位，属纯规划态复刻。
- **交互要素**：① 围栏绘制（多边形/圆形）〔上游 WI38 为缺口〕；② 设备位置 pin 标注/聚合/点击；③ 围栏判定展示（checkFence：inside/distanceMeters，既有页已消费）；④ 进出/滞留事件列表+告警联动；⑤ 轨迹回放〔上游 WI40 缺口〕；⑥ 通道树+点播控制（上游 API 面未实现）；⑦ 视频墙多画面阵列+云台/播放控制〔flux 侧预期〕。
- **renderer 映射**：底图=`map`（OpenLayers，basemap xyz/wms）；pin=`pinData`+`cluster`+onClick（feature-click payload）；choropleth=`regionData`+visualMap；事件列表=`table`/`list`+interval 轮询+`timeline`；通道树=`tree`+`drawer`；单画面=`video`（content L596-613，**纯 HTML5 video，仅 http/mp4 直链；无 HLS/HTTP-FLV/RTSP/GB28181**）；阵列=`grid`+`card`；圆形围栏可自转 GeoJSON 经 `geojsonSource` 回显（非交互式）。
- **缺口**：map 包无 draw/modify 绘制编辑交互与围栏图形叠加（G24）；轨迹回放 line/track/时间动画（G25）；iframe renderer 未注册实现（仅 dashboard editor palette 登记）+HLS/RTSP/GB28181 播放器（G26，与 roadmap §4 已知缺口"视频墙面板"一致）。

**IoT 域候选补充页**（按复杂度降序，均未纳入 1.0 复刻）：① 通道录像计划管理页（WI26 L71：时段模板×通道×调度任务三对象联动）；② 围栏事件→告警联动规则配置页（WI41 L98：三类事件×规则模板×通知渠道）；③ 视频设备与通道管理页（WI22 L67：国标编码/通道树/SIP 生命周期）；④ 轨迹时间窗检索页（WI40 L97：时序窗查询+双后端+降采样）；⑤ 固件断点续传传输监控页（WI10 L43：分块偏移簿记实时进度态）。

## 3. 缺口汇总（登记待 R4 裁定；续接 R1/R2 G1-G18）

| #   | 缺口                                                                   | 涉及页 | 性质                               |
| --- | ---------------------------------------------------------------------- | ------ | ---------------------------------- |
| G19 | OCR bbox 区域框 overlay/zoom/字段→区域联动（image-compare 仅整图对比） | O1     | 潜在新 type                        |
| G20 | 字段粒度确认门禁编排（wizard 是 step 级）                              | O1     | 近似可过（detail-view）            |
| G21 | 结构化 DiffTree（字段路径+to-many 分组）专用组件                       | O2     | 潜在新 type                        |
| G22 | 字段渲染器 compare 变体（行内新值+旧值删除线）                         | O2     | 既有控件扩展（上游亦列二期）       |
| G23 | 前端实时推送（WebSocket/SSE renderer；现仅轮询）                       | V1     | 潜在新 type                        |
| G24 | map 包绘制/编辑交互（draw/modify/顶点编辑）与围栏叠加                  | V3     | 既有控件扩展                       |
| G25 | 轨迹回放（line/track/时间动画）                                        | V3     | 潜在新 type                        |
| G26 | iframe renderer 注册实现 + HLS/RTSP/GB28181 播放器                     | V3     | 潜在新 type（roadmap §4 已知缺口） |

## 4. 关键引用清单

- 上游 roadmap：`~/app/nop-entropy/docs/backlog/{smart-document-platform, semantic-dataset}-roadmap.md`、`~/app/nop-app-iot/docs/backlog/iot-value-added-roadmap.md`（154 行）
- 上游佐证：`~/app/nop-entropy/ai-dev/design/{maker-checker/00-vision.md, maker-checker/04-review-ui-diff-contract.md, nop-wf/approval-flow-design.md, nop-wf/approvable-entity-design.md, nop-ai-agent/04-tool-invocation.md}`；`~/app/nop-app-iot/docs/{backlog/dashboard-ui-roadmap.md, design/telemetry-data-design.md, design/device-state-machine.md}`；实体 `_IotTelemetryRecord`/`_IotAlarm`/`_IotOtaPackage`/`_IotOtaPackageAssignment`/`_IotDeviceGeoFence`/`_IotDevice`；既有页 `IotDashTrendChart`/`IotDashLatestValue`/`IotOtaPackage(Assignment)`/`IotDeviceGeoView`
- flux 侧核实：`packages/flux-renderers-layout/src/index.ts`（L26/L31 wizard/steps 导出）、`packages/flux-renderers-content/src/content-renderer-definitions.ts`（image L231/image-compare L204/video L596/json-view L260/alert L381）、`packages/flux-renderers-map/src/map-renderer-definitions.ts`（唯一 map type）、`packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`（HITL L24-41/L237-304）、`packages/flux-renderers-form-advanced/src/detail-view/`、`packages/flux-renderers-dashboard/src/editor/editor-palette.tsx` L26（iframe 仅登记）、`packages/flux-core/src/types/schema.ts` L154/L158/L305-306
