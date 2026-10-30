# 794 D3 AI/MES 复刻设计（business-page-replication roadmap M2-D3）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D3（依赖 D1 done，已满足）
> Related: `docs/analysis/business-replication/d1-replication-master-design.md`（§5 模板强制）；R2 盘点；R4 矩阵 §2/§4

## Purpose

按 D1 §5 六节模板产出 AI/MES 两域 6 页（K1-K3/M1-M3）的复刻设计：schema 结构与 renderer 组合方案、mock backend 设计、验收断言清单。收口为 roadmap §2 D3 状态 `todo → planned → done`。

## Current Baseline

- D1 已交付：六项落地决策 + D2-D4 六节模板 + 21 页路由（本域 6 页 pageId 已定，D1 §1 表 #9-14）+ mock 规范（8 域模块，其中 ai/mes 两模块为本设计 Goals ④ 的直接对象）+ 三支柱验收模板。
- R2 盘点含 6 页逐页交互要素与 renderer 映射；R4 矩阵含本域 6 页可行性结论（K2 能力扩展；K1/K3/M1/M2/M3 直接组合）与缺口（G9/G12→K2、G11→K1/K2、G10→M1、G14→M3；K3 另涉 G13/G18 组合覆盖项）。
- R4 §4.1 对 D2-D4 的指名验证项（C1×2/G2）均不在本域；§4.1-① 的 M3 mobile axe 基线义务已由 D1 §4 分支 B 承接，本设计沿用。K2 的 G9（桌面 countdown）临时形态（静态剩余时长文本）与 M1 的 G10（stat-tile 近似翻牌器）须在设计中显式标注验收口径。
- mock 先例与 e2e 设施见 D1 §2/§3（本设计不重复，直接引用规范产出域级清单）。

## Goals

- 新建 `docs/analysis/business-replication/d3-ai-mes-design.md`，按 D1 §5 六节：① 6 页清单与上游引用（引 R2 节+行号，不重抄）；② 逐页 schema 结构设计（组件树/type 级选择 + 关键 schema 片段 + stack-\*/marker 类 styling contract 约定；K1 ai-chat 族整页编排、M1 dashboard+scada-canvas、M2 input-table computed/aggregate、M3 mobile 族）；③ R4 对照与 §2↔§4 双向核对表 + G9/G10/G14 临时形态口径；④ ai/mes 两个 mock 模块的端点清单（含错误分支）、数据集形状与测试钩子清单（**replAiCalls/**replMesCalls + TestHooks，D1 §2 规范；AI 域含 connector mock 对接说明，先例 apps/playground/src/ai/ mock-ai-env）；⑤ 逐页三支柱验收断言清单；⑥ 临时形态标注（K2 静态倒计时、M1 stat-tile 近似翻牌器、M3 无 capture 直采）。
- schema 片段做到 type/属性级可指导 M3 编码，但不产出完整可运行 JSON（M3 落地时编写）。

## Non-Goals

- 不写 playground 页面 JSON/e2e（M3）；不改 R2/R4 文档；不裁决 retention；不覆盖其他域。

## Scope

### In Scope

- d3-ai-mes-design.md 撰写（六节）。
- roadmap §2 D3 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- M3 实现；D3/D4 域；基线 JSON 新建；上游仓库改动。

## Failure Paths

不适用：纯设计文档。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - AI/MES 设计产出

Status: completed
Targets: `docs/analysis/business-replication/d3-ai-mes-design.md`

- Item Types: `Decision | Proof`

- [x] 按六节模板撰写 6 页设计（每页：组件树/type 选择/关键 schema 片段/mock 端点/三支柱断言点）
- [x] §2↔§4 双向核对表 + G9/G10/G14 临时形态验收口径标注
- [x] 引用准确性自查：引用的 R2/R4/D1 节号与行号、flux type 名全部对照 live

Exit Criteria:

- [x] 设计文档六节齐备，6 页逐页含 schema 结构与断言清单
- [x] G9/G10/G14 临时形态验收口径在设计正文显式标注（K2/M1/M3 逐页）
- [x] 文档引用的 flux type 名与 R2/R4 一致且 live 存在（抽查 ≥8，含 ai 族与 mobile 族归属）
- [x] roadmap §2 D3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：2 Major + 4 Minor；修复后达 pass-with-minors 水平）
- Rounds: 1
- Findings addressed:
  - Major-1：三处 roadmap 回写行 D2→D3（拷贝缺陷）
  - Major-2：Current Baseline 重写（本域 6 页 pageId D1 §1 #9-14；mock 8 域模块含 ai/mes）
  - Minor-1：缺口映射补全（G11→K1/K2、K3 G13/G18）
  - Minor-2：§4.1 表述改写（C1×2/G2 不在本域、M3 mobile axe 已由 D1 分支 B 承接）
  - Minor-3：closure 时序保持 EC 括注 + When Closing 9 同 commit 纪律（house pattern，审计时序豁免已声明）
  - Minor-4：Goals ② 补 styling contract、④ 补测试钩子

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用。

- [x] in-scope 工作全部落地（设计文档 + roadmap 回写）
- [x] 设计文档声称与 live repo / R2/R4/D1 对照无 drift（closure audit approved 零 Blocker/Major；1 Minor §7 归属表 3 处包归属 [flex→basic、form/textarea→form 包] 已随收口修正；type 名 30+ 全 live、属性级契约抽 7 个全中）
- [x] 不存在被静默降级的 in-scope 缺口（G9/G10/G14 临时形态显式登记有 R4 分级背书；G11 finishReason 退化口径为设计内 contingency 非 plan 级延期；G18 wf 图形不做是 R4 自身结论）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit approved）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: D3 六页复刻设计（K1-K3/M1-M3）六节齐备；AI 域 connector mock 复用既有装配+4 类 streaming fixture 预设；G9/G10/G14 临时形态四要素标注齐备；type 名与属性契约 live 全中（含 input-image 无 capture 之 G14 口径成立、data-source 取数走 action:'ajax' 契约修正）。closure audit approved（1 Minor 已修）。D3 可关。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，1 Minor 归属表已修）——6 页 schema 结构与三支柱断言齐备、type 抽查 30+ 与属性级 7 个全中、声称对账 5/5、双向核对表七项与 R4 §2 一致、范围外观察（improvement L186 button countDown vs live 实现张力）移交 D5；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（button countDown 登记与实现张力由 D5 深审承接核查）
