# 2 Cycle 2 / I1 — 新不变式沉淀（N1-N5 → 第二批门禁）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I1. 不变式沉淀（第二批门禁）
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I1 + Phase Details I1 + Loop Rule，I6 派生）、`docs/audits/ai-invariants/cycle1-findings.md` §3.2（N1-N5 触发证据 + RED 复现）、`docs/audits/ai-invariants/cycle1-adjudication.md` §3（N 表不变式陈述打包）、`docs/audits/ai-invariants/invariant-catalog.md`（Cycle 1 目录，§9 扩展点）、`docs/audits/ai-invariants/gates.md`（棘轮登记处）
> Related: `docs/plans/2026-08-09-2229-1-cycle1-i6-closure-and-cycle2-derivation.md`（前置依赖：roadmap Cycle 2 行追加）、`docs/plans/2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md`（下游：跑 ⑥-⑩ 门禁）
> 修复边界声明：本 plan **只沉淀门禁**（不变式陈述 + 参数化穷举测试 + 静态扫描器规则 + committed 回归 + 登记处同步）；N1-N5 的**代码修复**是 Cycle 2 / I4 的职责（roadmap Phase Details I4 + 本 plan Non-Goals）。门禁以「预期失败」形式落库（机制见 Goals/Decision），套件保持全绿。

## Purpose

把 I6 按 Loop Rule 派生的 Cycle 2 新族 N1-N5（active 位移完整性 / bootstrap 合并 / branch 戳泄漏 / plugin 错误隔离 / 失败轮残留污染）**沉淀为第二批不变式门禁**（⑥-⑩）：不变式陈述入 `invariant-catalog.md` §9（每条四字段，对齐 Cycle 1 先例）；参数化穷举测试 + 表完备性更新入 `engine-invariants.test.ts` / `conversation-invariants.test.ts`（方法表驱动，新增不变式列）；静态可 grep 的不变式补 `scripts/audit/find-ai-engine-invariant-violations.mjs` 扫描器规则 + committed 回归；`gates.md` 棘轮登记处追加 ⑥-⑩ 行。**当前 live 代码违反 ⑥-⑩（N1-N5 全部已复现 RED）**——门禁以「预期失败」形态落库（vitest `it.fails` + 扫描器注册红），I2 审计据此产出确定性 red list，I3 裁决后由 Cycle 2 / I4 修复翻绿。收口状态：⑥-⑩ 门禁全部落库、red 面显式注册、套件全绿、登记处单调追加。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I6 收口——roadmap Cycle 2 / I1 行追加）

- Cycle 1 已闭环（I0-I5 ✅）：门禁 ①-⑤ 全绿基线（`check:ai-engine-invariants` exit 0 + `engine-invariants.test.ts` 15 + `conversation-invariants.test.ts` 13 + 表完备性运行时枚举 + committed 回归 6 用例）；AI 包 66 files/542 tests 全绿（I5 full-green）。
- N1-N5 触发证据 + RED 复现齐备（findings §3.2，probe 全部 RED；live 行号 2026-08-09 起草轮复核）：
  - **N1**（active 提升/复水位移完整性）：`use-conversation.ts:280-313` createConversation（不 bump `switchVersionRef`）；`:315-368` switchConversation（`:322` 唯一 bump 点、`:335/:346` version guard、`:347` `setActiveEngine(engine)` 无位移校验）；`:370-404` deleteConversation（`:382-388` fixup 读 ref 但 `setActiveEngine(next ? (engineCache.get(next.id) ?? null) : null)`——next 不在 cache 时 null 悬挂）；`:427-475` clearAll（不 bump）。5 成员 probe（1/1b/1c/B/C）全 RED。
  - **N2**（mount bootstrap 列表覆盖）：`use-conversation.ts:234-257` bootstrap effect（`:243` `setConversations(convs)` 整体覆盖，非 functional merge）。probe-2 RED。
  - **N3**（pendingBranchId 泄漏）：`create-engine.ts:101` 声明；`:210-229` connector-missing 早退（runOnce 之前 return，戳未消费）；`:383-397` runOnce 消费（`:397` `pendingBranchId = undefined`）；`:578-602` regenerate（`:598` 设戳 + `:601` `await runTurn([])`）。probe-3 RED。
  - **N4**（plugin 错误隔离）：`create-engine.ts:247-249` `await plugin.onTurnStart`（try 之外，try 起于 `:251`——rejection 卡死 processing）；`:336-340` catch 内 `plugin.onError` 先于 mutate（`:341-353`——onError 抛错跳过状态写入）；`:362-364` finally 内 `await plugin.onTurnEnd` 无守卫（rejection 遮蔽原错误）。probe-4/probe-E RED + onTurnEnd 静态证据。
  - **N5**（失败轮残留污染）：`create-engine.ts:484-504` runOnce catch（`:485-486` `loading=false` + commitAssistant 保留空 placeholder）；`:507-528` buildContext（`:511` 仅排除 `isStreamingAssistantPlaceholder`（loading=true）尾消息）。probe-D RED。
