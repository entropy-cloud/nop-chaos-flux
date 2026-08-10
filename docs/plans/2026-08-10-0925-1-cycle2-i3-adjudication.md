# 1 Cycle 2 / I3 — 发现裁决与工作项拟制（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I3. 发现裁决与工作项拟制
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I3 + Phase Details I3 + Loop Rule）、`docs/audits/ai-invariants/cycle2-findings.md`（Cycle 2 / I2 产出，本 plan 唯一裁决输入）
> Related: `docs/plans/2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md`（前置依赖）、`docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`（裁决路由目标）、`docs/plans/2026-08-09-2007-1-cycle1-i3-adjudication.md`（Cycle 1 同步骤先例）

## Purpose

把 Cycle 2 / I2 产出 `cycle2-findings.md` 的 **13 条已知族 K finding（K-⑩×5 + K-⑥×3 + K-⑦×1 + K-K4/②×2 + K-K3/④×1 + K-⑨×1）**逐条裁决为 P0/P1/P2/P3，产出零悬挂裁决表 `docs/audits/ai-invariants/cycle2-adjudication.md`：P0/P1 → Cycle 2 / I4 修复项（附门禁补强要求契约）；新族（本轮 = 零）→ Cycle 3 / I1 派生（Loop Rule）；P2/P3（如有）→ 本图 Follow-up Backlog；watch-only（新 W-E/W-⑨-a/b/c + Cycle 1 W1-W4 维持）登记。收口状态：findings 每条发现都有明确路由，零悬挂、零静默降级。

## Current Baseline

（live repo 核对，2026-08-10；依赖 Cycle 2 / I2 先收口）

- Cycle 2 / I2 已收口（plan `2026-08-09-2229-3` completed + 独立 closure-audit 通过）：`cycle2-findings.md` 零悬挂，12×⑥-⑩ 覆盖矩阵零悬空格 + 发现清单齐备。
- 发现清单（裁决输入，全部带 `文件:行` + 不变式族归属 + 复现证据；live 行号已抽查核对）：
  - **K-⑩×5（失败轮产物清理族，engine）**：K-⑩-1 abort-before-first-chunk 空残留进下一请求历史（`create-engine.ts:432-483` chunk 循环 + `:456-458` `!firstChunkReceived → loading=false` + `:469` commitAssistant + `:511` buildContext 只排除 loading 尾消息）；K-⑩-2 onBeforeRequest rejection 留永久 loading 幽灵（`:407-410` try 外 + `:401-405` placeholder 已 push）；K-⑩-3 残留经 autoSave 持久化跨会话存活（`:484-486` catch commit × `use-conversation.ts:190` isDone + `:202-209` saveMessages）；K-⑩-4 regenerate×connector-throw 旧回答销毁 + 空残留（`create-engine.ts:593-596` 截断 + `:484-486` catch commit）；K-⑩-5 零 chunk「completed」轮同样产空残留（`:456-458` + `:325-335` completed 终态）。
  - **K-⑥×3（active 位移完整族，adapter）**：K-⑥-1 同 tick clearAll+create+delete 幽灵 activeId fixup（`use-conversation.ts:427-475` clearAll 不写 `conversationsRef` × `:280-313` create 镜像 × `:382-388` delete fixup 读镜像）；K-⑥-2 同 tick delete+switch 提升已删目标（`:316` exists 检查 + `:370-404` delete 不 bump `switchVersionRef`）；K-⑥-3 mount bootstrap 选中 active 但不建引擎（`:242-246` `setActiveId(current ?? convs[0].id)` 无 build/promote）。
  - **K-⑦×1（bootstrap 合并族，adapter）**：clearAll 在 bootstrap 在途时被迟到 resolve 复活（`:242-246` `setConversations(convs)` 整体覆盖 × clearAll `:444` 清空）。
  - **K-K4/②×2（sync 闭包读取/镜像维护族，adapter）**：K-K4/②-1 同 tick delete+rename → storage 幽灵重存（`:370-404` delete 不同步 `conversationsRef` × `:406-425` rename 读镜像 + saveConversation）；K-K4/②-2 同 tick rename+clearAll → storage 元数据幽灵（`:422-424` rename fire-and-forget × `:427-475` clearAll）。
  - **K-K3/④×1（storage 时序守卫族，adapter）**：同 tick create+clearAll → create 元数据不在排空链（`:309-311` create saveConversation × `:452-455` clearAll drain 只排 saveMessages 链）。
  - **K-⑨×1（plugin 错误隔离族，engine）**：aborted turn 的 onTurnEnd rejection → host promise reject（`create-engine.ts:362-364` finally `await plugin.onTurnEnd` 无守卫）。
