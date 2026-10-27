# 784 PH-20 文档拆分·必拆集（>50KB 活跃文档，分批队列）

> Plan Status: draft
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-20（F 组；"31 个 >50KB 按规则拆分"）
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md` Rule 23（拆分按职责而非长度本身）；`check:active-doc-code-anchors`（拆分后必须保持绿）；`docs/testing/known-good-baselines.md` 等基线文档的指针完整性

## Purpose

把 >50KB 的活跃文档按职责拆分为可导航的文档组，每拆一批保持三类门禁绿：`check:active-doc-code-anchors`、`check:owner-doc-semantics`、`check:baseline-line-keys`（后两者覆盖本批部分文件）。

## Current Baseline

2026-10-27 实测（HEAD `9beea547c`）：**34 份** >50KB（roadmap 10-19 记 31，其后 PH-9/16/18 等 plan 又新增 3 份超限文档——拆分过程中新超限文档一并入队）。最大 201KB（component-audit-roadmap）。明细队列见 §Batch Queue。

## Goals

- 按职责把每份 >50KB 文档拆成主文档（≤40KB 保留导航/现状）+ 若干专题子文档（各自 <40KB）。
- 每批拆分后 `check:active-doc-code-anchors` / `check:owner-doc-semantics` / `check:baseline-line-keys` 全绿。
- 拆分产生的子文档在 `docs/index.md` 或父文档 Related 节可发现。

## Non-Goals

- 不删内容、不改语义（纯结构重组 + 必要的指针行）。
- 不做 PH-21 的 40-50KB 目标集。

## Scope

### In Scope

- §Batch Queue 所列 34 份（执行中新增超限文档追加），逐批拆分

### Out Of Scope

- PH-21（40-50KB 目标集）；内容改写

## Failure Paths

| 场景       | 触发                 | 行为              | 可重试 | 用户可见        |
| ---------- | -------------------- | ----------------- | ------ | --------------- |
| anchor-red | 拆分破坏反引号路径锚 | 门禁红 → 修复指针 | 是     | `pnpm check` 红 |

## Test Strategy

本档选择：`不适用：纯文档重组`（每批以三个文档门禁 + `pnpm check` 为验收）。

## Execution Plan

### Batch Queue（每批 = 一个 execution slice，拆完即验证即提交）

Status: planned

- [ ] Batch 1：component-audit-roadmap.md（201KB → 历史封存路线图：加"已收官"头注 + 收纳至 archive 或原样加状态头——先裁定该文件是否为历史收官件，历史件按 roadmap 惯例可豁免，记录裁定）
- [ ] Batch 2：roadmap-industrial-hmi.md（172KB）+ industrial-hmi-component-audit-roadmap.md（101KB）——industrial-hmi 已收官，同 Batch 1 口径裁定
- [ ] Batch 3：deep-audit-prompts.md（128KB，skills，活跃工具）→ 按审计维度拆分为多份 prompt 文件
- [ ] Batch 4：renderer-runtime.md（122KB）→ 已有 27KB SSR 节 + 巨型 §Current Runtime Ownership 等，按节拆分
- [ ] Batch 5-8：其余 30 份按目录分组分批（backlog 收官路线图优先裁定"历史封存 vs 活跃拆分"）

**裁定规则**（每批先做）：收官/历史路线图（内容不再演化）→ 加状态头注 + 移 `docs/archive/`（或保留原位加显著状态头），**不算拆分**；活跃文档 → 真拆分。每批 Phase Exit = 该批文档全部处置 + 三门禁绿。

Exit Criteria:

- [ ] 每批完成后三门禁 + `pnpm check` 绿。

### Closure

- [ ] 全队列处置完毕；>50KB 活跃文档清零（或仅剩有状态头注的历史封存件并逐个登记理由）。

Exit Criteria:

- [ ] 复测 `find docs/{architecture,components,references,backlog,skills} -name '*.md' -size +50k` 仅剩登记的封存件。

## Draft Review Record

- Reviewer / Agent: <<fresh session>>
- Verdict: <<pending>>
- Rounds: <<>>
- Findings addressed: <<>>

## Closure Gates

- [ ] 全队列处置 + 复测清零
- [ ] 三门禁持续绿（每批）
- [ ] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm check`

## Deferred But Adjudicated

### PH-21 目标集

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap 分列的独立工作项（PH-21），本 plan 不吸收。
- Successor Required: `yes`
- Successor Path: roadmap PH-21

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: <<>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>