- 门禁机制先例（I1/I4）：参数化穷举（方法表驱动）+ 表完备性运行时枚举（`Object.keys(createMessageEngine())` + UseConversationReturn 函数字段 ⊆ 表 ∪ 白名单）+ `check:ai-engine-invariants` 静态扫描器（rules: scanPostAwaitClosureReads / scanAdapterSyncClosureReads / scanControllerIdentityGuard / scanCompletionIdentityGuard）+ committed 回归（`scripts/__tests__/find-ai-engine-invariant-violations.test.ts` 6 用例）。
- 棘轮纪律：门禁只增不减；弱化/豁免需人工确认 + 留痕（gates.md §棘轮规则）。
- 授权：AI 包默认 `implement`；新不变式门禁入 `pnpm check` 视为 check 脚本变更，需 committed 回归测试（mission description + roadmap Cross-Cutting）。
- 既有登记 red（验证时允许存在，非本 plan 引入）：`check:audit-event-dispatch-ctx` 6 hits（industrial）；`check:oversized-code-files` 2 条 locale 豁免。

## Goals

- **⑥-⑩ 五条新不变式沉淀**（catalog §9 追加，每条四字段：陈述 / 覆盖失败族 / 历史 bug 证据（findings §3.2 `文件:行` + probe 编号）/ 检测方法）：
  - ⑥（N1）：adapter post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）必须以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；位移方法（delete/clearAll/create）必须 bump `switchVersionRef` 使在途 switch 失效；删除 active 后的 next 引擎 build-on-demand（禁 `setActiveEngine(null)` 悬挂）；同 id 快速重 switch hydration 不得被 version guard 整体丢弃。
  - ⑦（N2）：storage bootstrap 的 post-await `setConversations` 必须合并当前状态（functional updater），不得覆盖加载期间由 `createConversation` 创建的会话。
  - ⑧（N3）：`pendingBranchId` 必须在使用前被消费或清除；runTurn 任一提前返回路径不得遗留待消费的 branch 戳（防泄漏到无关 turn）。
  - ⑨（N4）：plugin hook 的 rejection 不得使 turn 状态卡死或绕过状态写入：onTurnStart 必须纳入 try/finally 清理面；onError 调用不得先于状态写入（或写入不得被 hook 抛错跳过）；onTurnEnd rejection 不得遮蔽原错误（所有错误必须落在 `requestState`/`lastError`）。
  - ⑩（N5）：failed/aborted 轮的残留空 placeholder 不得进入后续请求历史（应移除或排除）；失败轮必须清理自身产物。
