# 709 审计修复 R2·MA9.4：开放式对抗审计—全仓端到端（真实旅程/异常输入/并发/内存长会话）

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA9.4；`docs/audits/arm2-scope-and-dimension-matrix.md` MA9.4 行（报告名注册 `*arm2-MA9.4-e2e-adversarial.md`；探测面 = playground 真实页面异常 schema 输入、边界值、组合滥用、内存泄漏长会话）；探针设计与信号源定义 = roadmap/matrix MA9 节〔MA9.1 draft review R1 M1 勘正纪律：skill 文件不含探针机制〕；carry-in = MA9.1 F-14/F-15/F-16 + MA9.2 PR-A05/PR-C03 + MA9.3 P-08 UI 面/P-10 保存往返/P-12 index-0 子步（三批不可判别转入口）；owner doc `docs/architecture/flux-design-principles.md`（MA9 族级默认）
> Related: matrix MA9 节、`docs/audits/arm2-index.md`、MA9.1/9.2/9.3 先例（两轮制 + 执行者对账 + 勘正记录）、MA5.x 走查面（真实旅程路线图）、P1-MA9.3-001/002 等在案 P1（MR3.0 展开时引用线索）
> 中间件：`_tmp/arm2-ma94/`（本批创建，收口清理；沿 ma91/92/93 工作流先例）；**环境假设**：browser 探针 = dev server 4175 + playwright（MA9.3 已证环境可用）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

全仓端到端对抗审计：以 playground 装配的真实页面为旅程载体，探测异常 schema 输入容错、边界值、多特性组合滥用、长会话内存泄漏；承接 MA9.1/9.2/9.3 三批共 8 项不可判别转入口的再判别；live 信号驱动探针设计 + 执行判别；产出探针清单 + 判别证据；MG 候选；零入库变更。MA9 收官项。

## Current Baseline（2026-10-23 live，HEAD `324e585d3`）

- **走查面**：playground 真实路由页库存 **263 页**（`docs/audits/visual-quality-r2/inventory/pages.json` 实测；MA6.1 已建 40 页代表抽选机制可复用；本批按旅程聚类抽选，不逐页遍历）。
- **carry-in 不可判别 8 项**：MA9.1 F-14/F-15（browser 后置，A 轮自标）、F-16（ai-chat mock 成本超限）；MA9.2 PR-A05（需自定义 actions fixture）、PR-C03（焦点场景超预算）；MA9.3 P-08 UI 面（sid 文档形状不符）、P-10 保存往返子步（被保存焦点丢失阻塞）、P-12 index-0 插入子步（palette 选择器未命中）。
- **在案对抗结论**：MA9.1 核心链路无 P0/P1（P2 ×3）；MA9.2 渲染器族 P1 ×1（capability 漂移族）；MA9.3 designer+office P1 ×2（taskflow 导入清空 / word 深栈 undo）——本批不重开已立案面，异常 schema 探针须避开 taskflow dsl.ts 已判别的 kind 缺口（引用不重开）。
- **执行状态**：roadmap MA9.4 `todo`；arm2-index MA9.4 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA9.4-e2e-adversarial.md`（矩阵注册名 e2e-adversarial）：探针清单（≥10）+ 判别证据 + finding P0–P3（P1 ID `P1-MA9.4-<nnn>`）+ MG 候选。
- 覆盖面（两轮对抗 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 四探测面配额（异常 schema 输入 ≥3 / 边界值 ≥2 / 组合滥用 ≥3 / 内存长会话 ≥2）+ carry-in 8 项再判别方案
  - ② **Round B · 探针执行**（子代理）：逐探针判别；清单外允许
  - ③ **执行者对账**：判别复核；P1 live 复核；MG 候选归并
- 登记 arm2-index（MA9.4 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复；MA9.1/9.2/9.3 已立案面不重开（引用——异常 schema 探针引用 P1-MA9.3-001 判别器作对照）；**并发交叉面**沿 MA9.1 D-09..12 已判别面引用不重开，新并发形状经组合滥用/清单外通道覆盖；MR / MV / MG。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA9.4 报告 + arm2-index 登记回填；`_tmp/arm2-ma94/` 实跑；daily log 追加；roadmap MA9.4 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA9.1/9.2/9.3 重开 / MR / MV / MG；并发线未提交变更（docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan 清理行〔`docs/plans/2026-10-22-0500-arm2-fix-P0-MA5.1-002-flow-delete-undo.md` 重复 checklist 行移除〕——工作树已知遗留，不入 stage）。

## Failure Paths

| 可测场景编号    | 触发                   | 行为                                                                                             | 可重试 |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| probe-undecided | 探针不可判别           | 记录原因 + MG 候选或 deferred（MA9 收官后无后继批——改录 watch 台账并给 MG 沉淀建议）             | 是     |
| audit-p0-found  | Rule 2 六类之一        | 即时通道                                                                                         | 否     |
| subagent-quota  | 限流/模型失败          | fresh 重启一次；再败执行者亲跑                                                                   | 是     |
| round-overflow  | 单轮超上限             | **字母批拆分（MA9.4-a/-b，Cross-Cutting 5 预授权）**                                             | 否     |
| env-down        | dev server 4175 不可用 | 执行者重启 dev server（`pnpm dev` 后台）再试；仍败则 browser 探针转 probe-undecided 并记配额影响 | 是     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：信号收集 + 探针设计 → 执行

Status: planned
Targets: `_tmp/arm2-ma94/round-{A,B}.md`、`_tmp/arm2-ma94/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 四探测面配额 + carry-in 8 项再判别方案 → ≥10 探针清单（21 执行体，`_tmp/arm2-ma94/round-A.md` 19:59 前会话落盘）
- [x] **Round B · 探针执行**（子代理）：逐探针判别；清单外允许（**两段续跑**：前会话 batch1–5 20:01–20:34 quota 中断 → 续任执行者接手，S-4 v1 判无效重设计 v3、c4 fu×4 补跑、B-3/A05/C03/P08/P10v2/P12v2/M-2/M-3/M-1-abort 重跑；`_tmp/arm2-ma94/round-B.md`）
- [x] **执行者对账**：判别复核；P1 live 复核（O1 fresh：静默清空复现 + undo 恢复通道）；MG 候选归并（5）

