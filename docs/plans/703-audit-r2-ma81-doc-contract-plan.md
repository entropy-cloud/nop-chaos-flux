# 703 审计修复 R2·MA8.1：文档契约审计—architecture/quick-reference/flux-guide 抽样对照 live code

> Plan Status: active
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA8.1；`docs/audits/arm2-scope-and-dimension-matrix.md` MA8.1 行（报告名注册 `*arm2-MA8.1-doc-contract.md`；`check:active-doc-code-anchors` + `docs/skills/doc-evaluation.md` 四问〔准确/强契约/决策质量/时效〕；漂移按 `docs/context/source-of-truth-and-precedence.md` 裁决）；owner doc `docs/architecture/`（自审域）
> Related: matrix MA8 节、`docs/audits/arm2-index.md`、MA1–MA7 各报告（其中文档相关 finding 引用归并——如 MA7.3 dashboard/gantt §10 文档缺口已立案）
> 方法先例沿用：`_tmp/arm2-ma81/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外；文档修正本身属文档域——本批仅审计取证不修正，修正归 MR/文档批）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

文档契约审计：`check:active-doc-code-anchors` 扫描；`docs/architecture/` + `docs/references/quick-reference.md` + `flux-guide/` 抽样对照 live code（四问评估：准确/强契约/决策质量/时效）；漂移按 source-of-truth 裁决；产出 arm2 报告并登记 arm2-index；零入库变更（含文档——只审不改）。

## Current Baseline（2026-10-23 live，HEAD `3a2671457`）

- **扫描器**：`check:active-doc-code-anchors`（路径存在性检查器；**无 M0 在册基线**——本批实测值为首轮基线）。
- **文档域**：`docs/architecture/`（含本批已立案的 dashboard §10 缺口/gantt §10 同步——MA7.3 P3 引用）、`docs/references/quick-reference.md`、`flux-guide/`。
- **执行状态**：roadmap MA8.1 `todo`；arm2-index MA8.1 行 `—`。
- **在案勘误（本批修复）**：MA7.3 收口提交（3a2671457）之 roadmap `done` 翻转被并发线陈旧快照在提交前回写覆盖（HEAD 实录 `planned`）——closure review m3 发现；修复随本批提交（行 surgery + 回读），此后 Serial 序不再是 residual。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA8.1-doc-contract.md`（矩阵注册名 doc-contract）：finding P0–P3（P1 ID `P1-MA8.1-<nnn>`）。
- 覆盖面（单轮子代理 + 执行者扫描；字母批拆分预授权）：
  - ① **anchors 扫描+复核**（子代理）：`check:active-doc-code-anchors` 命中人工复核（死锚/漂移锚分类）
  - ② **A1 · 架构文档抽样对照**（子代理）：6 份核心架构文档（renderer-runtime/flux-core/styling-system/renderer-markers/form-validation/renderer-env）逐份四问评估，代码引用逐个对照 live（file:line 级）
  - ②b **A2 · quick-reference + flux-guide 抽样对照**（子代理）：quick-reference.md + flux-guide ≥3 篇，同口径
  - **四问操作化定义（本 plan 权威——`doc-evaluation.md` 实际内容为 17 条技术文章批评规则、不含四问，指针错位已录为审计输入之一）**：①准确——文档断言与 live code 是否一致（file:line 抽验）；②强契约——文档承诺是否为可执行/可测试的强约束（vs 愿望性描述）；③决策质量——关键决策是否记录了 why 与取舍；④时效——是否反映当前 HEAD（含本 R2 批次引入的变更）。每问三值：pass / drift（附 file:line 证据）/ N/A
  - ③ **漂移裁决**（子代理+执行者）：按 `source-of-truth-and-precedence.md` 裁决每处漂移的方向（文档过时 vs 代码偏离契约）
