# AI Message-Snapshot & State Contract Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/audits/2026-07-24-1757-multi-audit-ai.md` (P1#1, P1#2, P1#3), `docs/audits/2026-07-24-1757-open-audit-ai.md` (O-1, O-2)
> Related: `docs/components/flux-renderers-ai/design.md` §3 Decision-A, `engine.md` §8/§14

## Purpose

把 `flux-renderers-ai` 的消息快照不变性契约（snapshot identity contract）从"多处漏守、靠注释自证、靠全绿藏雷"收敛为"引擎写路径一致经 `mutate`、公共出口一致隔离、并发竞态有 identity 守卫、并由引用-身份回归测试证明"。

## Current Baseline

- `MessageEngineState` 只活在 `MessageStateAdapter`；React 经单一 `useSyncExternalStore` 订阅。`ReactMessageAdapter.buildSnapshot()`（`adapters/react-adapter.ts:48-56`）返回 `{ messages: this.state.messages, ... }`——**不克隆数组**，故 `cached.messages === state.messages`。
- 引擎存在两条**绕过 `mutate` recipe** 直接改"被 cached 快照背书"的消息对象：
  - `engine/create-engine.ts:209-211`（`tool-loop-max` 失败路径）：`const last = adapter.getState().messages.at(-1); if (last) last.metadata = { ...last.metadata, toolLoopMaxReached: true };`
  - `engine/tool-execution.ts:36,61-69`（`executeToolCalls`）：`const owner = adapter.getState().messages.at(-1)` 后在 for 循环里直接改 `owner.state`/`owner.state.toolCall`，注释自承"Commit a fresh reference so subscribers re-render"却**先就地改、后建新引用**。
- `getMessages()`（`create-engine.ts:123-125`）直接 `return adapter.getState().messages`——React adapter 下 = `cached.messages` = `state.messages`，三者同一引用，既不 freeze 也不 copy。公共出口 `ai-component-handle.ts:67-69`（`component:getMessages`）和 `use-conversation.ts:163-168`（`storage.saveMessages`）把这条可变别名直接外泄给 host / 异步存储。
- `getMessages` 的契约声明（`engine/types.ts:286`）写着 "Read-only snapshot"，同名测试（`engine-tool-loop.test.ts:239-246`）只断言 `length===2` 与 `map(role)`，**不**校验引用隔离。
- 包内已有内规（Decision-A，`ai-chat.tsx:39-49` 的 `cloneMessages`）："never the live `engine.messages` reference"，但 `ai-chat.tsx:180-184` 的 `hostScopeData` 在**每个 streaming chunk** 都 `cloneMessages(messages)`（`structuredClone`），注释谎称 "The memo recomputes on `isProcessing` transitions (turn boundaries)"——实际无 memo，per-chunk 触发，深克隆成本随会话长度增长。
- abort→send 竞态：**四个** mutate 点都缺 controller-identity 守卫——`runTurn` finally（`:284-291`，无条件 `draft.abortController = null`）、`runTurn` 外层 catch（`:276-283`）、`runOnce` post-stream abort 检查（`:384-389`）、`runOnce` catch（`:400-407`）。其中 `runOnce` catch 是 abort 发生在 streaming 中途时的**主路径**：stream reject → catch 恢复 → `:400-407` 把新 turn 的 `requestState='processing'` 覆盖为 `'aborted'`。success-path（`:265-270`）仅有**值**守卫（`if (draft.requestState === 'aborted') return;`），不查 controller 身份（但该路径在 abort 竞态中不可达——见 Phase 3 备注）。
- `ReactMessageAdapter.cached`（`react-adapter.ts:22-46`）的全部存在理由是给 `useSyncExternalStore` 提供引用稳定快照，但 **零直接断言**：~6 个测试文件只断言值，无测试断言 `getState()===getState()`（mutation 间同 ref）或 mutate 后 ref 变化。

## Goals

