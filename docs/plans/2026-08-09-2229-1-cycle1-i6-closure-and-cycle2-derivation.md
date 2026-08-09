# 1 Cycle 1 / I6 — 循环收口与下一轮触发判定（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I6. 循环收口与下一轮触发判定
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I6 + Phase Details I6 + Loop Rule）、`docs/audits/ai-invariants/cycle1-findings.md`（I2 产出 §6 派生摘要）、`docs/audits/ai-invariants/cycle1-adjudication.md`（I3 产出 §3 N 表触发证据打包）、`docs/audits/ai-invariants/gates.md`（I1 产出 + I4 扩展，棘轮登记处）
> Related: `docs/plans/2026-08-09-2007-3-cycle1-i5-verification.md`（前置依赖，full-green 基线）、`docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（前置依赖，W1 复查 Non-Blocking Follow-up）、`docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md` + `docs/plans/2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md`（本 plan 派生出的 Cycle 2 计划，已起草）

## Purpose

收口 Cycle 1：统计本轮产出（新增门禁数 / red list 规模 / 新族数）、复查 I4 遗留的 W1 收敛预期（Non-Blocking Follow-up）、执行稳态判定——**有新族（N1-N5）⇒ 按 Loop Rule 预授权派生 Cycle 2 / I1 + I2 / I3**，把三个 Cycle 2 work item 行追加到 roadmap Work Item Status 表（附触发证据 = findings §3.2 `文件:行` + 不变式陈述，不重复造数据），同步动态状态区与 Follow-up Backlog。收口状态：Cycle 1 完整闭环、Cycle 2 派生证据回写、closure 由独立 fresh session 执行。

## Current Baseline

（live repo 核对，2026-08-09）

- I0-I5 全部 `✅`（roadmap Work Item Status）：I0 目录（`invariant-catalog.md`）、I1 门禁（`check:ai-engine-invariants` + 参数化穷举测试 + 表完备性门禁 + committed 回归）、I2 发现（`cycle1-findings.md` 零悬挂）、I3 裁决（`cycle1-adjudication.md` 零悬挂 13 条目）、I4 修复（K1-K4 + 门禁 ②③④⑤ 补强 + bug notes 121-124）、I5 验证（full-green 基线：typecheck/build/lint 33/33、`pnpm test` 60/60 tasks 12,246 passed/0 failed、AI 包 66 files/542 tests、test:scripts 8/36、check:ai-engine-invariants exit 0、AI e2e 47/0/0——`docs/logs/2026/08-09.md`）。
- **I6 是 Cycle 1 唯一剩余 `todo` work item**；roadmap 尚无任何 Cycle 2 行（Loop Rule 规定「本图只维护 Work Item Status + Loop Rule + Follow-up Backlog」；Cycle 2 行只能由 I6 按 Loop Rule 追加，不得提前）。
- 新族触发证据已齐备（裁决表 §3 N1-N5 打包 + findings §3.2 每条含 `文件:行` + 不变式陈述 + RED 复现证据）：N1 active 位移完整性（5 成员 probe）、N2 bootstrap 列表覆盖、N3 branch 戳泄漏（候选族 branching/fork 触发）、N4 plugin 错误隔离（候选族 plugin 生命周期触发）、N5 失败轮残留污染。
- I4 的 Non-Blocking Follow-up 登记：**W1（abortController 残留）由 I5/I6 复查是否被 K2 修复收敛，从 watch-only 移除并记录**（I4 plan Follow-up 节；K2 修复 = abort 强制终结 generator + finally 清理面）。
- live 复核（2026-08-09，I6 起草轮）：`create-engine.ts:534-555` `abort()` 仍不重置 `draft.abortController`/`draft.processingState`；`clear()`（:557-570）与 `setMessages()`（:146-158）不 null controller——abort→(clear|setMessages)→再 abort 窄窗口（二次 abort 把 idle 状态 clobber 回 'aborted'）**预计仍存在**，K2 收敛的是 generator 残留面与 finally 清理面（:450-454 `activeGenerator` 置空 + :354-361 finally 按身份守卫清 controller）。最终裁决以本 plan Phase 1 的实证复跑为准。
- 既有登记 red（与本 plan 无关，验证时允许存在）：`check:audit-event-dispatch-ctx` 6 hits（industrial，移交 industrial workstream）；`check:oversized-code-files` 2 条 locale 豁免。
- 授权：本 plan 为纯文档产出（统计 + 回写 + 判定），不改 live baseline / public contract / owner behavior；Cycle 2 work item 追加是 Loop Rule 预授权的唯一自动新增路径（roadmap Rule）。

## Goals

- Cycle 1 统计落档：新增不变式门禁数（5 类 + I4 加性扩展 ②③④⑤）、red list 规模（零，I2 实证）、新族数（5，N1-N5）。
- W1 收敛复查：live 实证复跑 W1 复触发窗口 → 收敛则从 watch-only 移除并记录；未收敛则维持 watch-only 并更新复触发条件证据（findings §4 W1 行或注释）。
- 稳态判定：**非稳态**（N1-N5 新族存在）→ 按 Loop Rule 派生 Cycle 2 / I1（新不变式沉淀）+ I2 + I3，roadmap Work Item Status 表追加 3 行，每行附触发证据引用（`cycle1-findings.md` §3.2 `文件:行` + `cycle1-adjudication.md` §3 N 表不变式陈述，不重复造数据）。
- roadmap 同步：I6 行 `todo` → `✅`（附执行证据）；动态状态区注释更新（Cycle 1 全闭环 + Cycle 2 派生）；Follow-up Backlog 节同步（W1 复查结论）。
- closure 由独立 fresh session 执行；Plan Status 随 closure-audit 通过转 `completed`。

## Non-Goals

- 不修复任何 N1-N5 缺陷（Cycle 2 / I1 只沉淀门禁，修复是 Cycle 2 / I4 的职责；本 plan 只派生 work item 行）。
- 不执行 Cycle 2 / I1 的门禁实现（那是 `2026-08-09-2229-2`）。
- 不做新审计 / 新对抗探查（那是 Cycle 2 / I2，`2026-08-09-2229-3`）。
- 不改 Loop Rule / 棘轮规则 / 类别清扫强制（硬约束）。

## Scope

### In Scope

- Cycle 1 统计（门禁数 / red list / 新族数）+ 落档。
- W1 收敛复查（live 复跑 + 裁决）。
- 稳态判定 + Cycle 2 / I1 + I2 + I3 三行追加（Loop Rule 预授权）+ 触发证据引用回写。
- roadmap I6 行状态翻转 + 动态状态区 + Follow-up Backlog 同步 + daily log 记录。

### Out Of Scope

- N1-N5 修复、Cycle 2 门禁实现、新审计（分别归 Cycle 2 / I4、`2026-08-09-2229-2`、`2026-08-09-2229-3`）。
- 非 AI 面的仓库验证复跑（引用 I5 full-green 基线即可）。

## Failure Paths

不适用：本 plan 是统计 + 回写 + 判定流程，无外部契约 / 错误处理面。质量门 = 统计数字与引用证据逐条核对（roadmap 三行触发证据 ↔ findings/adjudication 原文一致，零重复造数据）、W1 复查结论有实证依据。

## Test Strategy

本档选择：不适用：纯文档计划（仅修改 `docs/` 下文件 + 只读验证命令复跑），零代码变更；「统计 ↔ 证据核对」即本 plan 的质量验证。验证命令只用于 W1 窗口复跑取证（临时 vitest 或既有测试驱动，不落代码）。

## Execution Plan

### Phase 1 — Cycle 1 统计 + W1 收敛复查

Status: completed
Targets: `docs/audits/ai-invariants/gates.md`、`docs/audits/ai-invariants/cycle1-findings.md`（只读核对）、`packages/flux-renderers-ai/src/engine/create-engine.ts`（只读复跑）

- Item Types: `Proof | Decision`

- [x] Proof: Cycle 1 统计核对（逐项对照 I1/I4 交付物）：① 新增不变式门禁 = 5 类（①-⑤）+ I4 加性扩展（② sync 读取 / ③ 成功路径守卫 / ④ 时序守卫 / ⑤ 强制终结，扫描器 2 新规则 + 运行时参数化扩展 + committed 回归 6 用例，`gates.md` 5 行全绿）；② red list 规模 = 0（I2 实证 `check:ai-engine-invariants` exit 0 + 矩阵零 uncovered 悬空格）；③ 新族 = 5（N1-N5，触发证据齐备）——统计落档（daily log + 本 plan 记录）
- [x] Proof: W1 复触发窗口实证复跑——abort→(clear 或 setMessages)→再 abort 时序下 `requestState` 终态断言（**仅用临时 vitest 文件取证，禁止修改既有 committed 测试文件**；复跑后删除临时文件零残留）；记录 K2 后窗口是否仍可复现（live 复核预期：controller/processingState 残留窗口仍在，generator 残留面已收敛）
- [x] Decision: W1 裁决——收敛（窗口不可复现）⇒ 从 findings §4 / adjudication §3 W1 行移除并记录；未收敛 ⇒ 维持 watch-only，在 findings §4 W1 行追加「I6 复查（2026-08-09）：K2 已收敛 generator 残留面，controller/processingState 窗口仍在」更新证据

Exit Criteria:

- [x] Cycle 1 统计落档（门禁 5 类 + 扩展 / red list 0 / 新族 5），数字与 I1/I2/I4 交付物逐项对应
- [x] W1 复查结论有实证（复跑记录 + 裁决：移除或维持，均落档）

### Phase 2 — 稳态判定 + Cycle 2 / I1 + I2 / I3 派生回写

Status: completed
Targets: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item Status 表 + 动态状态区 + Follow-up Backlog）

- Item Types: `Decision | Proof`

- [x] Decision: 稳态判定——非稳态（N1-N5 = 5 个新失败类，findings §3.2 + adjudication §3 N 表齐备）⇒ 不标记「稳态暂停」，按 Loop Rule 派生 Cycle 2
- [x] Decision: roadmap Work Item Status 表追加 3 行（附触发证据引用，不重复造数据；触发证据 `文件:行` 为 **I2/I3 审计时点记录**——I4 修复已致 live 行号漂移，以 findings/adjudication 原文为准，追加行加注「行号按 cycle1 findings §3.2 原文（2026-08-09 I2 时点）」）：
  - **Cycle 2 / I1. 不变式沉淀（第二批门禁）**：N1-N5 → 新不变式 ⑥-⑩ 落为参数化穷举测试 + 门禁脚本 + 表完备性更新 + committed 回归；触发证据 = findings §3.2 各条 `文件:行` + adjudication §3 N 表不变式陈述；owner doc = invariant-catalog.md §9（待 Cycle 2 / I1 新建）+ gates.md + engine.md §Invariants；依赖 = I6
  - **Cycle 2 / I2. 不变式驱动审计**：跑 ⑥-⑩ 门禁跨全部方法 → red list（预期 = 注册 N 列表，确定性确认）+ 对抗探查（聚焦 ⑥-⑩ 未表达盲区）→ `cycle2-findings.md` 零悬挂；依赖 = Cycle 2 / I1
  - **Cycle 2 / I3. 发现裁决与工作项拟制**：red list + 新发现逐条裁决 → P0/P1 派 Cycle 2 / I4；新族 → Cycle 3 / I1（Loop Rule）；裁决表 `cycle2-adjudication.md` 零悬挂；依赖 = Cycle 2 / I2
- [x] Proof: 三行触发证据与 findings §3.2 / adjudication §3 逐条核对（ID 对应、行号一致、不变式陈述原文引用），零重复造数据
- [x] Proof: 已起草的 Cycle 2 plans（`2026-08-09-2229-2` / `-3`）在 roadmap 对应行关联引用（执行序 = 文件名 {N} 序）

Exit Criteria:

- [x] roadmap Work Item Status 表含 Cycle 2 / I1 + I2 + I3 三行，各附触发证据引用且与 findings/adjudication 逐条对应
- [x] 动态状态区注释更新（Cycle 1 全闭环、I6 ✅、Cycle 2 已派生并关联计划文件）

### Phase 3 — 收口（同步 + 记录 + closure）

Status: completed
Targets: `docs/logs/2026/08-09.md`、`docs/backlog/ai-invariant-loop-roadmap.md`（I6 行翻转）、git commit

- Item Types: `Proof`

- [x] Proof: daily log 记录本 plan 收口（Cycle 1 统计 + W1 复查结论 + Cycle 2 派生三行 + 触发证据引用）
- [x] Proof: roadmap I6 行 `todo` → `✅`（附执行证据：plan 路径 + daily log + 独立 closure-audit 引用）；Follow-up Backlog 节同步（W1 复查结论；W2-W4 维持登记）
- [x] Proof: `pnpm check:docs-garbled`（本 plan 新增/修改 docs：roadmap + findings + daily log）exit 0 或候选全部归属既有文件（对齐 I0/I1/I2 先例）
- [x] Proof: git commit——`docs(ai-invariant-loop): plan-2026-08-09-2229-1 Cycle 1 I6 收口 + Cycle 2 派生……`（对齐 I3/I5 纯记录先例；仅 stage 本 plan 相关文件）

Exit Criteria:

- [x] daily log 落档；roadmap I6 行 ✅；Follow-up Backlog 同步；docs-garbled 通过；commit 完成

## Draft Review Record

- Reviewer / Agent: `ses_0190cb866ffeWYTIeRs1OFPdJS`（fresh session，独立审查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] 触发证据 `文件:行` 为 I2/I3 审计时点锚点（post-I4 live 行号已漂移）→ Phase 2 追加行加注「行号按 cycle1 findings §3.2 原文（2026-08-09 I2 时点）」
  - [Minor] W1 复跑表述歧义（"既有测试驱动"可能误改 committed 文件）→ 钉死「仅用临时 vitest 文件取证，禁止修改既有 committed 测试文件」
  - [Minor] catalog §9 尚不存在 → Cycle 2 / I1 行 owner doc 加注「待 Cycle 2 / I1 新建」
  - [Minor] W2-W4 Deferred 块补 `Successor Path: （无需）` 键

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。纯文档计划：不涉及代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从 Closure Gates 移除（guide 纯文档条款）。

- [x] Cycle 1 统计落档且与 I1/I2/I4 交付物逐项对应（门禁数 / red list / 新族数）
- [x] W1 复查完成并有实证裁决（移除或维持，均记录依据）
- [x] 稳态判定 + Cycle 2 / I1 + I2 + I3 三行追加 roadmap，触发证据与 findings §3.2 / adjudication §3 逐条核对零悬挂
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（N1-N5 显式路由 Cycle 2 / I1（沉淀）→ I4（修复），非延期裁定；W1 按复查实证分类）
- [x] 受影响的 owner docs 已同步（roadmap Work Item Status + 动态状态区 + Follow-up Backlog + findings W1 行（如维持/移除）+ daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check:docs-garbled` 通过或候选全部归属既有文件