- **新族 N = 零**（findings §3.2）：双轮探查全部落入既有族（⑥⑦⑨⑩ + K4/② + K3/④），不触发 Cycle 3 派生。
- **watch-only**：新 4 条（W-E / W-⑨-a/b/c，findings §3.3 复触发条件齐备）+ Cycle 1 W1-W4 维持（findings §4 复核，I6 结论为锚）。W-E（aborted 轮 onAfterRequest 空回调）与 W-⑨-b（bootstrap-active 会话不挂 autoSave）分别随 K-⑩-1 / K-⑥-3 修复面评估。
- **red list（I3 需一并裁决路由）**：注册面确定性确认（findings §1.2）——⑥×3（`use-conversation.ts:280/:370/:427` 不 bump）+ ⑧×1（`create-engine.ts:228` connector-missing 早退戳泄漏）= 4 注册命中，零未注册 → 路由 Cycle 2 / I4 修复清零（⑧ 为 Cycle 2 / I1 注册红，I3 裁决表须显式包含其清零要求）。
- 裁决先例：`docs/audits/ai-invariants/cycle1-adjudication.md`（P0/P1 判级 + 门禁补强契约 + 零悬挂核对格式）、`docs/audits/component-audit-checklist.md:56-59`（P0-P3 判级标准）。
- 授权：本 plan 为纯文档产出（裁决表 + 路由记录），不改 live baseline / public contract / owner behavior；不涉及代码变更（对齐 Cycle 1 / I3 先例）。

## Goals

- `docs/audits/ai-invariants/cycle2-adjudication.md`：零悬挂裁决表——findings 全部条目逐条裁决，每条含：优先级（P0-P3）、族归属、路由（I4 / Cycle 3 / Follow-up Backlog / watch-only）、理由（checklist 依据）。
- 13 条 K finding 每条的裁决记录必须**附门禁补强要求**（作为 Cycle 2 / I4 的输入契约）：
  - K-⑩×5 → ⑩ 门禁扩展至 aborted 轮 / hook 拒绝幽灵 / autoSave 持久化臂 / regenerate 臂 / 零 chunk 成功轮成员（运行时参数化，不静态化）；
  - K-⑥×3 → ⑥ 门禁扩展至同 tick 组合成员（clearAll+create+delete 幽灵 fixup / delete+switch 提升已删目标）+ bootstrap build-on-demand 成员（运行时参数化 + 扫描器 bump 规则保持，注册红清零契约）；
  - K-⑦×1 → ⑦ 门禁扩展至 clearAll 成员（bootstrap 在途 × clearAll 复活）；
  - K-K4/②×2 → ② 门禁扩展至 delete/clearAll 镜像**写面**（`conversationsRef` 同步维护，K4/§7.4 写面只覆盖 create/rename）；
  - K-K3/④×1 → ④ 门禁扩展至 create 元数据写（saveConversation 入排空链，K3/§7.3 只覆盖 saveMessages）；
  - K-⑨×1 → ⑨ 门禁扩展至 abort 变体（onTurnEnd rejection 不得 reject host-facing promise）。
