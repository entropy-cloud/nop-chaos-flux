# 2 Cycle 1 / I4 — 修复执行（实例 + 类别清扫 + 门禁补强）（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I4. 修复执行（实例 + 类别清扫 + 测试）
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I4 + Phase Details I4 + Loop Rule）、`docs/audits/ai-invariants/cycle1-findings.md`（K1-K4 发现）、`docs/audits/ai-invariants/cycle1-adjudication.md`（I3 裁决输入，依赖前置）
> Related: `docs/plans/2026-08-09-2007-1-cycle1-i3-adjudication.md`（前置依赖：K1-K4 的 P0/P1 裁决 + 门禁补强要求契约）、`docs/plans/2026-08-09-2007-3-cycle1-i5-verification.md`（后继依赖）

## Purpose

修复 I2 发现、I3 裁决为 P0/P1 的 **K1-K4**（engine 2 项 + adapter 2 项），**强制类别清扫**（修任一实例必 grep 全部同类兄弟方法一并核对，只修实例 = 未完成），并按 I3 裁决表要求**补强不变式门禁 ②③④⑤**（测试 + 扫描器 + committed 回归）防同族复发；同步 invariant-catalog / gates.md / engine.md。收口状态：K1-K4 全部修复（test-first 先红后绿）、门禁扩展落地且对 live 零命中、AI 包测试全绿。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I3 先收口）

- I3 裁决表（`docs/audits/ai-invariants/cycle1-adjudication.md`）为前置；未收口则本 plan 不得开工。预期裁决：K1-K4 = P1 → 本 plan；N1-N5 = Cycle 2 / I1（**不在本 plan scope**）；W1-W4 = watch-only。
- 四项发现的 live 位置与机制（findings §3.1 已核对）：
  - **K1** — `create-engine.ts:318-323` 成功路径完成 mutate 无 controller 身份守卫（对照已守卫的 catch :329-341 / finally :342-353 / runOnce :447-455,:466-477）；abort 于 `plugin.onTurnStart`（:240-242，try 外）期间 → ⑤ 同步复位 → 新 turn 启动 → 陈旧 turn 完成写入 clobber 新 turn（probe-A RED）。
  - **K2** — chunk 循环（`create-engine.ts:417-429`）无 per-iteration signal 检查；`abort()`（:509-519）不持在途 generator 句柄 → signal-ignoring connector 迟到 chunk 仍提交 + 永不 settle 的 generator 使 catch/finally 永不执行（placeholder `loading=true` 永久 + abortController 残留）。
  - **K3** — `use-conversation.ts:183-196` attachAutoSave 的 fire-and-forget `saveMessages` vs `deleteConversation`（:348-372）/ `clearAll`（:390-423）storage 删除时序 → 在途 save 晚于 storage 删除 resolve → 已删会话消息重落盘成 ghost（probe-6 RED）；clearAll 的 abort 循环（:394-398）先于 `detachEngine`（:399）→ 在途 save 先于 detach 启动、晚于 storage 删除落盘（aborted 快照重新写入）。
  - **K4** — `use-conversation.ts:374-388` `renameConversation` 读 render 闭包 `conversations`（:377）→ 同 tick create+rename 时 `updated` undefined → 重命名静默不持久化（probe-K4 RED）；`conversationsRef` mirror（:133-136）已存在但仅经 effect 同步，create 未同步更新（对照 `activeIdRef` 的同步更新 :278）。
- 既有门禁基建（I1 落地）：`engine-invariants.test.ts`（12 tests）+ `conversation-invariants.test.ts`（10 tests）参数化穷举 + 表完备性门禁；`scripts/audit/find-ai-engine-invariant-violations.mjs` 静态扫描器（②③④）；`check:ai-engine-invariants` 入 `pnpm check`；committed 回归 `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（4 用例）。门禁清单登记处 `docs/audits/ai-invariants/gates.md`；不变式陈述登记处 `docs/audits/ai-invariants/invariant-catalog.md`；owner doc `engine.md` §invariants。
- 既有回归（保留不动，新测试在其上增量）：`engine-concurrency.test.ts`、`use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`ai-silent-drop-guards.test.tsx`。
- 复现证据：K1=probe-A、K3=probe-6、K4=probe-K4（findings §3.1 记录 RED）；K2 未脚本化（需 signal-ignoring 的 generator，本 plan 先写 RED 测试再修）。
- Bug note 编号：live 最高 120（`docs/bugs/`），新增编号 **121+**，按 `docs/bugs/00-bug-fix-note-writing-guide.md` 写。
- 授权：engine/adapter P0/P1 修复预授权自动（mission description）；**不改变公共 API 契约**（修复均为内部实现与行为语义，`MessageEngine`/`UseConversationReturn` 签名不变）→ 不触发「结构性重构人工确认」门。

