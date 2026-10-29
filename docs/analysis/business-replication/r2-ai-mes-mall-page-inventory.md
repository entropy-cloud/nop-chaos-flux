# R2 AI 客服 / MES / 商城页面盘点

> Created: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R2；执行 plan `docs/plans/787-business-replication-r2-ai-mes-mall-inventory-plan.md`
> 输入: 上游 `~/app/nop-app-erp/docs/backlog/{ai-knowledge-ticket, mes-shopfloor}-roadmap.md`、`~/app/nop-app-mall-wt/nop-app-mall-master/docs/backlog/multitenant-saas-roadmap.md`（均 Last Updated 2026-10-28 前后）+ 上游模块/页面佐证
> 用途: 供 R4 能力差距矩阵与 M2-D3/D4 设计消费。只登记"页面需要什么"，不裁定能力分级。缺口编号续接 R1（G9 起）。

## 0. 盘点方法与输入源勘误

- **上游 AI/MES roadmap 全部工作项 `todo`（0 done）**，owner docs（roadmap 标 NEW）均不存在：`docs/analysis/{ai-cs-survey, mes-survey}/`、`docs/design/{ai-cs, mes}/` 目录缺失。页面业务定义纯为需求输入，无实页可对照的以活仓 ORM/既有 flux 页佐证。
- **"上游无直接章节"的页面**（显式标注）：K3 审批轨迹页（上游仅 nop-wf human-approval 门 + use-approval 范式，无审批 UI 页工作项）；M1 车间大屏页（上游最接近的是 M3.5 车间看板聚合）；M3 异常叫料移动页（上游无页面级定义，仅 M1.3/§3 点名 flux-renderers-mobile 形态备选）；S2 分销后台页（上游仅 SAAS-10/11 业务模型锚点，页面三段形态为组装推断）。
- 活仓佐证模块（实存）：`module-cs`（工单/SLA/知识库 + 既有 flux 页 kanban.flux.yaml/timeline.flux.yaml）、`module-manufacturing`（JobCard/报工/领料实体）、`module-maintenance`（停机）、`module-aps`/`module-quality`；商城仓 `app-mall-web/.../pages/mall/`（flash-sale-list、goods-detail、stat-dashboard 实页）。
- flux 侧关键归属（live 核实 2026-10-30）：`flux-renderers-ai` 恰 14 个 type（ai-chat/ai-message-list/ai-bubble/ai-sender/ai-conversations/ai-welcome/ai-prompts/ai-feedback/ai-tool-call/ai-attachments/ai-citations/ai-voice-input/ai-token-usage/ai-suggestions）；`flux-renderers-industrial` 唯一 type `scada-canvas` + 37 个 `scada-*` 内置符号（含 scada-group）；`input-table` 列级 `aggregate`/`computed`/`summaryVisible`/`summaryBinding` 为 plan 785 已落地能力；**`countdown` 仅 mobile 包注册（桌面端无）**；轮询契约为 `data-source` 的 `interval`/`stopWhen`（flux-core schema.ts L302-308）；`user-select`/`department-select` 在 form 包 org 组（plan 505）；`carousel`/`progress`/`qrcode`/`status`/`mapping` 在 content 包。
- 标注约定：无标注 = 上游明示；**〔flux 侧预期〕** = 复刻目标引入、上游 roadmap 未明示。

## 1. AI 知识库 + 工单域

### K1 AI 知识库对话页

