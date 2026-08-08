# DB Bug 沉淀回补（第一轮 + post-closure 缺口，编号 90 起）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: DB
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（DB 行 + DB Phase Details + Cross-Cutting bug note 纪律）、`docs/bugs/00-bug-fix-note-writing-guide.md`、`docs/audits/round2-p3-inventory.md`、`docs/audits/round2-p3-adjudication.md`
> Related: `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（completed，输入盘点）、`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（completed，fixed 26 条卡内引用在案）；后续 `DG`（Guard 沉淀）依赖本 plan 的 bug-note 缺口终验

## Purpose

把第一轮（C1–C9 + CR + CX-1..CX-12）与 08-06/08-07/08-08 收口批次中**已修复但缺 `docs/bugs/` note** 的复杂缺陷逐条补写为 bug note（编号 **90 起**，短小聚焦记忆点，不重复实现 diff），盘点表落 `docs/audits/round2-bug-note-gaps.md` 且零悬挂，并修复 `docs/bugs/README.md` 索引漂移。本 plan 只回补历史缺口，不承接 D3.x 新发现的 bug note 义务（roadmap Cross-Cutting：D3.x 行内补写）。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **bug note 现状**：`docs/bugs/` 现有 **95 个编号 note（01–89 中 20/21 无文件；含重号：15×4、16×2、17×2、44×2、67×2、74×2，22 非重号）+ 指南 00 = 96 文件**（live `ls` 实测）；**`docs/bugs/README.md`「Current Entries」索引漂移**——索引仅登记至 `61-performance-table-strictmode-row-scope-runtime-key-fix.md`，缺登 **34 个文件 / 31 个编号**：62–89 全段 30 文件（28 编号 + 67/74 双文件）**加上** ≤61 的 4 条（`15-component-level-initfetch-analysis-and-fix` / `48-tabs-form-panel-unmount-reset-fix` / `54-surface-form-strictmode-dispose-fix` / `55-array-field-playground-item-region-scope-fix`）（live `ls` + README `comm -23` 对照确认）。下一可用编号 = **90**（roadmap DB 行约定）。
- **候选缺陷清单（roadmap DB 行，~15 条）**：CX-6 数值/布尔选项选中态 echo 破坏、CX-7 日期日历 locale 不随语言、CX-8 复合字段 readOnly/disabled 不传播、2-8 CRUD 自定义 state path 双 fetch、2-9 无限滚动重试跳页、2-10 polling 挂载序竞态、2-11 pagination 渲染期 clamp、2-12 surface scope dispose 缺口 + GC 测试假保障、2-13 barcode 连续同值静默丢弃、2-14 四个 drag hook 无 pointercancel、2-16 onErrorError 抑制标记丢失、2-19 gantt 键盘编辑派发错通道、15-2 设计器 NaN fail-closed、22-07 gantt onTaskEdit 缺失、22-12 kanban 死句柄——**均为 live 待核对**（每条需确认修复 plan/commit 与当前终态；如某条实为未修复的 live defect，则按 Bug Fix Test Coverage Rule 登记为 D3.x/DR 输入而非本条补写）。
- **修复证据来源（completed plan，live 核对）**：第一轮 C0–C9 + CX-n 批次（`docs/plans/2026-07-28..08-06`）、`2026-08-07-0819-*`、`2026-08-07-2228-*`、`2026-08-08-0150-*`、`2026-08-08-0715-3`（D2，fixed 26 条带卡内引用）；审计卡发现行（`docs/audits/per-component/*.md` 的 `[P1-x]/[P2-x]` fixed 标注）与 `docs/audits/round2-p3-adjudication.md`（fixed 26 条）为出处检索入口。
- **补写门槛**（`00-bug-fix-note-writing-guide.md`）：根因非平凡 / 跨包 / 加回归测试 / 重构可重引入——候选 15 条全部命中（roadmap 已按门槛筛定）。
- **D0 盘点产物**：`docs/audits/round2-p3-inventory.md` 零悬挂（149 P3 + 审计 P3 + Follow-ups 归集）；bug-note 盘点表 `docs/audits/round2-bug-note-gaps.md` 尚未建立。
- **CV full-green 基线**（2026-08-06 实测）在案；本 plan 纯文档变更，不影响代码基线。