## Goals

- K1-K4 四项修复全部落地：test-first（每项先写 RED 回归测试 → 修复 → GREEN），类别清扫强制（每项修复时 grep 全部同类兄弟方法一并核对/修改，清扫记录入档）。
- 门禁补强（按 I3 契约）：
  - ③ → 成功路径完成 mutate 纳入身份守卫检查面（参数化测试 + 扫描器规则）；
  - ⑤ → abort 强制终结在途 generator（运行时参数化测试）；
  - ④ → storage save-after-delete/clearAll 时序守卫（运行时参数化测试）；
  - ② → 扩展至 adapter 变更方法的 sync 闭包读取（参数化测试 + 扫描器规则）。
- 门禁登记处同步：`invariant-catalog.md`（②③④⑤ 陈述扩展）、`gates.md`（清单追加/更新）、`engine.md` §invariants。
- Bug note 121+ 补齐（K1-K4 各一条，按 guide）。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants`（扩展后）live 零命中、类别清扫记录入档。

## Non-Goals

- 不修 N1-N5（Cycle 2 / I1 派生，触发证据在 findings §3.2）。
- 不处理 W1-W4（watch-only；K2 修复对 W1 的 abortController 残留面为附带收敛，不作承诺）。
- 不改公共 API / adapter 契约签名（结构性重构需人工确认，本 plan 不触发）。
- 不做 Cycle 2+ 候选族（plugin 生命周期 / tool-execution / backpressure / branching）的新门禁（N3/N4 属 Cycle 2）。

## Scope

### In Scope

- K1-K4 修复（`create-engine.ts` + `use-conversation.ts`）+ 各自 RED→GREEN 回归测试 + 类别清扫。
- 门禁 ②③④⑤ 扩展（两个 invariants 测试文件 + 扫描器规则 + committed 回归用例追加）。
- 登记处同步（catalog / gates.md / engine.md）+ bug notes 121+。

### Out Of Scope

- 全量仓库验证（I5）、Cycle 2 / I1（派生后另立 plan）、N1-N5 修复。

## Failure Paths

| 场景               | 触发                                           | 行为                                                    | 可重试 | 用户可见表现              |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------- | ------ | ------------------------- |
| gate-extension-red | 门禁扩展测试注入违背样例                       | 断言红（先红后绿证据，预期）                            | 是     | AI 包测试红，证明门禁能抓 |
| scanner-hit        | 修复后代码仍违背静态可检不变式                 | `check:ai-engine-invariants` exit 1，输出违规 `文件:行` | 是     | `pnpm check` 红           |
| regression-red     | 修复破坏了既有行为                             | 既有套件红                                              | 是     | AI 包测试红               |
| sweep-miss         | 类别清扫遗漏兄弟实例（closure audit 抽查发现） | closure-audit 拒绝，plan 退回执行补扫                   | 是     | 无（内部流程门）          |

## Test Strategy

本档选择：必须自动化

不变式门禁本身即测试（roadmap Rule）；K1-K4 每项 Proof（RED）先于 Fix（test-first），门禁扩展附 PROOF 用例（注入违背 → 红）。复杂并发 bug 按 guide 补 bug note（121+）。

## Execution Plan

### Phase 1 — K1：成功路径完成 mutate 身份守卫（engine）

Status: planned
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/__tests__/engine-invariants.test.ts`、`scripts/audit/find-ai-engine-invariant-violations.mjs`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（probe-A 场景）——`abort()` 于 `plugin.onTurnStart` 挂起期间被调用 → 同步复位 → 立即 `sendMessage` 启动新 turn → 陈旧 turn 从 onTurnStart 恢复后完成写入：断言新 turn 的 `requestState`/`isProcessing` 不被 clobber（新 turn 流式期间状态仍 `'processing'`、abortController 为新控制器）——**此半即 RED 半**；另断言「abort 后无新 send」场景下终态仍为 `'aborted'`——**此为守卫保持断言（修复前已绿，属既有 :319 早退语义），防修复回归**；修复前 probe-A 半 RED
- [ ] Fix: `create-engine.ts:318-323` 完成 mutate 加身份守卫 `if (draft.abortController !== abortController) return;`（对齐 :334/:451/:470 既有模式）——**保留既有 `if (draft.requestState === 'aborted') return;` 早退，新守卫为加性修改**；类别清扫——grep 全部 `adapter.mutate('requestState', ...)` 终态写入 recipe（:211-217 connector-missing 同步早退路径记录「无并发窗口」理由；:288-293 tool-no-executor 路径核对守卫必要性），清扫记录入档
- [ ] Fix: 门禁 ③ 扩展——`engine-invariants.test.ts` 参数化表新增「完成路径身份守卫」行（abort-during-onTurnStart + send 交错断言）；扫描器补成功路径规则（完成 mutate 的 `'completed'` recipe 必须含 `draft.abortController !==` 判据）；`scripts/__tests__/find-ai-engine-invariant-violations.test.ts` 追加违规/清洁 fixture 用例
- [ ] Proof: PROOF 用例——注入「完成 mutate 无守卫」违规 fixture → 扫描器/测试红（先红后绿证据记录）