- **上游出处**（`ai-knowledge-ticket-roadmap.md`）：§1 L8（RAG 问答/引用溯源，对标 MaxKB/FastGPT，复用 nop-entropy `nop-ai`）；§4 L36（缺口：无 RAG 问答入口、无答案引用溯源展示）；K2.2 L56（检索/重排/引用溯源/护栏/频控）；K3.2 L67（问答页面实现）；§8 L115（护栏/频控为强制横切项）。
- **页面形态**：MaxKB/FastGPT 形态问答入口：会话列表 + 消息流（streaming）+ 引用来源卡片 + 反馈按钮；检索/护栏由 nop-ai 平台承担。
- **交互要素**：① 会话管理（新建/切换/重命名/删除）〔flux 侧预期，上游未逐条明示〕；② 提问输入（Enter 提交、字数上限、附件）；③ token 级 streaming 输出（请求中禁用输入+停止按钮）；④ 引用来源卡片（`[N]` 上标/悬浮卡/来源列表，可点击）；⑤ 反馈组（复制/重新生成/点赞/点踩）；⑥ 建议提问 chips；⑦ token 用量展示；⑧ 护栏/频控拒绝提示〔上游只定义后端强制项，提示 UI 为 flux 侧预期〕。
- **renderer 映射**：整页编排=`ai-chat`；会话=`ai-conversations`；消息流=`ai-message-list`+`ai-bubble`（streaming markdown buffer）；输入=`ai-sender`（submitType/maxLength/停止）；引用=`ai-citations`（inline/list 模式、onSourceClick）；反馈=`ai-feedback`；附件=`ai-attachments`；建议=`ai-prompts`/`ai-suggestions`；用量=`ai-token-usage`；空态=`ai-welcome`。streaming/分支/regenerate 引擎能力在 `engine/`（types.ts AsyncGenerator stream、branching.ts、regenerate.ts）。
- **缺口**：护栏/频控拒绝的结构化提示（来源可信度/护栏原因）无专用 type（G11）。

### K2 工单处理台页

- **上游出处**：§3 L23（`module-cs`：Ticket 登记→SLA→分派→解决关闭，status 六态）；K2.3 L57 + K3.3 L68（AI 自动分类/推荐回复/置信度门）；K2.4 L58（人工升级工作流）。ORM 佐证：`module-cs/model/app-erp-cs.orm.xml` L164 起（ErpCsTicket：subject/priority/slaPolicyId/deadlineDateTime/isSlaCompleted/lastEscalationLevel 等；ErpCsSlaPolicy L282；ErpCsTicketAction L356）。实页佐证：`ErpCsTicket/kanban.flux.yaml`（6 列看板，onCardMove 按目标列路由 assign/start/resolve/close/reopen mutation）、`ErpCsTicketAction/timeline.flux.yaml`。
- **页面形态**：队列（表格/看板按六态分列）+ 工单详情（timeline+动作）+ SLA 倒计时/升级标记 + AI 推荐（分类/优先级/推荐回复，置信度门）。
- **交互要素**：① 队列 CRUD+多维筛选；② 看板拖拽跨列路由 mutation（活仓已定义该语义）；③ SLA 倒计时（deadlineDateTime 剩余、超时标红）；④ 升级链展示+手动升级（ESCALATE）；⑤ 详情 timeline（fromStatus→toStatus+操作人+actionType）；⑥ AI 自动分类/优先级（可人工改写）；⑦ AI 推荐回复卡片+置信度门（低置信触发人工接管）；⑧ 内部备注；⑨ 转人工/升级。
- **renderer 映射**：队列=`crud`/`table`/`query-filter`（data）；看板=`kanban`（scheduling）；KPI 卡=`stat-tile`/`sparkline`；timeline=`timeline`（layout）；状态机进度=`steps`（layout process-display-definitions）；弹窗=`dialog`/`drawer`（basic）；AI 建议=`ai-suggestions`+组合。
- **缺口**：桌面端 SLA 倒计时——`countdown` 仅 mobile 包注册，表格行内实时倒计时无桌面 type（G9）；置信度门结构化卡片（与 G11 同族）；"推荐回复→写回回复框"采用动作链路需 action 编排（G12）。

### K3 审批轨迹页（上游无直接章节）

