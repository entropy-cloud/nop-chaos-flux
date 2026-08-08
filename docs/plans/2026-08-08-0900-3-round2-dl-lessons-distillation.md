# DL Lessons 沉淀（06–08：审计必漏定律 / 工具门禁沉淀法 / 声明即契约检测法）

> Plan Status: active
> Mission: component-audit-round2
> Work Item: DL
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（DL 行 + DL Phase Details + Cross-Cutting lessons 编号纪律）、`docs/lessons/README.md`、`docs/logs/2026/08-08.md`（D0/D1/D2 收口证据）
> Related: `docs/plans/2026-08-08-0715-{1,2,3}-round2-d*.md`（completed，证据源）、第一轮 `docs/plans/2026-07-28..08-06`（completed，证据源）；后续 `DG` 从 **09** 起续写（host 面审计方法等）

## Purpose

从第一轮（C0–C9 + CX-1..CX-12，113 卡）与 post-closure（08-06/08-07 两轮 85 条 P2、08-08 三轮收口）执行证据中提取三条方法论教训，写入 `docs/lessons/`（编号 **06–08**，格式对齐既有 01–05 与 README 结构），并更新 `docs/lessons/README.md` 索引。证据全部来自已落定的 repo 事实，不引入新观点。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **`docs/lessons/` 现状**：01–05 五个文件（`01-over-abstracted-compiler-fix...` / `02-unit-green-but-real-browser-broken-bug-73-pattern` / `03-schema-event-dispatch-requires-...-ctx` / `04-surface-args-embedded-schema-body-eager-evaluation-cx-11` / `05-reaction-field-wiring-requires-ready-and-component-handle`）+ README 索引（含 Component-Audit Lessons (CG) 节 02–05 摘要行与 Audit-Remediation Lessons (MR1–MR3) 节 02–05 摘要行）；README「File Naming Rule」约定编号文件名。**下一可用编号 = 06**。
- **教训证据链（live 在案）**：
  - 06 审计必漏定律：mission 2026-08-06 收口（CV full-green 10,397 单测 + 1054 e2e）→ 08-06/08-07 两轮 post-closure multi-audit 仍发现 **85 条 P2 且多为真缺陷**（pointercancel 缺失、polling 竞态、重试跳页、NaN fail-closed、gantt 键盘编辑派发错通道、事件 ctx 别名盲区等，由 08-07/08-08 各 P2 修复 plan（2228-_/1747-_/2306-3/0819-1/1023-1/0421-2/0150-\* 等）收口，`docs/logs/2026/08-07.md`、`docs/logs/2026/08-08.md`）。
  - 07 工具门禁沉淀法：`check:audit-*` 门禁（现 14 项，含第一轮新增的 `check:audit-renderer-browser-io`/`check:audit-event-dispatch-ctx`），08-07/08-08 多轮零新增命中；门禁自身回归先例——browser-io 扫描范围正则 commit `6d2497ea`（2026-08-07）把 10 个 flux-renderers-\* 包静默漏扫，0150-1 修订 + committed 正例夹具锁定；门禁回归套件 `scripts/__tests__/`（6 files / 15 tests）全绿在案。
  - 08 声明即契约检测法：第一轮最高产缺陷类别——声明事件从不派发、`component:*` 句柄零注册、schema 字段声明零消费（stopWhen / finishAction / importsReady / 22-12 kanban 死句柄等）；D2 `@reserved` 7 处逐处核对先例（`docs/audits/round2-p3-adjudication.md` §5）。
- **lessons 编号纪律**（roadmap Cross-Cutting）：DL 占 06–08，DG 从 09 起续写；`docs/lessons/README.md` 同步。
- **纯文档计划条款**（guide）：本 plan 无代码变更，Closure Gates 删 `pnpm test`/`lint`/`typecheck`/`build`。

## Goals

- 三条 lesson note 落地：`docs/lessons/06-*.md`、`docs/lessons/07-*.md`、`docs/lessons/08-*.md`（文件名沿用现有连字符英文风格，`Recommended Sections` 结构：Problem Context / Initial Judgment / Why It Looked Plausible / Why It Was Wrong / Decisive Evidence / Correct Decision Rule / Preventive Checklist / Related Files）。
- `docs/lessons/README.md` 索引更新（06–08 登记 + 结构对齐现有节）。
- roadmap DL 行 `todo`→`done`（附执行证据）+ daily log 收口。

## Non-Goals

- 不写第二轮 host 面审计方法 lessons（DG 从 09 起续写）。
- 不写 bug note（DB work item 范围）。
- 不新增审计方法论观点（三条全部来自既有 repo 证据，无新研究）。

## Scope

### In Scope

- 三条 lesson note 撰写（06/07/08，证据引用带 `docs/logs/` 与 plan 出处）。
- README 索引更新 + roadmap DL 行收口登记。

### Out Of Scope

- lessons 09+（DG）、bug note（DB）、host 面审计（D3.x）、任何代码/门禁变更。

## Failure Paths

不适用（纯文档计划；无外部集成/鉴权/API 契约；主要风险为证据引用错误——由「每条 note 的证据出处全部 live 核对」覆盖）。

## Test Strategy

本档选择：**不适用：纯文档计划，无行为变更**（理由：不涉及代码/契约/鉴权；`pnpm check` 保留为 Closure Gate——`check:docs-garbled` / `check:active-doc-code-anchors` 覆盖 docs 变更）。

## Execution Plan

### Phase 1 - Lesson 06：审计必漏定律

Status: planned
Targets: 新建 `docs/lessons/06-*.md`、`docs/logs/2026/08-07.md`、`docs/logs/2026/08-08.md`

- Item Types: `Follow-up`

- [ ] 撰写 06：审计必漏定律——closure 只保证「本轮无已知问题」；证据链（08-06 收口 → 08-06/08-07 两轮 post-closure 仍 85 条真缺陷，逐条 plan 修复在案）；制度结论（大规模审计收口后必须安排 1–2 轮 post-closure audit，审计轮间隔不宜长）。
- [ ] 每条证据引用 live 核对（daily log 行号 / plan 路径）。

Exit Criteria:

- [ ] `docs/lessons/06-*.md` 存在，含完整 Recommended Sections + 证据出处（daily log / plan 引用）。

### Phase 2 - Lesson 07：工具门禁沉淀法

Status: planned
Targets: 新建 `docs/lessons/07-*.md`、`scripts/__tests__/`、root `package.json`（`check:*` 清单）

- Item Types: `Follow-up`

- [ ] 撰写 07：每修一类模式落一个 `check:` + committed 回归测试（`scripts/__tests__/`），基线零命中才是真收口；门禁自身也会回归（browser-io 6d2497ea 漏扫 10 包）——门禁必须有测试。
- [ ] 证据引用 live 核对（0150-1 修复记录 + `scripts/__tests__/find-renderer-browser-io.test.ts` 正例夹具 + `pnpm test:scripts` 6/15 在案）。

Exit Criteria:

- [ ] `docs/lessons/07-*.md` 存在，含证据出处（0150-1 / 门禁回归套件路径）。

### Phase 3 - Lesson 08：声明即契约（ghost contract）检测法 + README 收口

Status: planned
Targets: 新建 `docs/lessons/08-*.md`、`docs/lessons/README.md`、`docs/backlog/component-audit-round2-roadmap.md`（DL 行）、`docs/logs/2026/08-08.md`

- Item Types: `Proof | Follow-up`

- [ ] 撰写 08：声明即契约检测法——注册项 defaultSchema/fields、事件派发点、`component:*` 句柄、schema 字段与 design.md 双向核对；「声明即死」是第一轮最高产缺陷类别（stopWhen/finishAction/importsReady/22-12 等，证据含 D2 @reserved 核对先例）。
- [ ] README 索引更新：06–08 登记（含 Component-Audit Lessons 或新增节组织，对齐既有 02–05 节结构）。
- [ ] 收口登记：roadmap DL 行 `todo`→`done`（附执行证据引用）+ daily log 收口节。

Exit Criteria:

- [ ] `docs/lessons/08-*.md` 存在；README 索引含 06–08 三行且链接有效；roadmap DL 行 `done` + daily log 收口节。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_021216253ffecfxOG2kmh5wvgG`，一轮 `pass`）
- Verdict: `pass`（零 Blocker 零 Major）
- Rounds: 1
- Findings addressed:
  - Minor-1：Goals 文件名自相矛盾（中文文件名 vs 连字符英文风格声明）→ 改为 `06-*.md`/`07-*.md`/`08-*.md` 通配形态，与既有 01–05 命名惯例一致。
  - Minor-2：85 条 P2 修复归属过窄（原文「2228-_/0150-_」）→ 扩为「08-07/08-08 各 P2 修复 plan（2228-_/1747-_/2306-3/0819-1/1023-1/0421-2/0150-\* 等）收口」。
  - Minor-3：「第一轮沉淀 12+ 个 check:audit-_ 门禁」出处不可溯 → 改为「`check:audit-_` 门禁（现 14 项，含第一轮新增的 check:audit-renderer-browser-io / check:audit-event-dispatch-ctx）」，去除无出处的 12+ 断言。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。
>
> **纯文档计划条款**：`pnpm test`/`lint`/`typecheck`/`build` 从本表移除；`pnpm check` 保留（docs 变更受 `check:active-doc-code-anchors` / `check:docs-garbled` 约束）。

- [ ] 三条 lesson note 落地（06/07/08，证据出处 live 核对）
- [ ] README 索引与 lesson 文件零缺口（链接有效）
- [ ] 不存在被静默降级到 deferred 的 in-scope 项
- [ ] 受影响的 owner docs 已同步（`docs/lessons/README.md`、roadmap DL 行、daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm check`

## Deferred But Adjudicated

无（三条 lesson 全部 in-scope 收口；无遗留裁决项）。

## Non-Blocking Follow-ups

- DG 从 09 起续写 host 面审计方法 lessons（roadmap Cross-Cutting 已定，非本 plan 义务）。

## Closure

Status Note: （执行完成后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent，fresh session）
- Evidence: （填写）

Follow-up:

- （填写；DG 从 09 起续写）
