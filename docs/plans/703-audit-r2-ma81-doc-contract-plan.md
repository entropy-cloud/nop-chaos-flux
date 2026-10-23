# 703 审计修复 R2·MA8.1：文档契约审计—architecture/quick-reference/flux-guide 抽样对照 live code

> Plan Status: completed
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

| 可测场景编号   | 触发            | 行为                                                 | 可重试 |
| -------------- | --------------- | ---------------------------------------------------- | ------ |
| tool-failure   | 扫描器失效      | 归因后重跑或手动等价抽样留痕                         | 是     |
| audit-p0-found | Rule 2 六类之一 | 即时通道                                             | 否     |
| subagent-quota | 限流/模型失败   | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow | 单轮超上限      | **字母批拆分（MA8.1-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：anchors 扫描 + 抽样对照（预拆 A1/A2——closure review M2 裁定默认拆分）

Status: completed
Targets: `_tmp/arm2-ma81/round-{A1,A2}.md`、`_tmp/arm2-ma81/tool-anchors.log`

- Item Types: `Proof | Decision`

- [x] **Round A1 · 架构文档抽样对照**（子代理）：6 份全读 5051 行/82 断言（77 成立）；无 P1；6 drifts（P2 ×2 + P3 ×4）；四问全 pass 除准确性局部 drift
- [x] **Round A2 · quick-reference + flux-guide 抽样对照**（子代理）：quick-reference 全读 1071 行/21 断言组 + flux-guide 3 篇/31 组；**P1 ×3** + P2 族 + P3 ×4；16 drifts 全 doc-stale
- [x] **执行者 · 扫描器实跑**：365 文档验证、exit 0、零命中（首轮基线在案）；双盲区备案
- [x] **执行者对账**：P1 三案实址复核（A2 引注路径偏移修正后全部立案）；漂移裁决 16/16 doc-stale 复核

Exit Criteria:

- [x] anchors 复核 + 抽样评估表（每文档四问 + 代码引用对照）落字
- [x] 漂移裁决逐处落字（16/16 doc-stale）；P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 P1 三案定址——A2 引注路径偏移修正；R2 漂移方向裁决 16/16 doc-stale + W6 跨节失同步模式立案），末轮显式停止
- [x] MR3 / 文档批 交叉线索分栏（文档批 +全部 16 处修正 + 16-monitor.md 处置首位；code-batch +W3 代码注释缺陷；MA7.3 文档同步批并入；MG 零新增）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-1011-arm2-MA8.1-doc-contract.md`：P1 ×3 + P2 ×3 + P3 汇总 8 + 四问总评表 + watch 6 + open 两轮 + 收口补记）
- [x] arm2-index：MA8.1 行 + P1-MA8.1-001/002/003 行 + Last Updated 滚动（累计 67；P2 ×4 + P3 ×11 为 closure R1 M2 补录后定稿数），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma81/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA8.1-001/002/003 双侧命中；P2 ×4/P3 ×11 补录后定稿）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA8.1 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_cb46fc28`）R1 `issues`（0B/2M/3m——M1 roadmap MA8.1 激活翻转同遭并发线回写覆盖（HEAD 实录 todo，与 MA7.3 erratum 同根）→ 修复 planned 后随本 commit done；M2 A2 四条 drifts 静默丢失 → 补录 P2-007 + P3 ×3（P2 ×4/P3 ×11 定稿）+ 计数同步；3m 落地：watch 6 项全列、renderer-env.ts 路径勘误、 staged-index minefield 以 temp-index 纪律处置）approved 后：roadmap MA8.1 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_16ceefe0`（roadmap :85 / 矩阵 :139 / arm2-index :95、HEAD `3a2671457`、扫描器语义核实（路径存在性检查器、~0 命中）、语料实测 ~405KB、doc-evaluation.md 全文核实不含四问（git -S 空）、6+1+20 抽样目标实存、MA7.3 交叉引用、guide 合规）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 四问操作化定义写入本 plan（权威）+ doc-evaluation.md 指针错位录为审计输入；M2 Phase 1 预拆 A1/A2（默认拆分非应急）；m1 扫描器基线措辞（无在册基线、实测值为首轮基线）；m2 Last Reviewed 落日期；m3 MA7.3 行 residual 发现——**执行者核实为并发线回写覆盖（HEAD 实录 planned）**，已修复随本批提交——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma81/` 清理）
- [x] roadmap Work Item Status MA8.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 文档契约审计收官（P1 ×3 新案〔quick-reference Data Source 三重错误 / monitor 幻影文档族 / refreshDataSource 签名过时——全部 quick-reference/flux-guide 面〕+ P2 ×4 + P3 ×11（closure R1 M2 补录定稿）+ **漂移裁决 16/16 doc-stale** + anchors 首跑 365 文档 0 命中 + 架构文档 6 份强契约/决策质量全 pass）；字母批裁定：预拆 A1/A2（review M2）；MA7.3 roadmap erratum 修复随本批（572519d1a + 本 commit 二段流转）；零入库变更核验通过（含文档只审不改）。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_cb46fc28`（R1）
- Evidence: R1 **`issues`**（0B/2M/3m）→ 回修 → 全部落地。审计员独立复核：**P1 三案源码全证**（quick-reference.md:799-817 三重错误 vs schema.ts:270 + 01-quickstart 正确反证；renderer-hooks.ts monitor 零命中 + applyMonitor 零命中 + 5ba737830 移除 commit + flux-monitor.md intent-only；renderer-core.ts:347 outcome 签名）；doc-stale 抽检两处属实（renderer-api.ts:94-114 扁平 14 字段 + renderer-runtime.md :522 vs :621 同文档矛盾）；语料行数逐文档核实（5051 = 1611+547+886+354+1306+347）；gate 日志 exit 0 全核；zero-code-change 双跑核实（含 docs 域）。M1/M2 处置如上。

Follow-up:

- no remaining plan-owned work；P1-MA8.1-001/002/003 + P2 ×4 修复行在文档批（16-monitor.md 处置首位；quick-reference Data Source 块/Runtime 方法块重写）；code-batch +W3 代码注释缺陷；文档批治理项 +W5 跨节失同步模式；MA8.2（i18n+deprecation+todo）为下一工作项。

Follow-up:
