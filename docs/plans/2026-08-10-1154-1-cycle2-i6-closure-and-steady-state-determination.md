# 1 Cycle 2 / I6 — 循环收口与稳态判定（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I6. 循环收口与下一轮触发判定
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I6 + Phase Details I6 + Loop Rule + 动态状态区）、`docs/audits/ai-invariants/cycle2-findings.md`（I2 产出 §6 派生摘要 + §3.3 W-E/W-⑨-b 附带评估更新）、`docs/audits/ai-invariants/cycle2-adjudication.md`（I3 产出 §3.3 N=零 + §3.4 watch-only）、`docs/audits/ai-invariants/gates.md`（I1 + I4 扩展 + 注册红清零节，棘轮登记处）
> Related: `docs/plans/2026-08-10-0925-3-cycle2-i5-verification.md`（前置依赖，full-green 基线）、`docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`（前置依赖，W-E/W-⑨-b 附带评估）、`docs/plans/2026-08-09-2229-1-cycle1-i6-closure-and-cycle2-derivation.md`（Cycle 1 同步骤先例）

## Purpose

收口 Cycle 2：统计本轮产出（新增不变式门禁数 / red list 规模 / 新族数）、复核 watch-only 登记一致性（W-E / W-⑨-a / W-⑨-c + Cycle 1 W1-W4，W-⑨-b 已由 I4 附带评估移除）、执行稳态判定——**N=零 + red list 零 ⇒ 预期标记「稳态暂停」并登记复触发条件**（按 Loop Rule；若复核意外发现新族则派生 Cycle 3 / I1，本 plan 判定以 live 证据为准）。收口状态：Cycle 2 完整闭环、稳态判定落档、roadmap Work Item Status 表追加 Cycle 2 / I6 行（`todo` → `✅`）、动态状态区与 Follow-up Backlog 同步、closure 由独立 fresh session 执行。

## Current Baseline

（live repo 核对，2026-08-10）

- I1-I5 全部 `✅`（roadmap Work Item Status）：I1 沉淀 ⑥-⑩ 第二批门禁（`conversation-invariants-cycle2.test.ts` + 扫描器 `scanDisplacementVersionBumps`/`scanBranchStampReset` + committed 回归）、I2 发现（`cycle2-findings.md` 零悬挂，red list = 注册面 ⑥×3 + ⑧×1 确定性确认）、I3 裁决（`cycle2-adjudication.md` 零悬挂 21 条目：K 13 + N 零 + watch-only 8）、I4 修复（13 条 K 全部修复 + 注册红清零 + 门禁 ⑥⑦⑨⑩②④ 补强 + bug notes 125-130）、I5 验证（full-green 基线：typecheck/build/lint 37/37 ×3、`pnpm test` 66/66 tasks 37 包 12,536 passed/0 failed（AI 包 69 files/572 tests）、`pnpm test:scripts` 8 files/41 tests、`check:ai-engine-invariants` exit 0 零命中（注册红 ⑥×3 + ⑧×1 清零确认）、`pnpm check` 仅既有登记 red 零新增、AI 面 e2e 13 文件 47 passed/0 failed/0 skipped——`docs/logs/2026/08-10.md`）。
- **I6 是 Cycle 2 唯一剩余 `todo` work item**：roadmap 动态状态区已注「Cycle 2 剩余：I6 一行 `todo` 如下表（I6 收口职责：稳态判定 + Cycle 3 派生，按 Loop Rule 由 I6 触发，引用本 I5 full-green 基线为事实输入）」；**Work Item Status 表尚无 Cycle 2 / I6 行**（对齐 I4/I5 由 I3 追加的先例，本 plan 收口时追加并翻转）。
- **Cycle 2 统计事实输入（I3/I4/I5 产出，I6 复核对象）**：
  - 新增不变式门禁：**5 条新不变式（⑥-⑩，Cycle 2 / I1）** + I4 门禁补强（⑥⑦⑨⑩②④：12 处 `it.fails` 翻转 `it`、参数化成员扩展（⑩ 六成员 / ⑥ 八成员 / ⑦ 三成员 / ⑨ 四成员 / ② 镜像写面 / ④ 排空臂）、扫描器新规则 `scanMirrorWriteSurface`、committed 回归追加）——`gates.md` 十行全绿。
  - red list 规模：I2 时点 = 4 注册命中（⑥×3 + ⑧×1，注册面确定性确认）；**I4 清零，I5 确认零命中**（`check:ai-engine-invariants` exit 0）。
  - 新族数：**N = 零**（I3 裁决 §3.3 显式落档：双轮探查全落入既有不变式族，Loop Rule 路由空转，不派生 Cycle 3）。
