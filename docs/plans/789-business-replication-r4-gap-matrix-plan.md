# 789 R4 flux 能力差距矩阵（business-page-replication roadmap M1-R4）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R4（依赖 R1-R3 done，已满足）
> Related: R1-R3 交付（`docs/analysis/business-replication/r{1,2,3}-*.md`）；`docs/components/amis-baseline-matrix.md`（retention 权威，本计划不裁决）；`docs/backlog/missing-components-and-designer-roadmap.md`；`docs/components/existing-components-improvement-analysis.md`

## Purpose

综合 R1-R3 三份盘点，产出 flux 能力差距矩阵：21 个复刻页的"页面交互要素 × 现有 renderer 覆盖"对照与"直接组合 / 能力扩展 / 新 type"三色分级，交付复刻可行性结论与合并缺口清单（G1-G26 归类），并核对缺口登记项与既有登记文档无重复立项冲突。收口为 roadmap §2 R4 状态 `todo → planned → done`。

## Current Baseline

- R1-R3 交付在案（本仓 live 核实）：`docs/analysis/business-replication/r1-erp-page-inventory.md`（8 页+G1-G8+候选 15）、`r2-ai-mes-mall-page-inventory.md`（8 页+G9-G18+候选 15）、`r3-entropy-iot-page-inventory.md`（5 页+G19-G26+候选 11）。合计 21 个 M3 固定复刻页、26 条缺口、41 个候选补充页。
- flux 基线：15 个 `flux-renderers-*` 包（R1-R3 已逐一实证关键 type 归属）。
- 三份登记面文档存在（roadmap Sources 声明）：`docs/components/amis-baseline-matrix.md`（retention 权威）、`docs/backlog/missing-components-and-designer-roadmap.md`（新类型线）、`docs/components/existing-components-improvement-analysis.md`（既有控件扩展登记）。其内部已有登记项清单需在执行期读出底账，防止 R4 重复立项。
- **Authority 约束（roadmap L19）**：R4 只做三色分级与登记映射，不裁决 retention；新 type 的最终裁决走 amis-baseline-matrix 增行（human gate）。
- 785 计划联动（roadmap §3）：input-table 合计行/从表联动/金额大写已落地（commit 2f904cea0，`docs/components/input-table/design.md` 列级增强节）；plan 785 头部状态 `executed (pending independent closure audit)`（即待签收语义）。W2/M2 页按已落地能力验收，无需"现状验收+页内标注"。

## Goals

- 新建 `docs/analysis/business-replication/r4-capability-gap-matrix.md`：
  1. 21 页可行性结论表（每页：直接组合可撑住 / 需能力扩展 / 需新 type 或以临时形态过验收，附依据缺口编号）
  2. G1-G26 三色分级矩阵（每条缺口：分级 + 涉及页 + 建议登记去向（missing-components / improvement-analysis / amis-baseline-matrix 增行候选，仅登记不裁决））
  3. 与既有登记文档的冲突核对结果（无重复立项；如有语义重叠，标注"扩展既有登记项"）
- 候选补充页 41 个仅作附录索引（不展开分析，1.0 范围外）。

## Non-Goals

- 不裁决 retention（amis-baseline-matrix 增行是 human gate）。
- 不落地任何缺口（M3 按分级以组合或临时形态过验收，落地属后续 plan）。
- 不改三份 R1-R3 盘点文档的结论（发现盘点错误时以勘误标注方式引用，不重写）。
- 不做 M2 设计。

## Scope

### In Scope

- 通读三份登记面文档，建立已有登记项底账（新类型线已登记项、既有控件扩展已登记项）。
- 综合三份盘点产出矩阵文档（上述 Goals 1-3）。
- roadmap §2 R4 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时；回写时按 guide When Closing 12 就地勘误 roadmap 头部 parenthetical 的 R3 状态滞留）。

### Out Of Scope

- 缺口实现、retention 裁决、R5/R6 审计的执行（R4 是其输入）。

## Failure Paths

不适用：纯文档综合，无运行时行为。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 登记面底账与矩阵产出

Status: completed
Targets: `docs/analysis/business-replication/r4-capability-gap-matrix.md`

- Item Types: `Decision | Proof`

- [x] 读 `missing-components-and-designer-roadmap.md`、`existing-components-improvement-analysis.md`、`amis-baseline-matrix.md` 三份登记面文档，摘出与 G1-G26 语义相关的既有登记项底账（新类型线/既有扩展/retention 已有行）
- [x] 21 页可行性结论表（三色分级，附缺口依据）
- [x] G1-G26 三色分级矩阵 + 登记去向映射
- [x] 冲突核对：G1-G26 vs 既有登记项，无重复立项或标注"扩展既有登记项"

Exit Criteria:

- [x] 矩阵文档存在，含 Goals 1-3 三节且 G1-G26 全部 26 条有分级与登记去向，无遗漏（§1 可行性表 21 行、§2 分级矩阵 26 行、§3 冲突核对 4 条、§4 登记映射）
- [x] 文档中引用的既有登记项在三份登记文档中真实存在（missing-components L107/L123/L90/L183、improvement-analysis L23-24/L60/L62/L68/L99-101/L147/L182-186，均 grep 行号锚定）；"新 type 增行候选"标注 demand-gated 不触碰 amis-baseline-matrix 既有行
- [x] 三色分级的每条"新 type"判定都引用了 R1-R3 盘点中的实证缺口描述（§0 分级原则声明 + 各行依据列）
- [x] roadmap §2 R4 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，4 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor F1：785 状态引用改写为可观测事实（commit 2f904cea0 + plan 785 头部 `executed (pending independent closure audit)`，"done-pending-signoff" 字面串不存在于任何 live 文档）
  - Minor F2：登记面底账覆盖补齐为三份（含 amis-baseline-matrix，EC 增"增行候选与既有行无重复"）
  - Minor F3：roadmap 回写时机括注补齐（planned/done 两步，788 同款）
  - Minor F4：回写项并入 roadmap 头部 parenthetical 就地勘误义务

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（矩阵文档 + roadmap 回写）
- [x] 文档事实声称与 live repo / R1-R3 交付 / 登记面文档对照无 drift（closure audit 首轮 1 Major 汇总行计数漂移 + 1 Minor echarts 事件计数，均已修复并经原审计员复核 approved）
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口，计数行同步勘误）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 复核确认无被隐藏的 in-scope 缺口）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 矩阵 21 页可行性结论（16/3/2，21/21 可过验收）、G1-G26 分级（12/5/7/2，逐行-汇总一致）、两条登记冲突引用既有裁定、11 处既有登记项引用行号全部真实；closure audit 首轮 issues（1 Major 汇总计数 + 1 Minor echarts 9 类事件勘误）修复后经原审计员复核 approved。R4 可关，M1 调研阶段四交付齐备。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；含同 agent 修订复核轮）
- Evidence: 首轮审计 verdict `issues`（1 Major：§2 汇总行 12/5/7/2 计数漂移；1 Minor：echarts 事件 8→9 就地勘误）→ 修复 → 复核 verdict `approved`（逐行重提 26 行标签核对一致、修订仅涉 L24/L54/L74 三处、无越权改动）；EC2 抽查 11 处既有登记项全真、EC3 新 type 溯源 7 条全中；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（登记动作与 retention flip 由后续 plan 按 Authority 执行，human gate 在 amis-baseline-matrix）
