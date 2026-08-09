# 1 Cycle 1 / I3 — 发现裁决与工作项拟制（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I3. 发现裁决与工作项拟制
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I3 + Phase Details I3 + Loop Rule）、`docs/audits/ai-invariants/cycle1-findings.md`（I2 产出，本 plan 唯一裁决输入）
> Related: `docs/plans/2026-08-09-1826-3-i2-invariant-driven-audit.md`（前置依赖）、`docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（裁决路由目标）

## Purpose

把 I2 产出 `cycle1-findings.md` 的 K1-K4（已知族，门禁漏覆盖）/ N1-N5（新族，触发证据齐备）/ W1-W4（watch-only）**逐条裁决**为 P0/P1/P2/P3，产出零悬挂裁决表 `docs/audits/ai-invariants/cycle1-adjudication.md`：P0/P1 → 本 Cycle I4 修复项（附门禁补强要求）；新族 → Cycle 2 / I1 派生证据打包（Loop Rule 预授权）；P2/P3（如有）→ 本图 Follow-up Backlog；watch-only 维持登记。收口状态：findings 每条发现都有明确路由，零悬挂、零静默降级。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I2 先收口）

- I2 已收口（plan `2026-08-09-1826-3` completed + 独立 closure-audit PASS）：`cycle1-findings.md` 零悬挂，12×5 覆盖矩阵 + 发现清单齐备。
- 发现清单（裁决输入，全部带 `文件:行` + 不变式陈述 + 复现证据）：
  - **K1** — [③族] runTurn 成功路径完成 mutate（`create-engine.ts:318-323`）仅判 `draft.requestState === 'aborted'` 字符串，无 controller 身份守卫；abort 于 `plugin.onTurnStart`（:240-242，try 外）期间 → 新 turn 状态被陈旧 turn 完成写入 clobber（probe-A RED）。
  - **K2** — [⑤族] abort 不强制终结在途 generator 消费：chunk 循环（`create-engine.ts:417-429`）无 per-iteration signal 检查；`abort()`（:509-519）只 `controller.abort()` 不持 generator 句柄 → signal-ignoring connector 的迟到 chunk 仍被提交、永不 settle 的 generator 使 catch/finally 永不执行（placeholder `loading=true` 永久 + abortController 残留）。
  - **K3** — [storage 幽灵族/P1-b 兄弟] save-after-delete/clearAll 时序：attachAutoSave 的 fire-and-forget `saveMessages`（`use-conversation.ts:183-196`）在 `storage.deleteConversation`/`clearAll` 之后 resolve → 已删会话消息重落盘成 ghost；clearAll 的 abort 循环（:394-398）先于 `detachEngine`（:399）→ aborted 快照在删除前重新落盘（probe-6 RED）。
  - **K4** — [②族同步扩展] `renameConversation` 读 render 闭包 `conversations`（`use-conversation.ts:377`）→ 同 tick `createConversation` + `renameConversation` 时 `updated` undefined → 重命名静默不持久化（probe-K4 RED）。
  - **N1-N5** — 新族（active 位移完整性 / bootstrap merge / branch 戳泄漏 / plugin 错误隔离 / 失败轮残留污染），触发证据全部齐备（findings §3.2，probe 全部 RED），按 Loop Rule 派 Cycle 2 / I1。
  - **W1-W4** — watch-only residual（findings §4，复触发条件已登记）。
- 裁决先例：`docs/audits/cr-inventory-adjudication.md`（分类 + 来源 file:line + 一句理由，零未分类）、`docs/audits/round2-dr-adjudication.md`（P2 路由登记表格式）、round-2 裁决表（roadmap I3 明示「对齐 checklist v2 裁决表」）。
- 授权：本 plan 为纯文档产出（裁决表 + 路由记录），不改 live baseline / public contract / owner behavior；不涉及代码变更。

## Goals

- `docs/audits/ai-invariants/cycle1-adjudication.md`：零悬挂裁决表——findings 全部条目（K1-K4 / N1-N5 / W1-W4）逐条裁决，每条含：优先级（P0-P3）、族归属、路由（I4 / Cycle 2 / Follow-up Backlog / watch-only）、理由。
- K1-K4 每条的裁决记录必须**附门禁补强要求**（作为 I4 的输入契约）：
  - K1 → ③ 门禁扩展至成功路径完成 mutate；
  - K2 → ⑤ 门禁扩展（abort 强制终结 + per-iteration 检查）——与 I4 plan Phase 2 一致，不开放「新增 ⑤b」二选一；
  - K3 → ④ 门禁扩展（delete 前排空在途 save / 时序守卫）；
  - K4 → ② 门禁扩展至 sync 读取。
- N1-N5 打包为 Cycle 2 / I1 派生证据（Loop Rule 预授权路径）：每条含触发证据引用（findings §3.2 `文件:行` + 不变式陈述），供 I6 回写 roadmap 时直接引用，**不重复造数据**。
- W1-W4 维持 watch-only 登记（复触发条件引用 findings §4）；如 K2 修复面天然覆盖 W1 的 abortController 残留，裁决表注明「I4 附带收敛预期」。
- 裁决表零悬挂核对：findings 每条目 ↔ 裁决表条目一一对应；P2/P3（如有）入 Follow-up Backlog；roadmap I3 行收口时 flip ✅。

## Non-Goals

- 不修复任何发现（那是 I4，plan `2026-08-09-2007-2`）。
- 不沉淀/扩展门禁（K1-K4 的门禁补强由 I4 执行，本 plan 只写要求契约）。
- 不 append Cycle 2 / I1 work item 行到 roadmap（那是 I6 的 Loop Rule 回写动作；本 plan 只备齐证据）。
- 不对 N1-N5 做 P2/P3 级降级——新族按 Loop Rule 强制走 Cycle 2 / I1 派生，这是预授权的路由，不是延期裁定。

## Scope

### In Scope

- 裁决方法基准（判级标准对齐 checklist v2 + 先例表格式）。
- 逐条裁决 K1-K4 / N1-N5 / W1-W4 + 裁决表落档 `docs/audits/ai-invariants/cycle1-adjudication.md`。
- Follow-up Backlog 填充（如裁决产生 P2/P3 项）+ 裁决表零悬挂核对。
- roadmap I3 行状态回写（plan 生命周期驱动）。

### Out Of Scope

- 修复（I4）、门禁补强实现（I4）、Cycle 2 / I1 派生回写（I6）、验证（I5）。

## Failure Paths

不适用：裁决产出流程，无外部契约 / 错误处理面。裁决表的完整性本身就是本 plan 的质量门（零悬挂核对）。

## Test Strategy

本档选择：不适用：纯决策文档产出，零代码变更；「零悬挂核对」即本 plan 的质量验证（逐条对照 findings 清单）。

## Execution Plan

### Phase 1 — 裁决基准与方法核对

Status: completed
Targets: `docs/audits/ai-invariants/cycle1-findings.md`、`docs/audits/cr-inventory-adjudication.md`、`docs/audits/round2-dr-adjudication.md`（只读）

- Item Types: `Proof | Decision`

- [x] Proof: 复核 findings 各条目的 `文件:行` 与 live 源码一致（K1 `create-engine.ts:318-323` / K2 `:417-429,:509-519` / K3 `use-conversation.ts:183-196,:394-399` / K4 `:374-388`；N1-N5 触发证据行号），逐条勾对；不一致时修正发现文档并在裁决表同步记录修正痕迹（可追溯，不作静默改写）
- [x] Decision: 确定判级标准（P0/P1/P2/P3 定义对齐 `docs/audits/component-audit-checklist.md:56-59`：P0 = 数据丢失/损坏或 CI 红线、P1 = 契约漂移/交互缺陷、P2 = UX/文档/测试、P3 = nits）与裁决表格式（含：发现 ID、优先级、族归属、路由、门禁补强要求（K1-K4）、理由、证据引用）
- [x] Decision: 预期裁决基调（供一致性参照，最终以复核后证据为准）：K1-K4 = P1（K1 是 1757 P1 同型路径复活；K2 永久 loading 幽灵 + 资源泄漏；K3 数据完整性 ghost；K4 静默丢持久化）→ 路由 I4。**注**：按 checklist 判级，K3（storage 数据完整性）/K4（持久化静默丢失）可能落入 P0 判据（数据丢失/损坏）——诚实裁决，逐条写 checklist 依据；路由不受影响（P0/P1 均进 I4）；N1-N5 = 新族 → Cycle 2 / I1；W1-W4 = watch-only 维持

Exit Criteria:

- [x] findings 条目 live 行号勾对完成，零不一致悬挂
- [x] 判级标准 + 裁决表格式确定（先例对齐）

### Phase 2 — 逐条裁决与裁决表落档

Status: completed
Targets: `docs/audits/ai-invariants/cycle1-adjudication.md`（新建）

- Item Types: `Decision | Proof`

- [x] Decision: K1-K4 逐条裁决（优先级 + 路由 I4 + 门禁补强要求——按 Purpose 列的 4 条契约，含 I4 plan 依赖声明）
- [x] Decision: N1-N5 逐条登记为 Cycle 2 / I1 派生项（附触发证据引用 = findings §3.2 的 `文件:行` + 不变式陈述），注明 Loop Rule 预授权路径与 I6 回写职责
- [x] Decision: W1-W4 逐条维持 watch-only（引用 findings §4 复触发条件）；K2 修复面与 W1 的重叠关系在裁决表注明（I4 附带收敛预期，不作为本 plan 承诺）
- [x] Decision: P2/P3 项（如有）→ 本图 Follow-up Backlog 填充；无则记录「零 P2/P3 项」结论
- [x] Proof: 零悬挂核对——裁决条目数 == findings §3.1 + §3.2 + §4 条目数（**13 条**：K1-K4 ×4 + N1-N5 ×5 + W1-W4 ×4），逐条 ID 一一对应，无遗漏无重复；findings §5 未触发候选族（streaming backpressure / tool-execution 并发）按设计排除（保持登记，非裁决对象）

Exit Criteria:

- [x] `cycle1-adjudication.md` 落档，裁决表零悬挂（findings ↔ 裁决表逐条勾对记录在案）
- [x] K1-K4 的 I4 门禁补强要求契约完整可执行（I4 plan 可据此开工）

### Phase 3 — 一致性核对与收口

Status: completed
Targets: `docs/backlog/ai-invariant-loop-roadmap.md`、`docs/logs/2026/08-09.md`

- Item Types: `Decision`

- [x] Decision: roadmap I3 行状态回写——Phase 3 记录回写意图（`todo` → `✅` 附执行证据：plan 路径 + closure-audit 引用），翻转动作在 closure-audit 通过后执行（对齐 I0/I1/I2 先例：行翻转发生在 closure 时，不提前）；Follow-up Backlog 节按 Phase 2 结果更新
- [x] Decision: daily log 记录本 plan 收口（裁决表产出 + 零悬挂核对结论 + I4/Cycle 2 路由摘要）

Exit Criteria:

- [x] roadmap I3 行 ✅ 且执行证据齐备；Follow-up Backlog 与裁决表一致
- [x] daily log 收口记录落档

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_01990ef13ffe6yopy6xmbnrmiK`（fresh session，独立审查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，Minor 已全部采纳修订）
- Rounds: 1
- Findings addressed:
  - [Minor] K2 门禁契约二选一（⑤ 扩展 vs 新增 ⑤b）→ 钉死为 ⑤ 门禁扩展（与 I4 plan Phase 2 一致）
  - [Minor] 零悬挂核对口径未钉条数 → 钉死为 §3.1+§3.2+§4 = 13 条目，§5 候选族按设计排除
  - [Minor] roadmap I3 翻转时序 → 翻转动作移至 closure-audit 通过后（对齐 I0/I1/I2 先例），Phase 3 只记录意图
  - [Minor] findings 修正可追溯性 → 修正须在裁决表同步记录痕迹
  - [Minor] 判级标准引用精确化 → 引用 `docs/audits/component-audit-checklist.md:56-59`；K3/K4 可能诚实落入 P0（数据丢失判据），路由不受影响
  - [Minor] Draft Review Record 占位 → 本次审查后填写（本记录）

