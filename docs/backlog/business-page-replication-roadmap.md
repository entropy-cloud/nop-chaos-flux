# Business Page Replication Roadmap（上游业务项目典型复杂页面复刻）

> Created: 2026-10-28（用户下达：对 nop-app-erp 五条业务线、nop-app-mall、nop-entropy 智能单据、nop-app-iot 的典型复杂页面，在 flux playground 中复刻，要求实现对应 UI/UX 能力）
> Status: **active**（M1 调研、M2 设计里程碑均达成：R1-R6/D1-D6 全 done；M3-M4 待启动。头部状态于 2026-10-30 随 plan 797 收口就地勘误）
> 拟制与共识流程：`docs/skills/roadmap-and-mission-authoring-with-consensus-review.md`
> Sources:
>
> - Gitee GVP 调研 2026-10-28（本会话；JeeWMS/若依 CRM/chemex/MaxKB/t3rik-erp/CRMEB/JetLinks 对标）
> - 上游项目 roadmap（复刻页面的业务定义来源）：
>   - `~/app/nop-app-erp/docs/backlog/{wms-warehouse,crm-standalone-app,itam-it-asset,ai-knowledge-ticket,mes-shopfloor}-roadmap.md`
>   - `~/app/nop-app-mall-wt/nop-app-mall-master/docs/backlog/multitenant-saas-roadmap.md`
>   - `~/app/nop-entropy/docs/backlog/{smart-document-platform,semantic-dataset}-roadmap.md`
>   - `~/app/nop-app-iot/docs/backlog/iot-value-added-roadmap.md`
> - flux 能力基线：`docs/components/amis-baseline-matrix.md`（retention 权威）、`docs/backlog/missing-components-and-designer-roadmap.md`（新类型线）、`docs/components/existing-components-improvement-analysis.md`（既有控件扩展登记）
>
> Authority 关系：
>
> - **本 roadmap 只在 playground 复刻页面与验证 UX 能力，不改上游业务项目**。上游页面是需求输入，业务逻辑（ORM/工作流/AI 后端）一律以 mock/fixture 数据呈现。
> - 复刻中裁决出的**新 renderer type** → 登记入 `missing-components-and-designer-roadmap.md` 或走 amis-baseline-matrix 增行（human gate）；**既有类型的能力扩展** → 登记 `existing-components-improvement-analysis.md`。本 roadmap 不直接裁决 retention。
> - 状态流转：`todo` → `planned`（对应 plan 独立草案审查通过）→ `done`（closure audit 通过后回写）。
> - **审计纪律（强制）**：每个阶段里程碑（M1 调研 / M2 设计 / M3 开发 / M4 验证）内含两个审计工作项——阶段深度审计（deep audit：对照 live repo 与上游 roadmap 核对复刻保真度与 contract drift）与阶段开放审计（open audit：独立 fresh sub-agent 开放评审，不复用执行者上下文）。

---

## 1. Purpose

上游八个业务方向（WMS、CRM、ITAM、AI 知识库+工单、MES、多租户商城、智能单据中台、IoT 增值域）都有各自的"典型复杂页面"。本 roadmap 把这些页面在 flux playground 中逐页复刻为可运行的 schema 演示页（mock 数据驱动），以"页面能不能撑住真实业务交互"为标准倒逼 flux 的 UI/UX 能力补齐：能组合现有 renderer 撑住的，落演示页验证；撑不住的，精确登记 renderer 缺口。复刻即验收——每页有明确的交互断言（程序化 e2e + axe a11y 基线 + focus 管理），不接受"看起来像"。

## 2. Work Item Status

> **本文件唯一的动态状态区。** 状态词表：`todo` / `planned` / `done`。Milestone 只是组织标签，不带状态。

### Milestone 1: 调研（上游典型页面盘点与能力矩阵）

| Work item                                                                                                     | 状态   | 依赖  | 说明                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1 WMS/CRM/ITAM 页面盘点（上游 roadmap + 模块 UI 中的典型复杂页面清单，逐页列出交互要素与所需 renderer 能力） | `done` | —     | 输入 erp wms/crm/itam 三份 roadmap；plan 786（completed）；交付 `docs/analysis/business-replication/r1-erp-page-inventory.md`                                      |
| R2 AI 客服/MES/商城页面盘点                                                                                   | `done` | —     | 输入 ai-knowledge-ticket/mes-shopfloor/multitenant-saas roadmap；plan 787（completed）；交付 `docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md` |
| R3 智能单据/IoT 页面盘点                                                                                      | `done` | —     | 输入 smart-document-platform/iot-value-added roadmap；plan 788（completed）；交付 `docs/analysis/business-replication/r3-entropy-iot-page-inventory.md`            |
| R4 flux 能力差距矩阵（页面交互要素 × 现有 renderer 覆盖；产出"直接组合 / 能力扩展 / 新 type"三色分级）        | `done` | R1-R3 | 交付复刻可行性结论与缺口清单；plan 789（completed）；交付 `docs/analysis/business-replication/r4-capability-gap-matrix.md`                                         |
| R5 调研阶段深度审计（对照 live repo 核对 R1-R4 引用的 renderer 能力与上游 roadmap 基线；contract drift 登记） | `done` | R4    | deep audit；plan 790（completed）；交付 `docs/audits/business-replication/r5-research-deep-audit.md`（Pass）                                                       |
| R6 调研阶段开放审计（独立 fresh sub-agent 开放评审，不复用执行者上下文）                                      | `done` | R5    | open audit；plan 791（completed）；交付 `docs/audits/business-replication/r6-research-open-audit.md`（首轮 Fail→修复→复审 Pass）                                   |

### Milestone 2: 设计（复刻方案与验收标准）

| Work item                                                                                                                                             | 状态   | 依赖    | 说明                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 复刻总体设计（playground 路由规划、mock fixture 规范、每页验收断言模板：交互断言 + axe 基线 + focus 断言）                                         | `done` | M1 done | ；plan 792（completed）；交付 `docs/analysis/business-replication/d1-replication-master-design.md`                                                                                        |
| D2 ERP 线复刻设计（WMS PDA 作业/拣货看板/库存台账；CRM 漏斗看板/客户 360/销售驾驶舱；ITAM 盘点扫码/折旧仪表盘——逐页 schema 结构与 renderer 组合方案） | `done` | D1      | ；plan 793（completed）；交付 `docs/analysis/business-replication/d2-erp-design.md`                                                                                                       |
| D3 AI/MES 复刻设计（知识库对话页/工单处理台/审批轨迹；车间大屏/工序报工表/异常叫料移动页）                                                            | `done` | D1      | ；plan 794（completed）；交付 `docs/analysis/business-replication/d3-ai-mes-design.md`                                                                                                    |
| D4 商城/智能单据/IoT 复刻设计（商品 SKU 页/营销活动页/分销后台；OCR 校正工作台/HITL 审批收件箱；设备遥测页/OTA 灰度管理/围栏地图/视频墙）             | `done` | D1      | ；plan 795（completed）；交付 `docs/analysis/business-replication/d4-mall-doc-iot-design.md`（注：D4 行页面枚举收敛为 7 页——营销活动页归 R2 候选⑤未纳入 1.0，围栏地图与视频墙合并 V3 页） |
| D5 设计阶段深度审计（设计 vs live repo renderer 契约核对；缺口登记项与 missing-components/improvement-analysis 无重复立项冲突）                       | `done` | D2-D4   | deep audit；plan 796（completed）；交付 `docs/audits/business-replication/d5-design-deep-audit.md`（首轮 Fail→两轮复审 Pass）+ improvement-analysis countDown 双处就地勘误                |
| D6 设计阶段开放审计（独立 fresh sub-agent 开放评审，不复用执行者上下文）                                                                              | `done` | D5      | open audit；plan 797（completed）；交付 `docs/audits/business-replication/d6-design-open-audit.md`（首轮 Fail→复审轮 1 Pass）                                                             |

### Milestone 3: 开发（逐页复刻）

> 每个工作项 = 一个 execution plan：playground 演示页 schema + mock fixture + 该页 focused e2e（程序化断言）+ axe 基线登记。缺口按 D 阶段分级：组合类当场落地，扩展/新类型类先落缺口登记再以临时形态过验收。

