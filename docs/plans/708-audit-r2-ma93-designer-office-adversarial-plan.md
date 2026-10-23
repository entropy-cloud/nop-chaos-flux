# 708 审计修复 R2·MA9.3：开放式对抗审计—designer+office 族（长会话状态、undo/redo、序列化往返、大文档）

> Plan Status: active
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA9.3；`docs/audits/arm2-scope-and-dimension-matrix.md` MA9.3 行（报告名注册 `*arm2-MA9.3-designer-office-adversarial.md`；探针面 = designer+office 族〔长会话状态、undo/redo、序列化往返、大文档〕）；探针设计与信号源定义 = roadmap/matrix MA9 节〔MA9.1 draft review R1 M1 勘正纪律：skill 文件不含探针机制〕；owner doc `docs/architecture/flow-designer/design.md`（关联 report-designer/design.md；roadmap owner 列 flux-design-principles.md 为 MA9 族级默认，topical owner 沿 707 先例）
> Related: matrix MA9 节、`docs/audits/arm2-index.md`、MA5.1/MA5.3/MA9.1 先例（P0-MA5.1-001..004 全部修复在案、MA5.3 office 走查、MA9.1 两轮制先例）、MA9.1 watch 5 + P2-MA9.1-001..003（MR3.0 展开时引用线索 / MG 候选）
> 中间件：`_tmp/arm2-ma93/`（本批创建，收口清理；沿 ma91/ma92 工作流先例）；**环境假设**：长会话/大文档探针为 browser-bound（dev server 4175 + playwright；MA9.1 F-14/15 browser 后置先例——环境不可用探针走 probe-undecided 路径，配额影响记录入报告）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

designer+office 族对抗审计：长会话状态（跨操作状态残留/内存增长）、undo/redo 边界（深栈/交叉操作/边界连续性）、序列化往返（import/export 保真）、大文档（性能退化 + 状态一致性）；live 信号驱动探针设计 + 执行判别；产出探针清单 + 判别证据；MG 候选；零入库变更。

## Current Baseline（2026-10-23 live，HEAD `e89182387`）

- **走查面**：flow-designer、taskflow-designer、page-designer、report-designer（+host）、spreadsheet、word-editor、scada-editor（chrome——画布/预览面已在 MA6.3 走查〔MA6.4 仅共管复算 MA6.1 P2-005 @800 298px 面〕，chrome 本批镜头）、debugger-lab（8 页域——MA5.1/5.3/6.4 已交互/视觉走查，本批对抗镜头）。
- **live 信号面**：MA5.1 P0/P1 线索（undo 焦点链已修/016 scrollTop 未修在案）、MA5.3 office 走查线索、MA9.1 watch（gantt 深滚动退化等）、git log 热点。
- **执行状态**：roadmap MA9.3 `todo`；arm2-index MA9.3 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA9.3-designer-office-adversarial.md`（矩阵注册名 designer-office-adversarial）：探针清单（≥10）+ 判别证据 + finding P0–P3（P1 ID `P1-MA9.3-<nnn>`）+ MG 候选。
- 覆盖面（两轮对抗 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 四探测面配额（长会话状态 ≥2 / undo/redo ≥3 / 序列化往返 ≥3 / 大文档 ≥2）
  - ② **Round B · 探针执行**（子代理）：逐探针判别；清单外允许
  - ③ **执行者对账**：判别复核；P1 live 复核；MG 候选归并
- 登记 arm2-index（MA9.3 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复；MA5.1/5.3 已立案交互缺陷不重开（引用——016 scrollTop 等在案项引用复核）；MA9.1/9.2 面不重开。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA9.3 报告 + arm2-index 登记回填；`_tmp/arm2-ma93/` 实跑；daily log 追加；roadmap MA9.3 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA9.1/9.2/9.4 / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                | 行为                                           | 可重试 |
| --------------- | ------------------- | ------------------------------------------- | ------ |
| probe-undecided | 探针不可判别        | 记录原因 + MA9.4 转入候选                   | 是     |
| audit-p0-found  | Rule 2 六类之一     | 即时通道                                    | 否     |
| subagent-quota  | 限流/模型失败       | fresh 重启一次；再败执行者亲跑              | 是     |
| round-overflow  | 单轮超上限          | **字母批拆分（MA9.3-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：信号收集 + 探针设计 → 执行

Status: planned
Targets: `_tmp/arm2-ma93/round-{A,B}.md`、`_tmp/arm2-ma93/probes/`

- Item Types: `Proof | Decision`

- [ ] **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 四探测面配额 → ≥10 探针清单
- [ ] **Round B · 探针执行**（子代理）：逐探针判别；清单外允许
- [ ] **执行者对账**：判别复核；P1 live 复核；MG 候选归并

Exit Criteria:

- [ ] ≥10 探针清单 + 判别证据落字
- [ ] 分类/分级/归族 + MG 候选 + P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: planned
Targets: `_tmp/arm2-ma93/`（open 轮记录）、报告 deferred 节

- Item Types: `Proof | Decision`

- [ ] ≥2 轮追问，末轮显式停止
- [ ] MR3 / MG 交叉线索分栏

Exit Criteria:

- [ ] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned
Targets: 报告文件、`docs/audits/arm2-index.md`、daily log

- Item Types: `Proof | Decision`

- [ ] 报告落盘（同构：探针清单 + 判别证据 + P1 记录 + MG 候选 + deferred + open 轮 + 收口补记）
- [ ] arm2-index：MA9.3 行 + P1 行〔触发时〕+ Last Updated 滚动，grep 复核
- [ ] daily log 追加（计数 = 报告实数）
- [ ] BUILD_VERIFY `pnpm test` 登记（exit 0）+ typecheck/build/lint（同一运行登记复用于 Closure Gates）
- [ ] 清理 `_tmp/arm2-ma93/`（closure audit 通过后、提交前执行）

Exit Criteria:

- [ ] 报告与 arm2-index 逐条一致（grep 双侧命中）
- [ ] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: planned
Targets: roadmap MA9.3 行、plan 文件

- Item Types: `Proof`

- [ ] draft review 通过后：**roadmap MA9.3 `todo`→`planned` 翻转入激活提交**（翻转纪律），plan→`active`
- [ ] closure audit（fresh subagent）approved 后：roadmap MA9.3 `planned`→`done`（**行号 surgery + sed 回读核验**），plan→`completed`
- [ ] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [ ] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）
- [ ] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_1199f01e`（roadmap :90 / 矩阵 :151 / arm2-index :100、HEAD `e89182387`、方法归因正确（draft review R1 M1 勘正分列）、翻转纪律在案、交叉引用全 live（P0 001-004 closed/016 open :174）、走查面 8 域核实、guide 合规）
- Verdict: R1 `revised`（0B/1M/5m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 scada-editor 画布面归属勘正（MA6.3 非 MA6.4——MA6.4 零 scada chrome finding 佐证 chrome 未走查，本批镜头加强）；m1 Phases 2-4 补 Targets；m2 Last Reviewed 落日期；m3 browser 环境假设 + probe-undecided 配额记录义务；m4 P2 引用措辞（MR3.0 展开时引用）；m5 owner 列注记——均已落字

## Closure Gates

- [ ] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [ ] arm2-index 登记与报告逐条一致
- [ ] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [ ] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [ ] 探针与临时配置已全部删除（`_tmp/arm2-ma93/` 清理）
- [ ] roadmap Work Item Status MA9.3 行已流转 `done`（closure audit 通过后，sed 回读核验）
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