- **门禁落库**（每族一个 Phase，test-first 证据 + 门禁形态）：
  - 参数化穷举测试（方法表驱动，`engine-invariants.test.ts` / `conversation-invariants.test.ts` 新增 ⑥-⑩ 列）——**以「预期失败」形态提交**（vitest `it.fails`）：断言不变式（正确行为）→ 当前 live 违反 → 预期失败（套件保持全绿）；Cycle 2 / I4 修复后翻转 `it`。RED 证据 = findings §3.2 probe 复现（probe-1/1b/1c/B/C/2/3/4/E/D）。
  - 静态扫描器规则（仅对静态可检测的不变式）：⑥ → `scanDisplacementVersionBumps`（位移方法 delete/clearAll/create 函数体必须含 `switchVersionRef.current` bump 语句，缺失即违例）；⑧ → `scanBranchStampReset`（runTurn 内 runOnce 调用前的提前 return 路径必须伴随 `pendingBranchId` 清除；可行性以 live 验证为准，若跨函数不可静态化则记录理由降级为运行时测试 + 在 gates.md 注明）。⑦⑨⑩ 为运行时时序/行为面，不静态化（沿用 K2/K3 先例，误报率高理由记录）。
  - 扫描器命中**显式注册**（本 plan 登记 red）：新规则对 live 代码的预期命中（⑥ delete/clearAll/create ×3 + ⑧ connector-missing 早退 ×1）注册进本 plan + gates.md + daily log，`pnpm check` 口径 = 零**未注册**新命中；Cycle 2 / I4 修复后清零。
  - committed 回归扩展：`scripts/__tests__/find-ai-engine-invariant-violations.test.ts` 追加 ⑥⑧ 规则 fixtures（违规 fixture exit 1 / 清洁 fixture exit 0，对齐既有 6 用例先例）。
- **表完备性门禁核对**：新不变式列不新增公共方法行（12 方法集不变），完备性门禁（方法集 ⊆ 表 ∪ 白名单）维持；如 I2 审计发现新方法则按既有机制报警。
- **登记处同步**：`gates.md` 追加 ⑥-⑩ 行（覆盖方法 × 检测方式 × 运行命令；棘轮状态 = 「预期红（待 Cycle 2 / I4）」→ 修复后「基线绿」）；`engine.md` §Invariants 追加 Cycle 2 节。
- 套件全绿维持：`pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（it.fails 机制）+ `pnpm test:scripts` 全绿 + `pnpm check` 仅登记 red（新增注册 + 既有）。

## Non-Goals

- **不修复 N1-N5 缺陷**——代码修复 + `it.fails` 翻转 + 注册红清零是 Cycle 2 / I4 的职责（roadmap Phase Details I4：test-first 先红后绿 + 类别清扫强制）。本 plan 交付的是「契约已钉、违背可见」的门禁面。
- 不写 bug notes（121-124 先例：bug notes 在 I4 修复轮落档，编号接 124 之后）。
- 不做新审计 / 对抗探查（Cycle 2 / I2，`2026-08-09-2229-3`）。
- 不裁决优先级（Cycle 2 / I3）。
- 不弱化 / 豁免既有门禁 ①-⑤（棘轮硬约束）。

## Scope

### In Scope

- catalog §9 ⑥-⑩ 五条不变式沉淀（四字段）。
- 参数化穷举测试 + 表完备性更新（engine + conversation 两个 invariants 文件）。
- 静态扫描器 ⑥⑧ 规则 + committed 回归 fixtures。
- gates.md / engine.md / catalog 登记处同步；注册红记录。
- I2 计划的输入契约交接（`2026-08-09-2229-3` 引用本 plan 门禁）。

### Out Of Scope

- N1-N5 修复（Cycle 2 / I4）、裁决（Cycle 2 / I3）、审计（Cycle 2 / I2）、bug notes 落档（I4）。

## Failure Paths

| 场景                     | 触发                                                               | 行为                                                                                      | 可重试 | 用户可见表现                  |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| it-fails-unexpected-pass | 修复提前落地（I4 前）使断言通过 → `it.fails` 反转为红              | 套件红 = 提示 I4 翻转标记；本 plan 不翻（I4 职责），记录异常                              | 否     | `pnpm test` AI 包红           |
| scanner-hit-mismatch     | ⑥⑧ 规则 live 命中数 ≠ 注册数（多出 = 新增违规面，少出 = 规则漏扫） | 按差异重新核对注册表 + 规则覆盖面，修正后记录；多出命中若属新方法面 → 登记 + 提示 I2 关注 | 是     | `pnpm check` 红（注册表核对） |
| static-feasibility-fail  | ⑧ 跨函数静态化不可行（live 验证）                                  | 记录理由，降级为运行时测试 + gates.md 注明「不静态化」（对齐 K2/K3 先例）                 | 是     | 门禁覆盖面调整记录            |
| suite-regression         | it.fails 之外的既有测试被新测试/改动破坏                           | 按测试归属修复或退回，不静默降级                                                          | 是     | `pnpm test` 红                |

## Test Strategy

本档选择：必须自动化

门禁本身即测试（roadmap Rule：「Test Strategy = Must automate（不变式门禁本身即测试）」）。本 plan 的交付物主体就是参数化穷举测试 + committed 回归；套件全绿（it.fails 预期失败语义）是 Closure Gates 的硬约束。

## Execution Plan

### Phase 1 — ⑥ 不变式（N1 active 位移完整性）沉淀

Status: completed
Targets: `docs/audits/ai-invariants/invariant-catalog.md`（§9）、`packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-cycle2.test.ts`（⑥⑦ 按 oversized 拆分落点，closure-audit M2）、`scripts/audit/find-ai-engine-invariant-violations.mjs`、`scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Proof: RED 证据确认——按 findings §3.2 N1 五成员场景（probe-1/1b/1c/B/C：switch 在途 × delete/clearAll/create 位移、同 id 快速重 switch hydration 丢失、delete active 后 next 引擎 null 悬挂）书写参数化测试断言不变式 ⑥（提升/复水以 `activeIdRef`/`switchVersionRef` 为裁决面 + 位移方法 bump + build-on-demand + hydration 不整体丢弃），live 实测断言失败（RED 记录在案）
- [x] Decision: ⑥ 门禁形态——参数化穷举测试以 `it.fails` 提交（预期失败，套件绿）+ 静态扫描器规则 `scanDisplacementVersionBumps`（delete/clearAll/create 函数体必须含 `switchVersionRef.current` 自增/版本写入，缺失即违例）；预期 live 命中 = 3（delete/clearAll/create），注册本 plan 登记 red
- [x] Fix: `conversation-invariants-cycle2.test.ts` 新增 ⑥ 测试块（`it.fails` × 5 成员场景）；`find-ai-engine-invariant-violations.mjs` 新增 `scanDisplacementVersionBumps` 规则（豁免：无——delete/clearAll/create 三方法均为位移面，全部必须 bump；`switchConversation:316` 的首语句读取豁免属 ② 规则 `scanAdapterSyncClosureReads` 的 K4 先例，与本规则无关）
- [x] Proof: committed 回归 fixtures——⑥ 违规 fixture（无 bump 的位移方法 → exit 1）×1 + 清洁 fixture（含 bump → exit 0）×1；`pnpm test:scripts` 相关用例绿
- [x] Proof: catalog §9 ⑥ 条落档（四字段，含 probe 编号 + live 行号 + 检测方法）

Exit Criteria:

- [x] ⑥ 参数化测试（it.fails × 5）+ 扫描器规则 + committed fixtures 落地；`pnpm --filter @nop-chaos/flux-renderers-ai test` 绿（预期失败语义下）；扫描器预期命中 3 注册
- [x] catalog §9 ⑥ 条四字段完整

### Phase 2 — ⑦ 不变式（N2 bootstrap 合并）沉淀

Status: completed
Targets: `invariant-catalog.md`（§9）、`conversation-invariants-cycle2.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Proof: RED 证据确认——按 probe-2 场景（create X 后 bootstrap resolve → 列表不得覆盖为 [A]、activeId 不得悬空）书写参数化测试断言不变式 ⑦（post-await `setConversations` 必须 functional merge），live 实测断言失败（RED 记录）
- [x] Decision: ⑦ 门禁形态——运行时参数化测试（`it.fails`）；**不静态化**（functional updater 为行为面，静态误报高，理由记录 gates.md）
- [x] Fix: `conversation-invariants-cycle2.test.ts` 新增 ⑦ 测试块（`it.fails`：bootstrap 覆盖场景 + merge 语义场景）
- [x] Proof: catalog §9 ⑦ 条落档（四字段）

Exit Criteria:

- [x] ⑦ 参数化测试（it.fails × 2 场景）落地；AI 包测试绿；catalog §9 ⑦ 条完整；gates.md ⑦ 行注明「不静态化」理由

### Phase 3 — ⑧ 不变式（N3 branch 戳消费/清除）沉淀

Status: completed
Targets: `invariant-catalog.md`（§9）、`engine-invariants.test.ts`、`find-ai-engine-invariant-violations.mjs`、`scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Proof: RED 证据确认——按 probe-3 场景（regenerate + connector-missing 早退后，下一正常 turn 不得携带 branch 戳）书写参数化测试断言不变式 ⑧，live 实测断言失败（RED 记录）
- [x] Decision: ⑧ 门禁形态——运行时参数化测试（`it.fails`）+ 静态扫描器规则 `scanBranchStampReset`（runTurn 内 runOnce 调用之前的提前 return 路径必须伴随 `pendingBranchId` 清除；先 live 验证静态可行性——connector-missing 早退与 runOnce 消费是否同一闭包可见范围，可行则落规则，不可行则记录理由降级运行时测试并在 gates.md 注明）
- [x] Fix: `engine-invariants.test.ts` 新增 ⑧ 测试块（`it.fails` 泄漏场景 ×1 + **普通 `it` 消费控制场景 ×1——live 实测即绿，若按 `it.fails` 提交将触发 it-fails-unexpected-pass 失败路径使套件红，故控制场景以普通 `it` 提交**）+ 扫描器规则（如静态可行）；预期 live 命中 = 1（connector-missing 早退，`create-engine.ts:210-229`），注册本 plan 登记 red——**扫描/豁免面显式记录**：runOnce 前的两个提前 return 逐一裁决——`isProcessing` 早退（`:206-208`）在设戳路径（regenerate→runTurn）不可达（regenerate 自身有 `isProcessing` 守卫，设戳前已拦截）→ 豁免并记录理由；connector-missing 早退（`:210-229`）可达（regenerate 无 connector 时设戳后必达）→ 扫描目标
- [x] Proof: committed 回归 fixtures——⑧ 违规 fixture（早退无清除 → exit 1）+ 清洁 fixture（清除存在 → exit 0）；`pnpm test:scripts` 相关用例绿
- [x] Proof: catalog §9 ⑧ 条落档（四字段）

Exit Criteria:

- [x] ⑧ 参数化测试（`it.fails` 泄漏 ×1 + 消费控制 `it` ×1）+ 扫描器规则（或降级记录）落地；committed fixtures 绿；扫描器预期命中 1 注册；catalog §9 ⑧ 条完整

### Phase 4 — ⑨ 不变式（N4 plugin 错误隔离）沉淀

Status: completed
Targets: `invariant-catalog.md`（§9）、`engine-invariants.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Proof: RED 证据确认——按 probe-4（onTurnStart rejection 卡死 processing）/ probe-E（onError 抛错跳过 mutate）/ onTurnEnd 静态证据三场景书写参数化测试断言不变式 ⑨（onTurnStart 纳入清理面 / onError 不先于状态写入 / onTurnEnd rejection 落 `requestState`/`lastError` 不遮蔽原错误），live 实测断言失败（RED 记录）
- [x] Decision: ⑨ 门禁形态——运行时参数化测试（`it.fails` × 3 场景）；**不静态化**（plugin 回调交错为行为面，误报高，理由记录）
- [x] Fix: `engine-invariants.test.ts` 新增 ⑨ 测试块（`it.fails` × 3）
- [x] Proof: catalog §9 ⑨ 条落档（四字段）

Exit Criteria:

- [x] ⑨ 参数化测试（it.fails × 3）落地；AI 包测试绿；catalog §9 ⑨ 条完整；gates.md ⑨ 行注明「不静态化」理由

### Phase 5 — ⑩ 不变式（N5 失败轮产物清理）沉淀

Status: completed
Targets: `invariant-catalog.md`（§9）、`engine-invariants.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Proof: RED 证据确认——按 probe-D 场景（失败轮空 placeholder 不得进入后续请求历史）书写参数化测试断言不变式 ⑩（空 placeholder 移除或排除），live 实测断言失败（RED 记录）
- [x] Decision: ⑩ 门禁形态——运行时参数化测试（`it.fails`）；**不静态化**（buildContext 排除谓词为行为面，误报高，理由记录）
- [x] Fix: `engine-invariants.test.ts` 新增 ⑩ 测试块（`it.fails` 失败轮产物排除 ×1 + **普通 `it` 正常轮控制 ×1——live 实测即绿，`it.fails` 形式仅用于 live 违反成员（同 ⑧ 消费控制先例）**）
- [x] Proof: catalog §9 ⑩ 条落档（四字段）

Exit Criteria:

- [x] ⑩ 参数化测试（`it.fails` 排除 ×1 + 正常轮控制 `it` ×1）落地；AI 包测试绿；catalog §9 ⑩ 条完整；gates.md ⑩ 行注明「不静态化」理由

### Phase 6 — 登记处同步 + 全量验证 + 收口

Status: completed
Targets: `docs/audits/ai-invariants/gates.md`、`docs/components/flux-renderers-ai/engine.md`、`docs/logs/2026/08-09.md`、git commit

- Item Types: `Fix | Proof | Follow-up`

- [x] Fix: `gates.md` 追加 ⑥-⑩ 五行（覆盖方法 × 检测方式 × 运行命令；棘轮状态 = 「预期红（待 Cycle 2 / I4）」；⑦⑨⑩ 注明不静态化理由；⑥⑧ 注明扫描器规则名 + 注册命中数）+ 新「注册红」节（4 命中逐条：⑥×3 + ⑧×1 含 live 行号）；`engine.md` §Invariants 追加 Cycle 2 节（⑥-⑩ 摘要 + 注册红说明 + Failure Path 更新：当前失败轮空 placeholder 进后续历史 / plugin hook rejection 卡死为已知违背面，待 I4）
- [x] Proof: 表完备性门禁核对——12 方法集不变、新不变式列不改变完备性断言（完备性测试 3/3 全绿）；如扫描器/运行时枚举发现方法集漂移则记录并修复
- [x] Proof: 全量验证——`pnpm typecheck` / `pnpm build` / `pnpm lint` 33/33；`pnpm test` 60/60 tasks（AI 包 67 files / 544 passed + 12 expected fail）；`pnpm test:scripts` 39/39（含 ⑥⑧ committed fixtures）；`pnpm check` exit 1 仅 = 既有登记 red + 本 plan 注册的 ⑥⑧ 扫描器命中 4，零未注册新增；`check:ai-engine-invariants` 单独复跑命中清单（create-engine.ts:228 ⑧×1 + use-conversation.ts:280/:370/:427 ⑥×3）与注册表逐条对应
- [x] Follow-up: daily log 记录本 plan 收口（⑥-⑩ 门禁清单 + 注册红 + 套件全绿 + ⑧⑩ 控制场景以普通 it 提交的偏差记录）；git commit——`feat(ai-invariant-loop): plan-2026-08-09-2229-2 Cycle 2 I1 第二批门禁 ⑥-⑩ 沉淀（it.fails + 扫描器注册红）`（对齐 I1/I4 commit 先例）

Exit Criteria:

- [x] gates.md ⑥-⑩ 五行 + engine.md Cycle 2 节落地；登记红清单与扫描器实测命中逐条对应
- [x] 全量验证全绿（it.fails 语义 + 注册红口径）；daily log + commit 完成

## Draft Review Record

- Reviewer / Agent: `ses_0190c9a6dffeb3axQVnZeJjp44`（fresh session，独立审查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] ⑥ Fix 项的豁免句错位（switchConversation 的 K4 首语句豁免属 ② 规则，且不在 ⑥ 扫描面）→ 改为「豁免：无——三方法均为位移面」+ 明确归属 ② 规则先例
  - [Minor] ⑧ 预期命中「1」需显式扫描/豁免面 → Phase 3 加注：isProcessing 早退（`:206-208`）设戳路径不可达豁免并记录理由；connector-missing 早退（`:210-229`）为扫描目标
  - [Minor] Phase 6 item-type 标签收紧（gates.md/engine.md 同步保留 `Fix` = owner-doc drift 收敛，rule 15 依据；daily log+commit 保留 `Follow-up` 对齐 I4 先例）
  - [Minor] Phase 6 Exit Criteria 与 Closure Gates 重复全量验证 → 按 review 说明保留（Phase 6 即收口 phase，验证运行即其交付物，且 Closure Gates 已全覆盖）

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] ⑥-⑩ 五条不变式全部沉淀（catalog §9 四字段 + 参数化测试（it.fails）+ 扫描器规则（⑥⑧，或降级记录）+ committed fixtures（⑥⑧））
- [x] 注册红显式登记：⑥×3 + ⑧×1（或实际命中数）记录于本 plan + gates.md + daily log，`pnpm check` 零**未注册**新增命中；不存在被静默降级为 deferred 的 in-scope 面（N1-N5 全部有门禁表达 + 显式 I4 路由）
- [x] 套件全绿（it.fails 预期失败语义下）——AI 包测试（67 files / 544 passed + 12 expected fail）、test:scripts（39/39）、全仓 test（60/60 tasks）无新红
- [x] 表完备性门禁维持（12 方法集零漂移）
- [x] 受影响的 owner docs 已同步（catalog §9 / gates.md ⑥-⑩ / engine.md §Invariants Cycle 2 节 / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（task `ses_018c671deffeNRcdOSIGlhc6au` verdict approved，证据见 Closure 节）；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### N1-N5 代码修复

- Classification: `moved to explicit successor ownership`（显式路由，非延期——roadmap Phase Details I4：修复 = Cycle 2 / I4 职责，test-first 先红后绿 + 类别清扫强制）
- Why Not Blocking Closure: 本 plan 的职责是沉淀门禁（契约钉死 + 违背可见），I2 审计将据 ⑥-⑩ 产出确定性 red list，I3 裁决后 I4 修复——这是 Loop Rule 设计的既定链路，非静默降级；门禁已把缺陷面显式表达（it.fails + 注册红），违背不可逃逸
- Successor Required: `yes`
- Successor Path: Cycle 2 / I4（由 I3 裁决后派生）

### 静态扫描器降级候选（⑧ 跨函数可行性）

- Classification: `optimization candidate`（仅在 Phase 3 live 验证发现静态不可行时触发；若可行则不适用）
- Why Not Blocking Closure: ⑧ 的运行时参数化测试（it.fails）已完整表达契约；静态规则是覆盖面加厚（对齐 K2/K3「纯行为不变式不静态化」先例），降级不损失契约表达
- Successor Required: `no`

## Non-Blocking Follow-ups

- Cycle 2 / I2（`2026-08-09-2229-3`）引用本 plan ⑥-⑩ 门禁作为审计输入（预期 red list = 注册面）。
- 本 plan 的注册红清零 + `it.fails` 翻转 = Cycle 2 / I4 的 Follow-up 义务（执行时核对）。

## Closure

Status Note: 2026-08-09 收口——⑥-⑩ 第二批门禁全部沉淀（it.fails 预期失败形态 + 扫描器注册红 ⑥×3/⑧×1 + committed fixtures 39/39）；N1-N5 代码修复显式路由 Cycle 2 / I4（plan Deferred But Adjudicated + engine.md Failure Path「已知违背面」）；套件全绿（AI 包 67 files / 544 passed + 12 expected fail、test:scripts 39/39、全仓 test 60/60、typecheck/build/lint 33/33）；`pnpm check` 零未注册新增（仅既有登记 red + 本 plan 注册 4 命中）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（general，fresh session，执行 session 未参与）
- Evidence: task `ses_018c671deffeNRcdOSIGlhc6au`，verdict **approved**（零 Blocker / 零 Major；2 Minor 已就地修复——M1 ⑧⑩ 控制场景计数与 it/it.fails 形式表述收敛（plan Phase 3/5 + catalog §9.3/9.5 已更新 + daily log 备注成立）、M2 Phase 1/2 Targets 文件落点更新为 `conversation-invariants-cycle2.test.ts`）；10 项 checklist 全 PASS（plan 一致性 / ⑥-⑩ 沉淀完整性 / 注册红逐条对应（独立复跑 `check:ai-engine-invariants` 4 命中）/ it.fails 语义（独立复跑 3 文件套件绿 + 断言正确行为抽查）/ committed fixtures / 无静默降级 / 表完备性 / 工作区零残留 / docs 同步 / 偏差诚实性）；evidence 见 daily log `docs/logs/2026/08-09.md`。

Follow-up:

- Cycle 2 / I2（`2026-08-09-2229-3`）引用本 plan ⑥-⑩ 门禁作为审计输入（预期 red list = 注册面）。
- 本 plan 的注册红清零 + `it.fails` 翻转 = Cycle 2 / I4 的 Follow-up 义务（执行时核对）。
- 或明确写 no remaining plan-owned work