- **注册红清零契约**：⑥×3（create/delete/clearAll bump `switchVersionRef`）+ ⑧×1（connector-missing 早退清 `pendingBranchId`）→ 显式列为 Cycle 2 / I4 修复项（findings §1.2 + gates.md 注册红节）。
- N=零 → 裁决表记录「零新族，不派生 Cycle 3」结论（Loop Rule 路由空转，仍显式落档）。
- W-E/W-⑨-a/b/c + W1-W4 维持 watch-only 登记（复触发条件引用 findings §3.3/§4）；W-E / W-⑨-b 注「I4 附带评估」（随 K-⑩-1 / K-⑥-3 修复面，不作承诺）。
- 裁决表零悬挂核对：findings §3.1(13) + §3.2(0) + §3.3(4) + §4(4) = 21 条目 ↔ 裁决表逐条一一对应；P2/P3（如有）入 Follow-up Backlog；roadmap Cycle 2 / I3 行收口时 flip ✅。
- **Loop Rule 回写准备（非执行）**：按 Loop Rule「I3 新工作项自动派生」，本 plan 备齐 Cycle 2 / I4 + I5 的派生证据（裁决表 §3 路由 + 门禁补强契约），供 Phase 3 追加 roadmap 行时直接引用，不重复造数据。

## Non-Goals

- 不修复任何发现（那是 Cycle 2 / I4，plan `2026-08-10-0925-2`）。
- 不沉淀/扩展门禁实现（K 条目的门禁补强由 I4 执行，本 plan 只写要求契约）。
- 不执行 Cycle 2 / I5 验证（plan `2026-08-10-0925-3`）与 Cycle 2 / I6 收口判定。
- 不对新族做 P2/P3 级降级——本轮新族为零，无派生对象；如有裁决意外发现需新增族，按 Loop Rule 记录触发证据供 I6-Cycle2 判定。

## Scope

### In Scope

- 裁决方法基准（判级标准对齐 checklist v2 + Cycle 1 先例表格式）。
- 逐条裁决 13 K finding + 注册红清零契约 + watch-only 维持 + 零新族落档 + 裁决表落档 `docs/audits/ai-invariants/cycle2-adjudication.md`。
- Follow-up Backlog 填充（如裁决产生 P2/P3 项）+ 裁决表零悬挂核对。
- roadmap 状态回写：Cycle 2 / I3 行 flip ✅（closure-audit 通过后）+ 按 Loop Rule 追加 Cycle 2 / I4 + I5 两行（附触发证据 = 裁决表 §3 路由 + 门禁补强契约）。
- daily log 收口记录（`docs/logs/2026/08-10.md`）。

### Out Of Scope

- 修复（I4）、门禁补强实现（I4）、全量验证（I5）、循环收口与 Cycle 3 派生判定（I6-Cycle2）。

## Failure Paths

不适用：裁决产出流程，无外部契约 / 错误处理面。裁决表的完整性本身就是本 plan 的质量门（零悬挂核对）。

## Test Strategy

本档选择：不适用：纯决策文档产出，零代码变更；「零悬挂核对」即本 plan 的质量验证（逐条对照 findings 清单，对齐 Cycle 1 / I3 先例）。

## Execution Plan

### Phase 1 — 裁决基准与方法核对

Status: completed
Targets: `docs/audits/ai-invariants/cycle2-findings.md`、`docs/audits/ai-invariants/cycle1-adjudication.md`（只读）、`docs/audits/component-audit-checklist.md:56-59`（只读）

- Item Types: `Proof | Decision`