- 登记 arm2-index（MA8.1 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修正文档（修正归 MR/文档批——本批纯审计）；MA7.3 已立案的 dashboard/gantt §10 文档缺口不重开（引用）；flux-guide 全量对照不覆盖（抽样 ≥3 篇）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA8.1 报告 + arm2-index 登记回填；`_tmp/arm2-ma81/` 实跑；daily log 追加；roadmap MA8.1 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 文档修正；MA7.3 / MA8.2+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                | 行为                                           | 可重试 |
| --------------- | ------------------- | ------------------------------------------- | ------ |
| tool-failure    | 扫描器失效          | 归因后重跑或手动等价抽样留痕                | 是     |
| audit-p0-found  | Rule 2 六类之一     | 即时通道                                    | 否     |
| subagent-quota  | 限流/模型失败       | fresh 重启一次；再败执行者亲跑              | 是     |
| round-overflow  | 单轮超上限          | **字母批拆分（MA8.1-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：anchors 扫描 + 抽样对照（预拆 A1/A2——closure review M2 裁定默认拆分）

Status: planned
Targets: `_tmp/arm2-ma81/round-{A1,A2}.md`、`_tmp/arm2-ma81/tool-anchors.log`

- Item Types: `Proof | Decision`

- [ ] **Round A1 · 架构文档抽样对照**（子代理）：6 份核心架构文档四问评估（四问操作化定义见 Goals ②）
- [ ] **Round A2 · quick-reference + flux-guide 抽样对照**（子代理）：quick-reference + ≥3 篇 flux-guide 同口径
- [ ] **执行者 · 扫描器实跑**：`check:active-doc-code-anchors`（路径存在性检查器——**无 M0 在册基线可比，记录实测值作为本轮基线**）；anchors 命中与 A1/A2 漂移发现交叉
- [ ] **执行者对账**：漂移裁决复核（按 source-of-truth-and-precedence.md）；P1 live 复核

Exit Criteria:

- [ ] anchors 复核 + 抽样评估表（每文档四问 + 代码引用对照）落字
- [ ] 漂移裁决逐处落字；P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: planned

- Item Types: `Proof | Decision`

- [ ] ≥2 轮追问，末轮显式停止
- [ ] MR3 / 文档批 交叉线索分栏

Exit Criteria:

- [ ] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned

- Item Types: `Proof | Decision`

- [ ] 报告落盘（同构：扫描器 + 抽样评估 + 漂移裁决 + P1 记录 + deferred + open 轮 + 收口补记）
- [ ] arm2-index：MA8.1 行 + P1 行〔触发时〕+ Last Updated 滚动，grep 复核
- [ ] daily log 追加（计数 = 报告实数）
- [ ] BUILD_VERIFY `pnpm test` 登记（exit 0）+ typecheck/build/lint（同一运行登记复用于 Closure Gates）
- [ ] 清理 `_tmp/arm2-ma81/`（closure audit 通过后、提交前执行）

Exit Criteria:

- [ ] 报告与 arm2-index 逐条一致（grep 双侧命中）
- [ ] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: planned

- Item Types: `Proof`

- [ ] draft review 通过后：roadmap MA8.1 `todo`→`planned`，plan→`active`
- [ ] closure audit（fresh subagent）approved 后：roadmap MA8.1 `planned`→`done`（**行号 surgery + sed 回读核验**），plan→`completed`
- [ ] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [ ] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）
- [ ] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_16ceefe0`（roadmap :85 / 矩阵 :139 / arm2-index :95、HEAD `3a2671457`、扫描器语义核实（路径存在性检查器、~0 命中）、语料实测 ~405KB、doc-evaluation.md 全文核实不含四问（git -S 空）、6+1+20 抽样目标实存、MA7.3 交叉引用、guide 合规）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 四问操作化定义写入本 plan（权威）+ doc-evaluation.md 指针错位录为审计输入；M2 Phase 1 预拆 A1/A2（默认拆分非应急）；m1 扫描器基线措辞（无在册基线、实测值为首轮基线）；m2 Last Reviewed 落日期；m3 MA7.3 行 residual 发现——**执行者核实为并发线回写覆盖（HEAD 实录 planned）**，已修复随本批提交——均已落字

## Closure Gates

- [ ] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [ ] arm2-index 登记与报告逐条一致
- [ ] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [ ] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [ ] 探针与临时配置已全部删除（`_tmp/arm2-ma81/` 清理）
- [ ] roadmap Work Item Status MA8.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [ ] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 登记

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