Exit Criteria:

- [ ] K1 回归测试由 RED 转 GREEN；probe-A 场景断言全绿
- [ ] 门禁 ③ 扩展覆盖完成路径（参数化 + 扫描器 + committed 回归），live 扫描零命中
- [ ] 类别清扫记录入档（engine 全部终态写入 recipe 核对结论）

### Phase 2 — K2：abort 强制终结在途 generator 消费（engine）

Status: planned
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/__tests__/engine-invariants.test.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试——signal-ignoring 但**有限 yield 后 settle** 的 connector（abort 后继续产出 N 个 chunk 再正常结束，保证测试快速失败而非 vitest 超时）：abort 后断言（a）在途轮在有限迭代内 settle（`requestState='aborted'`/`isProcessing=false`/abortController=null）；（b）abort 之后产出的迟到 chunk 不被 apply/commit 到消息（修复前此断言即 RED）；「永不 settle 的 generator」不放入运行时测试（由 Decision 项裁定为 connector 契约违背）
- [ ] Fix: chunk 循环（:417-429）加 per-iteration `if (abortController.signal.aborted) break;`（迟到 chunk 抑制；break 触发 AsyncIteratorClose → 协作式 generator 的 `.return()` 立即结算）；engine 闭包新增在途 generator 句柄（`let activeGenerator`，`runOnce` 在 `connector.stream()` 后登记；正常完成 / catch / 后置 abort 检查各出口置 null——已耗尽的 generator 上 `.return()` 为 no-op，置 null 防悬挂句柄）；`abort()`（:509-519）调用 `activeGenerator?.return()`（best-effort 强制终结）+ 既有同步复位
- [ ] Decision: 记录设计裁定——「永不 yield 的 generator（卡在自己内部 await）无法从外部抢占，属 connector 契约违背」；该裁定经 Phase 5 统一写入 engine.md Failure Path（本 Phase 只做裁决记录，避免双写）
- [ ] Fix: 门禁 ⑤ 扩展——`engine-invariants.test.ts` 参数化表新增「abort 强制终结」行（signal-ignoring-yielding connector 断言）；纯行为不变式不静态化（沿用 I1 裁定）

Exit Criteria:

- [ ] K2 回归测试由 RED 转 GREEN（含迟到 chunk 抑制断言）
- [ ] 门禁 ⑤ 扩展测试覆盖 abort 强制终结路径，live 零命中
- [ ] 设计裁定（永不 settle connector = 契约违背）记录入档