- **watch-only 登记（I6 复核对象）**：findings §3.3 更新后 = **新 3 条（W-E / W-⑨-a / W-⑨-c，W-⑨-b 已随 K-⑥-3 修复自然收敛移除）** + Cycle 1 **W1-W4 维持**（findings §4，Cycle 2 / I2 复核以 I6 锚点维持）；adjudication §3.4 八行登记在案（W-E/W-⑨-b 的「I4 附带评估」注记已被 I4 收口评估覆盖）。
- **roadmap Follow-up Backlog 同步缺口**：行「稳态期 watch-only 项（2026-08-10 更新）」仍写「新 4 条 W-E / W-⑨-a/b/c」——与 findings §3.3 的 W-⑨-b 移除更新**不同步**，属 I6 同步义务（更新为 3 条并注 W-⑨-b 收敛移除）。
- 既有登记 red（与本 plan 无关，验证时允许存在）：`check:audit-event-dispatch-ctx` 6 hits（industrial，移交 industrial workstream）；`check:oversized-code-files` 2 条 locale 豁免；`check:duplicates:detail` 非门禁归因（jscpd dump 固有 exit 1）。
- 授权：本 plan 为纯文档产出（统计 + 判定 + 回写），不改 live baseline / public contract / owner behavior；稳态判定与 Cycle 派生是 Loop Rule 预授权路径（roadmap Rule）。

## Goals

- Cycle 2 统计落档：新增不变式门禁数（5 条新族 ⑥-⑩ + I4 补强扩展）、red list 规模（I2 时点 4 注册命中 → I4 清零 → I5 零命中确认）、新族数（N = 零）。
- watch-only 复核：登记一致性核对（findings §3.3 三条 + §4 W1-W4 四条 + adjudication §3.4 八行 ↔ roadmap Follow-up Backlog 同步，W-⑨-b 收敛移除状态核销）；关键 live 锚点抽查（W-E 不收敛结论 / W-⑨-a / W-⑨-c / W1 复触发窗口），全部维持 watch-only 登记。
- 稳态判定：**N=零 + red list 零 ⇒ 标记「稳态暂停」**，登记复触发条件三选一（① CI 任一 engine 不变式门禁变红；② `packages/flux-renderers-ai/src/engine/` 或 `src/adapters/use-conversation*` 结构变更（新增/重命名变更型方法）；③ 周期复探——每 major release 或季度取早）。若复核意外发现新失败类 → 按 Loop Rule 派生 Cycle 3 / I1（附触发证据），不预设结论，以 live 证据为准。
- roadmap 同步：Work Item Status 表追加 Cycle 2 / I6 行（`todo` → `✅`，附执行证据）；动态状态区注释更新（Cycle 2 全闭环 + 稳态暂停）；Follow-up Backlog 节同步（watch-only 清单修正 W-⑨-b 移除）。
- closure 由独立 fresh session 执行；Plan Status 随 closure-audit 通过转 `completed`。

## Non-Goals

- 不修复任何 watch-only 项（W-E / W-⑨-a/c / W1-W4 均维持登记；W-⑨-b 已由 I4 收敛移除，不重开）。
- 不执行 Cycle 3 / I1 的门禁实现或 I4 式修复（若判定派生 Cycle 3，只追加 work item 行，实现归 Cycle 3 plan）。
- 不做新审计 / 新对抗探查（那是复触发后 Cycle 3 / I2 的职责）。
- 不改 Loop Rule / 棘轮规则 / 类别清扫强制（硬约束）。

## Scope

### In Scope

- Cycle 2 统计（门禁数 / red list / 新族数）+ 落档。
- watch-only 登记一致性复核（findings / adjudication / roadmap 三处对照 + live 锚点抽查）。
- 稳态判定（预期稳态暂停）+ 复触发条件登记；意外新族时按 Loop Rule 派生 Cycle 3 / I1 行。
- roadmap Work Item Status 表追加 Cycle 2 / I6 行 + 动态状态区 + Follow-up Backlog 同步 + daily log 记录 + commit。

### Out Of Scope

- watch-only 项修复、Cycle 3 门禁实现、新审计（分别归复触发后的 Cycle 3 / I4、Cycle 3 / I1、Cycle 3 / I2）。
- 非 AI 面的仓库验证复跑（引用 I5 full-green 基线即可）。

## Failure Paths

不适用：本 plan 是统计 + 回写 + 判定流程，无外部契约 / 错误处理面。质量门 = 统计数字与引用证据逐条核对（roadmap 追加行触发证据 ↔ findings/adjudication 原文一致，零重复造数据）、watch-only 复核结论有实证或登记依据。

## Test Strategy

本档选择：不适用：纯文档计划（仅修改 `docs/` 下文件 + 只读验证命令复跑），零代码变更；「统计 ↔ 证据核对」即本 plan 的质量验证。验证命令只用于 watch-only 锚点抽查取证（临时 vitest 或既有测试驱动，不落代码、不改 committed 测试文件）。

## Execution Plan

### Phase 1 — Cycle 2 统计 + watch-only 登记复核

Status: completed
Targets: `docs/audits/ai-invariants/gates.md`（只读核对）、`docs/audits/ai-invariants/cycle2-findings.md`（只读核对）、`docs/audits/ai-invariants/cycle2-adjudication.md`（只读核对）、`packages/flux-renderers-ai/src/engine/create-engine.ts` + `src/adapters/use-conversation.ts`（只读锚点抽查）

- Item Types: `Proof | Decision`

- [x] Proof: Cycle 2 统计核对（逐项对照 I1/I3/I4 交付物）：① 新增不变式门禁 = 5 条（⑥-⑩）+ I4 补强（⑥⑦⑨⑩②④：12 处 `it.fails` 翻转 + 参数化成员扩展 + `scanMirrorWriteSurface` 新规则 + committed 回归，`gates.md` 十行全绿）；② red list 规模 = I2 时点 4 注册命中（⑥×3 + ⑧×1）→ I4 清零 → I5 零命中确认（`check:ai-engine-invariants` exit 0）；③ 新族 = 零（N=零，I3 裁决 §3.3 落档）——统计核对结论记录于本 plan（daily log 落档归 Phase 3）。**核对结论（2026-08-10 live 复核）**：① `gates.md` 门禁清单 10 行（①-⑩）全部绿态（②③④⑥⑧ 基线零命中；⑥⑦⑨⑩ 全绿/翻转 + I4 新增成员），`scanMirrorWriteSurface` 在静态扫描器节（I4 新增），committed 回归 11 用例（含 I4 追加 ② 镜像写面 fixture ×2）——与 I4 交付物一致；② `gates.md` 注册红节两条均「已清零（2026-08-10）」+ 本 plan 执行轮 `pnpm check:ai-engine-invariants` 复跑 **exit 0 零命中**——I2 时点 4 注册命中（⑥×3 + ⑧×1）→ I4 清零 → I5/live 零命中确认成立；③ `cycle2-adjudication.md` §3.3 显式落档 N=零（Loop Rule 路由空转，不派生 Cycle 3）——与 I3 交付物一致
- [x] Proof: watch-only 登记一致性核对——findings §3.3（W-E / W-⑨-a / W-⑨-c 三条 + W-⑨-b 移除注记）↔ adjudication §3.4（八行，W-⑨-b 行注记被 I4 评估覆盖）↔ roadmap Follow-up Backlog（需修正「新 4 条」→「新 3 条」）逐条对照；W1-W4 以 findings §4 + I6（Cycle 1）锚点核对。**核对结论（三处对照，live 复核）**：findings §3.3（`2026-08-10 更新` 注记 + 3 行 W-E/W-⑨-a/W-⑨-c，W-⑨-b 已随 K-⑥-3 自然收敛移除）↔ adjudication §3.4（8 行维持登记，W-E/W-⑨-b 行「I4 附带评估」注记已被 I4 收口评估覆盖——adjudication 为 I3 时点历史裁决文本，rows 不删改）↔ roadmap Follow-up Backlog「稳态期 watch-only 项（2026-08-10 更新）」行仍写「新 4 条 W-E / W-⑨-a/b/c」——**不同步，Phase 2 修正为「新 3 条」**；W1-W4 以 findings §4（Cycle 2 / I2 复核，I6 锚点维持）与 Cycle 1 I6 复查结论核对一致
- [x] Proof: 关键 live 锚点抽查（只读 + 可选临时 vitest 取证，禁止修改 committed 测试）：W-E 不收敛结论（`onAfterRequest` 仍在空产物 drop 前触发）、W-⑨-a（connector-missing 早退生命周期不对称）、W-⑨-c（`clear`/`setMessages` 不重置 `lastError`）、W1（abort→(clear|setMessages)→再 abort 窗口）——确认复触发条件登记仍准确。**注**：行号以 live repo 为准（findings/adjudication 记录为 I2/I3 审计时点锚点，post-I4 已漂移，如 W-⑨-c 的 `clear()` 现于 `create-engine.ts:628-641`、lastError 清除现于 `:244`）。**抽查结论（create-engine.ts live 核对）**：W-E——`:531-532` `for (const plugin of plugins) { await plugin.onAfterRequest?.(ctx, assistant); }` 仍无条件调用且先于 `:534` `commitOrDropResidue()`，空产物 drop 未重排/跳过 hook 面 → **不收敛，维持**；W-⑨-a——`:211-231` connector-missing 早退在 `:254-256` onTurnStart 之前 return，仅 `:230` `callPluginError` 无配对 start/end → **生命周期不对称成立，维持**；W-⑨-c——`clear()`（`:628-641`）与 `setMessages()`（`:147-159`）的 mutate recipe 均不含 `draft.lastError = undefined`，`lastError` 清除仅于 `:244`（下一 turn 启动）→ **维持**；W1——`abort()`（`:605-626`）只落 requestState/isProcessing，不重置 `abortController`/`processingState`，clear() 后残留已 abort 的 controller → 二次 abort 仍把 idle clobber 回 'aborted' → **窗口仍在，维持**
- [x] Decision: watch-only 裁决——全部维持 watch-only 登记（W-E / W-⑨-a / W-⑨-c + W1-W4 共 7 条；W-⑨-b 维持「已收敛移除」状态）；任何一条出现收敛证据则如实移除并记录，任何一条复触发条件已满足则按复触发流程登记。**裁决（2026-08-10）**：7 条全部维持 watch-only 登记（W-E / W-⑨-a / W-⑨-c + W1-W4），零收敛证据、零复触发条件满足；W-⑨-b 维持「已随 K-⑥-3 修复收敛移除」状态（findings §3.3 行 + I4 收口评估实证），不重开

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Cycle 2 统计落档（门禁 5 条 + I4 补强 / red list 4→0 清零 / 新族 0），数字与 I1/I3/I4 交付物逐项对应
- [x] watch-only 复核结论有实证或登记依据（维持/移除均落档）；三处登记（findings/adjudication/roadmap）一致性核对完成

### Phase 2 — 稳态判定 + roadmap 同步回写

Status: completed
Targets: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item Status 表 + 动态状态区 + Follow-up Backlog）

- Item Types: `Decision | Proof`

- [x] Decision: 稳态判定——**N=零 + red list 零 ⇒ 标记「稳态暂停」**（findings §3.2 + adjudication §3.3 + I5 门禁零命中确认），登记复触发条件三选一：① CI 任一 engine 不变式门禁变红；② `packages/flux-renderers-ai/src/engine/` 或 `src/adapters/use-conversation*` 结构变更（新增/重命名变更型方法）；③ 周期复探（每 major release 或季度取早）。意外发现新族 ⇒ 按 Loop Rule 派生 Cycle 3 / I1（附触发证据 `文件:行` + 不变式陈述），以 live 证据为准。**判定（2026-08-10）**：N=零（adjudication §3.3 显式落档 + findings §3.2 双轮探查）+ red list 零（`check:ai-engine-invariants` 本 plan 执行轮复跑 exit 0）⇒ **稳态暂停**；复触发条件三选一登记落档（roadmap 动态状态区 + Loop Rule 节已存在同口径，本行在动态状态区追加稳态暂停标记）；**未发现新族，不派生 Cycle 3 / I1**
- [x] Decision: roadmap Work Item Status 表追加 **Cycle 2 / I6. 循环收口与下一轮触发判定** 行（交付范围 = 统计 + 稳态判定 + 复触发条件登记；触发证据 = I3 裁决 §3.3 N=零 + I5 full-green 基线 + I6 plan 执行证据；owner doc = 本路线图「Loop Rule」；依赖 = Cycle 2 / I5）。**执行（2026-08-10）**：I6 行已追加（初始 `todo`，翻转按 Phase 3 纪律待独立 closure-audit 通过后执行，不提前），行内含交付范围 / 触发证据（§3.3 N=零 + I5 full-green + 本 plan）/ owner doc / 依赖
- [x] Proof: 稳态判定数字与 Phase 1 统计逐条对应（零重复造数据）；若派生 Cycle 3，追加行触发证据与 findings §3.2 / adjudication §3.3 原文逐条核对。**核对（2026-08-10）**：稳态判定输入 = 新族 N=零（adjudication §3.3 原文「Loop Rule 路由空转，不派生 Cycle 3 / I1」）+ red list 零（gates.md 注册红节「已清零」+ live 复跑 exit 0）——与 Phase 1 统计逐条对应，零重复造数据；未派生 Cycle 3，无派生行触发证据需核对
- [x] Proof: 动态状态区注释更新（Cycle 2 全闭环、I6 ✅、稳态暂停标记 + 复触发条件）；Follow-up Backlog 节同步（watch-only 清单修正：新 3 条 W-E / W-⑨-a/c + W-⑨-b 收敛移除注记 + W1-W4 维持）。**执行（2026-08-10）**：动态状态区——Cycle 2 / I6 收口记录追加 + 「Cycle 2 完整闭环：I1-I6 全 ✅（2026-08-09/10）+ 稳态暂停 + 复触发条件三选一 + 复触发自动派生 Cycle 3 / I2（跳过 I1）」；Follow-up Backlog——「稳态期 watch-only 项（2026-08-10 更新）」行修正「新 4 条 W-E / W-⑨-a/b/c」→「**新 3 条 W-E / W-⑨-a/c**（W-⑨-b 已随 K-⑥-3 修复自然收敛移除）」，并追加 I6 同步行（watch-only 复核 7 条登记 + 稳态暂停 + 复触发条件）

Exit Criteria:

- [x] roadmap Work Item Status 表含 Cycle 2 / I6 行（`✅`）且与 Phase 1 统计逐条对应；稳态暂停判定 + 复触发条件落档
- [x] 动态状态区注释更新（Cycle 2 全闭环、稳态暂停）；Follow-up Backlog watch-only 清单修正完成（W-⑨-b 移除同步）

### Phase 3 — 收口（同步 + 记录 + closure）

Status: completed
Targets: `docs/logs/2026/08-10.md`、`docs/backlog/ai-invariant-loop-roadmap.md`（I6 行翻转）、git commit

- Item Types: `Proof`

- [x] Proof: daily log 记录本 plan 收口（Cycle 2 统计 + watch-only 复核结论 + 稳态判定 + 复触发条件登记 + roadmap 同步摘要）。**执行（2026-08-10）**：`docs/logs/2026/08-10.md` 顶部追加本 plan 收口条目（背景 + Phase 1 统计/watch-only 复核结论 + Phase 2 稳态判定/roadmap 同步 + Phase 3 收口 + plan 状态，含独立 closure-audit 证据）
- [x] Proof: roadmap Cycle 2 / I6 行 `todo` → `✅`（附执行证据：plan 路径 + daily log + 独立 closure-audit 引用）；**翻转留待 closure-audit 通过后执行（不提前，对齐 I3/I5 先例）**；Follow-up Backlog 节同步（watch-only 复核结论；稳态期 watch-only 项更新为 7 条登记）。**执行（2026-08-10）**：独立 closure-audit（task `ses_01626c83cffeSAovJo71YMpiBM`，fresh session）verdict **approved**（G1-G8 全 PASS，1 Minor 非阻塞：daily log 收口措辞与 verdict/task id 对账，已就地处理）→ 通过后 I6 行 `todo` → `✅` 翻转（含 plan 路径 + daily log + audit task id）；Follow-up Backlog 已在 Phase 2 同步（7 条登记 + W-⑨-b 移除 + I6 同步行）
- [x] Proof: `pnpm check:docs-garbled`（本 plan 新增/修改 docs：roadmap + findings（如更新）+ daily log）exit 0 或候选全部归属既有文件（对齐 Cycle 1 / I6 先例）。**执行（2026-08-10）**：`pnpm check:docs-garbled` exit 0——16 likely-garbled 全为既有文件（2026-05~08 时期 analysis/audits/plans + ppt assets），本 plan 文件（plan + roadmap + daily log）零候选（findings 本 plan 未修改）
- [x] Proof: git commit——`docs(ai-invariant-loop): plan-2026-08-10-1154-1 Cycle 2 I6 收口 + 稳态判定……`（对齐 Cycle 1 / I6 纯记录先例；仅 stage 本 plan 相关文件）。**执行（2026-08-10）**：commit 完成，仅 stage 本 plan 相关文件（plan + roadmap + daily log）

Exit Criteria:

- [x] daily log 落档；roadmap Cycle 2 / I6 行 ✅；Follow-up Backlog 同步；docs-garbled 通过；commit 完成

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_0162fbd00ffena0b5Cb0YzF0OY`（fresh session，独立审查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] W-⑨-c 锚点 `clear()` 行号 post-I4 已漂移（现 `create-engine.ts:628-641`、lastError 清除 `:244`）→ Phase 1 锚点抽查加注「行号以 live repo 为准（findings/adjudication 为 I2/I3 审计时点锚点）」
  - [Minor] Phase 1 统计「落档（daily log）」与 Phase 3 职责重叠 → 改为「核对结论记录于本 plan（daily log 落档归 Phase 3）」
  - [Minor] Cycle 2 / I6 行翻转时序 → Phase 3 加注「翻转留待 closure-audit 通过后执行（不提前，对齐 I3/I5 先例）」

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。纯文档计划：不涉及代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从 Closure Gates 移除（guide 纯文档条款）。

- [x] Cycle 2 统计落档且与 I1/I3/I4 交付物逐项对应（门禁数 / red list / 新族数）
- [x] watch-only 复核完成并有实证或登记裁决（W-E / W-⑨-a / W-⑨-c + W1-W4 共 7 条维持；W-⑨-b 收敛移除核销）
- [x] 稳态判定落档（预期稳态暂停 + 复触发条件三选一登记；若意外新族则 Cycle 3 / I1 派生行 + 触发证据）
- [x] roadmap Work Item Status 表追加 Cycle 2 / I6 行 ✅ + 动态状态区 + Follow-up Backlog 同步（watch-only 清单修正）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（watch-only 7 条按登记复触发条件维持，非延期裁定；W-⑨-b 已收敛移除有实证）
- [x] 受影响的 owner docs 已同步（roadmap Work Item Status + 动态状态区 + Follow-up Backlog + findings（如更新）+ daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（auditor task `ses_01626c83cffeSAovJo71YMpiBM`，verdict **approved**，G1-G8 全 PASS，1 Minor 非阻塞已就地处理——见本 plan Closure 节）；执行 session 不得自审勾选本项
- [x] `pnpm check:docs-garbled` 通过或候选全部归属既有文件（exit 0，16 likely-garbled 全为既有文件，本 plan 文件零候选）

## Deferred But Adjudicated

### W-E（abort-before-first-chunk 轮 onAfterRequest 触发）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 插件侧状态失真（计数/记录类插件把空轮记为完成），engine 状态无损坏；I4 附带评估已确认 K-⑩-1 修复后不自然收敛（`:531-532` 无条件调用），复触发条件登记在案（findings §3.3 W-E 行）
- Successor Required: `no`
- Successor Path: （无需；复触发条件满足时按 Loop Rule 复触发流程）

### W-⑨-a / W-⑨-c（watch-only 维持登记）

- Classification: `watch-only residual`
- Why Not Blocking Closure: W-⑨-a = connector-missing 早退生命周期不对称（设计面，低严重度）；W-⑨-c = `clear`/`setMessages` 不重置 `lastError`（stale 错误下一 turn 自动清除，低严重度）——复触发条件均已登记 findings §3.3，本 plan 不重开
- Successor Required: `no`
- Successor Path: （无需）

### W1-W4（Cycle 1 watch-only 维持登记）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 复触发条件已在 findings §4 逐条登记（W1 abortController 窄窗口自愈 / W2 流式期 setMessageEditing 设计面语义 / W3 病态 listener / W4 abort-onTurnStart 设计行为），Cycle 2 / I2 复核维持，本 plan 不重开
- Successor Required: `no`
- Successor Path: （无需）

## Non-Blocking Follow-ups

- 稳态暂停期间：复触发条件三选一（CI 门禁变红 / engine·use-conversation 结构变更 / 周期复探），复触发时按 Loop Rule 自动派生 Cycle 3 / I2（直接审计，跳过 I1，因门禁已存在）。
- watch-only 7 条（W-E / W-⑨-a / W-⑨-c + W1-W4）维持登记；复触发条件满足时按 findings 流程复核。

## Closure

Status Note: 本 plan 为纯文档收口计划（Cycle 2 / I6 循环收口与稳态判定）。Phase 1-3 全部 completed，Closure Gates 1-8 全部 [x]：Cycle 2 统计（门禁 5 条 ⑥-⑩ + I4 补强 / red list 4 注册命中 → 清零 → live 零命中 / 新族 N=零）与 I1/I3/I4 交付物逐项对应；watch-only 7 条（W-E / W-⑨-a/c + W1-W4）复核维持（live 锚点实证），W-⑨-b 收敛移除核销；稳态判定 N=零 + red list 零 ⇒ 标记「稳态暂停」+ 复触发条件三选一登记（不派生 Cycle 3）；roadmap 同步完成（I6 行 ✅ + 动态状态区 + Follow-up Backlog 修正新 3 条）；`pnpm check:docs-garbled` exit 0 零新增；独立 closure-audit approved（G1-G8 全 PASS）后由执行 session 记录证据收口。纯文档计划按 guide 条款不涉及 code 验证。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent task `ses_01626c83cffeSAovJo71YMpiBM`（独立 session，不复用执行上下文）
- Evidence: verdict **approved**——G1-G8 全 PASS（G1 统计与 gates.md/adjudication §3.3 逐项核对 + `pnpm check:ai-engine-invariants` exit 0；G2 三处登记一致性 + 4 个 live 锚点代码核对（onAfterRequest `:531-533` 先于 commitOrDropResidue `:534` / connector-missing 早退 `:211-231` 在 onTurnStart 前 / clear `:628-641`·setMessages `:147-159` 不重置 lastError / abort `:605-626` 不重置 controller·processingState）；G3 稳态判定 + 复触发条件落档；G4 roadmap I6 行 + 动态状态区 + Follow-up Backlog 修正（todo→✅ 翻转在 audit 通过后执行）；G5 零静默降级；G6 仅 plan/roadmap/daily log 三文件改动；G7 独立 audit 完成；G8 `pnpm check:docs-garbled` exit 0）；1 Minor 非阻塞（daily log 收口措辞与 verdict/task id 对账）已就地处理；审计复跑 `pnpm check:ai-engine-invariants` exit 0 + `pnpm check:docs-garbled` exit 0；daily log `docs/logs/2026/08-10.md` 顶部收口条目在案

Follow-up:

- 稳态暂停期间：复触发条件三选一（CI 门禁变红 / engine·use-conversation 结构变更 / 周期复探），复触发时按 Loop Rule 自动派生 Cycle 3 / I2（直接审计，跳过 I1，因门禁已存在）。
- watch-only 7 条（W-E / W-⑨-a / W-⑨-c + W1-W4）维持登记；复触发条件满足时按 findings 流程复核。
- no remaining plan-owned work。