| Work item                                                                                                                  | 状态      | 依赖           | 说明                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1 WMS PDA 收货/上架作业页（swipe-cell + pull-refresh + barcode-input + wheel-picker；单手操作流、扫码即校验、离线提示条） | `done`    | M2 done        | mobile 渲染器族主战场；plan 798（completed）；交付 playground W1 页全链（schema/host override/mock/e2e 13 测试/axe 分支 B 登记）+ 设施先行切片（replication helpers 六件套/axe 失效 id 修正）                                                                                   |
| W2 WMS 拣货路径看板与波次管理页（gantt/kanban 路径可视化；input-table 波次明细 + 合计行）                                  | `done`    | M2 done        | plan 799（completed）；交付 W2 页全链（schema/六端点 mock 含 G2 逐字段钩子/e2e 9 测试/axe 分支 A 登记）                                                                                                                                                                         |
| W3 WMS 库存台账页（pivot 多维透视 + dashboard 指标卡 + 批次追溯 drill-down dialog）                                        | `done`    | M2 done        | ；plan 800（completed）；交付 W3 页全链（pivot 透视/schema strict 零 error/九测试含 G7 对账切换断言/axe 分支 A 登记/render-host 补注册 registerPivotRenderers）                                                                                                                 |
| C1 CRM 商机漏斗看板页（kanban 拖拽阶段流转 + 漏斗统计 + 行内编辑金额）                                                     | `done`    | M2 done        | ；plan 801（completed）；交付 C1 页全链（crm mock 五端点+守卫+钩子/动态阶段列 kanban+拖拽 moveStage 绑定/统计带三处/漏斗 bar 近似/e2e 10 测试含 G2 逐字段+test.fail 棘轮/axe 分支 A 登记）                                                                                      |
| C2 CRM 客户 360 详情页（tabs + detail-view + timeline 跟进记录 + 关联列表主从联动）                                        | `done`    | M2 done        | ；plan 802（completed）；交付 C2 页全链（六端点 mock 含 activityCreate mutation 链/drawer 提交/timeline seek 高亮/主从联动/日历回归/e2e 9 测试/axe 分支 A 登记）                                                                                                                |
| C3 CRM 销售驾驶舱页（dashboard + echarts + stat-tile + 条件筛选联动）                                                      | `done`    | M2 done        | plan 803（completed）——交付 C3 页全链（dashboard 网格+stat-tile×4+echarts 钻取参数链+漏斗 bar+级联多源+报表下载/render-host 补注册 registerDashboardRenderers/echarts-renderer evaluationBindings 产品修复+新单测/e2e 9 测试/axe 分支 A 登记）；done 回写补齐（2ac589edc 曾漏） |
| I1 ITAM 资产台账与盘点页（table 批量操作 + barcode-input 扫码盘点 + diff-view 盘点差异）                                   | `done`    | M2 done        | ；plan 804（completed）；交付 I1 页全链（itam mock 六端点+repairCreate 裁决补充+钩子五件/台账 crud+batch-bar/盘点三阶段 barcode batchMode/差异三态标色/diff-view split/报修 drawer/e2e 11 测试/axe 分支 A 登记）                                                                |
| I2 ITAM 折旧仪表盘页（dashboard 图表组 + pivot 年度折旧透视 + 导出）                                                       | `done`    | M2 done        | ；plan 805（completed）；交付 I2 页全链（delegate 六端点/page 直排 stat-tile×5+pie+line+pivot category×quarter SUM+totals 嵌套+crud 预警行 dialog/e2e 10 测试/axe 分支 A 登记/data-blob 豁免登记）                                                                              |
| K1 AI 知识库对话页（flux-renderers-ai 会话流 + streaming 输出 + 引用来源卡片 + 反馈按钮）                                  | `planned` | M2 done        | ；plan 806（active，host override 页）                                                                                                                                                                                                                                          |
| K2 工单处理台页（CRUD 队列 + SLA 倒计时 + 工单详情 timeline + AI 推荐回复卡片）                                            | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| K3 审批轨迹页（approval timeline + user-picker 转办 + HITL 审批卡片）                                                      | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| M1 MES 车间大屏页（industrial/dashboard + echarts 实时刷新 + 翻牌器/跑马灯式状态栏）                                       | `todo`    | M2 done        | 大屏能力验收                                                                                                                                                                                                                                                                    |
| M2 MES 工序报工页（input-table 行内报工 + 行级 computed 工时/合计 + 数量校验）                                             | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| M3 MES 异常叫料移动页（mobile 族：floating-panel + action-sheet + image-viewer 现场拍照）                                  | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| S1 商城商品 SKU 选择页（picker/组合规格 + 数量步进 + countdown 秒杀倒计时 + 商品卡片）                                     | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| S2 商城分销后台页（table 佣金明细 + pivot 分销层级透视 + dashboard 业绩卡）                                                | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| O1 OCR 校正工作台页（image 区域对照 + 字段确认表单 + 置信度高亮 + 逐字段校验流）                                           | `todo`    | M2 done        | 表单+图片组合复杂度最高的一页                                                                                                                                                                                                                                                   |
| O2 HITL 审批收件箱页（CRUD 待办 + AI 建议卡片 + 审批 dialog + 批量通过）                                                   | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| V1 IoT 设备遥测详情页（echarts 实时曲线 + data-source 轮询 + 告警列表联动 + sparkline 概览）                               | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| V2 IoT OTA 灰度管理页（wizard 分批推送 + 状态机步骤条 + 失败回滚操作 + 进度表）                                            | `todo`    | M2 done        |                                                                                                                                                                                                                                                                                 |
| V3 IoT 围栏地图与视频墙页（flux-renderers-map 围栏绘制 + 地理点标注；iframe/video 面板墙）                                 | `todo`    | M2 done        | ；交互验收收窄裁决：绘制/轨迹/流媒体不做交互验收（R4 §1 V3 行+开放审计 Minor-④，D4 设计 §6 落位）                                                                                                                                                                               |
| P1 开发阶段深度审计（逐页对照 live repo 与上游 roadmap 核对复刻保真度、断言真实性；缺口登记项与 §Authority 无冲突）        | `todo`    | W1-V3 all done | deep audit                                                                                                                                                                                                                                                                      |
| P2 开发阶段开放审计（独立 fresh sub-agent 开放评审，不复用执行者上下文；输入"页面清单 + diff 摘要 + e2e 输出"）            | `todo`    | P1             | open audit                                                                                                                                                                                                                                                                      |