- **佐证来源**：roadmap §3 L24（nop-wf human-approval 门）+ K2.4 L58/K3.4 L69（转人工）+ K4.3 L79（E2E：提问→RAG→转人工→回写）；`docs/design/ai-native-interface.md` §2/§3（L42 可复用 use-approval 审批门；L47-51 AI 人工确认点=NopWfStepInstance/NopWfWork 待办）；`docs/design/flow-overview.md` §3.1 L280-282（approveStatus 四值权威源）；`module-purchase/.../ErpPurPayment.xbiz`（submitForApproval/approve/reject mutation 范式）；module-cs approveStatus 字段。活仓内无 `*.wf.xml` 实例、无审批台页面 yaml（find 核实）。
- **页面形态**：审批中心视图：approveStatus 轴 + 审批轨迹 timeline + 待办审批卡片；复刻语境叠加 HITL（AI 高影响动作以审批卡等待 approve/reject）。转办/HITL 卡片为〔flux 侧预期〕。
- **交互要素**：① submitForApproval/approve/reject 动作（带 `:approve` 权限）；② approveStatus 轴展示（UNSUBMITTED→SUBMITTED→APPROVED/REJECTED）；③ 审批轨迹 timeline（操作人/时间/动作/意见）；④ 转办（选人+原因）〔flux 侧预期〕；⑤ HITL 审批卡片（工具名/参数/影响面+approve/reject）〔AI 侧能力已有，上游仅语义定义〕；⑥ 审批意见（reject 必填）；⑦ 待办列表。
- **renderer 映射**：轨迹=`timeline`；状态=`steps`；转办选人=`user-select`（form org 组）；弹窗=form+textarea；HITL=`ai-tool-call`（onApproval 事件，不 mutate state.approval）或 `ai-bubble` 内嵌（schemas L96-102）；待办=`crud`。
- **缺口**：真实 wf 图形可视化需核 `flow-designer-renderers` 适用性（G18）；"转办"无专用 renderer，user-select+ajax 组合（G13）。

**AI 域候选补充页**（按复杂度降序，均未纳入 1.0 复刻）：① 知识库文档管理页（§4 L36+K2.1/K3.1：上传→分段→向量化作业轮询→版本/启停，CRUD+异步管道）；② RAG 检索测试台（L36"检索测试"+K2.2：多路检索并排对比+溯源高亮，实验台形态）；③ AI→人工升级工作流处理台（K2.4/K3.4：置信度门→接管→回写，三域联动）；④ AI 操作审计与权限核查页（K3.5 L70：高维过滤+role-row-filter 核查，actorType"设计预留"需自造模型）；⑤ MaxKB 形态对照演示场景页（K4.4 L80：全链路剧本式长页）。

## 2. MES 车间域

### M1 MES 车间大屏页（上游无"大屏"直接章节，最近锚点=车间看板）

- **上游出处**：§4 L37（缺口：车间看板无车间视角聚合）；M3.5 L71（车间看板实现：工单进度/异常/停机聚合+KPI 口径登记，owner doc NEW 不存在）；§3 L29（getDashboardKpi 范式）；M4.3 L80（E2E 终点"派工→报工终端→质检→看板"）。佐证：`docs/design/manufacturing/ui-patterns.md` L96-133（工单四阶段进度条+配色规则）；`docs/design/flux-complex-pages.md` §4.1（看板+轮询范式）。
- **页面形态**：车间级聚合看板/大屏：工单执行进度+当日报工趋势+异常（Andon）与停机实时状态；数据跨 mfg/mnt/异常单（异常单实体未建，M3.3 后才有源）。
- **交互要素**：① KPI 翻牌卡（计划/完成/报废/完成率）；② 产线趋势图定时自动刷新；③ 工单四阶段进度列表（配色分级：100% 绿/50-99% 蓝/<50% 黄/0% 灰）；④ 未关闭异常滚动播报；⑤ 当前停机设备/时长；⑥ 车间工位组态示意〔flux 侧预期〕；⑦ 预警明细下钻。
- **renderer 映射**：骨架=`dashboard`（panel 网格）；KPI=`stat-tile`（value/delta/sparkline/status）；实时刷新=`data-source` interval/stopWhen + `use-crud-polling`；趋势=`echarts`（line，9 类事件，live ECHARTS_EVENT_CONTRACTS 实证；R5 审计勘误）/`sparkline`；进度=`progress`+`status`/`mapping` 配色；跑马灯=`notice-bar`（marquee 滚动+多文本轮播，mobile 包）；组态示意=`scada-canvas`+`scada-instrument-*`/`scada-sensor-control-*`/`scada-device-*`（industrial）。
- **缺口**：翻牌器 flip 动效（stat-tile 无动画，G10）。