- 引擎写路径不再绕过 `mutate` recipe 就地改"已发布 cached 快照里的消息对象"——所有 `last`/`owner` 的写都搬进 `mutate('messages', draft => {...})` recipe 内。
- `getMessages()` 返回隔离快照（浅拷贝），公共出口 `component:getMessages`/`storage.saveMessages` 不再外泄内部 state 引用。
- abort→send 竞态被 controller-identity 守卫堵住：stale turn 的 `runTurn` catch/finally **与** `runOnce` catch/post-stream-abort-check 都不再 clobber 新 turn 的 `abortController` / `requestState`。
- `hostScopeData` 的 clone 频率收敛到 turn 边界（`requestState` 终态翻转或 `isProcessing` true→false），不再 per-chunk。
- `ReactMessageAdapter` 的引用-身份不变性被显式回归测试证明（mutation 间同 ref、mutate 后新 ref）。

## Non-Goals

- 不重构 adapter 的快照策略本身（Decision-A 的 `structuredClone` 隔离语义保留；只收敛"在何处、何时"克隆）。
- 不改 `MessageEngineState` 的字段结构或引擎对外 API 签名（`getMessages`/`sendMessage`/`abort`/`regenerate`/`setMessages` 签名不变，只改 `getMessages` 返回值的隔离性）。
- 不实现 renderers.md 文档里残留的 phantom 字段（属 Plan 2 的 doc-sync 范围）。
- 不处理 P2 级别项（已移入 `roadmap-ai.md` Follow-up Backlog）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/engine/create-engine.ts`（`getMessages`、`tool-loop-max` 写路径、catch/finally identity 守卫）
- `packages/flux-renderers-ai/src/engine/tool-execution.ts`（`executeToolCalls` 的 `owner` 写路径）
- `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts`（`getMessages` 分支 clone）
- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`（`saveMessages` clone）
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`（`hostScopeData` clone 频率门控）
- 引擎/适配器/handle 的 focused 引用-身份回归测试

### Out Of Scope

- `flux-react` 的 `useHostScope`/`useSyncExternalStore` 绑定本身（不改 runtime）
- Tiptap sender / IME 守卫（Plan 2）
- renderers.md / engine.md / design.md 的 phantom 字段与契约表对齐（Plan 2）

## Failure Paths

> 本计划修复的是既有缺陷，不新增对外契约。下列为修复后必须成立的可测不变性。

| 场景编号                              | 触发                                                        | 预期行为                                                                                                              | 可重试                                | 用户可见表现                                    |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| `getMessages-isolation`               | host 拿 `getMessages()` 后 `.push()`/改字段                 | 引擎内部 state 不被写穿；旧快照不随后续 send 变化                                                                     | 否                                    | 无（静默正确性）                                |
| `tool-loop-max-no-snapshot-pollution` | `maxToolRounds` 命中                                        | `metadata.toolLoopMaxReached` 经由 `mutate` recipe 置位；执行中途读 cached 快照不被就地改写                           | 否                                    | 工具循环上限徽标正确                            |
| `abort-send-race`                     | turn A 流式中 `await abort()` → `await sendMessage('next')` | turn B 的 `abortController` 不被 turn A 的 finally 清空；turn B 的 `requestState='processing'` 不被覆盖为 `'aborted'` | 否（host 重试 sendMessage 即 turn B） | Stop 按钮可中止 turn B；UI 显示 turn B 真实状态 |

## Test Strategy

档位选择：**必须自动化**（snapshot 不变性 + 并发竞态属核心回归路径；见 `00-plan-authoring-and-execution-guide.md` Test Strategy Tiers）。

每个 Phase 的 Proof 项（failing-test-first 或伴随实现的回归测试）必须先于/伴随 Fix 项落地。

## Execution Plan

### Phase 1 - Engine write-path discipline (move out-of-recipe mutations inside `mutate`)

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts:209-217`, `packages/flux-renderers-ai/src/engine/tool-execution.ts:36,61-76`

- Item Types: `Proof | Fix`

