# 786 R1 ERP 三域页面盘点（business-page-replication roadmap M1-R1）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R1
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`；后续 R4 矩阵、M2-D2 设计

## Purpose

为 ERP 三域（WMS/CRM/ITAM）在 flux playground 的复刻提供输入盘点：逐页列出上游业务出处、交互要素、所需 renderer 能力。收口为 roadmap §2 R1 状态 `todo → planned → done`（终态 done，经 planned 两步流转）。

## Current Baseline

- 上游输入存在（live 核实 2026-10-30）：`~/app/nop-app-erp/docs/backlog/wms-warehouse-roadmap.md`、`crm-standalone-app-roadmap.md`、`itam-it-asset-roadmap.md`。
- roadmap M3 已固定 ERP 线 8 个复刻页：W1 WMS PDA 收货/上架、W2 拣货路径看板/波次、W3 库存台账、C1 商机漏斗看板、C2 客户 360、C3 销售驾驶舱、I1 资产台账与盘点、I2 折旧仪表盘。
- flux 渲染器包实况以 `packages/` 目录为准（15 个 `flux-renderers-*` 包 + 基础层；`docs/components/package-reorganization-analysis.md` 仅历史重组背景参考，未枚举全部 15 包）。
- **上游出处不对等事实（live 核实 2026-10-30）**：8 页中 C2（客户 360）/C3（销售驾驶舱）在上游 `crm-standalone-app-roadmap.md` 无直接对应章节（上游锚点仅为漏斗看板与 `getDashboardKpi` 销售漏斗 KPI；模块 UI 侧以 `module-crm/erp-crm-web/.../pages/` 的 ErpCrmActivity/ErpCrmEvent/report 佐证）。此类页的上游出处登记为"复刻 roadmap M3 行定义 + 模块 UI/领域模型佐证"，并显式标注"上游无直接章节"。
- 研究文档存放区 `docs/analysis/` 已有先例（ui-review/、visual-quality/ 子目录）。

## Goals

- 新建 `docs/analysis/business-replication/r1-erp-page-inventory.md`：M3 固定 8 页逐页登记——上游出处（文件+章节）、页面形态、交互要素清单、所需 renderer 能力（引用 live 包/type 名）。
- 上游 roadmap 中存在但 M3 未覆盖的典型复杂页，作为"候选补充页"登记并显式标注未纳入 1.0 复刻。
- 盘点只登记"页面需要什么"，不裁定能力分级。

## Non-Goals

- 不做"直接组合/能力扩展/新 type"三色分级（R4 职责）。
- 不改上游仓库；不做 schema 设计（M2-D2）；不写 playground 页面（M3）。
- 不盘点 AI/MES/商城/智能单据/IoT 域（R2/R3 职责）。

## Scope

### In Scope

- 通读三份上游 roadmap 中与 8 个固定复刻页相关的章节，必要时以模块 UI 目录结构佐证页面形态。
- 新建 `docs/analysis/business-replication/r1-erp-page-inventory.md`。
- roadmap §2 R1 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- R4 矩阵、M2 全部设计、M3 全部实现、retention 裁决、上游仓库任何改动。

## Failure Paths

不适用：纯文档盘点，无运行时行为。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 上游盘点与文档产出

Status: completed
Targets: `docs/analysis/business-replication/r1-erp-page-inventory.md`

- Item Types: `Decision | Proof`

- [x] 逐域抽取 W1-W3/C1-C3/I1-I2 共 8 页的上游定义与交互要素（扫码、拖拽、离线、行内编辑、drill-down 等，逐条列出）
- [x] 逐页登记所需 renderer 能力，引用 live 包/type 名
- [x] 候选补充复杂页登记（M3 未覆盖、上游 roadmap 中存在的典型复杂页）

Exit Criteria:

- [x] 盘点文档存在，8 页逐页含"上游出处（直接章节，或显式标注无直接章节并给出佐证来源）/ 交互要素 / 所需 renderer 能力"三要素，无空节（`docs/analysis/business-replication/r1-erp-page-inventory.md` §1-§3）
- [x] 文档引用的每个 flux 包/type 名经 live repo `packages/` 抽查存在（能力语义是否完备留 R4）：`barcode-input`(scheduling)、`stat-tile`/`sparkline`/`query-filter`(data)、`diff-view`/`qrcode`(content)、`timeline`(layout)、`detail-view`/`condition-builder`/`input-table`(form-advanced)、`kanban`/`gantt`/`calendar`(scheduling)、`pivot-table`(pivot)、`pull-refresh` 等 mobile 族——全部经 `ls packages/*/src` 实证
- [x] roadmap §2 R1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 3 Minor；按最小修改清单修订 4 项后达成共识，零 Blocker/Major）
- Rounds: 1
- Findings addressed:
  - Major F1：C2/C3 在上游 crm roadmap 无直接章节 → Current Baseline 增补"上游出处不对等事实"，Exit Criterion 1 措辞放宽为"直接章节或显式标注无直接章节并给出佐证来源"
  - Minor F2：Purpose 状态流转补全为 `todo → planned → done`
  - Minor F3：Exit Criterion 3 加注"随 closure audit 同一次回写提交完成"
  - Minor F4：package-reorganization-analysis.md 引用弱化为"历史重组背景参考，未枚举全部 15 包"

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（盘点文档 + roadmap 回写）
- [x] 文档事实声称与 live repo / 上游 roadmap 对照无 drift
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 核实无被隐藏的 in-scope 缺口）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 盘点文档 8 页三要素齐备、25+ renderer type 引用 live 实证、~20 个上游锚点精确命中、六处状态文本一致；G1-G8 缺口与 15 候选页是 Goals 要求的交付内容（登记待 R4），非降级项。R1 可关。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计报告 verdict `approved`（零 Blocker/Major/Minor）——EC1 文档逐页核对、EC2 抽查 25+ type 全中（chart-schemas 6 图型与 G1 声称精确一致）、声称-实况对账 ~20 个上游锚点全命中（opportunity-kanban L6"不使用拖拽"逐字、module-crm getDashboardKpi grep 零命中、dashboards.md L125/138/298/307 精确）、文本一致性六处吻合；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（R4 矩阵由 roadmap 后继工作项承接）