### M2 MES 工序报工页

- **上游出处**：§4 L37（缺口：无报废/返工/工时结构化提交面）；M2.2 L57 + M3.2 L68（报工设计/实现：合格/报废/返工数量、工时、批次/序列写边、进度回写）；§8 L118（数量守恒断言为强制测试项）。佐证：`docs/design/manufacturing/ui-patterns.md` L121-133（工序作业卡列+L133"报工操作：弹出报工表单（完成数量、工时、报废数量）"+L129 工时比>1.0 标红，R5 审计勘误）；`state-machine.md` L184-205（JobCard 8 态+7 mutation）；`ErpMfgJobCardTimeLog.xmeta`（durationMins/setupMins/runMins/completedQuantity/scrappedQuantity/hourlyRate/laborCost）。
- **页面形态**：操作工按作业卡工序报工：选卡→开始/暂停→录入本班合格/报废数量与工时→提交；行级实时计算工时比与合计，超计划拦截；报工回写进度。
- **交互要素**：① 作业卡列表（工序/卡号/工作中心/计划数/完成数/工时比/状态）；② 行内报工编辑（完工数/报废数/setupMins/runMins）；③ 行级 computed（工时=setup+run、工时比>1.0 标红、合格率）；④ 合计行+数量守恒校验（completed+scrapped≤planned）；⑤ 状态动作按钮（startJob/holdJob/resumeJob/submitJob/completeJob 按 status 显隐）；⑥ 报工弹窗表单；⑦ 数量校验/非法状态迁移拦截；⑧ 返工数量（上游提及，ORM 载体待 M2.2 设计）。
- **renderer 映射**：行内编辑=`input-table`（item 行内控件）；行级计算=`computed` 列（composite-schemas L123-124）；合计=`aggregate`+`summaryVisible`+`summaryBinding`（plan 785 能力）；校验=ValidationRule+`validateValueAction`+input-number min/max；状态按钮=`button`+visible 表达式→ajax mutation；弹窗=`dialog`+`form`；标红=`status`/`mapping`+条件 className；回写刷新=`refreshNearest`/`refreshSource`。
- **缺口**：无（全部要素现成 type 覆盖；本页是 form-advanced plan 785 能力的直接受益页）。

### M3 MES 异常叫料移动页（上游无页面级定义）