- [x] [Proof] 新增回归测试：在 `tool-loop-max` 命中后、`notify` 之前抓取 cached 快照引用，断言快照内的 tail message 的 `metadata.toolLoopMaxReached` **未被就地改写**（旧 ref 的旧值保持不变）；命中后经 `mutate` 置位、`notify` 后新 ref 携带 `toolLoopMaxReached: true`。
- [x] [Proof] 新增回归测试：`executeToolCalls` 执行中途抓取 cached 快照引用，断言 owner message 的 `state.toolCall` 未在 recipe 之外被就地改写；commit 后新 ref 反映最新 per-call 状态。
- [x] [Fix] `create-engine.ts:209-217`：删除 `const last = adapter.getState().messages.at(-1); last.metadata = {...}` 的 recipe 外就地改写；改为在 `mutate('messages', draft => { const tail = draft.messages[len-1]; if (tail) draft.messages[len-1] = { ...tail, metadata: { ...tail.metadata, toolLoopMaxReached: true } }; })` recipe 内完成"读旧→建新→替换"。
- [x] [Fix] `tool-execution.ts:36,61-76`：删除对 `owner`（`adapter.getState().messages.at(-1)`）的就地改写（`owner.state = {}` / `owner.state.toolCall = ...`）；改为在 `mutate('messages', draft => { const t = draft.messages[ownerIndex]; const toolCallState = { ...(t.state?.toolCall ?? {}), [key]: {...} }; draft.messages[ownerIndex] = { ...t, state: { ...t.state, toolCall: toolCallState } }; })` recipe 内完成。

Exit Criteria:

> 每个 Phase 完成后逐条勾选。只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查。

- [x] `tool-loop-max` 与 `executeToolCalls` 的写路径不再在 `mutate` recipe 之外引用/改写 `adapter.getState().messages` 的元素（`rg` 核对 `getState().messages.at(-1)` 后紧跟字段赋值的 pattern 已消除）。
- [x] Phase 1 的两个 Proof 测试通过（snapshot 不被就地污染成立）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai test` 局部通过（focus `engine-tool-loop` + tool-execution 相关）。

### Phase 2 - getMessages isolation + public-exit cloning

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts:123-125`, `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts:67-69`, `packages/flux-renderers-ai/src/adapters/use-conversation.ts:163-168`

- Item Types: `Proof | Fix`

- [x] [Proof] 替换 `engine-tool-loop.test.ts:239-246` 的 fake-green "read-only snapshot" 测试为真校验：`getMessages() !== adapter.getState().messages`（数组引用隔离）；`getMessages()[0] !== adapter.getState().messages[0]`（message 对象引用隔离——防"改字段"写穿）；改返回数组（`.push`）或改元素字段（`.content = 'x'`）均不污染 `engine.getState()`；后续 `sendMessage` 后旧 `getMessages()` 快照 length 不变。
- [x] [Fix] `create-engine.ts:123-125`：`getMessages()` 返回 per-message 浅拷 `return adapter.getState().messages.map((m) => ({ ...m }))`——隔离数组 + 每个 message 对象的顶层字段（`content`/`role`/`id` 等），满足 O-2 "改字段不写穿"语义。仅在 turn 边界（`onResponseComplete`/`saveMessages`）调用，O(n) per turn 可接受。
- [x] [Fix] `ai-component-handle.ts:67-69`：`component:getMessages` 分支（`getMessages` 现已隔离，无需二次 clone）。
- [x] [Fix] `use-conversation.ts:163-168`：`storage.saveMessages(conversationId, engine.getMessages())`（`getMessages` 现已隔离；异步存储实现即使 `await` 后序列化也不读到跨回合混合快照）。

Exit Criteria:

- [x] `getMessages()` 返回值与内部 state 既不同数组 ref、也不同 message 对象 ref（数组 + 顶层字段双重隔离）。
- [x] 替换后的 snapshot 测试断言引用隔离 + 写穿免疫（数组 `.push` 与字段 `.content=` 均不污染）。
- [x] `engine/types.ts:286` 的 "Read-only snapshot" 契约注释与实现一致（补注"returns a per-message shallow-isolated copy"）。
- [x] Phase 1 已先行消除引擎对 message 对象的就地改写（Phase 2 的对象级隔离才能完整成立——Phase 1→Phase 2 顺序依赖）。

### Phase 3 - abort→send race controller-identity guards

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts:276-291` (runTurn catch + finally), `:384-389` (runOnce post-stream abort check), `:400-407` (runOnce catch)

- Item Types: `Proof | Fix`

- [x] [Proof] 新增 `engine-concurrency` 测试：模拟 `abort()→sendMessage('next')` interleave（turn A 流式中、turn A 的 `runOnce` stream 仍 gated 时启动 turn B），断言：(1) turn B 的 `abortController` 不为 `null`（runTurn finally 未 clobber）；(2) `requestState==='processing'`（未被 runOnce catch / runTurn catch / post-stream 检查覆盖为 `'aborted'`）；(3) 后续 `engine.abort()` 能真正中止 turn B（`getAbortController()` 非 null）。覆盖两条 abort 时机：streaming 中途 reject（命中 runOnce catch `:400-407`）与 stream 完成后 abort（命中 post-stream 检查 `:384-389`）。
- [x] [Fix] `create-engine.ts:276-283`（runTurn catch）：mutate 前加 identity 守卫 `if (draft.abortController !== abortController) return;`（stale turn 不覆盖新 turn 的 `requestState`/`isProcessing`/`lastError`）。
- [x] [Fix] `create-engine.ts:284-291`（runTurn finally）：`if (draft.abortController === abortController) draft.abortController = null;`（只清自己的 controller，不 clobber 新 turn 的）。
- [x] [Fix] `create-engine.ts:400-407`（runOnce catch）：加 identity 守卫 `if (draft.abortController !== abortController) return;`——**这是 abort 发生在 streaming 中途时的主路径**（stream reject → catch 恢复 → 覆盖新 turn 状态）。
- [x] [Fix] `create-engine.ts:384-389`（runOnce post-stream abort check）：加 identity 守卫 `if (draft.abortController !== abortController) return;`（abort 发生在 stream 完成后、此检查前的路径）。

> **备注（success-path `:265-270`）**：该路径仅在 turn 正常完成（非 abort）时可达。abort 竞态中 `runOnce` 返回 `{kind:'aborted'}` → `runTurn` 在 `:224-227` 早退，`:265-270` 不执行；且该路径的 value-guard（`if (draft.requestState === 'aborted') return;`）在非竞态场景已足够。故不强制加 identity 守卫，但实施时可顺手统一为 identity 守卫（一行，使不变性一致）。

Exit Criteria:

- [x] runTurn catch（`:276-283`）、runTurn finally（`:284-291`）、runOnce catch（`:400-407`）、runOnce post-stream 检查（`:384-389`）四个 mutate 点均带 controller-identity 守卫（`draft.abortController === abortController` / `!== abortController`）。
- [x] abort→send interleave Proof 测试通过（覆盖 streaming-reject 与 post-stream 两条 abort 时机；Stop 按钮在新 turn 仍可用、UI 不显示 stale terminal state）。
- [x] 现有 `engine-concurrency.test.ts` 的 `isProcessing` 串行化测试仍绿（未回归）。

### Phase 4 - hostScopeData turn-boundary snapshot gating

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:173-185`

- Item Types: `Proof | Fix`

- [x] [Proof] 新增/扩展测试：streaming 期间多个 chunk 到达时，`useHostScope` 收到的 `messages` 引用**不变**（同 ref，per-chunk 不触发 `scope.replace` 重建）；turn 终态翻转（`completed|aborted|error`）后引用更新。因 `cloneMessages` 是 module-local 非导出函数无法直接 spy，Proof 改为观测下游可观测信号：注入一个读取 `${messages}` 的 descendant，断言其收到的数组 ref 在 streaming 中稳定、turn 边界才变化（等价于"clone 不再 per-chunk"，但不依赖 spy 私有函数）。
- [x] [Fix] `ai-chat.tsx:180-184`：把 `hostScopeData` 的 clone 显式门控在 turn 边界——snapshot 仅当 `requestState` 进入终态（`completed|aborted|error`）或 `isProcessing` 翻转 `true→false` 时重建；streaming 中持有上一个 turn-boundary 快照引用。Decision-A 的 clone（隔离）保留，只改频率。
- [x] [Fix] 更正 `ai-chat.tsx:173-179` 注释，使其与实现一致（不再谎称"memo recomputes on isProcessing transitions"而实现是 per-chunk）。

Exit Criteria:

- [x] streaming 期间 `hostScopeData.messages` 引用稳定（per-chunk 不重建），turn 边界才更新（经 descendant 收到的 ref 身份证明，非 spy 私有 `cloneMessages`）。
- [x] `cloneMessages` 不再 per-chunk 触发（等价于 descendant ref 在 streaming 中稳定）。
- [x] 注释与实现一致。

### Phase 5 - ReactMessageAdapter snapshot-identity invariant test suite

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/react-adapter.ts:22-46`, 新增 `packages/flux-renderers-ai/src/adapters/__tests__/react-adapter-identity.test.ts`

- Item Types: `Proof`

- [x] [Proof] 新增 `react-adapter-identity.test.ts`：(1) `getState()` 连续多次调用返回同一 ref（无 mutation 间）；(2) `mutate('messages', …)` 后 `getState()` 返回**不同** ref；(3) cached `messages` 数组 ref 在非 messages-kind mutation 后稳定，在 messages-kind mutation 后翻转；(4) 删除 `cached` 字段（模拟"简化为 always rebuild"）会让该测试 fail（证明它守的是真不变性，非 tautology）。

Exit Criteria:

- [x] `ReactMessageAdapter` 的引用-身份不变性被 4 条断言覆盖（同 ref / 异 ref / messages-kind flip / 反向证明）。
- [x] 测试名与测试体一致（名承诺的不变性恰被断言）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh sub-agent `ses_06c063b1fffeAF4z8rwMTzU4aB`（Round 1）+ `ses_06c0156d7ffeAPnTzNqqXDygLZ`（Round 2，复审）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - **[Blocker, Round 1 → 已修复]** Phase 3 漏了 `runOnce` catch（`create-engine.ts:400-407`）与 post-stream abort 检查（`:384-389`）——abort 发生在 streaming 中途的主路径。Phase 3 已补齐全部四个 mutate 点的 controller-identity 守卫，Proof 覆盖 streaming-reject 与 post-stream 两条 abort 时机。Round 2 确认 Blocker 已解决。
  - **[Minor, Round 1 → 已修复]** Phase 2 浅拷贝未隔离 message 对象顶层字段——已升级为 per-message 浅拷 `messages.map(m => ({ ...m }))` + 字段写穿断言（`.content = 'x'` 不污染 state）。嵌套对象（`metadata`/`tool_calls`）仍共享 ref，但 Phase 1 已消除引擎自身嵌套改写，此为已记录的隔离边界（非隐藏 gap）。
  - **[Minor, Round 1 → 已修复]** Phase 4 Proof 试图 spy 非导出的 `cloneMessages`——已改为经 descendant 读取 `${messages}` 的 ref 身份证明（可观测）。
  - **[Minor, Round 1 → 已修复]** Phase 1→Phase 2 顺序依赖——已在 Phase 2 Exit Criteria 显式标注。
- 引用准确性：Round 2 逐行核对 `create-engine.ts`/`tool-execution.ts`/`ai-chat.tsx`/`react-adapter.ts`/`ai-component-handle.ts`/`use-conversation.ts`，所有引用 ±0 行匹配。

## Closure Gates

> 只有本 section 全部 `[x]` + 每个 Phase Exit Criteria 全 `[x]` 后，才能将 `Plan Status` 改为 `completed`。closure-audit 必须由独立子 agent（fresh session）完成，执行 session 不得自审勾选。

- [x] O-1：引擎写路径不再在 `mutate` recipe 之外就地改 cached 快照里的消息对象
- [x] O-2：`getMessages()` 返回 per-message 隔离快照（数组 + 顶层字段双重隔离）；公共出口不外泄内部 state 引用；同名测试为真校验（含字段写穿免疫）
- [x] P1#1：abort→send 竞态被 controller-identity 守卫堵住（runTurn catch + finally + runOnce catch + post-stream 检查，共四个 mutate 点）
- [x] P1#2：`hostScopeData` clone 收敛到 turn 边界，不再 per-chunk
- [x] P1#3：`ReactMessageAdapter` 引用-身份不变性被显式回归测试证明
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline：**No owner-doc update required** — 本计划不改引擎对外 API 签名（Non-Goals），`design.md` §14.3 / `engine.md` 已将 `getMessages` 描述为"只读快照"，Phase 2 的 per-message 浅拷使实现与该既有描述一致（修复前实现背离文档，修复后两者对齐）；嵌套对象（`metadata`/`tool_calls`/`state`）仍共享 ref 的隔离边界已在 `engine/types.ts:286` 契约注释 + Phase 1（引擎自身不再就地改嵌套）双重编码。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（workspace 58/58 green）
- [x] `pnpm build`（workspace 31/31 green）
- [x] `pnpm lint`（workspace 31/31 green，`react-hooks/refs` 通过——Phase 4 用 React "adjusting state during render" 模式而非 ref）
- [x] `pnpm test`（workspace 58/58 green；flux-renderers-ai 41 files / 345 tests）

## Deferred But Adjudicated

（暂无；执行中若出现需裁定项，按 `Non-Degradable Items` 规则处理。）

## Non-Blocking Follow-ups

- （P2 项见 `docs/components/roadmap-ai.md` `## Follow-up Backlog`，不在本 plan 收口）

