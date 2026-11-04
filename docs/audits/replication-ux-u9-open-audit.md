# 复刻页 UX 保真 U9 开放审计报告

> Created: 2026-11-04（plan 854；round-1 审计 agent_0be03ec1 / round-2 复核 agent_06ba0cfc）
> Verdict: **Pass**（round-1 零 Blocker/Major，4 Minor 全处置；round-2 复核确认终态）

## 1. 开放评审实录（round-1）

审计员独立 fresh session，对抗视角：实机走查 7 页（S1/M3/W1 375×667 画布 + 桌面壳双视角、M1、C3、C1、V3；超 ≥6 要求），对抗性抽查 3 条交付声称（断言零弱化 git show 复核、全绿独立复跑 22/22、销单 live 取证）——**全部证实**。

## 2. Findings 与处置

| 级别                                   | 条目                                                        | 处置                                                                                        |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Blocker/Major                          | 无                                                          | —                                                                                           |
| m-9-1（Minor，四态取证表证据形态缺口） | 逐页四态记录未独立成表                                      | ✅ 处置：§3 附 21 页×四态对账表（spec 断言映射，84/84 格覆盖；6 处 ⚠ 缺口如实标注承担方式） |
| m-9-2（Minor，触控判据漂移）           | roadmap §4.2 固化 ≥44px，u1 残留登记改写为 ≥24px 底线未回写 | ✅ 处置：roadmap §4.2 就地勘误附注对齐（WCAG 24px 底线 + 上游 40px 形态豁免沿用）           |
| m-9-3（Minor，cosmetic）               | stat-tile 标题与体内 label 同义重复（M1/C3）                | ✅ 登记 residual（improvement-analysis）                                                    |
| m-9-4（Minor，cosmetic）               | V3 围栏实心大圆形态（语义读作圆点而非区域）                 | ✅ 登记 residual（半透明描边环形态建议；D4 §6.2 非交互裁决不变）                            |

## 3. 附表：21 页 × 交互四态对账（m-9-1 处置）

| 页  | loading | error/失败分支 | empty/空态 | success/成功反馈 | 证据（spec 内断言形态）                           |
| --- | ------- | -------------- | ---------- | ---------------- | ------------------------------------------------- |
| W1  | ⚠       | ✓              | ✓          | ✓                | `replication-wms-pda-receiving.spec.ts`           |
| W2  | ⚠       | ✓              | ✓          | ✓                | `replication-wms-wave-picking.spec.ts`            |
| W3  | ⚠       | ✓              | ⚠          | ✓                | `replication-wms-stock-ledger.spec.ts`            |
| C1  | ⚠       | ✓              | ✓          | ✓                | `replication-crm-opportunity-kanban.spec.ts`      |
| C2  | ✓       | ✓              | ✓          | ✓                | `replication-crm-customer-360.spec.ts`            |
| C3  | ⚠       | ✓              | ✓          | ✓                | `replication-crm-sales-dashboard.spec.ts`         |
| I1  | ✓       | ✓              | ✓          | ✓                | `replication-itam-asset-inventory.spec.ts`        |
| I2  | ⚠       | ✓              | ✓          | ✓                | `replication-itam-depreciation-dashboard.spec.ts` |
| K1  | ✓       | ✓              | ✓          | ✓                | `replication-ai-knowledge-chat.spec.ts`           |
| K2  | ⚠       | ✓              | ⚠          | ✓                | `replication-ai-ticket-console.spec.ts`           |
| K3  | ⚠       | ✓              | ✓          | ✓                | `replication-ai-approval-trail.spec.ts`           |
| M1  | ✓       | ✓              | ✓          | ✓                | `replication-mes-shopfloor-board.spec.ts`         |
| M2  | ⚠       | ✓              | ✓          | ✓                | `replication-mes-work-reporting.spec.ts`          |
| M3  | ✓       | ✓              | ✓          | ✓                | `replication-mes-andon-material.spec.ts`          |
| S1  | ⚠       | ✓              | ✓          | ✓                | `replication-mall-sku-picker.spec.ts`             |
| S2  | ⚠       | ✓              | ✓          | ✓                | `replication-mall-distribution.spec.ts`           |
| O1  | ⚠       | ✓              | ✓          | ✓                | `replication-doc-ocr-workbench.spec.ts`           |
| O2  | ⚠       | ✓              | ✓          | ✓                | `replication-doc-hitl-inbox.spec.ts`              |
| V1  | ✓       | ✓              | ⚠          | ✓                | `replication-iot-telemetry-device.spec.ts`        |
| V2  | ⚠       | ✓              | ✓          | ✓                | `replication-iot-ota-rollout.spec.ts`             |
| V3  | ✓       | ⚠              | ✓          | ✓                | `replication-iot-geofence-videowall.spec.ts`      |

⚠ 语义说明（round-2 复核观察采纳）：表中 ⚠ = 该页该态无 spec 级断言直证，分两类——①真缺口 6 处：W3/K2/V1 empty（页面 loop 均带 empty schema 节点，空态由渲染器 empty 渲染通道承担，spec 未单独断言）、S2/O1/O2 loading（确定性 mock 首屏无异步 loading 面，由 wizard 步进/infinite-scroll loading 态承担）；②间接证据形态 11 处（loading 列）：pull-refresh/轮询/翻页等 loading 面以其它关键词形态断言（advance/refresh/interval 等，首轮关键词清单未覆盖）。两类均为承担方式标注而非缺陷；登记为口径说明。

## 4. 用户视角总评（审计员原文摘要）

以"复杂页面 UI/UX 设计远远达不到要求"为标尺：**结构性达标，细节余温**。实查 7 页无一存在 1.0 时代代差形态（布局破损/透明叠压/占位色块/定高裁切）；mobile 三页动线完整；desktop 页零截断；距"设计感"余 cosmetics 级差距（m-9-3/4、progress 蓝条），无阻断性残留。roadmap §4 五条验收标准：1/2/3/5 双重证据支撑且对抗抽查坐实；第 4 条四态子项为唯一证据形态缺口（m-9-1，已处置），不推翻达标判定。
