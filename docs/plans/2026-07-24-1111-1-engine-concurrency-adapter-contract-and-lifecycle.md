# {1} flux-renderers-ai Engine & Adapter Contract, Concurrency, Lifecycle & Performance Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/audits/2026-07-23-2141-open-audit-ai.md` (F1.1, F1.2, F1.3, F1.6, F2.2, F2.3, F3.2, F3.3), `docs/audits/2026-07-23-2141-multi-audit-ai.md` (AI-01, AI-03, AI-06, AI-08, AI-18(engine-half), AI-19(engine-half), AI-20, AI-23, AI-24, AI-28)
> Finding-split note: AI-18 跨两层——engine 模块（state-adapter/plugins）归本计划；bubble renderers（error/loading/text.tsx + `extractLastUserText` 死代码）归 Plan {3}。AI-19 跨两层——engine 写 `lastError` 到 state 归本计划（engine 拥有 `create-engine.ts` catch path）；renderer 读 `state.lastError` 喂 `onError` 归 Plan {2}。
> Related: Plan {2} (renderer tier — depends on this plan's engine contract), Plan {3} (conformance/docs/quality tier)
> Execution Order: 1 — unblocks Plan {2} (renderer error/subscribe fixes depend on engine concurrency + error state landed here).

## Purpose

把 `@nop-chaos/flux-renderers-ai` 的 **engine 与 adapter 层** 收口到「回合串行化可靠、abort 可达、adapter 契约自足、tool-loop 在 useConversation 路径可用、卸载释放资源、提交路径非线性、owner-doc 与 live interface 一致」的状态。这是两份 open audit 中唯一 P0（AI-01，Bug 07 recurrence）所在层，必须最先修。

## Current Baseline

- 包 `packages/flux-renderers-ai/` 已存在：engine (`create-engine.ts` 606 行、`state-adapter.ts`、`types.ts`、`native-adapter.ts`、`plugins/`)、adapters (`use-message.ts`、`use-conversation.ts`、`ai-component-handle.ts`、`ai-connector-factory.ts`)。
- 验证基线（审计时）：`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` PASS、`pnpm test` 274/274 PASS、`pnpm lint` clean —— **下列缺陷在全绿前提下共存**，说明现有测试存在盲区。
- `clear`/`setMessages`/`regenerate` 已有 `isProcessing` 守卫；唯独 `sendMessage`/`send`/`runTurn` 三个主发送入口无守卫（AI-01）。
- `create-engine.ts` 有 6 处 `(adapter as unknown as { state: InternalMessageState }).state.*` 穿透读私有字段（AI-08）；`MessageStateAdapter` 接口只暴露 `PublicMessageState`（无 `connector`/`abortController`）。
- `useConversation.buildEngine` 转发 plugins/initialMessages/extraRequestParams/systemPrompt/adapter，**漏** `tools`/`toolExecutor`/`maxToolRounds`（F1.2；同包 `use-message.ts:63-75` 已正确转发）。
- `engine.md §8.1` 文档 8 方法，实际 interface 11 方法（AI-06）；`§8.5` 文档 `useRef`，实际 `useState` lazy initializer（AI-20）。
- `ai-component-handle.ts:24` docstring "5 logical methods" 实为 6（F3.3）。

## Goals

- AI-01/P0 关闭：`sendMessage`/`send`/`runTurn` 入口串行化，并发重入不再覆写 abortController、不再交错双流。
- abort 可达所有在途 controller（AI-03 作为 AI-01 的副作用关闭）；`abort()` 不再含空 recipe 死代码（F1.6）。
- `MessageStateAdapter` 契约自足：删除 6 处穿透 cast，接口暴露真实读取需求或收紧到基类（AI-08）。
- `useConversation` 路径 tool-loop 可用：`buildEngine` 转发 tool 三项（F1.2）；storage 失败对 host 可观测（AI-28）。
- 卸载释放自建 engine 在途流（F2.2）；connector factory 生成器内部兜底检查 `signal.aborted`（F2.3）。
- 提交路径消除每 chunk O(n) 扫描（AI-23）；`create-engine.ts` 回到 500 行阈值内（AI-24）。
- engine 关键模块（state-adapter、plugins）有直接单测（AI-18 engine-half）。
- engine catch path 把真实 error 写入 state（`lastError`），供 renderer 透传（AI-19 engine-half，解阻塞 Plan {2} 的 renderer-half）。
- `engine.md §8.1/§8.5`、`ai-component-handle.ts` docstring 与 live interface 一致（AI-06、AI-20、F3.3）。

## Non-Goals

- 不修 renderer 层资源/事件/Decision-A/projection 缺陷（归 Plan {2}）：AI-02、AI-04、AI-09、AI-10、AI-11、AI-12、AI-19(renderer-half，读 `state.lastError` 喂 `onError`)、F1.4、F1.5。
- 不修样式/UI/doc-tree/test-quality 治理项（归 Plan {3}）：AI-05、AI-07、AI-13~AI-17、AI-18(bubble-renderer half：error/loading/text.tsx + `extractLastUserText`)、AI-21、AI-22、AI-25~AI-27、AI-29~AI-34、F3.1。
- 不收敛全仓 raw `<button>`（F3.4，observation，不归本 mission）。
- 不改 engine 的对外公共导出清单（AI-26 归 Plan {3}）；本计划只动 engine/adapters 内部实现与其 owner-doc。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/engine/create-engine.ts`、`engine/types.ts`、`engine/state-adapter.ts`、`engine/plugins/*`。
- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`use-message.ts`、`ai-connector-factory.ts`、`ai-component-handle.ts`。
- engine/adapters 对应 `__tests__/` 新增与回归用例。
- owner-doc：`docs/components/flux-renderers-ai/engine.md`（§8.1、§8.5）、`ai-component-handle.ts` docstring。

### Out Of Scope

- renderer 文件（ai-chat.tsx、ai-voice-input.tsx、ai-attachments.tsx、ai-tool-call.tsx、ai-message-list.tsx 等）—— Plan {2}。
- `src/index.ts` 导出治理、`rich-text/`、`styles.css`、schema/definitions 字段清单 —— Plan {3}。
- F3.4（全仓 raw `<button>`）、F3.5（markdown XSS 嵌套用例，非确认缺陷）。

## Failure Paths

| 场景                            | 触发                                                          | 行为                                                         | 可重试                      | 用户可见表现                          |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------- | ------------------------------------- |
| `engine-turn-concurrent-reject` | 回合进行中再次 `sendMessage`/`send`                           | 守卫拒绝（返回 canonical cancelled 结果），不覆写 controller | 是（host 可在 idle 后重发） | 无双流交错；不产生重复 LLM 计费       |
| `engine-abort-reaches-all`      | 并发已不可能（AI-01 守卫）+ `abort()` 调用                    | 终止当前在途 controller，state 转 `aborted`                  | 否                          | Stop 即停；无后台孤儿流               |
| `use-conversation-tool-loop`    | `buildEngine` 构建的 engine 收到 `finish_reason:'tool_calls'` | 有 executor 则执行 tool-loop；无则 `tool-no-executor` error  | 否                          | useConversation 路径 agentic 能力可用 |
| `engine-unmount-abort`          | 自建 engine 的 hook 卸载                                      | 终止在途流、释放连接                                         | 否                          | 路由切换不残留后台流                  |
| `storage-error-observable`      | conversation 存储加载/保存失败                                | 对 host 暴露 lastError/回调（非静默）                        | 是（host 可 toast/重试）    | 配额/网络失败有用户反馈               |

## Test Strategy

档位选择：**必须自动化**。

理由：AI-01 是 Bug 07 recurrence 的 P0 公共 host-utility 契约缺陷；adapter 契约自足（AI-08）、tool-loop 可用性（F1.2）、abort 可达性均跨公开契约边界，且当前在全绿下隐藏 —— 对应 Proof 项必须在 Fix 之前/同时落地。

## Execution Plan

### Phase 1 - 回合并路与 abort 可靠性（P0 关闭）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/adapters/ai-connector-factory.ts`

- Item Types: `Proof`（先写失败用例）→ `Fix`

- [x] **Proof**：在 `engine/__tests__/` 新增并发回归用例——「`sendMessage` 进行中再次 `sendMessage`/`send`/`component:sendMessage`/`ai:send` 时第二条被守卫拒绝、不覆写 `draft.abortController`、旧流仍可 abort、`requestState`/messages 不被交错改写」。当前应失败。
- [x] **Proof**：新增「`abort()` 终止当前在途 controller 且 state 转 `aborted`」用例（覆盖 AI-03）。
- [x] **Fix** AI-01：`sendMessage`/`send` 入口（或统一在 `runTurn` 入口）加 `if (adapterState.isProcessing) return cancelledResult;`；返回 canonical cancelled 结果使 action 链视为 ignored 而非业务 error。对照 Bug 07 fix（`docs/bugs/07-submit-concurrent-guard-fix.md`）。
- [x] **Fix** F1.6：删除 `abort()` 中第一个空 recipe 的 `mutate`（死代码 + 无意义通知）。
- [x] **Fix** F2.3：`ai-connector-factory.ts:59-67` 生成器循环内部加廉价 `if (signal.aborted) break/return;` 兜底，abort 生效不完全压给 host `env.stream`。

Exit Criteria:

- [x] `create-engine.ts` 三个发送入口存在 `isProcessing` 守卫；`engine.test.ts` 双发并发用例由红转绿。
- [x] `abort()` 无空 recipe；abort 回归用例绿。
- [x] connector factory 生成器含 `signal.aborted` 检查（grep 可证）。

### Phase 2 - Adapter 契约自足 + engine 模块测试覆盖

Status: completed
Targets: `engine/types.ts`、`engine/state-adapter.ts`、`engine/create-engine.ts`、`engine/__tests__/`

- Item Types: `Proof` → `Fix` → `Decision`

- [x] **Proof**：新增 `engine/__tests__/state-adapter.test.ts`——直接覆盖 `BaseMessageStateAdapter` 的 `subscribe`（kind/wildcard 路由、listener fan-out）、`mutate`、`createMessage`；当前无直接测试。
- [x] **Proof**：新增 `engine/__tests__/plugins.test.ts`——覆盖 `length-plugin`/`thinking-plugin` 对 `message.state` 的 mutation。
- [x] **Proof**：新增「plain-object adapter（直接实现 `MessageStateAdapter` 接口、无 `.state` 字段）下 `setConnector`/`abort`/`runTurn` 守卫不抛 `undefined`」契约用例；当前应暴露 AI-08 漏洞。
- [x] **Decision** AI-08：在「接口加 `getConnector()`/`getAbortController()` 读访问器」与「`CreateMessageEngineOptions.adapter` 收紧为 `BaseMessageStateAdapter`」二选一（推荐前者以保留扩展点），记录决策于 `design.md §8`。
- [x] **Fix** AI-08：删除 `create-engine.ts` 全部 6 处 `as unknown as { state: InternalMessageState }` cast，改用接口访问器（或 `getState().isProcessing`）。

Exit Criteria:

- [x] `rg "as unknown as \{ state: InternalMessageState \}" packages/flux-renderers-ai/src/engine/create-engine.ts` 返回 0 匹配。
- [x] `state-adapter.test.ts`、`plugins.test.ts` 绿；plain-object adapter 契约用例由红转绿。
- [x] 决策记录写入 `design.md §8`（仅当本 Phase 改了 adapter 公共契约）。

### Phase 3 - useConversation 正确性

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/`

- Item Types: `Proof` → `Fix`

- [x] **Proof**：`use-conversation.test.ts` 新增「`buildEngine` 构建的 engine 收到 `finish_reason:'tool_calls'` 时执行 tool-loop 而非转 `tool-no-executor`」用例；当前应失败（F1.2）。
- [x] **Fix** F1.2：`buildEngine` 补齐 `tools`/`toolExecutor`/`maxToolRounds` 转发（对齐 `use-message.ts:63-75`）。
- [x] **Fix** AI-28：`use-conversation.ts` 的 bare `catch {}`（`:117-129`、`:168`、`:227`、`:266`）将 storage 失败暴露给 host（`lastError` state 或 `onStorageError` 回调），不再仅 `console.warn`。

Exit Criteria:

- [x] `buildEngine` 转发三项（grep 可证）；tool-loop 用例由红转绿。
- [x] storage 失败路径有 host 可观测信号（用例或代码可证）。

### Phase 4 - 生命周期、提交性能、模块体积与 owner-doc 同步

Status: completed
Targets: `engine/create-engine.ts`、`adapters/use-conversation.ts`、`adapters/use-message.ts`、`docs/components/flux-renderers-ai/engine.md`、`ai-component-handle.ts`

- Item Types: `Fix` → `Proof`

- [x] **Fix** F2.2：`useConversation`/`useMessage` 对**自建**（非外部注入）engine 在 unmount effect 调 `engine.abort()`；外部 engine 生命周期归 owner（不 abort）。区分「switch-while-stream 背景保活」（有意，保留）与「整体卸载销毁」（应终止）。
- [x] **Fix** AI-23：`commitAssistant`（`:330-336`）与 tool-loop 提交（`:445`）缓存 assistant/owner 占位在闭包内的 index，提交改为直接按下标赋值，消除每 chunk 的 `lastIndexOf` + `slice`（O(chunks×messages) → O(chunks)）。
- [x] **Fix** AI-19（engine-half）：`engine/types.ts` 的 engine state 加 `lastError?: unknown`；`create-engine.ts:267-276` catch 把真实 caught `error` 写入 `draft.lastError`（当前仅转发 `plugin.onError`，从未写入 state）。解阻塞 Plan {2} renderer-half（`onError({error: state.lastError ?? new Error(...)})`）。
- [x] **Fix** AI-24：`create-engine.ts`（606 行）回到 500 行阈值内——抽出 branch-stamping（`regenerate`/`advanceBranchId`/`pendingBranchId`）到 `engine/branching.ts`（如已有分支逻辑）或 tool-loop 段；保持导出兼容。
- [x] **Fix**（owner-doc）AI-06：`engine.md §8.1` 补齐 `clear`/`getMessages`/`setMessages`/`regenerate` 四方法（最终 11 方法，与本计划落地后的实际 interface 一致）。
- [x] **Fix**（owner-doc）AI-20：`engine.md §8.5` 「useRef 持有 engine」改为「useState lazy initializer」。
- [x] **Fix** F3.3：`ai-component-handle.ts:24` docstring "5 logical methods" 改为 6。

Exit Criteria:

- [x] 自建 engine 卸载 abort 用例绿；`wc -l create-engine.ts` ≤ 500（或记录豁免理由）。
- [x] `commitAssistant` 无 per-chunk `lastIndexOf`/`slice`（代码可证）。
- [x] `engine.md §8.1` 方法数 = 实际 interface 方法数；`§8.5` primitive 与 `use-message.ts` 一致；`ai-component-handle.ts` docstring 计数正确。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent, fresh session（round 1 ses_06de20c5effe0F17djh4Qc88cE、round 2 ses_06ddb596bffeLsHSyorNrllAV7）
- Verdict: `pass`（R1 pass-with-minors → 修订 → R2 pass）
- Rounds: 2
- Findings addressed:
  - R1 Minor：F3.3 行号 `:9`→`:24`（"5 logical methods" 实在 `ai-component-handle.ts:24`）；AI-23 去掉 `:458-460`（该处为 `push`，非 `lastIndexOf`/`slice`，真实扫描在 `:330-331`/`:445`）；Non-Goals 可追溯性补全（AI-05/07/21/22、AI-18 bubble-renderer half）。
  - 跨计划归属：AI-19 engine-half（写 `state.lastError`，`create-engine.ts:267-276`）划归本计划；AI-18 engine-half（state-adapter/plugins）归本计划、bubble-renderer half 归 Plan {3}。R2 已核对 `rg lastError` 当前零匹配 → engine 写为真实新增工作，无 orphan。

## Closure Gates

- [x] AI-01/P0 已修：三个发送入口串行化，并发回归用例绿。
- [x] AI-03 作为 AI-01 副作用关闭：abort 可达在途 controller。
- [x] AI-08 已修：6 处穿透 cast 清零，adapter 契约自足。
- [x] AI-18(engine-half) 已修：state-adapter/plugins 直接单测存在且绿。
- [x] AI-19(engine-half) 已修：engine catch path 写 `lastError` 到 state，Plan {2} renderer-half 可消费。
- [x] F1.2 已修：useConversation tool-loop 可用且有用例。
- [x] AI-28 已修：storage 失败对 host 可观测。
- [x] F1.6/F2.2/F2.3 已修。
- [x] AI-23 已修：提交路径无线性扫描。
- [x] AI-24 已修：`create-engine.ts` ≤ 500 行（或豁免理由）。
- [x] owner-doc（AI-06/AI-20/F3.3）与 live interface 一致。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（本计划暂无；若执行中发现非阻塞项，按 `watch-only residual` / `optimization candidate` 分类并写明 `Why Not Blocking Closure`。）

## Non-Blocking Follow-ups

- F3.5（markdown sanitize 嵌套/属性分裂组合 XSS 用例）：非确认漏洞（Dim 15 security CLEAN），仅作加固观测项，归 Plan {3} Non-Blocking Follow-ups 或独立加固任务。

## Closure

Status Note: `@nop-chaos/flux-renderers-ai` 的 engine/adapter 层已收口——回合串行化可靠（AI-01/P0 Bug 07 recurrence 关闭）、abort 可达（AI-03）、adapter 契约自足零穿透 cast（AI-08，接口加 `getConnector`/`getAbortController` 读访问器）、useConversation tool-loop 可用（F1.2）、storage 失败对 host 可观测（AI-28，`onStorageError` 回调）、卸载释放自建 engine 在途流（F2.2）、提交路径 O(chunks)（AI-23 缓存 index）、engine catch 写 `lastError` 到 state 解阻塞 Plan {2} renderer-half（AI-19 engine-half）、`create-engine.ts` 回到 499 行（AI-24，抽出 `branching.ts` + `tool-execution.ts`）、owner-doc 与 live interface 一致（AI-06 11 方法 / AI-20 useState / F3.3 6 methods）。全 4 Phase 落地，Proof 先行（并发/abort/plain-adapter/tool-loop/storage-observability/unmount/lastError 共 37 条新增/增强测试）。workspace typecheck/build/lint/test 全绿（flux-renderers-ai 311/311）。独立 fresh-session closure audit `approved`（24/24 验证点通过）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent, fresh session（ses_06db04f3cffeY2o7lseTydI9gv）
- Evidence: 24-point live-repo verification — runTurn guard before controller creation (L168 < L181), 0 casts (`rg` exit 1), no empty-recipe mutate, connector-factory signal check, `MessageStateAdapter` accessors + `BaseMessageStateAdapter` impl, plain-object adapter test (no `.state`), state-adapter/plugins tests, §8.2 AI-08 decision, buildEngine forwards tool triad, 5 `reportStorageError` call sites, use-message unmount guard `if (externalEngine) return`, useConversation cache abort, cached `assistantIndex` (no lastIndexOf/.slice in commit path), `lastError` written in both catch blocks, `wc -l` = 499, branching.ts + tool-execution.ts exist, §8.1 11 methods + §8.5 useState, docstring "6 logical methods", no in-scope defect in deferred/follow-up. Verdict `approved`.

Follow-up:

- no remaining plan-owned work. AI-19 renderer-half（renderer 读 `state.lastError` 喂 `onError`）归 Plan {2}；AI-18 bubble-renderer half、样式/doc-tree/test-quality 治理项归 Plan {3}（均已在 Non-Goals 显式移出）。F3.5 markdown sanitize 嵌套加固为 non-blocking observation。