## Closure

Status Note: AUDIT VERDICT: pass. All five phases (O-1/O-2/P1#1/P1#2/P1#3) independently re-verified against the live repo by a fresh-session closure-audit sub-agent. All four verification commands are fully green; every invariant assertion was confirmed genuine (would fail under the pre-fix behavior documented in Current Baseline). No in-scope work was silently deferred.

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session)
- Evidence: task id `audit-2026-07-24-ai-snapshot-contract-1`; re-run verification counts (workspace, repo root):
  - `pnpm typecheck` → 58/58 green
  - `pnpm build` → 31/31 green
  - `pnpm lint` → 31/31 green (`react-hooks/refs` clean — Phase 4 uses the React "adjusting state during render" pattern, not a ref)
  - `pnpm test` → 58/58 green; flux-renderers-ai = 41 files / 345 tests
  - One-line-per-phase audit confirmation:
    - Phase 1 (O-1): `rg "getState\(\)\.messages\.at\(-1\)"` in non-test src → zero matches (only a read-only match in `engine-snapshot-write-path.test.ts:80`); tool-loop-max (`create-engine.ts:222-231`) and `executeToolCalls` (`tool-execution.ts:66-82`) writes both moved inside `mutate('messages', ...)` recipes with read-old→build-new→replace.
    - Phase 2 (O-2): `getMessages()` returns `adapter.getState().messages.map((m) => ({ ...m }))` (`create-engine.ts:134`); `engine-tool-loop.test.ts:247,250,253-258,262-265` asserts array-ref + element-ref isolation, push & field-mutate write-immunity, and point-in-time stability across a subsequent turn.
    - Phase 3 (P1#1): all four controller-identity guards present in `create-engine.ts` — runTurn catch (`:296`), runTurn finally (`:308`), runOnce post-stream abort check (`:413`), runOnce catch (`:432`); both race-timing tests (`engine-concurrency.test.ts:218,259`) pass.
    - Phase 4 (P1#2): `ai-chat.tsx:193-202` clones at turn boundaries only (the `isProcessing` true→false flip via the adjusting-state pattern in `useState`); `rg "\.current" ai-chat.tsx` → only two `eventsRef.current` reads, both inside `useEffect` (none during render); projection-stability test (`ai-chat-projection.test.tsx:308`) asserts ref stable across chunks (`:369`) and updates at turn boundary (`:380`).
    - Phase 5 (P1#3): `react-adapter-identity.test.ts` has 4 tests — stable-ref-between-mutations, new-ref-after-mutate, messages-array-ref stable-on-non-messages-mutation (+ flips on messages-kind reassignment), and reverse-proof that an `AlwaysRebuildAdapter` (no `cached` field) breaks the stability invariant.
  - Test honesty spot-check: Phase 1 proof assertions (`capturedToolMessage.metadata.toolLoopMaxReached not.toBe(true)`, `capturedOwner.state.toolCall toBeUndefined()`) and Phase 3 proof assertions (`controllerB` preserved, `requestState==='processing'`, `isProcessing===true` after turn A settles) would each genuinely fail under the pre-fix in-place-mutation / unguarded-mutate behavior recorded in Current Baseline.
  - No silent degradation: the only follow-ups are P2 items in `docs/components/roadmap-ai.md` Follow-up Backlog (lines 34-58), explicitly out of scope per the plan's Non-Goals.

Follow-up:

- no remaining plan-owned work (P2 items tracked in roadmap-ai.md Follow-up Backlog, out of scope)

---

AUDIT VERDICT: pass