- **上游出处**：§4 L37（缺口：无车间异常 Andon/叫料 pull signal 机制）；M2.3 L58 + M3.3 L69（异常登记/升级、叫料信号→领料单联动，复用 MaterialIssue/NopSysEvent）；M1.3 L47（车间终端形态调研，复用 flux-renderers-mobile）；§3 L27（flux-renderers-mobile 报工终端形态备选）。佐证：`ErpMfgMaterialIssue(Line).xmeta`（docStatus/approveStatus/posted；requiredQuantity/issuedQuantity/batchNo/locationId）。**异常单/叫料信号无实体**——移动端页面形态整体〔flux 侧预期〕。
- **页面形态**：车间现场（手机/PDA）异常登记与叫料：快速发起异常（类型/工位/描述/拍照）→升级链；缺料叫料→自动生成 MaterialIssue→跟踪响应。
- **交互要素**：① 任务列表（下拉刷新+无限加载）；② 快速发起异常（类型选择+工位+描述）；③ 现场拍照上传；④ 拍照预览放大；⑤ 叫料明细行内录入（物料/应领数量/库位）；⑥ 底部快捷动作面板（叫料/升级/关闭）；⑦ Andon 升级链；⑧ 响应倒计时〔flux 侧预期〕；⑨ 滚动通知；⑩ 领料单状态跟踪。
- **renderer 映射**：容器=`page`+`pull-refresh`+`infinite-scroll`；列表=`list`/`crud`+`swipe-cell`（快捷催单/关闭）；发起入口=`floating-bubble`；动作面板=`action-sheet`（display:grid）；半屏表单=`floating-panel`（anchors 两档）；拍照=`input-image`（form-advanced，multiple/accept/uploadAction）；预览=`image-viewer`（pinch 缩放）；选择=`wheel-picker`/`wheel-cascader`/`picker-view`；数量=`number-keyboard`+input-number；倒计时=`countdown`；播报=`notice-bar`；提交=ajax→mutation+NopSysEvent（后端）。
- **缺口**：`input-image` 无 `capture` 属性直采相机（accept="image/\*" 唤起相机仅为平台行为，G14）。

**MES 域候选补充页**（按复杂度降序，均未纳入 1.0 复刻）：① 报工质检联动工作台（M2.4/M3.4：触发规则+NCR 联动+放行门，佐证 module-quality ErpQaInspection/NCR）；② 工单执行工作台（M2.1/M3.1：执行态/排产态双状态轴，JobCard 8 态含 2 个预留死状态）；③ 工序排产甘特（§3 L23 复用 module-aps；`docs/design/aps/ui-patterns.md` L142"排产甘特图（核心复杂页面）"，flux 有现成 gantt）；④ 异常/叫料联动流 E2E 演示页（M4.4 L81：BOM→工单→排产→报工→质检五域编排）；⑤ 车间停机记录管理页（§3 L25+M3.5 数据源，ErpMntDowntimeEntry）。

## 3. 多租户商城域

### S1 商城商品 SKU 选择页

- **上游出处**（`multitenant-saas-roadmap.md` L141 SAAS-07）：商城渲染器需求清单明示"商品卡、SKU 选择器、营销倒计时、拼团进度、优惠券领取入口"；L16/L83（商城渲染器仅作外部依赖引用，flux 尚无该族）。**补充锚点**（同仓其他 roadmap）：`mobile-ux-redesign-roadmap.md` L52-55（秒杀倒计时楼层/SKU 半屏面板/吸底双按钮/加购动效）；`mobile-frontend-roadmap.md` L93/L149/L177（商品详情/秒杀场次/库存语义化）；`enhanced-features-roadmap.md` L265-287（item 23/24 限时折扣+秒杀：三态场次/倒计时/抢购进度条/秒杀直接下单不走购物车/不支持优惠券）+L494（缺货置灰+SKU 缺货标识）；`implementation-roadmap.md` L142-148/L181（SKU 管理/同 SKU 合并加购）。实页佐证：`app-mall-web/.../pages/mall/flash-sale/flash-sale-list.page.yaml`（正在抢购/即将开始/已结束三区+秒杀下单 form；实页无 countdown 元素，倒计时需求由 SAAS-07/mobile-ux L53/enhanced item 24 文本锚点独立支撑）、`goods/goods-detail.page.yaml`。
- **页面形态**：移动端商品详情 SKU 交互层：半屏面板按多维规格组合定位 SKU，联动价格/库存/图片，数量步进；秒杀场景倒计时+三态场次+直购。
- **交互要素**：① 规格组合选择（多列→求交定位 SKU 记录）；② 缺货标识/置灰（number≤0 禁选）；③ 数量步进（库存+限购约束）；④ 秒杀倒计时（finish 事件切态）；⑤ 场次三态切换（已结束/进行中/即将开始）；⑥ 抢购进度条；⑦ 促销横幅（促销价+直降+倒计时）；⑧ 商品卡（瀑布流）；⑨ 轮播画廊+图片放大；⑩ SKU 半屏面板+吸底双按钮；⑪ 秒杀直购（地址+数量，不经购物车、禁优惠券）；⑫ 下拉刷新/无限滚动。
- **renderer 映射**：倒计时=`countdown`（mobile，finish 事件）；规格选择=`picker-view`/`wheel-cascader`（mobile）或 `picker`（form-advanced）；步进=`input-number`（stepper）；进度=`progress`（content）；商品卡=`card`/`cards`（content）；画廊=`carousel`（content L614）+`image-viewer`（mobile）；半屏面板=`floating-panel`（mobile）；缺货标识=`status`/`mapping`；刷新/滚动=`pull-refresh`/`infinite-scroll`。
- **缺口**：价格文本组件（大小字+划线价，PriceText 为上游 app 级组件非 flux renderer，G15）；吸底操作栏专用 type（G15）；加购动效（G15）；场次 Tab/分段切换未在既有包确认（G15）；规格求交→SKU 定位业务逻辑需 formula/action 层自建（G16）。

### S2 商城分销后台页（上游无直接章节，业务模型锚点）

- **佐证来源**：roadmap L80（差距：全仓库无分销关系/三级分销/佣金计算结算提现实体）；L143 SAAS-10（三级分销关系/邀请码/冻结）；L144 SAAS-11（三级比例佣金/结算批处理/提现申请打回，复用钱包流水）；L148 SAAS-15（商户侧运营视图按租户隔离裁剪）；L59/L60（nop-sys 字典存分销等级比例配置、nop-job-local 结算批处理）。旁证：`2026-09-22-next-gen-improvement-roadmap.md` L359-368（item 47：Commission 规则按品类/金额、Payout T+1/T+7、独立 Seller 后台）；`enhanced-features-roadmap.md` L186-193（item 18 指标卡模式）。实页佐证：`stat-dashboard.page.yaml`（趋势粒度 select+date-range+getDashboardMetrics+同环比卡片）、`LitemallWalletFlow/main.page.yaml`。**层级透视（pivot）上游无直接章节**〔flux 侧预期〕。
- **页面形态**：商户侧分销运营后台：业绩指标卡开场+佣金明细表（订单维度三级拆佣）+分销层级透视+关系树；结算侧提现审核/打回+批次入口。
- **交互要素**：① 佣金明细表（订单号/分销员/层级/比例/金额/状态，筛选分页导出）；② 提现申请与打回（行级审核，打回走余额语义）；③ 结算批处理（后台 job+手动批次入口）；④ 分销层级透视（行=三级分销员，指标=佣金/订单数，下钻）〔flux 侧预期〕；⑤ 分销关系树+邀请码/冻结；⑥ 业绩指标卡（GMV/佣金/人数+同环比+迷你趋势）；⑦ 销售趋势+实时订单流；⑧ 邀请二维码；⑨ 租户/商户两级视图裁剪（SAAS-15）；⑩ 佣金规则配置（品类/金额区间→三级比例）。
- **renderer 映射**：明细=`table`+`crud`+`query-filter`+`batch-bar`；透视=`pivot-table`（rowDimensions/columnDimensions/indicators/totals+`pivot:cell-click` 下钻）；指标卡=`stat-tile`+`sparkline`；仪表盘=`dashboard`；趋势=`chart`/`echarts`；关系树=`tree`；状态=`status`/`mapping`；邀请码=`qrcode`；规则配置=`input-table`/`combo`；数据源=`data-source`。
- **缺口**：导出（同 G6）；调度批处理界面（仅 batch-bar+action 模拟，G17）；租户两级裁剪无 renderer 级机制（page/权限层组装，G17）。

