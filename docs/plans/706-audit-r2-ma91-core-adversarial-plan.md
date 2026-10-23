# 706 审计修复 R2·MA9.1：开放式对抗审计—核心链路（compile→scope→render→action→update）+ 并发/StrictMode/取消/错误传播

> Plan Status: draft
> Last Reviewed: —
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA9.1；`docs/audits/arm2-scope-and-dimension-matrix.md` MA9.1 行（报告名注册 `*arm2-MA9.1-core-adversarial.md`；共享方法 `docs/skills/open-ended-adversarial-review-prompt.md`——live 信号驱动探针设计〔git log 热点、audit:knip 死代码、console 基线、skip/watch-only 清单、MA1–MA8 报告 watch-only 项〕、明确允许清单外发现、产出探针清单+判别证据、有价值失败模式记 MG 候选）；owner doc `docs/architecture/flux-core.md`
> Related: matrix MA9 节、`docs/audits/arm2-index.md`、MA5.1 P0-MA5.1-003（React Compiler 判别——同域先例）、MA6.x 全部 watch-only 台账（对抗探针输入）、MA7.1 热点取证
> 方法先例沿用：`_tmp/arm2-ma91/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对核心链路（compile→scope→render→action→update 主干）+ 并发/StrictMode/取消/错误传播交叉做开放式对抗审计：live 信号驱动探针设计（git log 热点 + knip 死代码 + console 基线 + watch-only 清单 + MA1–MA8 watch 项），明确允许清单外发现；产出探针清单 + 判别证据；有价值失败模式记 MG 候选；零入库变更。

## Current Baseline（2026-10-23 live，HEAD `855ae5151`）

- **live 信号面**：git log 热点（高频改动文件=高风险面）；`audit:knip` 死代码报告；console 基线；skip/watch-only e2e 清单（gantt/kanban perf ×3 + scada-editor ×3 等在案）；MA1–MA8 报告全部 watch-only 项（arm2-index 汇总）。
- **同域先例**：P0-MA5.1-003（React Compiler 误提升——useSyncExternalStoreWithSelector fork 判别法）；MA7.1 P1-MA7.1-001（虚拟化被布局击穿）。
- **执行状态**：roadmap MA9.1 `todo`；arm2-index MA9.1 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA9.1-core-adversarial.md`（矩阵注册名 core-adversarial）：探针清单（每探针：信号源→假设→判别证据）+ finding P0–P3（P1 ID `P1-MA9.1-<nnn>`）+ 有价值失败模式 MG 候选。
- 覆盖面（两轮对抗 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · 信号收集 + 探针设计**（子代理）：git log 热点 TOP、knip 死代码、watch-only/MA1–MA8 watch 项清单 → 设计 ≥10 对抗探针（每探针：信号源→假设→判别方法），覆盖 compile→scope→render→action→update 主干 + 并发/StrictMode/取消/错误传播交叉
  - ② **Round B · 探针执行**（子代理）：逐探针执行 + 判别证据（红/绿/不可判别均记录）；清单外发现明确允许
  - ③ **执行者对账**：判别证据复核；P1 live 复核；MG 候选归并
- 登记 arm2-index（MA9.1 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复（P0 即时通道除外）；非核心链路面（renderer 族 MA9.2/designer-office MA9.3/e2e MA9.4 不覆盖）；性能阈值裁决归 MA7.1（已收官，引用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA9.1 报告 + arm2-index 登记回填；`_tmp/arm2-ma91/` 实跑；daily log 追加；roadmap MA9.1 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA9.2+ / MA8 / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                | 行为                                           | 可重试 |
| --------------- | ------------------- | ------------------------------------------- | ------ |
| probe-undecided | 探针不可判别        | 记录不可判别原因 + 升级信号设计一轮         | 是     |
| audit-p0-found  | Rule 2 六类之一     | 即时通道                                    | 否     |
| subagent-quota  | 限流/模型失败       | fresh 重启一次；再败执行者亲跑              | 是     |
| round-overflow  | 单轮超上限          | **字母批拆分（MA9.1-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更；对抗探针即取证本体）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：信号收集 + 探针设计 → 执行

Status: planned
Targets: `_tmp/arm2-ma91/round-{A,B}.md`、`_tmp/arm2-ma91/probes/`

- Item Types: `Proof | Decision`

- [ ] **Round A · 信号收集 + 探针设计**（子代理）：git log 热点 TOP + knip + watch 清单 + MA1–MA8 watch 项 → ≥10 对抗探针清单（信号源→假设→判别方法）
- [ ] **Round B · 探针执行**（子代理）：逐探针执行 + 判别证据（红/绿/不可判别）；清单外发现允许
- [ ] **执行者对账**：判别证据复核；P1 live 复核；MG 候选归并

Exit Criteria:

- [ ] ≥10 探针清单 + 逐探针判别证据落字
- [ ] 分类/分级/归族 + MG 候选 + P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: planned

- Item Types: `Proof | Decision`

- [ ] ≥2 轮追问，末轮显式停止
- [ ] MR3 / MG 交叉线索分栏

Exit Criteria:

- [ ] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned

- Item Types: `Proof | Decision`

- [ ] 报告落盘（同构：探针清单 + 判别证据 + P1 记录 + MG 候选 + deferred + open 轮 + 收口补记）
- [ ] arm2-index：MA9.1 行 + P1 行〔触发时〕+ Last Updated 滚动，grep 复核
- [ ] daily log 追加（计数 = 报告实数）
- [ ] BUILD_VERIFY `pnpm test` 登记（exit 0）+ typecheck/build/lint（同一运行登记复用于 Closure Gates）
- [ ] 清理 `_tmp/arm2-ma91/`（closure audit 通过后、提交前执行）

Exit Criteria:

- [ ] 报告与 arm2-index 逐条一致（grep 双侧命中）
- [ ] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: planned

- Item Types: `Proof`

- [ ] draft review 通过后：roadmap MA9.1 `todo`→`planned`，plan→`active`
- [ ] closure audit（fresh subagent）approved 后：roadmap MA9.1 `planned`→`done`（**行号 surgery + sed 回读核验**），plan→`completed`
- [ ] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [ ] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）
- [ ] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: （待 fresh-session 审查子代理）
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

- [ ] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [ ] arm2-index 登记与报告逐条一致
- [ ] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [ ] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [ ] 探针与临时配置已全部删除（`_tmp/arm2-ma91/` 清理）
- [ ] roadmap Work Item Status MA9.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
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