## Goals

- `docs/audits/round2-bug-note-gaps.md` 盘点表**零悬挂**：每条候选 = 缺陷描述 + 修复 plan/commit 出处 + 门槛命中理由 + note 去向（90 起编号或裁决不写 + 理由）。
- 逐条补写 bug note（90 起，按 guide 模板：Problem / Diagnostic Method / Root Cause / Fix / Tests / Affected Files / Notes For Future Refactors），短小聚焦，不重复实现 diff。
- 修复 `docs/bugs/README.md` 索引漂移：补登全部缺登条目（62–89 共 30 文件 + ≤61 的 4 条：15-component-level / 48 / 54 / 55，合计 34 文件 / 31 编号）+ 登记本次补写条目，索引与 live 文件一一对应。

## Non-Goals

- 不修复任何代码缺陷（纯文档回补；live 核对中发现未修复缺陷只登记路由，不在此修复）。
- 不重写既有 bug note（guide Rule 21：历史计划/历史文档不回写；62–89 已在文件内的 note 只补索引，不改内容）。
- 不承接 D3.x 行内补写义务（roadmap Cross-Cutting 纪律：D3.x 各 plan 自行行内补写）。
- 不写 lessons（DL work item 范围）。

## Scope

### In Scope

- 盘点表 `docs/audits/round2-bug-note-gaps.md`（live 核对候选 ~15 条 + 出出处 + 门槛理由 + 去向）。
- 补写 note 90 起（条数以 live 核对裁决为准，预期 ~15 条）。
- `docs/bugs/README.md` 索引更新（62–89 补登 + 新 note 登记）。

### Out Of Scope

- 代码修复、D3.x 新发现、lessons 06–08（DL）、门禁变更（DG）。

## Failure Paths

不适用（纯文档计划；主要风险是候选缺陷修复出处检索困难或某候选实为未修复 live defect——已由「盘点表裁决列 + 路由 D3.x/DR」覆盖）。

## Test Strategy

本档选择：**不适用：纯文档计划，无产品代码变更**。note 的「Tests」节引述既有回归测试文件（live 核对存在性），不新增测试；`pnpm check` 保留为 Closure Gate（`check:active-doc-code-anchors` 与 `check:docs-garbled` 覆盖 docs 变更）。

## Execution Plan

### Phase 1 - 盘点表建立（live 核对）

Status: completed
Targets: 新建 `docs/audits/round2-bug-note-gaps.md`、`docs/audits/per-component/*.md`、`docs/plans/2026-07-28..08-08` 相关 plan、`docs/bugs/README.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] 逐条 live 核对 15 候选：定位修复 plan/commit（audit 卡 fixed 标注 / plan Closure 节 / daily log 检索），核对修复后终态（focused 测试存在性 + 修复站点 live）。
- [x] 裁决（Decision）：每条落 `补写（编号）` 或 `不写（理由）` 或 `未修复 live defect（路由 D3.x/DR）`；盘点表零悬挂声明（15 条 = 去向全覆盖）。
- [x] README 漂移盘点：live `ls docs/bugs/*.md` 全量文件清单 vs README「Current Entries」逐条比对——缺登 34 文件 / 31 编号（62–89 全段 30 文件 + 15-component-level/48/54/55 共 4 条），登记缺失条目清单（Phase 3 修复用）。

Exit Criteria:

- [x] `docs/audits/round2-bug-note-gaps.md` 存在且零悬挂：每条候选有出处 + 门槛命中理由 + 明确去向；`rg` 复核候选编号全覆盖。
- [x] README 漂移清单（62–89 全段 30 文件 + ≤61 的 4 条：15-component-level/48/54/55，合计 34 文件 / 31 编号）完整登记。

### Phase 2 - 逐条补写 note（90 起）

Status: completed
Targets: `docs/bugs/90-*.md` 起若干

- Item Types: `Follow-up`

- [x] 按 guide 模板逐条补写（90 起；编号唯一，不沿用既有重号先例——本 plan 从 90 顺序递增）。
- [x] 每条 note：Problem（症状+最小复现）/ Diagnostic Method（非平凡诊断路径）/ Root Cause / Fix（设计意图）/ Tests（引述既有回归测试文件:行）/ Affected Files / Notes For Future Refactors。

Exit Criteria:

- [x] 盘点表「去向」列全部兑现：`docs/bugs/90-*.md` 至 `docs/bugs/{90+n}-*.md` 存在，内容符合模板（抽查每条 7 节模板齐全：Problem / Diagnostic Method / Root Cause / Fix / Tests / Affected Files / Notes For Future Refactors）。
- [x] 未修复路由项已在盘点表显式登记 successor（D3.x/DR），无悬挂。

### Phase 3 - README 索引修复 + 零缺口核对 + 收口登记

Status: completed
Targets: `docs/bugs/README.md`、`docs/backlog/component-audit-round2-roadmap.md`（DB 行）、`docs/logs/2026/08-08.md`、`docs/audits/round2-bug-note-gaps.md`

- Item Types: `Proof | Follow-up`

- [x] README「Current Entries」修复：全部缺登条目补登（62–89 共 30 文件 + 15-component-level/48/54/55 共 4 条，不改既有行）+ 本次新 note（90+）登记；索引与 `ls docs/bugs/*.md` 一一对应（文件清单对比零缺口）。
- [x] 收口登记：roadmap DB 行 `todo`→`done`（附执行证据引用）、daily log 收口节。
- [x] 零缺口终验：`docs/bugs/README.md` 条目数 = note 文件数（含指南 00；重号条目按文件名逐一登记）；盘点表去向全覆盖复核。

Exit Criteria:

- [x] README 索引与 live 文件零缺口（`diff <(ls) <(README 条目)` 式核对证据在案）；roadmap DB 行 `done` + daily log 收口节。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0212171ceffeVBN5J9hR0nXNjG` 轮 1；`ses_0211c7a34ffehrZNeOLx3cvdMC` 轮 2）
- Verdict: `pass`（轮 2 零 Blocker 零 Major；轮 1 `fail` 1 Major 已修复）
- Rounds: 2
- Findings addressed:
  - Major-1（轮 1）：README 索引漂移数量与范围错误（原写 62–89 共 24 条；实测 62–89 全段 30 文件 + ≤61 的 15-component-level/48/54/55 共 4 条，合计 34 文件 / 31 编号）→ Baseline/Goals/Phase 1/Phase 3/Closure Gate 五处同步更正为全量口径。
  - Minor（轮 1 三项全部处理）：重号清单更正（15×4、16×2、17×2、44×2、67×2、74×2，22 非重号）；note 计数更正（95 编号 + 指南 00 = 96 文件，20/21 无文件）；Phase 2 Exit 改「7 节模板齐全」（guide 模板实为 7 节 + 标题）。
  - Minor（轮 2 两项全部处理）：Phase 1 Exit 漂移清单补 ≤61 四条口径；Baseline 补注「20/21 无文件」防 phantom gap 误读。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。
>
> **纯文档计划条款**（guide 模板）：不涉及代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从本表移除；`pnpm check` 保留（docs 变更受 `check:active-doc-code-anchors` / `check:docs-garbled` 约束）。

- [x] 盘点表零悬挂（15 候选去向全覆盖 + 证据在案）
- [x] note 补写全部落地（90 起，模板合规，README 索引同步）
- [x] README 索引漂移修复（缺登 34 文件 / 31 编号全量补登），索引与 live 文件零缺口
- [x] 不存在被静默降级到 deferred 的 in-scope 项（候选如判未修复 live defect 显式路由 D3.x/DR）
- [x] 受影响的 owner docs 已同步（`docs/bugs/README.md`、roadmap DB 行、daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check`（实测 exit 0，2026-08-08）

## Deferred But Adjudicated

### 候选裁决为「未修复 live defect」的条目

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 是纯文档回补；如 live 核对发现某候选修复不成立（缺陷仍在），属已确认 live defect，显式登记盘点表并路由 D3.x/DR 修复，不在本 plan 内修复（避免文档轮夹带代码修复的 scope 漂移）。
- Successor Required: `yes`（仅当存在此类条目）
- Successor Path: 对应 D3.x 面审计 plan 或 roadmap DR 行

## Non-Blocking Follow-ups

- 既有 note 文件的内容陈旧问题（如有）：归日常维护，不属本 plan（历史文档不回写纪律）。
- 重号文件名（15×4、16×2、17×2、44×2、67×2、74×2）治理：影响索引清晰度但不阻塞（文件名即规范 id，README 逐条登记即可区分），归未来治理轮次。**已收口（2026-08-09）**：由 plan `docs/plans/2026-08-09-0444-2-round2-bug-note-duplicate-number-filenames.md` 治理完成——6 重号编号 14 文件后缀去重（15a-d/16a-b/17a-b/44a-b/67a-b/74a-b，README 登记顺序即后缀序）+ README「Current Entries」索引同步（comm 零缺口 126 = 126）+ 维护面 24 处完整文件名引用与 3 处编号短语消歧（保留区 plans 10 + archive 14 历史保留）；`pnpm check` exit 0。

## Closure

Status Note: 2026-08-08 完成。3 Phase 全 completed。纯文档回补，零产品代码变更：盘点表 `docs/audits/round2-bug-note-gaps.md` 零悬挂（15 候选全部 live 核对为已修复，去向 = 补写 92–106 共 15 note；90/91 已被 D3.1 行内补写占用 → 从 92 起，编号裁决记录于盘点表）；15 条 bug note 按 guide 模板 7 节合规（每条 Tests 节引述既有回归测试，live 核对存在）；README「Current Entries」索引漂移修复（缺登 34 文件 / 31 编号全量补登，规范化 diff 实测零缺口 113 = 113）；roadmap DB 行 `todo`→`done` + daily log 收口节。验证：`pnpm check` exit 0（closure gate，check:active-doc-code-anchors / check:docs-garbled 覆盖 docs 变更）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `ses_0208dfb10ffefTla0iXqUnEiA5`）
- Evidence: Verdict **pass**——7 项检查全 PASS：① plan 一致性（3 Phase 全 `Status: completed` + 全部 item/Exit `[x]`，closure-audit gate 在审计时正确保持 `[ ]` 待独立勾选）；② 盘点表（15 候选全在表 + 零悬挂 + 10 个修复 plan 文件逐一存在 + 23 个回归测试文件逐一存在，超出 8 条抽查下限）；③ bug notes（92–106 共 15 文件存在，`rg -c '^## '` = 7 全合规；90/91 由 commit 68fcc326（D3.1）先于本 plan 存在，从 92 起编号正确）；④ README 索引规范化 diff ZERO GAP（113 = 113，含指南 00，重号按文件名逐一登记；34 条缺登全补）；⑤ 收口登记（roadmap DB 行 `done` + 执行证据、daily log DB 节）；⑥ 纯 docs 变更（git status 仅 docs/ 修改 + 新增，零 packages/scripts 变更）；⑦ `pnpm check` live 复跑 exit 0。Blockers 0 / Majors 0；Minor-1（盘点表零缺口命令改为规范化两侧同前缀形态，已修正）、Minor-2（closure 证据占位 → 本审计后由独立证据回填，已回填本表）。

Follow-up:

- DG 承接 bug-note 缺口终验时引用本 plan 盘点表（`docs/audits/round2-bug-note-gaps.md`）与 README 零缺口基线（113 = 113，2026-08-08）。
