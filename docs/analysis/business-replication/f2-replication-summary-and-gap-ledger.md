# F2 复刻总结与缺口沉淀（business-page-replication roadmap M4-F2）

> Status: final
> Date: 2026-11-02
> Plan: `docs/plans/842-business-replication-f2-summary-gap-ledger-plan.md`
> 输入: M3 二十一页交付（plans 798-818）、P1 深审（`docs/audits/business-replication/p1-dev-deep-audit.md`）、P2 开放审计（`docs/audits/business-replication/p2-dev-open-audit.md`）、F1 统一验收（`docs/audits/business-replication/f1-unified-ux-acceptance.md`）

## 1. 二十一页复刻清单终态

| 页 | roadmap 项 | 上游来源 | 复刻形态 | 验收面 | 收窄裁决指针 |
| --- | --- | --- | --- | --- | --- |
| wms-pda-receiving | W1 | nop-app-erp wms-roadmap | mobile host override（375×667 画布） | focused e2e 13 测试 + axe 分支 B | D2 勘误 7（focus 退守） |
| wms-wave-picking | W2 | 同上 | 桌面整页（kanban+gantt+input-table） | e2e 9 测试 + 分支 A | D2 §2.2 P1-W2 |
| wms-stock-ledger | W3 | 同上 | 桌面整页（pivot+dashboard） | e2e 9 测试 + 分支 A | — |
| crm-opportunity-kanban | C1 | crm-standalone-roadmap | 桌面整页（kanban 拖拽+漏斗） | e2e 10 测试（含 test.fail 棘轮）+ 分支 A | D2 §2.4 |
| crm-customer-360 | C2 | 同上 | 桌面整页（detail-view+timeline+日历） | e2e 10 测试〔含时区判别回归〕+ 分支 A | P1 TZ-1 |
| crm-sales-dashboard | C3 | 同上 | 桌面整页（dashboard+echarts 钻取） | e2e 10 测试 + 分支 A | P1-C3-1/2/3、P2-C3 |
| itam-asset-inventory | I1 | itam-it-asset-roadmap | 桌面整页（crud+barcode 三阶段盘点+diff-view） | e2e 11 测试 + 分支 A | — |
| itam-depreciation-dashboard | I2 | 同上 | 桌面整页（stat-tile×5+pie/line+pivot） | e2e 10 测试 + 分支 A | data-blob 豁免登记 |
| ai-knowledge-chat | K1 | ai-knowledge-ticket-roadmap | host override（AI 会话族） | e2e 9 测试（streaming 逐帧）+ 分支 A | D3 §2.1（D6 MAJ-B） |
| ai-ticket-console | K2 | 同上 | 桌面整页（六态看板+classify+SLA） | e2e 12 测试 + 分支 A | P1-K2、P2-K2 |
| ai-approval-trail | K3 | 同上 | 桌面整页（steps+timeline+HITL 卡） | e2e 9 测试 + 分支 A | G13 组合覆盖 |
| mes-shopfloor-board | M1 | mes-shopfloor-roadmap | 桌面整页（大屏 panels+scada-canvas） | e2e 9 测试 + 分支 A | P1-M1 |
| mes-work-reporting | M2 | 同上 | 桌面整页（input-table 报工+守卫） | e2e 12 测试 + 分支 A | P1-M2（reworkQty） |
| mes-andon-material | M3 | 同上 | mobile host override | e2e 14 测试 + 分支 B | D3 §2.6 勘误 9 条 |
| mall-sku-picker | S1 | nop-app-mall multitenant-saas-roadmap | mobile host override | e2e 12 测试 + G16 vitest 5 用例 + 分支 B | P1-S1（有界重转） |
| mall-distribution | S2 | 同上 | 桌面整页（dashboard+pivot 层级透视） | e2e 11 测试 + 分支 A | D4 §2.2 勘误 10 条 |
| doc-ocr-workbench | O1 | nop-entropy smart-document-roadmap | 桌面整页（wizard 四步+detail-field 逐字段） | e2e 9 测试 + 分支 A | D4 §2.3 勘误 9 条 |
| doc-hitl-inbox | O2 | 同上 | 桌面整页（跨页批量+staleness+HITL） | e2e 9 测试 + 分支 A | D4 §2.4 勘误 9 条 |
| iot-telemetry-device | V1 | nop-app-iot iot-value-added-roadmap | 桌面整页（interval 轮询+三曲线） | e2e 7 测试 + 分支 A | D4 §2.5 勘误 7 条 |
| iot-ota-rollout | V2 | 同上 | 桌面整页（wizard 分批+steps 八态） | e2e 7 测试 + 分支 A | D4 §2.6 勘误 8 条 |
| iot-geofence-videowall | V3 | 同上 | 桌面整页（pin 地图+region 围栏+video×4） | e2e 7 测试 + geojson vitest + 分支 C | V3 收窄裁决（R4 §1/D4 §6） |

验收总账：二十一页 focused e2e 约 200 测试 + axe 28 项扫描（分支 A/B/C）+ vitest 侧 67（G16 求交 5 + geojson 环闭合 + schema strict 校验语料）；F1 统一验收四支柱 Pass。

## 2. 缺口登记汇总（复刻 1.0 全部新增登记，逐条底账锚点）

| 条目 | 分类 | 底账锚点 | demand gate |
| --- | --- | --- | --- |
| G5 库位 2D 平面图/拣货动线 | 新 type 候选（demand-gated） | missing-components **L7.9**（plan 819 补登） | 各自 demand gate |
| G9 桌面 SLA 倒计时 | 新 type 候选 | missing-components **L7.9** | 同上 |
| G10 大屏翻牌器 flip-number | 新 type 候选 | missing-components **L7.9** | 同上 |
| G15 商城 UI 形态族 | 新 type 候选 | missing-components **L7.10**（plan 837 P2 补登） | 同上 |
| G19 OCR bbox 区域框 overlay | 新 type 候选 | missing-components **L7.10** | 同上 |
| G21 结构化 DiffTree | 新 type 候选 | missing-components **L7.10** | 同上 |
| G23 WebSocket/SSE 实时推送 | 新 type 候选 | missing-components **L7.10** | 同上 |
| G25 轨迹回放 | 新 type 候选 | missing-components **L7.10** | 同上 |
| G26-播放器 HLS/RTSP 播放器 | 新 type 候选（iframe 半条 keep-out 不登记） | missing-components **L7.10** | 同上 |
| G14 input-image capture | 能力扩展（input 族） | improvement-analysis **2026-11-02 登记**（plan 837 补登） | 同上 |
| G22 字段渲染器 compare 变体 | 能力扩展（input 族） | improvement-analysis **2026-11-02 登记** | 同上 |
| G24 map draw/modify 绘制编辑 | 能力扩展（map 族） | improvement-analysis **2026-11-02 登记** | 同上 |
| 轮询刷新 aria-live 播报通道 | 能力扩展（data 族可及性） | improvement-analysis **2026-11-02 登记**（P2 MIN-7） | 同上 |
| 地图族 pin+geojson 叠加 | 能力扩展（map 族） | improvement-analysis **2026-11-01 登记**（plan 818） | 同上 |
| calendar UTC 日模型观察 | 组件 owner 观察项 | improvement-analysis **2026-11-01 登记**（plan 819） | scheduling owner 裁决 |
| inputClassName 类型死字段 | 契约漂移（§4 #9） | improvement-analysis §4 **#9**（plan 814 登记） | 全局字段面 |
| axe owner 债（table 列宽 separator / tree role / checkbox-group aria-required / 壳 badge 对比度） | 组件 owner 债 | `tests/e2e/__fixtures__/axe-baseline.json` 各 route `_notes` | 各组件 owner |
| scanner map 名称碰撞 | 基线注记（matrix L225 别名 ≠ flux geo map） | `scripts/baselines/scanner-baselines.json` `_header.reRegistrationNotes` | matrix owner |
| C1 看板键盘层 / K2 drawer 负载竞争 | flake 台账 | `docs/testing/e2e-flake-ledger.md`（ATTRIBUTED×2） | 复观察条件在册 |
| F1 快照 4 项观测（I1 双按钮/I2 量纲/W3 列序/V3 可视性） | 观测级 residual | `docs/audits/business-replication/f1-unified-ux-acceptance.md` §residual | demand-gated |

与 roadmap §Authority 对账：新 type 候选全部只进 missing-components（不立项）、能力扩展只进 improvement-analysis、retention 未触碰 amis-baseline-matrix——无越权、无重复立项（P1 深审 + P2 开放审计两轮核对）。

## 3. 逐域「flux 侧能力已验证」备忘（八域，可直接被上游 roadmap 引用）

> 以下段落为上游回写备忘文本。上游仓库在本仓库之外，跨仓库写回未经授权不执行（见 §4）。

