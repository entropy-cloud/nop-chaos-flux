# R4 flux 能力差距矩阵（21 复刻页 × renderer 覆盖三色分级）

> Created: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R4；执行 plan `docs/plans/789-business-replication-r4-gap-matrix-plan.md`
> 输入: R1-R3 盘点（`docs/analysis/business-replication/r1-erp-page-inventory.md`、`r2-ai-mes-mall-page-inventory.md`、`r3-entropy-iot-page-inventory.md`，21 页/G1-G26/候选 41）+ 登记面底账（amis-baseline-matrix / missing-components-and-designer-roadmap / existing-components-improvement-analysis）
> Authority: 本矩阵只做三色分级与登记映射，**不裁决 retention**；新 type 最终裁决走 `amis-baseline-matrix.md` 增行（human gate）。

## 0. 方法与分级词汇

- 三色分级（roadmap 原词）：**直接组合**（现有 type 组合可撑住验收）/ **能力扩展**（既有 type 增强后可撑住）/ **新 type**（无现成 type，登记候选并以近似组合临时过验收）。
- 每条分级必须引用 R1-R3 盘点的实证缺口描述，不新造事实；"临时形态"列说明验收期近似方案。
- 底账引用（live 行号，2026-10-30）：missing-components L107（L3.3 declarative download action，`proposed`）、L123（L4.5 kanban 手势变体，`proposed`）、L90（L2.1 user-select/department-select，已由 plan 505 落地 form 包）、L183（P3 keep-out 清单：menu shell/multi-tab/**iframe**/export backend/…）；improvement-analysis L23-24 与 L182-183（**前端导出/echarts 扩展不采纳**：导出=后台职责、chart=recharts 够用）、L68（table/crud P0 缺口族）、L99-101（§2.2 桌面拖拽缺口保留）、L62（v2 将 data-source ws 等降为 P2）。
- 冲突裁定原则：缺口诉求与"不采纳清单/keep-out"冲突时，该诉求**不得新登记**，按组合近似过验收并引用既有裁定。

## 1. 21 页可行性结论表

| 页                   | 域       | 结论                                                                                    | 依据缺口      | 验收期说明                                                                                                                                         |
| -------------------- | -------- | --------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1 PDA 收货/上架     | WMS      | **直接组合**（扫码/刷新/滑动/滚轮/数字键盘全齐）                                        | G3、G4        | "单手操作流"以 floating-bubble/action-sheet 近似；扫码校验走 action 编排                                                                           |
| W2 拣货路径看板/波次 | WMS      | **直接组合**（kanban/gantt/input-table 合计行）                                         | G5、G2、G7    | 路径可视化以 gantt 时间轴形态验收（上游未明示 2D）；库位平面图不做                                                                                 |
| W3 库存台账          | WMS      | **直接组合**（pivot-table/stat-tile/dialog drill-down）                                 | G6、G7        | 导出走服务端报表下载（既有 trace-report 先例）；对账提示用 status/card                                                                             |
| C1 商机漏斗看板      | CRM      | **直接组合**（kanban dnd+quick-edit；漏斗图近似）                                       | G1、G2        | 漏斗统计以水平 bar 近似（chart 6 图型无 funnel）；拖拽落点→moveStage 绑定在 D2 设计时验证；footer 统计带绑定方式 D2 验证（R1 登记，未单列 G 编号） |
| C2 客户 360          | CRM      | **直接组合**（tabs/timeline/detail-view/calendar）                                      | —             | 全要素现成 type；上游 calendar 降级项在 flux 侧回归验证                                                                                            |
| C3 销售驾驶舱        | CRM      | **直接组合**（dashboard/stat-tile/echarts/query-filter）                                | G1、G8        | 漏斗分布以 bar 近似；钻取走 echarts 事件（9 类事件，盘点记 8 系笔误，live ECHARTS_EVENT_CONTRACTS 实为 9——就地勘误）                               |
| I1 资产台账与盘点    | ITAM     | **直接组合**（crud/batch-bar/barcode-input batchMode/diff-view）                        | —             | 全要素现成 type（barcode-input batchMode 直接对口）                                                                                                |
| I2 折旧仪表盘        | ITAM     | **直接组合**（stat-tile/chart/pivot-table/crud）                                        | G6            | 导出走服务端报表下载（mnt 报表先例）                                                                                                               |
| K1 知识库对话        | AI       | **直接组合**（ai-chat 族 14 type 全覆盖）                                               | G11           | 护栏/频控提示以 alert/status 组合                                                                                                                  |
| K2 工单处理台        | AI       | **能力扩展**（桌面 SLA 倒计时缺）                                                       | G9、G12、G11  | 倒计时临时以静态剩余时长文本过验收；推荐回复采用走 action 编排                                                                                     |
| K3 审批轨迹          | AI       | **直接组合**（timeline/steps/user-select/ai-tool-call HITL）                            | G13、G18      | 转办以 user-select+ajax 组合；wf 图形可视化不需要（timeline/steps 覆盖）                                                                           |
| M1 车间大屏          | MES      | **直接组合**（dashboard/stat-tile/echarts/notice-bar/scada-canvas）                     | G10           | 翻牌器动效以 stat-tile 近似（无 flip 动画）                                                                                                        |
| M2 工序报工          | MES      | **直接组合**（input-table computed/aggregate/summaryBinding 全齐，plan 785 直接受益页） | —             | 无缺口                                                                                                                                             |
| M3 异常叫料移动页    | MES      | **直接组合**（mobile 16 type 全齐）                                                     | G14           | 拍照以 input-image accept 唤起相机（平台行为），无 capture 属性                                                                                    |
| S1 商品 SKU 选择     | 商城     | **能力扩展**（主体组合可撑，UI 形态组缺）                                               | G15、G16      | 价格文本以 card/text tpl 拼、吸底栏以布局近似、场次切换以 button-group-select 近似；规格求交走 formula                                             |
| S2 分销后台          | 商城     | **直接组合**（table/pivot-table/stat-tile/tree/qrcode）                                 | G6、G17       | 导出/调度/租户裁剪分别走服务端下载、batch-bar+action、page 权限层                                                                                  |
| O1 OCR 校正工作台    | 智能单据 | **新 type**（bbox overlay 无现成 type）                                                 | G19、G20      | 以 image-compare 整图对照+detail-view 逐字段确认临时过验收；字段门禁 detail-view 已覆盖                                                            |
| O2 HITL 审批收件箱   | 智能单据 | **能力扩展**（主体组合可撑，DiffTree/compare 变体缺）                                   | G21、G22      | diffTree 以 table/tree 承载近似；行内 compare 变体上游自证二期                                                                                     |
| V1 遥测详情          | IoT      | **直接组合**（echarts/data-source 轮询/stat-tile/sparkline）                            | G23           | 实时以 interval 轮询模拟（上游订阅亦无前端 API）                                                                                                   |
| V2 OTA 灰度管理      | IoT      | **直接组合**（wizard/steps/timeline/input-file/table）                                  | —             | 无 renderer 缺口（断点续传属上游未实现）                                                                                                           |
| V3 围栏地图与视频墙  | IoT      | **新 type**（map 绘制/轨迹/视频流均缺）                                                 | G24、G25、G26 | pin/cluster/geojson 回显+video mp4 样例流过验收；绘制/轨迹/流媒体不做交互验收                                                                      |

**汇总**：直接组合 16 页；能力扩展 3 页（K2/S1/O2）；新 type 2 页（O1/V3）。21/21 页均可在 M3 以组合或临时形态过验收——**复刻可行性结论：整体可行，无阻塞性缺口**。

## 2. G1-G26 三色分级矩阵