### Milestone 4: 验证（统一 UX 验收与收口）

| Work item                                                                                                                                | 状态   | 依赖    | 说明       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- | ---------- |
| F1 统一 UX 验收（全部复刻页浏览器快照评审 + axe 基线全绿 + focus 管理抽查 + 移动端页 viewport 适配验证；pass/fail 程序化断言）           | `todo` | M3 done |            |
| F2 复刻总结与缺口沉淀（复刻中新登记的 missing-components / improvement-analysis 条目汇总；对上游各 roadmap 回写"flux 侧能力已验证"备忘） | `todo` | F1      |            |
| F3 验证阶段深度审计（对照 live repo 核对验收覆盖与 contract drift）                                                                      | `todo` | F1      | deep audit |
| F4 验证阶段开放审计（独立 fresh sub-agent 开放评审，不复用执行者上下文；通过后本 roadmap 收口 ★）                                        | `todo` | F3      | open audit |

★ **Milestone: 上游典型页面复刻 1.0**（unlocks when M1-M4 all done）

> Milestone 只是组织标签，不带状态；milestone 达成 = 其全部工作项 `done`。

## 3. Framework / Platform Reuse

| Capability    | Provider                                                                      | Notes                                                                                     |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 移动端交互族  | flux-renderers-mobile                                                         | W1/M3：swipe-cell、pull-refresh、wheel-picker、floating-panel、action-sheet、image-viewer |
| 表格编辑族    | flux-renderers-form-advanced                                                  | W2/M2/O1：input-table（785 计划补合计行/从表联动/金额大写）、detail-view                  |
| 看板/排程     | flux-renderers-scheduling                                                     | C1/W2：kanban、gantt、calendar                                                            |
| 大屏/图表     | flux-renderers-dashboard + flux-renderers-data（echarts/stat-tile/sparkline） | M1/C3/I1/I2/V1                                                                            |
| 地图          | flux-renderers-map                                                            | V3：围栏、标注                                                                            |
| AI 会话族     | flux-renderers-ai                                                             | K1/K2/O2：会话流、streaming、HITL                                                         |
| CRUD/查询族   | flux-renderers-data                                                           | K2/O2/V2：CRUD、query-filter、pagination                                                  |
| 流程/审批     | flow-designer 渲染器 + timeline                                               | K3/O2：审批轨迹、步骤条 wizard                                                            |
| 工业符号/画布 | flux-renderers-industrial                                                     | M1 车间大屏状态元素                                                                       |
| 验证设施      | tests/e2e + axe a11y 基线 + focus ledger                                      | F1 统一验收直接复用 PH-17/PH-18 设施                                                      |
| 785 联动      | docs/plans/785-input-table-erp-enhancement-plan.md                            | W2/M2 依赖其合计行/从表联动/金额大写落地；未落地前以现状验收并在页内标注                  |

## 4. Current Baseline

- flux 已有 15 个渲染器包 + 6 个设计器包（45 packages），页面级组合能力有 playground 现有演示页背书；e2e 与 axe a11y 基线设施已就绪（PH-17/PH-18）。
- 复刻页所需的已知缺口（本 roadmap 输入，待 R4 矩阵精化）：approval-timeline、user-picker、翻牌器/跑马灯大屏组件、office/image 区域对照（O1）、视频墙面板（V3）、kanban 拖拽阶段流转的深度（C1）。
- 上游八个 roadmap（见 Sources）已定义各域待建模块；其页面形态为调研输入，业务后端不进 flux。

## 5. Rules

- 本文件是状态索引与粗分解，不是 execution plan；每个工作项由其 execution plan 承载。
- 状态变更只发生在 §2 的 Work Item Status 区。
- Milestone 不带状态；milestone 达成 = 全部所属工作项 `done`。
- 每个阶段里程碑（M1/M2/M3/M4）必须且只包含两个审计工作项：阶段深度审计（deep audit，对照 live repo 与上游 roadmap）与阶段开放审计（独立 fresh sub-agent，不复用执行者上下文）。
- 复刻页全部使用 mock/fixture 数据，禁止为复刻在 flux 中引入后端依赖；缺口裁决只登记不越权（retention 权威在 amis-baseline-matrix）。
- 每页验收必须程序化断言（locator/evaluate/getComputedStyle + axe 基线）；截图仅作评审辅助，不作为测试证据。