- [x] Proof: 复核 findings 各条目的 `文件:行` 与 live 源码一致（K-⑩-1 `create-engine.ts:432-483/:456-458/:469/:511`、K-⑩-2 `:407-410/:401-405`、K-⑩-3 `:484-486` × `use-conversation.ts:190/:202-209`、K-⑩-4 `create-engine.ts:593-596/:484-486`、K-⑩-5 `:456-458/:325-335`；K-⑥-1 `use-conversation.ts:427-475/:280-313/:382-388`、K-⑥-2 `:316/:370-404`、K-⑥-3 `:242-246`；K-⑦-1 `:242-246/:444`；K-K4/②-1 `:370-404/:406-425`、K-K4/②-2 `:422-424/:427-475`；K-K3/④-1 `:309-311/:452-455`；K-⑨-1 `create-engine.ts:362-364`；注册红 ⑥×3 `:280/:370/:427` + ⑧×1 `create-engine.ts:228`），逐条勾对；不一致时修正发现文档并在裁决表同步记录修正痕迹（可追溯，不作静默改写）
- [x] Decision: 确定判级标准（P0/P1/P2/P3 定义对齐 `docs/audits/component-audit-checklist.md:56-59`：P0 = 数据丢失/错误提交/崩溃/存储损坏/CI 红线、P1 = 契约漂移/交互缺陷/错误行为、P2 = UX/文档/测试加固、P3 = nits）与裁决表格式（含：发现 ID、优先级、族归属、路由、门禁补强要求（K 条目）、理由、证据引用——对齐 cycle1-adjudication.md）
- [x] Decision: 预期裁决基调（供一致性参照，最终以复核后证据为准）：K 全部 13 条为**已确认 live defect（全部确定性复现 RED）→ P0/P1 → 路由 Cycle 2 / I4**；判级诚实化——storage 幽灵面按 K3 先例诚实评估：**K-K4/②-1（幽灵重创建，remount 复生已删会话）与 K-K3/④-1（幽灵会话）预期 P0**（存储损坏/数据完整性）；**K-K4/②-2（元数据幽灵 `{A: title}`）为列表本身已清空的**元数据级**残留——预期 P1（判级标准：会话级幽灵复生 = P0 存储损坏、纯元数据残留 = P1 错误行为，逐条写 checklist 依据防不对称）**；K-⑩-4（regenerate 销毁旧回答 = 数据丢失形态）预期 P0；其余 P1（交互缺陷/错误行为）；路由不受影响（P0/P1 均进 I4）；N = 零 → 记录「零新族」；watch-only 8 条维持

Exit Criteria:

- [x] findings 条目 live 行号勾对完成，零不一致悬挂
- [x] 判级标准 + 裁决表格式确定（cycle1-adjudication 先例对齐）

### Phase 2 — 逐条裁决与裁决表落档

Status: completed
Targets: `docs/audits/ai-invariants/cycle2-adjudication.md`（新建）

- Item Types: `Decision | Proof`

- [x] Decision: K-⑩×5 逐条裁决（优先级 + 路由 I4 + ⑩ 门禁补强要求——按 Purpose 列契约，含 I4 plan 依赖声明）
- [x] Decision: K-⑥×3 逐条裁决（优先级 + 路由 I4 + ⑥ 门禁补强要求：同 tick 组合成员 + bootstrap build-on-demand + 注册红 bump 清零契约）
- [x] Decision: K-⑦×1 / K-K4/②×2 / K-K3/④×1 / K-⑨×1 逐条裁决（各自路由 I4 + 门禁补强要求 ⑦/②/④/⑨）
- [x] Decision: 注册红清零契约落档（⑥×3 + ⑧×1 → I4 显式修复项，引用 gates.md 注册红节）
- [x] Decision: N=零 落档（「零新族，不派生 Cycle 3」+ Loop Rule 路由空转结论）
- [x] Decision: watch-only 逐条维持（W-E/W-⑨-a/b/c 引用 findings §3.3、W1-W4 引用 §4 + I6 锚点）；W-E / W-⑨-b 注「I4 附带评估」（随 K-⑩-1 / K-⑥-3 修复面，不作为本 plan 承诺）
- [x] Decision: P2/P3 项（如有）→ 本图 Follow-up Backlog 填充；无则记录「零 P2/P3 项」结论
- [x] Proof: 零悬挂核对——裁决条目数 == findings §3.1(13) + §3.2(0) + §3.3(4) + §4(4) = **21 条目**，逐条 ID 一一对应，无遗漏无重复；findings §5 未触发候选族（streaming backpressure / tool-execution 并发）按设计排除（保持登记，非裁决对象）

Exit Criteria:

- [x] `cycle2-adjudication.md` 落档，裁决表零悬挂（findings ↔ 裁决表逐条勾对记录在案）
- [x] 13 条 K finding 的 I4 门禁补强要求契约完整可执行（I4 plan 可据此开工）+ 注册红清零契约显式落档

### Phase 3 — 一致性核对与收口

Status: completed
Targets: `docs/backlog/ai-invariant-loop-roadmap.md`、`docs/logs/2026/08-10.md`

- Item Types: `Decision`

- [x] Decision: roadmap Cycle 2 / I3 行状态回写——记录回写意图（`todo` → `✅` 附执行证据：plan 路径 + closure-audit 引用），翻转动作在 closure-audit 通过后执行（对齐 Cycle 1 先例：行翻转发生在 closure 时，不提前）；**按 Loop Rule「I3 新工作项自动派生（预授权）」追加 Cycle 2 / I4 + I5 两行**（附触发证据 = 裁决表 §3 路由 + 门禁补强契约，引用不重复造数据）；Follow-up Backlog 节按 Phase 2 结果更新
- [x] Decision: daily log 记录本 plan 收口（裁决表产出 + 零悬挂核对结论 + I4/Cycle 2 路由摘要）

Exit Criteria:

- [x] roadmap Cycle 2 / I3 行 ✅ 且执行证据齐备（closure-audit approved（task `ses_0169d8d24ffeDTTOPuuZScDiZl`）后翻转，附 plan 路径 + 审计引用）；Cycle 2 / I4 + I5 行按 Loop Rule 追加（触发证据在案）；Follow-up Backlog 与裁决表一致
- [x] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_016b48f2fffeiJcT7c1eDnuGzs`（fresh session，独立审查）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] 预期裁决基调的 P0 候选清单漏 K-K4/②-2（同为 storage 幽灵形态）→ 已补：K-K4/②-2 预期 P1（元数据级残留，判级标准 = 会话级幽灵复生 P0 vs 纯元数据残留 P1，逐条写 checklist 依据防不对称）
  - [Minor] W-⑨-a 复触发条件措辞（informational）→ 无需改动，仅记录可追溯

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。纯文档计划：不涉及代码变更，`pnpm typecheck`/`build`/`lint`/`test` 从 Closure Gates 中移除（guide 纯文档计划条款，对齐 Cycle 1 / I3 先例）。

- [x] 裁决表零悬挂（findings §3.1+§3.2+§3.3+§4 全部 21 条目 ↔ 裁决表一一对应，勾对记录在案；§5 候选族按设计排除）
- [x] 13 条 K finding 门禁补强要求契约完整（I4 plan 依赖明确）+ 注册红清零契约（⑥×3 + ⑧×1）显式落档
- [x] N=零 结论落档（不派生 Cycle 3，Loop Rule 路由空转记录在案）
- [x] watch-only 8 条维持且复触发条件可追溯（W-E/W-⑨-b 附带评估注记在案）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（13 条 K 全部路由 I4；N=零 已落档；watch-only 均为低严重度/已登记复触发条件）
- [x] No owner-doc update required：本 plan 为裁决文档产出，不改 live baseline / public contract / owner behavior（`engine.md` 等不因本 plan 变更；门禁补强由 I4 执行并同步 owner doc）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（approved，task `ses_0169d8d24ffeDTTOPuuZScDiZl`，零 Blocker/零 Major；证据见 Closure 节）；执行 session 不得自审勾选本项
- [x] `pnpm check:docs-garbled` 通过或候选全部归属既有文件（16 likely-garbled 全为既有文件，本 plan 新增/修改 docs：adjudication + roadmap + daily log 零候选）

## Deferred But Adjudicated

### watch-only residuals（W-E / W-⑨-a/b/c + Cycle 1 W1-W4，维持登记不重开）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 低严重度/窄窗口/复触发条件已逐条登记（findings §3.3 + §4）；W-E 与 W-⑨-b 分别随 K-⑩-1 / K-⑥-3 修复面评估（I4 附带评估，不作承诺）；W1-W4 以 I6 复查结论为锚维持
- Successor Required: `no`（复触发条件在 findings 登记；若 Cycle 2 / I4 修复后任一收敛，按 findings 流程从 watch-only 清单更新）

### 零新族（Cycle 3 不派生）

- Classification: `out-of-scope improvement`（对本 Cycle：无派生对象）
- Why Not Blocking Closure: findings §3.2 双轮探查全部落入既有不变式族（⑥⑦⑨⑩ + K4/② + K3/④），无需要新增不变式陈述的失败类；Loop Rule 派生路径本轮空转，结论显式落档
- Successor Required: `no`

## Non-Blocking Follow-ups

- Cycle 2 / I4 修复 K 条目时若发现「兄弟实例」（类别清扫证据），需回读本裁决表确认路由一致（对齐 Cycle 1 I3 先例）。
- W-E / W-⑨-b 的附带评估结论回写 findings §3.3 对应行（I4 收口时）。

## Closure

Status Note: closure-audit approved——Phase 1/2/3 全 completed + 全 checklist [x] + Closure Gates 8/8 [x]。13 条 K 零悬挂裁决（P0 ×3：K-⑩-4 / K-K4/②-1 / K-K3/④-1 + P1 ×10 → 路由 Cycle 2 / I4 附门禁补强契约 ⑩/⑥/⑦/②/④/⑨ + 注册红清零契约 ⑥×3+⑧×1）、N=零（不派生 Cycle 3）、watch-only 8 条维持（W-E/W-⑨-b 附 I4 附带评估）、零 P2/P3 项——`cycle2-adjudication.md` 落档（21 条目逐条勾对零悬挂）、roadmap Cycle 2 / I3 行 ✅ + I4/I5 行按 Loop Rule 追加、daily log 收口、`pnpm check:docs-garbled` 通过（16 候选全为既有文件，本 plan docs 零候选）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（task `ses_0169d8d24ffeDTTOPuuZScDiZl`，fresh session，不复用执行上下文）
- Evidence: 审计复核对 live repo（2026-08-10）——① 零悬挂核对：21 = §3.1(13) + §3.2(0) + §3.3(4) + §4(4) 逐条 ID 一一对应，13 条 K 无遗漏无重复无静默降级；② 判级诚实：K-⑩-4 / K-K4/②-1 / K-K3/④-1 = P0（checklist 数据丢失/存储损坏判据，对齐 Cycle 1 K3/K4 先例）、K-K4/②-2 = P1（元数据级残留 vs 会话级复生判据防不对称，Draft Review 补强项）、其余 P1；③ live 行号抽查 15+ 处全吻合（`create-engine.ts:228/:362-364/:407-410/:456-458/:469/:484-486/:511/:593-596`、`use-conversation.ts:190/:202-209/:242-246/:316/:382-388/:427-475/:452-455`、`ai-chat.tsx:343-352`），findings 零改动 →「修正痕迹：零修正」成立；④ 门禁补强契约 ⑥⑦⑨⑩②④ 逐族完整 + 注册红清零契约显式落档（I4 plan 依赖明确）；⑤ roadmap I3 行翻转意图记录在案（翻转待本审计通过后执行）+ I4/I5 行追加附触发证据零重复造数据 + Follow-up Backlog 与裁决表一致；⑥ `pnpm check:docs-garbled` 16 likely-garbled 全为既有文件，本 plan 新增 docs 零候选；⑦ 纯文档计划（仅 docs/ 变更，零代码变更）。零 Blocker / 零 Major（1 条 non-blocking minor：I3 行状态格旧措辞随翻转自愈）。

Follow-up:

- Cycle 2 / I4 修复 K 条目时若发现「兄弟实例」（类别清扫证据），需回读本裁决表确认路由一致（对齐 Cycle 1 I3 先例）。
- W-E / W-⑨-b 的附带评估结论回写 findings §3.3 对应行（I4 收口时）。
- 明确 no remaining plan-owned work（除上述 non-blocking follow-up）。