## Closure Gates

- [x] 裁决表零悬挂（findings §3.1+§3.2+§4 全部 13 条目 ↔ 裁决表一一对应，勾对记录在案；§5 候选族按设计排除）
- [x] K1-K4 门禁补强要求契约完整（I4 plan 依赖明确）
- [x] N1-N5 派生证据打包齐备（供 I6 直接引用）
- [x] W1-W4 维持 watch-only 且复触发条件可追溯
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（N1-N5 的 Cycle 2 路由 = Loop Rule 预授权强制路径，非延期裁定，已写明）
- [x] No owner-doc update required：本 plan 为裁决文档产出，不改 live baseline / public contract / owner behavior（`engine.md` 等不因本 plan 变更；门禁补强由 I4 执行并同步 owner doc）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

> 纯文档计划：不涉及代码变更，`pnpm typecheck`/`build`/`lint`/`test` 从 Closure Gates 中移除（guide 纯文档计划条款）。

## Deferred But Adjudicated

### W1-W4 watch-only residual（维持登记，不重开）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 四项均为低严重度/窄窗口/未确定复现（findings §4 已逐条写复触发条件）；K2 修复面（abort 强制终结）预计附带收敛 W1 的 abortController 残留面，但作为附带收益不作承诺
- Successor Required: `no`（复触发条件在 findings §4 登记，Cycle 2+ 若触发则按 Loop Rule 处理）

