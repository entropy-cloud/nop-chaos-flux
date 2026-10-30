# 793 D2 ERP 线复刻设计（business-page-replication roadmap M2-D2）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D2（依赖 D1 done，已满足）
> Related: `docs/analysis/business-replication/d1-replication-master-design.md`（§5 模板强制）；R1 盘点；R4 矩阵 §2/§4

## Purpose

按 D1 §5 六节模板产出 ERP 线 8 页（W1-W3/C1-C3/I1-I2）的复刻设计：schema 结构与 renderer 组合方案、mock backend 设计、验收断言清单。收口为 roadmap §2 D2 状态 `todo → planned → done`。

## Current Baseline

- D1 已交付：六项落地决策 + D2-D4 六节模板 + 21 页路由（本域 8 页 pageId 已定）+ mock 规范（wms/crm/itam 三域模块）+ 三支柱验收模板。
- R1 盘点含 8 页逐页交互要素与 renderer 映射；R4 矩阵含本域 8 页可行性结论（全直接组合）与缺口（G1-G8 相关项：W1 G3/G4、W2 G2/G5/G7、W3 G6/G7、C1 G1/G2、C3 G1/G8、I2 G6）。
- ERP 域散落验证项归集义务（R4 §4.1）：C1 kanban moveStage 绑定验证、C1 footer 统计带绑定验证、G2 拖拽绑定语义——必须落入本设计 §3 归集表。
- mock 先例与 e2e 设施见 D1 §2/§3（本设计不重复，直接引用规范产出域级清单）。

## Goals

- 新建 `docs/analysis/business-replication/d2-erp-design.md`，按 D1 §5 六节：① 8 页清单与上游引用（引 R1 节+行号，不重抄）；② 逐页 schema 结构设计（组件树/type 级选择 + 关键 schema 片段）；③ R4 对照与 §2↔§4 双向核对表 + 验证项归集表（含上述三项 ERP 义务）；④ wms/crm/itam 三个 mock 模块的端点清单（含错误分支）与数据集形状；⑤ 逐页三支柱验收断言清单；⑥ 临时形态标注（本域无新 type 页，G5/G6 按近似组合说明）。
- schema 片段做到 type/属性级可指导 M3 编码，但不产出完整可运行 JSON（M3 落地时编写）。

## Non-Goals

- 不写 playground 页面 JSON/e2e（M3）；不改 R1/R4 文档；不裁决 retention；不覆盖 AI/MES/商城/智能单据/IoT 域（D3/D4）。

## Scope

### In Scope

- d2-erp-design.md 撰写（六节）。
- roadmap §2 D2 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- M3 实现；D3/D4 域；基线 JSON 新建；上游仓库改动。

## Failure Paths

不适用：纯设计文档。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - ERP 线设计产出

Status: completed
Targets: `docs/analysis/business-replication/d2-erp-design.md`

- Item Types: `Decision | Proof`

- [x] 按六节模板撰写 8 页设计（每页：组件树/type 选择/关键 schema 片段/mock 端点/三支柱断言点）
- [x] §2↔§4 双向核对表 + ERP 验证项归集表（三项义务逐项落位）
- [x] 引用准确性自查：引用的 R1/R4/D1 节号与行号、flux type 名全部对照 live

Exit Criteria:

- [x] 设计文档六节齐备，8 页逐页含 schema 结构与断言清单
- [x] 三项 ERP 验证项义务在归集表逐项落位（C1 moveStage/C1 footer 统计带/G2）
- [x] 文档引用的 flux type 名与 R2/R4 一致且 live 存在（抽查 ≥8）
- [x] roadmap §2 D2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，3 Minor 已记录执行口径）
- Rounds: 1
- Findings addressed:
  - Minor-1：Goals ② 的 styling contract 约定在执行时于设计文档第②节显式含（已记入执行项口径）
  - Minor-2：Goals ④ 的测试钩子清单在执行时于第④节显式含
  - Minor-3：closure 时序按 When Closing 9 同 commit 纪律一次性落（审计时序豁免已声明，house pattern）

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用。

- [x] in-scope 工作全部落地（设计文档 + roadmap 回写）
- [x] 设计文档声称与 live repo / R1/R4/D1 对照无 drift（closure audit 三轮收敛：首轮 2 Major/9 实例属性级 drift + 3 Minor → 修复 → 二轮 1 Major refreshSource 形态（6 行+树注+kpiAll）→ 修复 → 三轮复核 approved 零 findings；type 名核对 40+ 全 live）
- [x] 不存在被静默降级的 in-scope 缺口（§6 不做项均承 R4/D1 既有裁决并带出处；§3.3-② 实测收口预案为设计内预案非 plan 项改判）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——三轮审计后零 findings）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: D2 八页复刻设计（W1-W3/C1-C3/I1-I2）六节齐备；三项 ERP 验证项义务（C1 moveStage/C1 footer 统计带 affixRow+stat-tile 双落位/G2 拖拽绑定语义）归集表逐项落位含验证方法与断言点；R4 §2↔§4 双向核对表 8 行一致。三轮审计全部收敛（属性级契约经编译链+运行时+live 先例四方核验）。D2 可关，M2 三域设计齐备待 D5。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；同一审计员三轮）
- Evidence: 首轮 `issues`（2 Major：quickSaveApi/status mapping/query-filter submitOnChange/panel events 四处属性不存在 + columnAggregate 数组/aggregationType 小写/totals 平铺/affixRow label/chart props type 五处值形态 drift；3 Minor）→ 修复 → 二轮 `issues`（refreshSource args.sourceName 应为顶层 targetId：新引入 2 行+同型残留 4 行+树注+kpiAll 未声明）→ 修复 → 三轮复核 `approved`（RefreshSourceActionSchema/compileTargeting/运行时守卫/sundial 先例四方一致；sourceName 全文零残留）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（D5 深审承接三域设计核查，含 794 移交的 button countDown 张力项）
