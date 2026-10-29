# 788 R3 智能单据/IoT 页面盘点（business-page-replication roadmap M1-R3）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R3
> Related: `docs/plans/786-business-replication-r1-erp-inventory-plan.md`、`docs/plans/787-business-replication-r2-ai-mes-mall-inventory-plan.md`（同型先例，均 completed）；R4 矩阵、M2-D4 设计

## Purpose

为智能单据中台（nop-entropy）与 IoT 增值域（nop-app-iot）在 flux playground 的复刻提供输入盘点：逐页列出上游业务出处、交互要素、所需 renderer 能力。收口为 roadmap §2 R3 状态 `todo → planned → done`（终态 done，经 planned 两步流转）。

## Current Baseline

- 上游输入存在（live 核实 2026-10-30）：`~/app/nop-entropy/docs/backlog/{smart-document-platform, semantic-dataset}-roadmap.md`、`~/app/nop-app-iot/docs/backlog/iot-value-added-roadmap.md`。
- roadmap M3 已固定本批 5 个复刻页：O1 OCR 校正工作台页、O2 HITL 审批收件箱页（智能单据域）；V1 IoT 设备遥测详情页、V2 IoT OTA 灰度管理页、V3 IoT 围栏地图与视频墙页（IoT 域）。semantic-dataset roadmap 为智能单据域辅助输入（无固定复刻页，供候选页登记）。
- **上游出处可能不对等（R1/R2 先例条款）**：任一复刻页在上游 roadmap 无直接章节时，出处登记为"复刻 roadmap M3 行定义 + 模块 UI/领域模型佐证"，并显式标注"上游无直接章节"；不得编造上游章节。
- 上游模块目录实况需调研时核实（owner docs 标 NEW 可能均不存在，R2 先例）。
- flux 基线（live 核实 2026-10-30）：15 个 `flux-renderers-*` 包；O1/O2 对应 `form`/`form-advanced`/`data`/`ai`(ai-tool-call HITL)/`content`(image-compare/diff-view)；V1 对应 `data`(echarts/data-source 轮询/sparkline)；V2 对应 `layout`(wizard/steps)/`data`(crud)；V3 对应 `flux-renderers-map`（围栏/标注，适用性待核）+ iframe 面板（仅 dashboard editor palette 登记未注册实现，roadmap §4 已列"视频墙面板"缺口）+ video 面板（content，已实证）。
- 研究文档存放区 `docs/analysis/business-replication/` 已建（R1/R2 交付在案）。

## Goals

- 新建 `docs/analysis/business-replication/r3-entropy-iot-page-inventory.md`：5 页逐页登记——上游出处（直接章节，或显式标注无直接章节并给出佐证来源）、页面形态、交互要素清单、所需 renderer 能力（引用 live 包/type 名）。
- 上游 roadmap 中存在但 M3 未覆盖的典型复杂页，作为"候选补充页"登记并显式标注未纳入 1.0 复刻（含 semantic-dataset roadmap 贡献）。
- 盘点只登记"页面需要什么"，不裁定能力分级。

## Non-Goals

- 不做"直接组合/能力扩展/新 type"三色分级（R4 职责）。
- 不改上游仓库；不做 schema 设计（M2-D4）；不写 playground 页面（M3）。
- 不盘点 ERP/AI/MES/商城域（R1/R2 已收口）。

## Scope

### In Scope

- 通读三份上游 roadmap 中与 5 个固定复刻页相关的章节，必要时以上游模块 UI 目录/页面 yaml 佐证。
- 新建 `docs/analysis/business-replication/r3-entropy-iot-page-inventory.md`。
- roadmap §2 R3 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- R4 矩阵、M2 全部设计、M3 全部实现、retention 裁决、上游仓库任何改动。

## Failure Paths

不适用：纯文档盘点，无运行时行为。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 上游盘点与文档产出

Status: completed
Targets: `docs/analysis/business-replication/r3-entropy-iot-page-inventory.md`

- Item Types: `Decision | Proof`

- [x] 逐域抽取 O1-O2/V1-V3 共 5 页的上游定义与交互要素（image 区域对照、置信度高亮、HITL 审批、实时曲线轮询、OTA 分批推送、围栏绘制、视频墙等，逐条列出）
- [x] 逐页登记所需 renderer 能力，引用 live 包/type 名
- [x] 候选补充复杂页登记（M3 未覆盖、上游 roadmap 中存在的典型复杂页，含 semantic-dataset roadmap）

Exit Criteria:

- [x] 盘点文档存在，5 页逐页含"上游出处（直接章节，或显式标注无直接章节并给出佐证来源）/ 交互要素 / 所需 renderer 能力"三要素，无空节（`docs/analysis/business-replication/r3-entropy-iot-page-inventory.md` §1-§2；V1 显式标注"上游无直接章节"）
- [x] 文档引用的每个 flux 包/type 名经 live repo `packages/` 抽查存在（wizard/steps 在 layout 包 index.ts L26/L31——评审 Major 修正后归属；image-compare/image/video/json-view/alert content 包行号锚点；map 包唯一 map type；ai-tool-call HITL renderers/ai-tool-call.tsx；iframe 仅 dashboard editor palette L26 登记无实现）
- [x] roadmap §2 R3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 1 Minor；修订后共识，零 Blocker/Major）
- Rounds: 1
- Findings addressed:
  - Major F1：V2 能力锚包归属错误——wizard/steps 在 `flux-renderers-layout` 而非 `basic`（layout index.ts L26/L31 实证）→ Current Baseline 已更正
  - Minor F2：iframe 待核指向不准确——仅 `flux-renderers-dashboard/src/editor/editor-palette.tsx` L26 调色板登记、无注册实现；video 在 content 包已实证；roadmap §4 L117 已列"视频墙面板"缺口 → Current Baseline 已更正

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（盘点文档 + roadmap 回写）
- [x] 文档事实声称与 live repo / 上游 roadmap 对照无 drift（closure audit 2 Minor 已随收口修正：OCR grep 假阳性措辞收紧、docs/design/ "空目录"改"不存在"；另 roadmap 头部 Status 行与 §2 实况漂移属 pre-existing，本次同 commit 就地勘误）
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 核实无被隐藏的 in-scope 缺口）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 盘点文档 5 页三要素齐备（V1 显式标注上游无直接章节）、评审 Major 修正项（wizard/steps 归属 layout、iframe 仅 palette 登记）经审计复验为真、20+ 上游锚点与 14+ renderer type 抽查全中、强佐证 6/6 存在；G19-G26 缺口与 11 候选页是 Goals 要求的交付内容（登记待 R4），非降级项。R3 可关。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计报告 verdict `approved`（零 Blocker/Major，2 Minor 已随收口修正）——renderer type 存在性+归属 14+ 全中、上游行号锚点 20+ 全中（含 maker-checker 04 文档逐项吻合、"批量操作标注影响行数"§八.3 精确、OtaRolloutService 四方法行号精确）、五处状态文本一致；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（R4 矩阵由 roadmap 后继工作项承接）