### N1-N5（路由 Cycle 2 / I1，非延期）

- Classification: `out-of-scope improvement`（对本 Cycle 而言：新族按 Loop Rule 预授权派 Cycle 2 / I1，属于 roadmap 强制的派生路径而非推迟裁定）
- Why Not Blocking Closure: Loop Rule 强制「新族 → Cycle N+1 / I1 沉淀」；触发证据（probe 全部 RED + `文件:行`）已齐备于 findings §3.2，I6 收口时自动派生，路由完整无悬挂
- Successor Required: `yes`
- Successor Path: Cycle 2 / I1 新不变式沉淀（由 I6 按 Loop Rule 派生回写 roadmap 后立项）

## Non-Blocking Follow-ups

- I4 修复 K1-K4 时若发现「兄弟实例」（类别清扫证据），需回读本裁决表确认路由一致

## Closure

Status Note: 纯文档裁决计划关闭：Phase 1/2/3 全部完成，交付物 `docs/audits/ai-invariants/cycle1-adjudication.md`（零悬挂 13 条目裁决表：K1=P1/K2=P1/K3=P0/K4=P0 附门禁补强契约 → 路由 I4；N1-N5 → Cycle 2 / I1 派生证据齐备；W1-W4 watch-only 维持；零 P2/P3 项）与 roadmap 回写 + daily log 收口记录齐备；roadmap I3 行已翻转 `✅`（2026-08-09，附执行证据）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（opencode / deepseek-v4-flash，非执行 session）
- Evidence:
  - plan 一致性：Phase 1/2/3 `completed`，全部 Item 与 Exit Criteria `[x]`，Closure Gates 1-6 `[x]`（审计前未勾选），第 7 项由本审计勾选；in-scope 无残留未勾选项。
  - 零悬挂核对：findings §3.1（K1-K4 ×4）+ §3.2（N1-N5 ×5）+ §4（W1-W4 ×4）= 13 ↔ 裁决表一一对应；§5 未触发候选族（backpressure / tool-execution）×2 按设计排除保持登记。
  - live 核对：16 处 `文件:行` 抽查全部吻合（create-engine.ts 12 处 + use-conversation.ts 8 处，含 K1 `:318-323`/`:240-242`、K2 `:417-429`/`:509-519`、K3 `:183-196`/`:394-399`、K4 `:374-388`/`:377`、N1-N5/N2 触发证据行号）；判级标准与 `component-audit-checklist.md:56-59` 一致；K3/K4 P0 诚实判级附 checklist 依据（数据丢失/存储损坏判据），路由不受影响。
  - 门禁契约对齐：K1→③ / K2→⑤（与 I4 plan Phase 2 一致，无 ⑤b 二选一）/ K3→④ / K4→② 与 I4 plan（`2026-08-09-2007-2`）Phase 1-4 逐条一致；I4 依赖声明在案。
  - roadmap 与 log：I3 行翻转发生在 closure-audit 通过后（对齐 I0/I1/I2 先例）；Follow-up Backlog 零 P2/P3 + W1-W4 watch-only 项与裁决表一致；daily log 收口记录（reverse-chronological 顶部）在案。
  - 2 条 non-blocking 观察（Exit Criterion 措辞先于翻转、log 门禁编号 off-by-one）已处理：log 编号已修正（1-6/第 7 项），Exit Criterion 在翻转后自然满足。零 Blocker / 零 Major，通过。

Follow-up:

- 无 plan-owned 剩余工作；后续为 I4（修复执行，plan `2026-08-09-2007-2-cycle1-i4-fix-execution.md`，依赖本裁决表开工）