## Deferred But Adjudicated

### W1（abortController 残留）——以 Phase 1 复查实证为准

- Classification: `watch-only residual`（预期维持；若实证收敛则移除，不属本项）
- Why Not Blocking Closure: 窄窗口（abort→(clear|setMessages)→再 abort）+ 自愈（陈旧轮 finally 身份守卫清理 + 新 turn 覆盖）；K2 已收敛 generator 残留面（I4 附带收敛预期部分兑现）；controller/processingState 残留窗口即使仍在，低严重度不阻塞闭环（findings §4 W1 原始裁定）
- Successor Required: `no`
- Successor Path: （无需；如裁决移除则从 watch-only 清单注销并记录）

### W2-W4（watch-only 维持登记）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 复触发条件已在 findings §4 逐条登记（W2 流式期 setMessageEditing 设计面语义 / W3 病态 listener / W4 abort-onTurnStart 设计行为），本 plan 不重开
- Successor Required: `no`
- Successor Path: （无需）

## Non-Blocking Follow-ups

- Cycle 2 / I1（`2026-08-09-2229-2`）+ I2（`2026-08-09-2229-3`）执行序接续；Cycle 2 / I3 待 I2 findings 产出后起草。
- W1 若维持 watch-only：其复触发窗口已实证，Cycle 2 后续轮次（I2 审计）若触及则按 findings 流程复核。

## Closure

Status Note: Cycle 1 / I6 收口完成——统计落档（门禁 5 类 + I4 扩展 / red list 0 / 新族 5）+ W1 实证复查（临时 vitest 3/3，窗口仍可复现 → 维持 watch-only，findings §4 更新证据）+ 稳态判定（非稳态）→ Cycle 2 / I1 + I2 + I3 三行按 Loop Rule 派生回写 roadmap（附触发证据引用，逐条与 findings §3.2 / adjudication §3 对应零造数）+ 动态状态区 / Follow-up Backlog / daily log 同步 + commit `0ae711c6`；独立 closure-audit **approved**（零 Blocker / 零 Major）→ Plan Status `completed`。

Closure Audit Evidence:

- Auditor / Agent: `ses_018f2057dffeJmWQX182ImvLfJ`（independent fresh sub-agent session，不复用执行者上下文）
- Evidence: verdict **approved**（0 Blocker / 0 Major；3 Minor 均为收口表述类——M1 daily log 措辞「Closure Gates 全 [x]」随本 finalization 轮成立、M2 handoff 摘要计数笔误（4→5 份 BI 草稿）、M3 plan 文件 commit 时序（Phase 3 翻转在 `0ae711c6` 之后）——无内容影响）；audit 9 项 checklist 全 PASS：① 文本一致性（Phase 1/2/3 全 completed + 全部 [x]）② 统计准确性（gates.md:12-16 五行 + 4 项 I4 扩展 + committed 回归 6 用例；findings:22 red list 0；findings §3.2 新族 5）③ 触发证据零造数（roadmap:47-49 行号逐条对应 findings:97/110/117/126-128/135 + adjudication §3 N 表族名）④ W1 裁决诚实（静态核对 create-engine.ts:534-555/:557-570/:146-158/:354-361 代码一致）⑤ roadmap 同步（I6 行 ✅ + 动态状态区 + Follow-up Backlog）⑥ deferred 诚实 ⑦ `pnpm check:docs-garbled` exit 0 候选全 pre-existing（daily log:256 "façade" 为 HEAD 既有）⑧ 工作区零残留（临时 vitest 已删；零代码文件改动）⑨ interface-vs-semantics（文档状态均在 live 文件实际存在）

Follow-up:

- Cycle 2 / I1（`2026-08-09-2229-2`）+ I2（`2026-08-09-2229-3`）执行序接续；Cycle 2 / I3 待 I2 findings 产出后起草。
- W1 维持 watch-only：复触发窗口已实证（findings §4 更新在案），Cycle 2 / I2 审计若触及按 findings 流程复核。
- 无 remaining plan-owned work。