### Phase 3 — K3：save-after-delete/clearAll ghost 重落盘（adapter）

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants.test.ts`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（probe-6 场景，mock storage 可控 resolve 顺序）——（a）in-flight `saveMessages`（先于 delete 启动、后于 delete 完成）→ 断言 delete 后 storage 不含已删会话消息（无 ghost）；（b）processing 中 `clearAll` → 断言 aborted 快照不落盘、**storage 终态为空**（clearAll 为同步签名 `(): void`，测试侧等待 mock storage 最后一次操作 resolve 或 `waitFor` 终态，不断言单个 promise 完成顺序）；修复前 RED
- [ ] Fix: `use-conversation.ts`——① per-conversation 在途 save 串行化（`pendingSavesRef`：attachAutoSave 把 `saveMessages` 链到该会话 pending promise 上）；② **按方法签名分机制排空在途 save**——`deleteConversation`（异步 `:348`）在 `storage.deleteConversation` **之前** `await Promise.allSettled` 该会话在途 save；`clearAll`（同步 `(): void`，公共 API 签名不变）**不 await**，改为把 storage 清空链到排空链之后（`void (async () => { await drain; await storage?.clearAll?.(); })()` 或 `.then()` 追加，per-id fan-out 同理）——排空→删除的顺序保证不变、sync 签名不破坏，**链内 storage 调用保持 `reportStorageError` 路由（.catch per 不变式④）**（记录该理由）；③ `clearAll` 顺序调整：`detachEngine`（退订）先于 abort 循环（:394-399 反序）——abort 触发的 auto-save 回调不得再启动新 save
- [ ] Fix: 类别清扫——delete/clearAll/create/switch 的 storage 调用点全部核对「在途 save 排空」语义（clearAll 走链式排空、delete 走 await 排空）；`attachAutoSave` 订阅生命周期与退订顺序核对；清扫记录入档
- [ ] Fix: 门禁 ④ 扩展——`conversation-invariants.test.ts` 参数化表新增「save-after-delete 时序守卫」行（mock storage 乱序 resolve → 无 ghost，断言 storage 终态）；扫描器不扩展（运行时时序，静态误报高——记录理由）

Exit Criteria:

- [ ] K3 回归测试由 RED 转 GREEN（两个断言场景全绿）
- [ ] 门禁 ④ 扩展测试覆盖时序守卫，live 零命中
- [ ] 类别清扫记录入档（adapter 全部 storage 调用点核对结论）

### Phase 4 — K4：renameConversation sync 闭包读取（adapter）

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants.test.ts`、`scripts/audit/find-ai-engine-invariant-violations.mjs`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（probe-K4 场景）——同 tick `createConversation()` + `renameConversation(id,'T2')` → 断言 storage 收到的保存 title === `'T2'`（持久化不丢失）；修复前 RED
- [ ] Fix: `use-conversation.ts`——`renameConversation`（:374-388）改读 `conversationsRef.current`；`createConversation`（:272）同步更新 `conversationsRef.current`（对齐 `activeIdRef` 同步更新 :278 模式）
- [ ] Fix: 类别清扫——全部 conversations 列表变更方法（create :272 / rename :376 / delete :349 / clearAll :401）的 ref mirror 同步核对（**全部**改为同步维护，不依赖 effect flush）；`switchConversation` :294 闭包读（异步方法**首语句、await 之前**的读取）记录「安全，不改」理由并**在扫描器规则中显式豁免**；清扫记录入档
- [ ] Fix: 门禁 ② 扩展——不变式陈述扩展至「adapter 变更方法的 sync 闭包读取」；`conversation-invariants.test.ts` 参数化表新增 rename sync 行；扫描器补规则——**判别准则：仅 flag adapter 变更方法体内「首次状态变更语句（`setConversations`/`setActiveId`/`create`/`delete`/`await`）之后」出现的裸 `conversations`/`activeId` 读取**（`switchConversation:294` 为方法首语句、await 前读取 → 豁免并记录理由；`renameConversation:377` 在 `setConversations`（:376）之后 → 被抓）；committed 回归 fixture 追加

Exit Criteria:

- [ ] K4 回归测试由 RED 转 GREEN（同 tick create+rename 持久化断言全绿）
- [ ] 门禁 ② 扩展覆盖 sync 读取（参数化 + 扫描器 + committed 回归），live 扫描零命中
- [ ] 类别清扫记录入档（adapter 全部列表变更方法 ref 同步核对结论）

### Phase 5 — 类别清扫复核 + 登记处同步 + bug notes