**商城域候选补充页**（按复杂度降序，均未纳入 1.0 复刻）：① 平台/商户两级运营后台（L119/L148/L151：权限×数据×页面三重裁剪）；② 租户套餐与商户入驻审核（SAAS-14：套餐配额生效+审核流+通知模板）；③ 拼团详情/管理页（enhanced L292-305 item 25：开团/参团/成团失败状态机+超时退款+头像空位）；④ 订单运营工作台（enhanced L227-241 item 21：批量发货/打印/改价/合单拆单/异常监控）；⑤ 营销活动日历（enhanced L245-257 item 22：排期+冲突检测，scheduling calendar 候选）。

## 4. 缺口汇总（登记待 R4 裁定；续接 R1 G1-G8）

| #   | 缺口                                                           | 涉及页 | 性质                                                                     |
| --- | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| G9  | 桌面端 countdown/SLA 倒计时（countdown 仅 mobile 包注册）      | K2     | 既有控件跨包扩展（R4 统一定性：跨包提升行走新 type 线登记，见 R4 §2 G9） |
| G10 | 大屏翻牌器 flip 动效                                           | M1     | 近似可过（stat-tile）                                                    |
| G11 | AI 护栏/频控拒绝与置信度门的结构化提示                         | K1/K2  | 组合可覆盖                                                               |
| G12 | "AI 推荐回复→写回工单回复框"采用动作链路                       | K2     | action 编排模式                                                          |
| G13 | 转办/改派专用动作（user-select+ajax 组合）                     | K3     | 组合可覆盖                                                               |
| G14 | input-image `capture` 直采相机属性                             | M3     | 既有控件扩展                                                             |
| G15 | 商城 UI 形态组：价格文本/吸底操作栏/加购动效/场次分段切换      | S1     | 潜在新 type 族（对应上游 SAAS-07 渲染器清单）                            |
| G16 | 规格组合求交→SKU 定位逻辑                                      | S1     | formula/action 层，非 renderer                                           |
| G17 | 结算批处理调度界面 / 租户两级视图裁剪                          | S2     | 组合可覆盖（page/权限层）                                                |
| G18 | 审批流真实 wf 图形可视化（flow-designer-renderers 适用性待核） | K3     | 待核                                                                     |

## 5. 关键引用清单

- 上游 roadmap：`~/app/nop-app-erp/docs/backlog/ai-knowledge-ticket-roadmap.md`（124 行，R5 审计勘误）、`mes-shopfloor-roadmap.md`（127 行，R5 审计勘误）、`~/app/nop-app-mall-wt/nop-app-mall-master/docs/backlog/multitenant-saas-roadmap.md` 及同目录 `{mobile-ux-redesign, mobile-frontend, enhanced-features, implementation, 2026-09-22-next-gen-improvement}-roadmap.md`
- 上游佐证：`module-cs/model/app-erp-cs.orm.xml`、`module-cs/erp-cs-web/.../pages/{ErpCsTicket/kanban.flux.yaml, ErpCsTicketAction/timeline.flux.yaml}`、`docs/design/{ai-native-interface, flow-overview, manufacturing/ui-patterns, manufacturing/state-machine, aps/ui-patterns, quality/ui-patterns, flux-complex-pages}.md`、`module-manufacturing/erp-mfg-meta/.../{ErpMfgJobCardTimeLog, ErpMfgMaterialIssue*}`、商城 `app-mall-web/.../pages/mall/{flash-sale/flash-sale-list, goods/goods-detail, stat/stat-dashboard}.page.yaml`
- flux 侧核实：`packages/flux-renderers-ai/src/ai-renderer-definitions.ts`（14 type sort -u 实证）、`packages/flux-renderers-industrial/src/{renderer-definitions.ts, symbols/register-builtin.ts}`、`packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`（L110-131 aggregate/computed）、`packages/flux-core/src/types/schema.ts`（L302-308 轮询契约）、`packages/flux-renderers-form/src/renderers/org/org-renderer-definitions.ts`（L62 user-select）、`packages/flux-renderers-content/src/content-renderer-definitions.ts`（L95 progress/L614 carousel）、`packages/flux-renderers-mobile/src/`（16 type）