- **WMS（nop-app-erp wms）**：PDA 收货/上架单手操作流（swipe-cell/pull-refresh/wheel-picker/barcode-input 连续扫码/number-keyboard）、波次看板拖卡+拣货路径 gantt、库存多维透视（pivot cell-click 钻取+对账双态+报表导出）均可在 flux playground 以 mock 数据撑起完整交互断言。缺口：库位 2D 平面图/拣货动线（G5，demand-gated 登记 L7.9）。
- **CRM（nop-app-erp crm）**：商机六阶段动态列看板（拖卡流转+非法迁移守卫+行内金额编辑+列头/统计带聚合）、客户 360（detail-view+timeline seek+drawer 新增跟进+月视图日历）、销售驾驶舱（dashboard 网格+echarts 点击钻取参数链+漏斗近似+条件筛选联动+报表下载）全链验证。缺口：无新增 type（漏斗以 bar 近似已裁决）。
- **ITAM（nop-app-erp itam）**：资产台账批量操作+barcode 批量盘点三阶段（含状态徽章迁移）+盘盈亏三态标色+diff-view 对照+报修 drawer、折旧仪表盘（KPI 五 tile+pie/line+category×quarter 透视+行操作 dialog）验证通过。缺口：无。
- **AI 知识库+工单（nop-app-erp ai-knowledge-ticket）**：知识库对话（streaming 逐帧+引用来源卡片+护栏 alert+token 用量+会话管理）、工单处理台（六态看板+SLA 现算+AI 分类/定级人工改写 classify+内部备注+推荐回复写回+置信度门禁）、审批轨迹（steps+timeline+HITL 工具卡持久化+user-select 转办）验证通过。缺口：桌面 SLA 倒计时组件（G9，L7.9）；备注回显列为 residual。
- **MES（nop-app-erp mes-shopfloor）**：车间大屏（stat-tile+echarts 下钻+scada-canvas 工位组态+轮询相位推进+跑马灯播报近似）、工序报工（input-table 行内双行明细+computed 工时比+守卫双差异+五状态动作）、异常叫料移动页（countdown 超时标红+swipe-cell 催单/关闭+action-sheet+半屏面板+现场拍照链）验证通过。缺口：翻牌器 flip-number（G10，L7.9）。
- **商城（nop-app-mall）**：SKU 选择页（瀑布流翻页+秒杀 countdown/progress+场次三态+规格求交前端定位+缺货闸+吸底双按钮）、分销后台（表达式聚合 KPI+query-filter JSON 门法+pivot 层级透视下钻+三级树+提现审核+CSV 导出）验证通过。缺口：商城 UI 形态族（G15，L7.10 demand-gated）。
- **智能单据（nop-entropy）**：OCR 校正工作台（双图对照+wizard 四步服务端门禁+逐字段确认+低置信高亮+明细 formId 校验+回流）、HITL 审批收件箱（跨页批量恰键+staleness 禁批+AI 建议+HITL 交接卡+三视图对照+SoD）验证通过。缺口：OCR bbox overlay（G19）与结构化 DiffTree（G21）（L7.10）；compare 变体（G22，improvement 登记）。
- **IoT（nop-app-iot）**：设备遥测（interval 轮询+三曲线 288 点+质量位 mapping+告警联动含 ACK_FAILED/ALREADY_CLOSED 分支）、OTA 灰度（wizard 分批门禁+steps 八态 error 分叉+进度矩阵+GATE_NOT_PASSED+回滚）、围栏地图与视频墙（pin 判定联动+region geojson 回显+事件轮询+video×4 无 iframe）验证通过。缺口：实时推送（G23）/轨迹回放（G25）/流播放器（G26）三项 L7.10 登记；map 绘制编辑（G24，improvement）。

## 4. 跨仓库回写裁决记录

roadmap §2 F2 原文「对上游各 roadmap 回写备忘」与 §Authority「本 roadmap 不改上游业务项目」存在张力。裁决（plan 842 Draft Review round-2 确认）：**本仓库内沉淀本节备忘文本为 F2 交付物**——§3 八段措辞可直接被上游 roadmap 粘贴引用；跨仓库文件写回需上游 owner/用户另行授权，不在本 plan 内执行（登记于 plan 842 Non-Blocking Follow-ups）。上游八个 roadmap 位于 `~/app/nop-app-erp`、`~/app/nop-app-mall-wt/nop-app-mall-master`、`~/app/nop-entropy`、`~/app/nop-app-iot` 各自 `docs/backlog/`。
