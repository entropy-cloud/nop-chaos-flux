# 795 D4 商城/智能单据/IoT 复刻设计（business-page-replication roadmap M2-D4）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D4（依赖 D1 done，已满足）
> Related: `docs/analysis/business-replication/d1-replication-master-design.md`（§5 模板强制）；R2（商城域）/R3 盘点；R4 矩阵 §2/§4

## Purpose

按 D1 §5 六节模板产出商城/智能单据/IoT 三域 7 页（S1-S2/O1-O2/V1-V3）的复刻设计：schema 结构与 renderer 组合方案、mock backend 设计、验收断言清单。收口为 roadmap §2 D4 状态 `todo → planned → done`。

## Current Baseline

- D1 已交付：六项落地决策 + D2-D4 六节模板 + 21 页路由（本域 7 页 pageId 已定，D1 §1 表 #15-21）+ mock 规范（8 域模块，其中 mall/doc/iot 三模块为本设计 Goals ④ 的直接对象）+ 三支柱验收模板。
- R2（商城 2 页）/R3（智能单据 2 页+IoT 3 页）盘点含 7 页逐页交互要素与 renderer 映射；R4 矩阵含本域 7 页可行性结论（S1/O2 能力扩展、O1/V3 新 type 临时形态、S2/V1/V2 直接组合）与缺口（G15/G16→S1、G6/G17→S2、G19/G20/G21/G22→O1/O2、G23→V1、G24/G25/G26→V3）。
- 本域强制输入（R4 §4.1/开放审计）：V3 的 per-page axe 对策（map-demo 超时排除先例）与交互验收收窄显式裁决；O2 批量通过注意 crud `keepOnPageChange` opt-in 契约；S1 商城 UI 形态组（G15）近似组合口径——逐项落入设计正文。
- mock 先例与 e2e 设施见 D1 §2/§3（本设计不重复，直接引用规范产出域级清单）。

## Goals

- 新建 `docs/analysis/business-replication/d4-mall-doc-iot-design.md`，按 D1 §5 六节：① 7 页清单与上游引用（引 R2/R3 节+行号，不重抄）；② 逐页 schema 结构设计（组件树/type 级选择 + 关键 schema 片段 + styling contract 约定；S1 G15 四项近似组合口径、S2 table/pivot/tree/qrcode+服务端下载+权限层、O1 image-compare+detail-view 临时形态、O2 crud+ai-tool-call HITL 卡+diffTree→table/tree 近似、V1 echarts+轮询、V2 wizard/steps/timeline、V3 map+video 临时形态）；③ R4 对照与 §2↔§4 双向核对表 + 散落验证项归集表（G16 规格求交 formula 编排验证、O2 keepOnPageChange 当期复核——R4 §4.1 明示底账滞后）+ 本域强制输入逐项落位；④ mall/doc/iot 三个 mock 模块的端点清单（含错误分支）、数据集形状与测试钩子清单（\_\_replMallCalls 等，D1 §2 规范；V3 的 mp4 样例流资产来源说明）；⑤ 逐页三支柱验收断言清单（V3 按分支 C axe 策略）；⑥ 临时形态标注（O1/V3 实现边界：做什么/不做什么/裁决引用）。
- schema 片段做到 type/属性级可指导 M3 编码，但不产出完整可运行 JSON（M3 落地时编写）。

## Non-Goals

- 不写 playground 页面 JSON/e2e（M3）；不改 R2/R3/R4 文档；不裁决 retention；不覆盖其他域。

## Scope

### In Scope

- d4-mall-doc-iot-design.md 撰写（六节）。
- roadmap §2 D4 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）；closure 回写 done 时对 D4 行就地加注页面枚举收敛说明（评审 Minor-5：行枚举 9 项→本设计 7 页，营销活动页归 R2 候选⑤未纳入 1.0、围栏地图与视频墙合并 V3），并落 R6 Minor-4 双路径选择：roadmap §2 M3 表 V3 行说明列加注交互验收收窄裁决引用。

### Out Of Scope

- M3 实现；D3/D4 域；基线 JSON 新建；上游仓库改动。

## Failure Paths

不适用：纯设计文档。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 商城/智能单据/IoT 设计产出

Status: completed
Targets: `docs/analysis/business-replication/d4-mall-doc-iot-design.md`

- Item Types: `Decision | Proof`

- [x] 按六节模板撰写 7 页设计（每页：组件树/type 选择/关键 schema 片段/mock 端点/三支柱断言点）
- [x] §2↔§4 双向核对表 + V3 axe 对策/O2 keepOnPageChange/S1 形态组口径逐项落位
- [x] 引用准确性自查：引用的 R2/R3/R4/D1 节号与行号、flux type 名全部对照 live

Exit Criteria:

- [x] 设计文档六节齐备，7 页逐页含 schema 结构与断言清单
- [x] V3 axe 对策与收窄裁决、O2 keepOnPageChange、S1 形态组口径在设计正文逐项落位
- [x] 文档引用的 flux type 名与 R2/R4 一致且 live 存在（抽查 ≥8，含 map/video/image-compare/ai-tool-call 归属）
- [x] roadmap §2 D4 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Blocker + 4 Major + 6 Minor；修复后达 pass 水平）
- Rounds: 1
- Findings addressed:
  - Blocker-1：三处 roadmap 回写行 D2→D4（拷贝缺陷）
  - Major-1：O2 分级订正为能力扩展（"余直接组合"吞并错误）
  - Major-2：缺口枚举补 G6→S2（登记冲突项裁决引用）
  - Major-3：本域计数 8→7 页（D1 §1 #15-21）
  - Major-4：mock 规范范围订正为 8 域模块（mall/doc/iot 为本设计对象）
  - Minor m-1/m-2/m-3：Goals ②④ 补 S1/S2/O2 要点与测试钩子、③ 补散落验证项归集（G16/O2 keepOnPageChange）
  - Minor m-4：R6 Minor-4 双路径选择"roadmap M3 V3 行加注"（并入 In Scope 回写项）
  - Minor m-5：D4 行页面枚举收敛附注义务（并入 In Scope 回写项）
  - Minor m-6：closure 时序保持 EC 括注 + When Closing 9 同 commit 纪律（house pattern）；type 抽查口径以 EC"抽查 ≥8"为准

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用。

- [x] in-scope 工作全部落地（设计文档 + roadmap 回写）
- [x] 设计文档声称与 live repo / R2/R3/R4/D1 对照无 drift（closure audit 首轮 1 Major 属性级 drift 5 处+附录误挂 → 修复 → 二轮 1 Major-残留大小写+1 Minor 行号 → 修复 → 三轮复核 approved 零 findings；附录 A 抽样 ~30 条出处精确、12 条双向核对全一致、mock 端点与片段一致）
- [x] 不存在被静默降级的 in-scope 缺口（O1 要素⑩近似按 watch-only 记录于设计正文 §2.3，V2 timeline items 绑定未确认项诚实标注）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——三轮审计后零 findings）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: D4 七页复刻设计（S1-S2/O1-O2/V1-V3）六节齐备；V3 axe 分支 C 对策与收窄显式裁决、O2 keepOnPageChange、S1 形态组口径逐项落位（R4 §4.1 与开放审计强制输入全承接）；三轮审计（首轮 1M+2m→二轮 1M 残留+1m→approved）全部清零。D4 可关，M2 三域设计齐备待 D5 深审。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；同一审计员三轮）
- Evidence: 首轮 `issues`（1 Major：countdown finishedText/picker-view options/pivot aggregate/trackExpression/totals.row 五处属性级 drift+附录误挂）→ 修复 → 二轮 `issues`（aggregationType 大小写残留+L83 行号）→ 修复 → 三轮复核 `approved`（零 findings，回归扫描无越权改动）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（D5 深审承接三域设计）