Exit Criteria:

- [x] ≥10 探针清单 + 判别证据落字（21 执行体 28 次判别执行，判别证据日志 24 份〔另 recon/v1 作废 4 份留存〕）
- [x] 分类/分级/归族 + MG 候选 + P1 复核实录 + carry-in 8 项逐项处置落字（报告 §0/§1/§4/§6）

### Phase 2 - open：live 信号驱动开放式追问

Status: planned
Targets: `_tmp/arm2-ma94/`（open 轮记录）、报告 deferred 节

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问，末轮显式停止（O1 browser fresh 复核 + O2 源码锚定；报告 §8 停止声明）
- [x] MR3 / MG 交叉线索分栏（报告 §1 fix direction / §3 MG 候选 5）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由（P3 池 5 项 + undecided 2 半项 watch）

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned
Targets: 报告文件、`docs/audits/arm2-index.md`、daily log

- Item Types: `Proof | Decision`

- [x] 报告落盘（同构：探针清单 + 判别证据 + P1 记录 + MG 候选 + deferred + open 轮 + 收口补记）——`docs/audits/2026-10-24-0039-arm2-MA9.4-e2e-adversarial.md`
- [x] arm2-index：MA9.4 行 + P1 行〔触发时〕+ Last Updated 滚动，grep 复核
- [x] daily log 追加（计数 = 报告实数）——`docs/logs/2026/10-24.md`
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0）+ typecheck/build/lint（同一运行登记复用于 Closure Gates；roadmap Cross-Cutting 9 BUILD_VERIFY 预声明机制，非全量门禁入 Phase）——2026-10-24 00:5x 实跑：test 82/82 tasks exit 0、typecheck 44/44、build 44/44、lint 44/44（全缓存命中，零代码变更基线未漂移）
- [ ] 清理 `_tmp/arm2-ma94/`（closure audit 通过后、提交前执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep 双侧命中——P1-MA9.4-001 双侧 2×2、MA9.4 行指向实存文件、73 open 实测一致）
- [x] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap MA9.4 行、plan 文件

- Item Types: `Proof`

- [x] draft review 通过后：**roadmap MA9.4 `todo`→`planned` 翻转入激活提交**（翻转纪律），plan→`active`（478c056ea，前会话）
- [x] closure audit（fresh subagent）approved 后：roadmap MA9.4 `planned`→`done`（**行号 surgery + sed 回读核验**），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）
- [ ] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_f48b24b1`（roadmap :91 MA9.4 `todo` / matrix :152 注册名 / arm2-index :101 `—` / HEAD `324e585d3` 实测一致；carry-in 8 项逐条对照 MA9.1/9.2/9.3 来源报告实存；263 页库存、4175 端口、40 页抽选机制 live 核对；并发线遗留清单与 git status 逐条吻合）
- Verdict: R1 `pass-with-minors`（0B/0M/4m）→ 回修共识
- Rounds: 1
- Findings addressed: m1 走查面库存 100+ → 263 页（inventory pages.json 实测数）；m2 并发面处置口径补入 Non-Goals（MA9.1 D-09..12 引用不重开）；m3 BUILD_VERIFY 补注 Cross-Cutting 9 预声明机制；m4 P0-MA5.1-002 全 ID 展开——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账——F15-transfer/P12 半项 + C03 焦点环观察入报告 §7）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma94/` 清理，closure audit 通过后、提交前执行）
- [x] roadmap Work Item Status MA9.4 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 登记

## Deferred But Adjudicated

（无——执行中改判当场落本节。S-4 v1/P10 v1 无效探针属伪影备案入报告 §5，非改判。）

## Non-Blocking Follow-ups

- MR3.0 展开时 P1-MA9.4-001 与 P1-MA9.3-001 同批修复（共享判别测试；报告 §1 fix direction）。
- MG 候选 5 项（transfer demo 页 / 诊断-执行缺口失败模式 / Ctrl+S 设计缺口 / 真实拖拽 e2e 基建 / mock 可调延迟）随 MG 里程碑裁决。

## Closure

Status Note: MA9.4 收官——carry-in 8 项全部处置、MA9 四批（9.1–9.4）全部完成；零入库变更；本 plan 执行跨越一次会话中断（前会话 Round A + batch1–5，续任执行者接手对账/补跑/复核，报告 §6）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_55a46f0e`（2026-10-24 01:1x）
- Evidence: R1 **`approved`**（9 项核验全 PASS + 2 minor 不阻塞）——plan 勾选面 vs 产物零错位、计数自洽（21 执行体/28 判别/红 4/绿 21/undecided 2 互咬合）、arm2-index 73 open 实测吻合、session.ts:56-68 源码锚点亲读成立、log-s1-s2/log-open1 抽查逐字吻合、零代码变更（apps/packages/tests 零条目）、中断续跑叙事与工件时间戳互证（20:34:33 中断点 / c4 spec 20:24 创建 vs 日志 00:15 补跑）、BUILD_VERIFY 登记属实、无「未做声称已做」；minor m1（C03 观察入 §7 watch 台账）+ m2（日志计数措辞 24=判别证据、另 4 份 recon/v1 作废）均已随收口落字。

Follow-up:
