# 787 R2 AI 客服/MES/商城页面盘点（business-page-replication roadmap M1-R2）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R2
> Related: `docs/plans/786-business-replication-r1-erp-inventory-plan.md`（同型先例，completed）；R4 矩阵、M2-D3 设计

## Purpose

为 AI 知识库+工单、MES、多租户商城三域在 flux playground 的复刻提供输入盘点：逐页列出上游业务出处、交互要素、所需 renderer 能力。收口为 roadmap §2 R2 状态 `todo → planned → done`（终态 done，经 planned 两步流转）。

## Current Baseline

- 上游输入存在（live 核实 2026-10-30）：`~/app/nop-app-erp/docs/backlog/ai-knowledge-ticket-roadmap.md`、`~/app/nop-app-erp/docs/backlog/mes-shopfloor-roadmap.md`、`~/app/nop-app-mall-wt/nop-app-mall-master/docs/backlog/multitenant-saas-roadmap.md`。
- roadmap M3 已固定本批 8 个复刻页：K1 AI 知识库对话页、K2 工单处理台页、K3 审批轨迹页（AI 域）；M1 MES 车间大屏页、M2 MES 工序报工页、M3 MES 异常叫料移动页（MES 域，§2 Milestone 3 表行号 M1/M2/M3，与里程碑标签无关）；S1 商城商品 SKU 选择页、S2 商城分销后台页（商城域）。
- **上游出处可能不对等（R1 先例）**：任一复刻页在上游 roadmap 无直接章节时，出处登记为"复刻 roadmap M3 行定义 + 模块 UI/领域模型佐证"，并显式标注"上游无直接章节"；不得编造上游章节。
- 上游模块目录实况需调研时核实（R1 先例：`module-wms/`/`module-itam/` 不存在，需找实存替代模块佐证；AI/MES/商城域对应模块目录待核实）。
- flux 基线（live 核实 2026-10-30）：15 个 `flux-renderers-*` 包；AI 域对应 `flux-renderers-ai`（会话流/streaming/HITL），MES 大屏对应 `flux-renderers-industrial` + `dashboard`/`data`(echarts)，移动页对应 `flux-renderers-mobile`，商城对应 `form`/`data`/`content` 族。`docs/components/package-reorganization-analysis.md` 仅历史背景。
- 研究文档存放区 `docs/analysis/business-replication/` 已建（R1 交付 r1-erp-page-inventory.md）。

## Goals

- 新建 `docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md`：8 页逐页登记——上游出处（直接章节，或显式标注无直接章节并给出佐证来源）、页面形态、交互要素清单、所需 renderer 能力（引用 live 包/type 名）。
- 上游 roadmap 中存在但 M3 未覆盖的典型复杂页，作为"候选补充页"登记并显式标注未纳入 1.0 复刻。
- 盘点只登记"页面需要什么"，不裁定能力分级。

## Non-Goals

- 不做"直接组合/能力扩展/新 type"三色分级（R4 职责）。
- 不改上游仓库；不做 schema 设计（M2-D3/D4）；不写 playground 页面（M3）。
- 不盘点 ERP 三域（R1 已收口）与智能单据/IoT 域（R3 职责）。

## Scope

### In Scope

- 通读三份上游 roadmap 中与 8 个固定复刻页相关的章节，必要时以上游模块 UI 目录/页面 yaml 佐证。
- 新建 `docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md`。
- roadmap §2 R2 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- R4 矩阵、M2 全部设计、M3 全部实现、retention 裁决、上游仓库任何改动。

## Failure Paths

不适用：纯文档盘点，无运行时行为。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 上游盘点与文档产出

Status: completed
Targets: `docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md`

- Item Types: `Decision | Proof`

- [x] 逐域抽取 K1-K3/M1-M3/S1-S2 共 8 页的上游定义与交互要素（会话流、streaming、HITL、大屏实时刷新、行内报工、现场拍照叫料、SKU 组合选择、佣金明细等，逐条列出）
- [x] 逐页登记所需 renderer 能力，引用 live 包/type 名
- [x] 候选补充复杂页登记（M3 未覆盖、上游 roadmap 中存在的典型复杂页）

Exit Criteria:

- [x] 盘点文档存在，8 页逐页含"上游出处（直接章节，或显式标注无直接章节并给出佐证来源）/ 交互要素 / 所需 renderer 能力"三要素，无空节（`docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md` §1-§3；K3/M1/M3/S2 四页显式标注"上游无直接章节"）
- [x] 文档引用的每个 flux 包/type 名经 live repo `packages/` 抽查存在（14 个 ai-\* type sort -u 实证、input-table aggregate/computed composite-schemas L110-131、user-select org L62、carousel/progress content、data-source interval/stopWhen flux-core schema L302-308、countdown 仅 mobile 包）
- [x] roadmap §2 R2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，3 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor 1：Non-Goals 设计 owner 引用补全为 M2-D3/D4（商城页设计 owner 是 D4）
  - Minor 2：Phase 1 交互示例"扫码叫料"改为"现场拍照叫料"（对齐 roadmap M3 行定义，上游无扫码）
  - Minor 3：Current Baseline 商城包映射改为"form/data/content 等族（逐页所需包以盘点登记为准）"

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（盘点文档 + roadmap 回写）
- [x] 文档事实声称与 live repo / 上游 roadmap 对照无 drift（closure audit 6 Minor 描述性 drift 已随收口 commit 修正：scada 符号 37 个、上游行数 124/127、字典锚点 L59、ai-native-interface L42、flash-sale 实页无倒计时标注、候选页"未纳入 1.0 复刻"标注）
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 核实无被隐藏的 in-scope 缺口）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 盘点文档 8 页三要素齐备（K3/M1/M3/S2 显式标注上游无直接章节）、closure audit 抽查 30+ 上游锚点与 25+ renderer type 全命中、"ai 14 type""countdown 仅 mobile 包"两个易错声称实证为真；G9-G18 缺口与 15 候选页是 Goals 要求的交付内容（登记待 R4），非降级项。R2 可关。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计报告 verdict `approved`（零 Blocker/Major，6 Minor 已随收口 commit 修正）——30+ 上游行号锚点逐一命中、renderer type 全仓抽查通过、K3/S2"上游无直接章节"标注诚实性验证（grep 零命中+实页 find 核实）、六处状态文本一致；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（R4 矩阵由 roadmap 后继工作项承接）