Status: planned
Targets: `docs/audits/ai-invariants/invariant-catalog.md`、`docs/audits/ai-invariants/gates.md`、`docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-09.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Proof: 类别清扫终审——跨 engine + adapter grep 四类修复模式全部兄弟实例（终态写入守卫 / generator 消费 / storage 时序 / 列表闭包读取），与 Phase 1-4 清扫记录逐条核对，形成清扫总表（文件:行 + 结论）入档
- [ ] Fix: `invariant-catalog.md` ②③④⑤ 陈述扩展（对齐本 plan 门禁补强：② sync 读取 / ③ 完成路径 / ④ 时序守卫 / ⑤ 强制终结）+ `gates.md` 门禁清单追加/更新（棘轮单调）
- [ ] Fix: `engine.md` §invariants 同步（门禁清单 + 运行命令 + K2 设计裁定「永不 settle connector = 契约违背」Failure Path）
- [ ] Fix: bug notes 121+（K1-K4 各一条，按 `docs/bugs/00-bug-fix-note-writing-guide.md`：触发 / 根因 / 修复 / 类别清扫范围 / 回归测试）
- [ ] Proof: AI 包全量测试（`pnpm --filter @nop-chaos/flux-renderers-ai test`）+ `pnpm check:ai-engine-invariants`（扩展后）live 零命中 + `pnpm test:scripts`（committed 回归追加用例全绿）
- [ ] Follow-up: daily log 记录本 plan 收口（K1-K4 修复 + 门禁扩展 + 清扫总表摘要）

Exit Criteria:

- [ ] 清扫总表入档（含全部兄弟实例核对结论，closure audit 抽查依据）
- [ ] catalog / gates.md / engine.md 与 live 门禁状态一致；bug notes 121+ 落档
- [ ] AI 包测试全绿零回归；扩展后门禁 live 零命中；scripts 回归全绿

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_01990d393ffeaqPyMK6kBoYm1g`（fresh session）→ `revised`；Round 2 `ses_01989f3abffeTAoBe4vV4YFPD5`（fresh session）→ `pass-with-minors`，零 Blocker / 零 Major，共识达成
- Verdict: `pass-with-minors`（Round 2）
- Rounds: 2
- Findings addressed:
  - [Major M1] clearAll 同步签名 vs await 排空矛盾 → 分机制：deleteConversation await 排空、clearAll 链式排空（sync 签名不变，排空→删除顺序保证）
  - [Major M2] 扫描器规则与 switchConversation:294 豁免冲突 → 判别准则钉死：仅 flag「首次状态变更语句之后」的裸读取，:294 豁免并记录理由
  - [Minor] K1 守卫加性修改 → 保留 :319 早退、身份守卫加性追加 + 「abort 无新 send」保持断言
  - [Minor] K2 RED 测试 → 有限 yield 后 settle connector（避免 vitest 超时），永不 settle 归 Decision 项
  - [Minor] K3 基线措辞 → 「在途 save 先于 detach 启动、晚于 storage 删除落盘」
  - [Minor] K3 RED 测试 (b) → 断言 storage 终态（waitFor），不断言 promise 顺序
  - [Minor] K3 链式 clearAll → reportStorageError 路由显式保留（.catch per ④）
  - [Minor] K2 activeGenerator 清理 → 各出口置 null（耗尽 generator .return() 为 no-op）
  - [Minor] K2 契约违背裁定 → 统一由 Phase 5 写入 engine.md，避免双写
  - [Minor] switchConversation 措辞 → 「异步方法首语句、await 前读取」

## Closure Gates

- [ ] K1-K4 全部修复落地，各自 RED→GREEN 回归测试在案（probe-A / signal-ignoring / probe-6 / probe-K4 场景）
- [ ] 门禁 ②③④⑤ 扩展全部落地（参数化测试 + 扫描器规则（②③）+ committed 回归追加），live 零命中
- [ ] 类别清扫强制满足：清扫总表入档（修任一实例必核对全部兄弟；closure audit 抽查）
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect（K1-K4 全部修复；N1-N5/W1-W4 路由明确且不在本 plan scope）
- [ ] 登记处同步完成：`invariant-catalog.md` / `gates.md` / `engine.md` §invariants / bug notes 121+
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### W1（abort 不重置 processingState/abortController 残留）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 窄窗口（abort→(clear|setMessages)→再 abort）且自愈（陈旧轮 finally 身份守卫清理 + 新 turn 覆盖）；K2 修复（强制终结 + finally 清理面）预期附带收敛 abortController 残留面，但属附带收益不作承诺（findings §4 W1）
- Successor Required: `no`

### N1-N5（新族，本 plan 不处理）

- Classification: `out-of-scope improvement`（对本 plan：Cycle 2 / I1 派生项）
- Why Not Blocking Closure: Loop Rule 强制「新族 → Cycle N+1 / I1 沉淀」，触发证据齐备（findings §3.2 全 RED）；I6 收口时自动派生，路由完整
- Successor Required: `yes`
- Successor Path: Cycle 2 / I1 新不变式沉淀（I6 派生回写 roadmap 后立项）

## Non-Blocking Follow-ups

- K2 修复后 W1 的 abortController 残留面复查（若已被收敛，I5/I6 时从 watch-only 清单移除并记录）

## Closure

Status Note: （待执行后填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立 fresh session 填写）
- Evidence: —

Follow-up:

- （待执行后填写；预期：无 plan-owned 剩余工作，后续为 I5 全量验证）