| #   | 缺口                                                | 分级                                                    | 涉及页   | 建议登记去向                                                             | 与既有登记项关系                                                                                                                                   |
| --- | --------------------------------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | funnel/gauge 图型                                   | 能力扩展                                                | C1/C3    | improvement-analysis（chart P3 增强族）                                  | 对齐既有"chart minor recharts 增强"（L60/L147）；echarts 透传路径不受 L183 echarts 不采纳约束（echarts renderer 已独立注册）                       |
| G2  | kanban 拖拽落点→mutation 绑定                       | 直接组合（验证项）                                      | C1/W2    | 无需登记（D2 设计验证项）                                                | 旁证：missing-components L4.5 kanban 手势变体（proposed）；improvement §2.2 桌面拖拽                                                               |
| G3  | 扫码即校验回填                                      | 直接组合                                                | W1       | 无需登记                                                                 | action graph 编排，非 renderer 缺口                                                                                                                |
| G4  | 单手操作流                                          | 直接组合                                                | W1       | 无需登记                                                                 | floating-bubble/floating-panel/action-sheet 近似                                                                                                   |
| G5  | 库位 2D 平面动线图                                  | 新 type                                                 | W2       | missing-components 需求行（demand-gated）                                | 上游未明示 2D，M3 以 gantt 形态过验收，登记为 watch-only 需求                                                                                      |
| G6  | table/crud/pivot 内建导出                           | **登记冲突**                                            | W3/I2/S2 | 不登记                                                                   | improvement L23/L182 明示"前端不做导出（后台职责）"；导出走 missing-components L3.3 declarative download action（proposed，已登记）+服务端报表下载 |
| G7  | job 调度监控/对账可视化                             | 直接组合                                                | W2/W3    | 无需登记                                                                 | status/card/batch-bar 组合可覆盖                                                                                                                   |
| G8  | chart 点击钻取                                      | 直接组合                                                | C3       | 无需登记                                                                 | echarts 9 类事件（R2/R3 盘点写 8，live 实为 9——就地勘误）；chart(recharts) 路径归 G1 族                                                            |
| G9  | 桌面端 countdown                                    | 能力扩展                                                | K2       | missing-components 新 type 候选（SLA demand）                            | 注意与 improvement L186"button 不采纳 amis countDown prop"区分：本条是独立倒计时组件跨包（mobile→desktop），非 button prop                         |
| G10 | 翻牌器 flip 动效                                    | 新 type                                                 | M1       | missing-components 需求行（demand-gated）                                | stat-tile 近似过验收；roadmap §4 已预告"翻牌器"缺口                                                                                                |
| G11 | AI 护栏/置信度结构化提示                            | 直接组合                                                | K1/K2    | 无需登记                                                                 | alert/status/ai-feedback 组合                                                                                                                      |
| G12 | 推荐回复采用→写回                                   | 直接组合                                                | K2       | 无需登记                                                                 | action 编排                                                                                                                                        |
| G13 | 转办/改派专用动作                                   | 直接组合                                                | K3       | 无需登记                                                                 | user-select（L2.1 已落地）+ajax 组合                                                                                                               |
| G14 | input-image capture 属性                            | 能力扩展                                                | M3       | improvement-analysis 新增条目（input 族扩展）                            | 无既有登记冲突                                                                                                                                     |
| G15 | 商城 UI 形态组（价格文本/吸底栏/加购动效/场次切换） | 新 type 族                                              | S1       | missing-components 需求行（demand-gated，上游需求源 SAAS-07 渲染器清单） | 全部有近似组合过验收；登记为商城渲染器族候选而非逐个立项                                                                                           |
| G16 | 规格求交→SKU 定位                                   | 直接组合                                                | S1       | 无需登记                                                                 | formula/action 层职责，非 renderer                                                                                                                 |
| G17 | 结算批处理界面/租户两级裁剪                         | 直接组合                                                | S2       | 无需登记                                                                 | page/权限层+action 组合；调度 UI 属 host 职责                                                                                                      |
| G18 | 审批流 wf 图形可视化                                | 直接组合                                                | K3       | 无需登记                                                                 | timeline/steps 覆盖审批轨迹；图形设计属 flow-designer 域（designer-canvas 等 6 type 已注册）                                                       |
| G19 | OCR bbox 区域框 overlay                             | 新 type                                                 | O1       | missing-components 需求行（demand-gated，上游 §3.3 工作台为需求源）      | image-compare 整图对照临时过验收                                                                                                                   |
| G20 | 字段粒度确认门禁                                    | 直接组合                                                | O1       | 无需登记                                                                 | detail-view 草稿+逐字段提交+再校验已具备                                                                                                           |
| G21 | 结构化 DiffTree 组件                                | 新 type                                                 | O2       | missing-components 需求行（demand-gated）                                | diff-view 仅文本 diff；table/tree 近似过验收                                                                                                       |
| G22 | 字段渲染器 compare 变体                             | 能力扩展                                                | O2       | improvement-analysis 新增条目（input 族扩展）                            | 上游 maker-checker 04 文档自证"二期实施"，与上游节奏一致                                                                                           |
| G23 | WebSocket/SSE 实时推送                              | 新 type                                                 | V1       | missing-components 需求行（demand-gated）                                | improvement L62 已将 ws 降为 P2；复刻以轮询过验收，登记 watch-only                                                                                 |
| G24 | map draw/modify 绘制编辑                            | 能力扩展                                                | V3       | improvement-analysis 新增条目（map 族扩展）                              | 上游 WI38 多边形围栏亦为缺口，demand 双侧印证                                                                                                      |
| G25 | 轨迹回放（track/时间动画）                          | 新 type                                                 | V3       | missing-components 需求行（demand-gated）                                | 上游 WI40 轨迹存储同缺；复刻不做交互验收                                                                                                           |
| G26 | iframe renderer + HLS/RTSP 播放器                   | **登记冲突**（iframe 部分）/ 新 type 候选（播放器部分） | V3       | iframe 不登记；视频流播放器 missing-components 需求行（demand-gated）    | iframe 在 missing-components L183 keep-out 清单（demand-gated 非 item）；video renderer 仅 mp4，复刻以 mp4 样例流过验收                            |

**分级汇总（与 §2 逐行表一致，closure audit Finding 1 勘误）**：直接组合 12 条（G2/G3/G4/G7/G8/G11/G12/G13/G16/G17/G18/G20）；能力扩展 5 条（G1/G9/G14/G22/G24）；新 type 候选 7 条（G5/G10/G15/G19/G21/G23/G25，demand-gated watch-only）；登记冲突 2 条（G6、G26-iframe，引用既有不采纳/keep-out 裁定不新登记）。12+5+7+2=26。另一口径：按"是否需要登记动作"计，无需/不登记条目 14（§4 第三项 13 整条 + G26 iframe 半条）。

## 3. 冲突核对结论

1. **G6 导出**：诉求与 `existing-components-improvement-analysis.md` L23/L182"前端不做导出（后台职责）"直接冲突——**不登记 renderer 扩展**；复刻统一走服务端报表下载（三处既有先例：trace-report/downtime-summary/ErpCrmReport\_\_download）+ missing-components L3.3 declarative download action（proposed）承接动作词汇。
2. **G26 iframe**：诉求与 missing-components L183 P3 keep-out 清单（iframe 明示在列）冲突——**不登记 iframe renderer**；视频墙走 video+grid 组合，流接入归流媒体服务器/外部播放器。
3. **G9 countdown 与 button countDown 不采纳的区分**：improvement L186 不采纳的是 amis 式 button 倒计时 prop；G9 是独立倒计时组件的桌面注册，不构成冲突，可登记。
4. 其余 23 条缺口与两份登记文档无语义重复（逐条对照 missing-components §13 状态总表与 improvement §7 工作项草案，无同名/同语义项）。

## 4. 登记映射汇总（供 F2 缺口沉淀与 D 阶段设计引用）

- **improvement-analysis 新增条目候选**（既有控件扩展）：G14（input-image capture）、G22（input compare 变体）、G24（map draw/modify）、G1（chart 图型，并入既有 P3 chart 族）。
- **missing-components 需求行候选**（demand-gated，新 type）：G5（库位平面图）、G10（翻牌器）、G15（商城渲染器族）、G19（OCR bbox overlay）、G21（DiffTree）、G23（ws/sse）、G25（轨迹回放）、G26 播放器半条（视频流）。
- **不登记**（引用既有裁定/组合覆盖）：G2/G3/G4/G6/G7/G8/G11/G12/G13/G16/G17/G18/G20、G26 iframe 半条。
- 以上均为**登记候选**，实际登记动作与 retention flip 由后续 plan 按 Authority 执行（human gate 在 amis-baseline-matrix）。

## 附录 A. 候选补充页索引（41 个，1.0 范围外，仅索引不分析）

- R1（15）：PDA 拣货/移库/盘点作业、收货→发运全流程演示、发运/承运商网关、调拨审批过账、波次调度监控（WMS）；线索转化三步向导、销售预测主从、营销序列编排、评分规则配置、组合定价（CRM）；二维码标签打印、报修/维保请求、demo 聚合入口、资产处置工作台、资产审计轨迹（ITAM）。
- R2（15）：知识库文档管理、RAG 检索测试台、AI→人工升级处理台、AI 操作审计、MaxKB 形态对照演示（AI）；报工质检联动、工单执行工作台、工序排产甘特、异常叫料 E2E 演示、停机记录管理（MES）；平台/商户两级后台、套餐与入驻审核、拼团详情、订单运营工作台、营销活动日历（商城）。
- R3（11）：自助分析配置、台账归档统计报表、ChatBI 对话查数、单据模板管理、存量 SQL 迁移校验（+备选计算字段编辑器）（智能单据）；通道录像计划、围栏事件告警联动规则、视频通道管理、轨迹时间窗检索、断点续传监控（IoT）。

## 5. 关键引用清单

- R1-R3 盘点：`docs/analysis/business-replication/r{1,2,3}-*.md`（本矩阵全部分级的事实来源）
- 登记面底账：`docs/backlog/missing-components-and-designer-roadmap.md`（L107/L123/L90/L183/§13 状态总表）、`docs/components/existing-components-improvement-analysis.md`（L23-24/L60/L62/L68/L99-101/L147/L182-186/§7）、`docs/components/amis-baseline-matrix.md`（retention 权威，未增行）
- 785 联动：commit 2f904cea0（input-table 合计行/从表联动/金额大写落地）、`docs/components/input-table/design.md` 列级增强节
