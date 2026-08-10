> Audit Status: closed（原 open → 2026-08-10 mission-driver 起草轮 planned：9 条 P1 全部路由——P1-1/P1-2/P1-3/P1-4/P1-5 入 `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`；P1-6/P1-7/P1-8/P1-9 入 `docs/plans/2026-08-10-1301-2-renderer-bubble-p1-remediation.md`；18 条 P2 已移入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog「2026-08-09-1826 双审计 P2 填充」节 → **2026-08-10 plan `2026-08-10-1301-1` 收口翻 closed**（engine 族 P1-1/2/3/4/5 全修复落地，见该 plan Closure；renderer 族 P1-6/7/8/9 由 plan `2026-08-10-1301-2` 独立 closure surface 跟踪））
> Audit Type: multi-dimensional
> Mission: ai-invariant-loop

# Multi-Dimensional Audit — Mission `ai-invariant-loop` (`packages/flux-renderers-ai`)

**Date:** 2026-08-09 · **Auditor:** opencode (deep-audit skill, per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/flux-renderers-ai/` — code, config, tests, and public contracts (exports / API surface), cross-referenced against architecture docs (`docs/components/flux-renderers-ai/engine.md`, `docs/audits/ai-invariants/*`) for documented contract drift.
**Baseline:** v1 (no compatibility burden / no transitional main-path allowances).
**Mission context:** `ai-invariant-loop` has completed Cycle 1 (I0-I6) and Cycle 2 (I1-I6) with steady-state determination; invariant gates ①-⑩ are registered in `docs/audits/ai-invariants/gates.md`. This audit re-baselines after Cycle 2 / I4 fixes and surfaces only **NEW** findings not covered by registered gates or prior audit closures.

## Methodology

Followed `docs/skills/deep-audit-prompts.md`: read calibration (`deep-audit-calibration-patterns.md`) + mission context (invariant catalog + gates registry + roadmap); ran tooling baselines first; dispatched 6 parallel deep-dive sub-agents (Wave 1: dims 01/03, 04/05, 06/07/19, 09/10/11, 14/23, 16/17/20); ran 2 follow-up deep-dive rounds (Wave 2: engine/adapter residual surfaces + renderer/rich-text residual surfaces); then dispatched 3 **independent verification sub-agents** who re-checked every candidate against live code and output retain/downgrade/reject per item. Only independently verified findings appear below.

## Mechanical Gates (baseline run by main agent at audit time)

| Gate                                                   | Result                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:ai-engine-invariants`                      | **exit 0 — zero violations** (registered red ⑥×3+⑧×1 confirmed cleared)                                                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` | PASS                                                                                                                                                                             |
| `pnpm --filter @nop-chaos/flux-renderers-ai test`      | **572 / 572 pass (69 files)** — matches I5 full-green baseline                                                                                                                   |
| `check:audit-runtime-raw-schema-reads` (AI)            | 0 hits                                                                                                                                                                           |
| `check:audit-missing-renderer-markers` (AI)            | 0 hits                                                                                                                                                                           |
| `check:audit-reactive-render-reads` (AI)               | 0 hits                                                                                                                                                                           |
| `check:audit-performance-suspects` (AI)                | 0 hits                                                                                                                                                                           |
| `check:audit-fieldframe-bypasses` (AI)                 | 0 hits                                                                                                                                                                           |
| `check:audit-styling-suspects` (AI)                    | 16 hits in `styles.css`; all attribute-equals scoped (`[data-slot='ai-*']`) with globally-unique ai-prefixed names — re-verified false positives                                 |
| `check:audit-async-failure-paths` (AI)                 | 39 candidates; each verified against live code — most fail-safe/intentional; real defects surfaced as findings below                                                             |
| `check:audit-test-global-leaks` (AI)                   | 7 module-top `let` candidates; 4 verified false positives (local vars / proper reset), 2 real hygiene items (T-2, T-3)                                                           |
| `check:oversized-code-files` (AI)                      | warnings only: `create-engine.ts:677`, `use-conversation.ts:670`, `engine-invariants.test.ts:613` (all >500, <700; single cohesive owner each — not reportable per dim 02 rules) |

## Verification Discipline

- 9 engine/adapter candidates, 13 renderer candidates, 15 doc/test/a11y candidates were independently re-verified against live code by fresh verification agents.
- 1 candidate rejected (registered K-⑩-3 window — not new); 1 confirmed already-fixed (bubble matcher catch); 1 downgraded to observation (virtualization threshold jump).
- Zero P0: no finding constitutes contract break on the engine's public API, data loss on a primary path, security red-line, or failing/absent test for **changed** behavior — all invariant gates ①-⑩ hold.

## Priority Summary

| Priority                                                     | Count  | Drives remediation plan? |
| ------------------------------------------------------------ | ------ | ------------------------ |
| **P0** (blocking)                                            | **0**  | —                        |
| **P1** (material — real defect / contract drift, should fix) | **9**  | **Yes**                  |
| **P2** (non-blocking polish / residual cleanup / doc rot)    | **26** | No (follow-up backlog)   |

**Outcome:** audit has issues → remediation plan should cover the 9 P1s (4 engine-family, 3 renderer-family, 1 projection, 1 request-payload hygiene).

---

# P1 Findings (material — must fix)

Each P1 was independently re-verified against live code (file:line + behavior trace).

## [P1-1] `executeToolCalls` — abort 后 tool 结果仍 commit 进历史（abort mid-executor 迟到提交）

_Justification: real defect on the user's most common path (press Stop during tool execution → ghost tool card with "The operation was aborted." text committed to history, persisted by autoSave, and fed to the model on the next request). Not covered by any registered gate._

- **File:** `packages/flux-renderers-ai/src/engine/tool-execution.ts:41-108`
- **Evidence:**
  ```ts
  for (const call of calls) {
      if (abortController.signal.aborted) return false;   // :42 only check at loop top
      const raw = await toolExecutor({ toolCall: call, signal: abortController.signal });  // :52 — no re-check after await
      ...
      adapter.mutate('messages', (draft) => { ... });   // :78-95 commit UI state
      adapter.mutate('messages', (draft) => { draft.messages.push(toolMessage); });  // :105-107 commit tool message
  }
  ```
- **Current:** abort during `toolExecutor` suspension: signal-aware executors reject with AbortError → caught as "tool failed"; signal-ignoring executors resolve → recorded "success". Both commit the tool message into history after the turn has already reached its terminal state (`requestState='aborted'`).
- **Risk:** ghost tool result cards in UI; autoSave persists them (K-⑩-3 strip only filters vacuous assistant, not tool messages); next request's `buildContext` carries the orphan tool message to the model.
- **Fix:** re-check `abortController.signal.aborted` after `await toolExecutor(...)` and before the mutate commits (or special-case AbortError in the catch); add a regression assertion to `engine-tool-loop.test.ts:239-262` that aborted turns contain no `role:'tool'` residue.
- **误报排除:** not invariant ① (that's double-turn concurrency) nor ③ (controller identity) — this is single-turn abort interleaving; the registered candidate family "tool-execution 并发" was triggered with a real member.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-2] 悬空 `tool_calls` assistant 消息在 abort / tool-no-executor 路径被完整 commit → 进入下一轮请求载荷与 autoSave 持久化

_Justification: a tool-calling message with no paired tool response is a protocol violation — strict OpenAI-compatible backends return 400 and the user's retry loop fails repeatedly; the residue is also persisted by autoSave. `isVacuousAssistantResidue` (invariant ⑩) explicitly does not cover this shape — a true gate blind spot._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:531-547` (commit order), `:289-308` (tool-no-executor), `:579-583` (buildContext exclusion); `engine/utils.ts:156-162` (predicate)
- **Evidence:**
  ```ts
  for (const plugin of plugins) { await plugin.onAfterRequest?.(ctx, assistant); }
  commitOrDropResidue();          // commit BEFORE abort check
  if (abortController.signal.aborted) { ...mutate aborted...; return { kind: 'aborted' }; }
  ```
  A `content:''` + `tool_calls` + `finishReason:'tool_calls'` message fails `isVacuousAssistantResidue` (which requires `!metadata?.finishReason`), so both abort-in-window and tool-no-executor paths commit it; `buildContext` excludes only streaming-placeholder/vacuous — the dangling message flows into the next request.
- **Current:** verified 4 sub-claims (commit order, tool-no-executor path, exclusion predicate scope, autoSave persistence) all true.
- **Risk:** repeated 400 failures on retry for config-without-executor hosts; corrupted history persisted to storage.
- **Fix:** drop (or strip `tool_calls`) for assistant products that carry `tool_calls` with no following `role:'tool'` result in runOnce's abort branch and tool-no-executor branch; extend the buildContext tail-exclusion + autoSave strip predicates to the same shape.
- **误报排除:** engine.md:460 design adjudication covers only "empty content + no finishReason" (drop) vs "empty content with finishReason kept (real completion)" — dangling tool_calls falls between both; a genuine predicate gap, not design semantics.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-3] `clearAll` 排空链漏掉「已逐出会话」的在途 autoSave → save 落在 storage 清空之后（ghost 复活）

_Justification: `switchConversation` evicts engines but leaves `pendingSavesRef` entries; `clearAll` drains only `engineCache.keys()` so an in-flight autoSave for an evicted session escapes the drain and lands after storage is cleared → ghost resurrection on remount. The K3/④ gates only cover sessions that have engines — a registered gate blind spot._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:577-634` (clearAll), `:479-484` (switch eviction), `:225-232` (autoSave no settlement re-check)
- **Evidence:**
  ```ts
  const ids = [...engineCache.keys()]; // evicted sessions not included
  const drain = Promise.allSettled(
    ids.map((id) => pendingSavesRef.current.get(id) ?? Promise.resolve()),
  );
  pendingSavesRef.current.clear(); // in-flight entries dropped, not awaited
  ```
  `saveMessages` (`:226-232`) has no settlement-time mirror re-check (contrast create `:411-413` / rename `:565-567`).
- **Risk:** switch-to-B while A's autoSave is in flight → clearAll → A's save lands after storage clear → remount rehydrates ghost (slow/network storage hits easily).
- **Fix:** `ids = [...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys()])]`; or add settlement-time mirror check to autoSave's saveMessages.
- **误报排除:** `conversation-invariants-i4.test.ts` covers rename/delete/create × clearAll gated-save drain but has no "evicted engine + in-flight autoSave + clearAll" case; `use-conversation-clear-all.test.ts` only covers sessions with engines in cache.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-4] `clearAll` per-id fan-out 只遍历 `engineCache.keys()` — 未打开过的会话在 storage 残留 → remount ghost rehydration

_Justification: bootstrap only builds an engine for the active session; all other loaded sessions never enter `engineCache`. `clearAll`'s default per-id fallback path (storage `clearAll` is optional) therefore leaves their storage records → FP-2 ghost-rehydration family's uncovered member; tests never exercise the "≥2 sessions, one never opened" shape._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:575-635`; bootstrap engine build at `:330-336`
- **Evidence:**
  ```ts
  function clearAll(): void {
      const ids = [...engineCache.keys()];        // only sessions that built an engine
      ...
      for (const id of ids) {                     // per-id fallback same limitation
          Promise.resolve(storage?.deleteConversation?.(id)).catch(...);
      }
  }
  ```
- **Current:** sessions loaded by bootstrap but never switched to (and non-first), or host-pre-seeded storage records, survive `clearAll` when storage has no `clearAll` implementation (the documented default per `storage/types.ts:14,26`).
- **Risk:** "Clear all" then refresh → ghost conversations reappear; same user-visible symptom as the already-fixed FP-2 but on the default storage path.
- **Fix:** fan-out over `conversationsRef.current.map(c => c.id)` (the list mirror = full storage conversation set) instead of `engineCache.keys()`; add test: storage pre-seeded with 3 → bootstrap → clearAll without switching → storage empty, remount list empty.
- **误报排除:** invariant ④ gate checks `.catch → reportStorageError` routing and drain-before-delete order (both satisfied) — the fan-out **traversal source** is outside every gate surface.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-5] `buildContext` 把渲染器私有 `state`（editing draft / toolCall UI）与 `metadata.toolError` 原样送进连接器请求载荷

_Justification: un-submitted editing drafts and internal UI state leak unconditionally to the model provider on every request (playground sends `req.messages` raw); `design.md:541` explicitly classifies these as "域内部、不投影" — sending them violates the documented design contract. No gate covers request-payload hygiene._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:572-599` (buildContext); `apps/playground/src/ai/openai-connector.ts:48` (raw passthrough)
- **Evidence:**
  ```ts
  const request: AiConnectorRequest = {
      messages: requestMessages,   // raw — includes state.editing.draft / state.toolCall / metadata.toolError
      ...
  ```
- **Current:** `AiConnectorRequest.messages` carries `message.state` (editing drafts, toolCall UI) and `metadata.toolError` (Error object with stack) without field stripping; `createStreamBasedAiConnector` (`ai-connector-factory.ts:42-53`) does no sanitization.
- **Risk:** user's un-submitted edit draft sent to the model provider on each request; internal error stack may reach the wire depending on the host serializer; strict backends may 400 on unknown fields.
- **Fix:** strip `state` and internal `metadata` when building request payloads (whitelist `{id, role, content, tool_calls, ...}`), or document the host obligation and exclude `state` from the wire type.
- **误报排除:** not invariant ②/⑥ (those cover adapter ref reads); this is the engine→connector serialization boundary, previously unaudited.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-6] ai-chat 投影快照在 engine 替换（会话切换/复水/clear）后不刷新 — `${messages}` 区域无限期显示上一会话数据

_Justification: `projection` rebuilds only on `isProcessing` boundary crossing; engine swaps (session switch hydration via `setMessages`, `clear()`, external engine swap) are double-idle → `prevIsProcessing === isProcessing` → snapshot never re-cloned → header/beforeMessages/afterMessages/footer/emptyState regions bound to `${messages}` show the previous conversation indefinitely until the next turn completes (possibly never)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:241-264`
- **Evidence:**
  ```tsx
  const [projection, setProjection] = useState(() => ({
    prevIsProcessing: isProcessing,
    snap: cloneMessages(messages),
  }));
  if (projection.prevIsProcessing !== isProcessing) {
    const crossedBoundary = projection.prevIsProcessing && !isProcessing;
    setProjection({
      prevIsProcessing: isProcessing,
      snap: crossedBoundary ? cloneMessages(messages) : projection.snap,
    });
  }
  ```
- **Current:** session A messages stay projected after switching to completed session B (both idle); `ai-chat-projection.test.tsx` covers only streaming turn-boundary stability, not engine-swap.
- **Risk:** wrong data in summary/counter/empty-state regions for the whole span until the next turn boundary — user-visible data misalignment on the documented multi-session path.
- **Fix:** extend the rebuild trigger to engine-identity change and requestState terminal-state changes (not only isProcessing flip); add an engine-swap projection regression test.
- **误报排除:** the turn-boundary gating itself is documented design (`ai-chat.tsx:226-234`); the defect is the missing non-turn message-replacement surface — not in any invariant ①-⑩ or bug note.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-7] 气泡路径工具卡展开控件死 — `state?.open ?? internalOpen` 被恒 `false` 短路，`ChatToolCallUIState.open` 字段孤儿化

_Justification: three write paths all set `open:false` and nobody ever writes `open:true`; `false ?? internalOpen` never falls through to local state → the expand chevron is a dead control, function-arguments JSON never visible, `aria-expanded` always false. `onToggle` has no production wiring. Verified: zero `open:true` writes in production code (only a test-injected shape)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx:52-53,95-99`; `renderers/ai-bubble/renderers/tools.tsx:57-61`; `engine/plugins/tool-plugin.ts:43`
- **Evidence:**
  ```tsx
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const open = state?.open ?? internalOpen; // state.open===false ⇒ never falls through
  // tools.tsx: resolveToolState returns { status:'running', open:false } when map has no key
  // tool-plugin.ts: toolCallState[key] = { status:'running', open:false } — written once, never updated
  ```
- **Current:** expand/collapse permanently broken in the bubble path; `open` field on `ChatToolCallUIState` is write-once-false orphan.
- **Risk:** users cannot inspect tool call arguments (a core agentic-chat interaction); virtualized row recycling also loses local expansion state.
- **Fix:** stop writing `open:false` (leave undefined so `?? internalOpen` engages), or merge as `state?.open !== undefined ? state.open : internalOpen` with `onToggle` writing back to engine state; add a bubble-path expansion regression test.
- **误报排除:** not calibration Pattern 8 exemption — this is a dead interactive control + orphan state field, not transient UI styling.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-8] thinkingPlugin 注册后 reasoning 面板永久折叠且禁用 — `controlled` 恒定义 + 插件从不写 `open:true`

_Justification: thinking-plugin writes `{open:false, startedAt}` on first chunk and only updates `endedAt`; reasoning.tsx treats `controlled !== undefined` as authoritative → button permanently `disabled`, panel never expands (even after streaming ends), `internalOpen` dead code. Same root family as P1-7._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/reasoning.tsx:21-25,35-37,53`; `engine/plugins/thinking-plugin.ts:21-26`
- **Evidence:**
  ```tsx
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = message.state?.thinking;
  const open = controlled ? controlled.open : internalOpen;
  ...
  <Button ... onClick={toggle} disabled={controlled !== undefined}>   // always disabled once plugin registered
  ```
- **Current:** R1 reasoning content is permanently invisible in plugin scenarios; the A-10 test only asserts the label text, never expand/disabled behavior.
- **Risk:** reasoning content cannot be reviewed by users in the plugin (default) path.
- **Fix:** decide with P1-7 — either the plugin must not pin `open:false` (leave undefined), or `onToggle` must write back to `message.state.thinking.open`; add an interaction regression test.
- **误报排除:** not "design read-only" — the collapse button is an explicit interactive control; the comment only describes state mirroring, not a no-interaction contract.
- **复核状态:** 独立复核通过（成立，P1）

## [P1-9] markdown 渲染器（NORMAL=0）按切片遮蔽 tools/reasoning/image 渲染器 — 混合消息下工具卡/推理面板永不渲染

_Justification: each content slice selects exactly one renderer by ascending priority; markdown (NORMAL=0) wins over tools/reasoning (CONTENT=10) whenever the message has non-empty text content — which is the standard R1 shape (text + reasoning_content) and the interleaved shape (text + tool_calls). The existing test only covers the `content:''` branch._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts:22-78`; `renderers/ai-bubble/index.tsx:211-234`
- **Evidence:**
  ```tsx
  { priority: BubbleRendererMatchPriority.NORMAL, find: (_, content) => 非空文本, renderer: MarkdownContentRenderer },
  { priority: BubbleRendererMatchPriority.CONTENT, find: toolsMatcher, renderer: ToolsContentRenderer },
  // index.tsx pickRenderer: ascending priority, first match wins
  ```
- **Current:** mixed messages render text only; reasoning panel disappears the moment the first content chunk arrives during streaming; tool cards invisible in text+tool_calls messages.
- **Risk:** core AI UX (tool call visibility, thinking panel) silently missing on R1/interleaved model output — contradicts `tools.tsx` "Matches assistant messages carrying tool_calls" and the "not shadowed by markdown" test intent.
- **Fix:** render reasoning/tools at message level (alongside markdown slices) or match them by message-level fields before slice-level markdown; add mixed-content integration assertions.
- **误报排除:** verified `resolveContentSlices` produces a single slice for string content — no second path lets tools/reasoning match non-empty-text messages.
- **复核状态:** 独立复核通过（成立，P1）

---

# P2 Findings (non-blocking — follow-up backlog)

Each P2 was independently verified against live code.

## [P2-1] `pendingBranchId` 戳在 abort / onTurnStart 抛错路径残留，被下一次无关 turn 消费 — 普通消息被误标 branchId

_Justification: verified real but narrower than ⑧'s registered scope: the static scanner `scanBranchStampReset` only matches `return;` paths, so abort (`while` break at `create-engine.ts:262`) and onTurnStart-throw paths leak the stamp; the next unrelated sendMessage consumes it. Metadata-level defect (branch mis-grouping + regenerate sequence shift), no data loss — P2._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:262,427-432,649-672`; scanner `scripts/audit/find-ai-engine-invariant-violations.mjs:404-437`
- **复核状态:** 独立复核通过（成立，P2 — 建议扩展 ⑧ 门禁覆盖面：break/throw 路径 + 运行时参数化成员）

## [P2-2] unmount 清理顺序与 clearAll 的 detach-before-abort 不变式相反 — 卸载期间入队 aborted 快照 save 且无人可排空

_Justification: `use-conversation.ts:357-369` aborts engines (synchronous notify while autoSave listener still attached) **before** unsubscribing; `pendingSavesRef` is neither drained nor cleared on unmount → the aborted-snapshot save escapes every future mount's drain (cross-mount ghost on rapid remount + fast new turn). Requires a multi-step timing to manifest — P2._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:357-369` (vs clearAll's `:579-590` detach-before-abort)
- **复核状态:** 独立复核通过（成立，P2）

## [P2-3] slash/mention 弹出层零匹配时进入键盘死区 — Enter/方向键被吞，且注释与实现直接矛盾

_Justification: `handleKeyDown` checks only `state.kind === 'none'`; with zero matching popupItems the kind stays `'slash'/'mention'` → Enter/Arrow keys are consumed (`return true`) while the popup is visually gone; the comment at `:332-335` claims keys pass through when `popupItems.length === 0` — the implementation never checks length. Keyboard submission dies silently until the user guesses Escape. P2 (interaction dead-zone, not data error)._

- **File:** `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx:224-249,332-335,370-394`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-4] FallbackToolCallCard 未透传 onApproval — HITL 审批在默认气泡路径结构性不可达

_Justification: `FallbackToolCallCard` (`ai-tool-call.tsx:312-320`) drops `onApproval`; `BubbleToolRendererProps` has no such field → any `approval==='pending'` message in the standard message flow hits the `hitl-no-handler` guard and the approve button is permanently disabled. HITL works only in the standalone ai-tool-call renderer path. P2 (feature unreachable on default path, has an escape channel)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx:198-216,312-320`; `renderers/ai-bubble/renderers/tools.tsx:43-51`; `renderers/ai-bubble/types.ts:55-64`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-5] 全部 14 个渲染器未消费 schema `disabled` 节点控制 — 页面级禁用静默失效 + `AiSenderExtensionProps.disabled` 死契约字段

_Justification: `disabled` is a compiler-classified meta field (`fields.ts:11` `BOOLEAN_META_FIELDS`), resolved into `props.meta.disabled` by `node-runtime.ts:283-292`, and consumed by every other widget package (basic/layout/content/scheduling/industrial) — but AI package has zero `meta.disabled` reads and `AiSenderExtensionProps.disabled` (schemas.ts:186-189) is declared but never passed. Cross-package contract inconsistency + dead contract field — P2 (functional gap, not crash)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-sender.tsx:124-142,214-246`; `schemas.ts:167-199`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-6] ai-voice-input 同 tick 双击麦克风 — 双重识别实例，首个会话泄漏麦克风

_Justification: `handleStart` creates a new recognition unconditionally and overwrites `recognitionRef.current`; the `status` React-state guard is async so same-tick double-click creates two instances; unmount cleanup only aborts the ref-held (second) instance; the first `continuous:true` instance keeps the mic until page unload. Real but narrow (React 19 discrete events flush synchronously) — P2._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx:147-230`
- **复核状态:** 独立复核通过（成立，P2 — ref-based in-flight guard suggested）

## [P2-7] useConversation 挂载 bootstrap effect 依赖不稳定 `storage` 引用 — 逐 render 重跑 loadConversations

_Justification: `storage` goes directly into effect deps (`use-conversation.ts:297-348`) while `connector` uses a ref mirror; hosts constructing storage inline re-run `loadConversations()` on every render (each run aborts the previous controller). Conditional on host behavior (playground memoizes) — P2, host-contract fragility._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:297-348`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-8] engineNullSwitch 窗口期：component handle / action provider 绑定到被隐藏的自建 engine — `component:sendMessage` 写入幽灵会话

_Justification: during external-engine A→null→B, `externalEngine=undefined` falls back to `selfEngine`; handle/provider are registered against it while UI renders only emptyState; command dispatches in that window write ghost messages that evaporate when B arrives. Narrow, externally-triggered, no data corruption — P2._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:118-144,189-199`; `adapters/use-message.ts:87-88`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-9] useAutoScroll 核心行为（trigger 驱动滚底 + scrollToBottom）零测试断言

_Justification: `use-auto-scroll.ts:53-58` (the hook's core contract — auto-scroll to bottom when pinned and trigger changes) and `scrollToBottom()` have zero assertions; A-9 tests only assert `isAtBottom` after manually-set scrollTop. Deleting the core effect leaves tests green — coverage gap (dim 14/23)._

- **File:** `packages/flux-renderers-ai/src/adapters/use-auto-scroll.ts:42-58`; `renderers/__tests__/phase5-deepening.test.tsx:66-112`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-10] engine.md §8.1 MessageEngine 接口清单缺 `setMessageEditing`，"共 11 个方法"计数过期

_Justification: live `MessageEngine` has 12 methods (`setMessageEditing` at `types.ts:320-323`); engine.md:106-135 omits it and the AI-06 note (`:148-151`) still says 11. Doc contract drift on the authoritative host-facing doc — P2._

- **File:** `docs/components/flux-renderers-ai/engine.md:106-151` vs `packages/flux-renderers-ai/src/engine/types.ts:287-335`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-11] engine.md §8.5/§9.5 `UseMessageOptions` 接口列表过时（3 字段 vs 9 字段），且与同节正文自相矛盾

_Justification: interface blocks list only `connector/initialMessages/plugins`; live `use-message.ts:14-41` has 9 (incl. `engine`, `systemPrompt`, `tools`, `toolExecutor`, `maxToolRounds`, `extraRequestParams`) — and the prose at `:240-246` already mentions the extra fields, making the doc internally contradictory. Host integrators copying §9.5 miss the external-engine and tool-loop options — P2._

- **File:** `docs/components/flux-renderers-ai/engine.md:206-211,421-427` vs `packages/flux-renderers-ai/src/adapters/use-message.ts:14-41`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-12] engine.md §8.6 `UseConversationOptions` 接口列表缺 `initialConversations` 与 `onStorageError`

_Justification: live options (`use-conversation.ts:16-31`) have 6 fields; the doc block lists 4 and omits `onStorageError` — the host's only observation channel for storage failures (invariant ④ host face) — even though the same §8.6 prose already references it. P2._

- **File:** `docs/components/flux-renderers-ai/engine.md:251-257` vs `packages/flux-renderers-ai/src/adapters/use-conversation.ts:16-31`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-13] engine.md §9.3 示例文件路径与函数名不存在

_Justification: `apps/playground/src/ai-connectors.ts` doesn't exist (actual: `apps/playground/src/ai/openai-connector.ts`, function `createOpenAICompatibleConnector` not `createOpenAIConnector`). Host developers copying the example get a compile error — P2 (stale doc reference)._

- **File:** `docs/components/flux-renderers-ai/engine.md:354-357,404-405`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-14] ai-chat 投影克隆在 abort 同步翻转窗口可捕获空产物幽灵（K-⑩ 三落地面缺第四面）

_Justification: `abort()` flips `requestState` synchronously before the engine's cleanup microtask chain (registered K-⑩-3 window); the projection's `crossedBoundary` clone can snapshot a `{content:'', loading:false}` residue that is spliced only later, and no later flip triggers a re-clone → ghost empty bubble persists until the next turn. Engine and autoSave are covered; the projection surface is the only unguarded one — P2 (window-dependent, self-heals)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:244-250`; `engine/create-engine.ts:605-626`
- **复核状态:** 两个独立 deep-dive agent 一致报告（dim 04/06）；修复与 P1-6 同面（投影重建触发条件扩展）时一并处理

## [P2-15] dompurify 声明为非可选 peerDependency + devDependency，包内零引用

_Justification: sanitization is delegated to `@nop-chaos/flux-renderers-content` (which owns dompurify); the ai package's non-optional peer forces consumers to install a package it never imports. Manifest-vs-import drift (workspace-manifest-deps gate explicitly exempts peer/dev) — P2._

- **File:** `packages/flux-renderers-ai/package.json:36,57`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-16] invariant-catalog / gates.md 记录的 live 行号在 Cycle 2 / I4 后系统性漂移

_Justification: method line numbers drifted +108~+185 (e.g. `createConversation` :263 → live :371; `clearAll` :390 → :575) after I4 added bump statements and `ensureEngineAndHydrate`. All invariants' semantics and detection methods remain correct; only the evidence anchors are stale, and catalog §2.6's "2026-08-09 live 核对全部一致" claim is now misleading — P2 (governance: add a timestamp/anchor note or re-verify)._

- **File:** `docs/audits/ai-invariants/invariant-catalog.md:33,43,52,63,73,82-86,109-122,190-218`; `docs/audits/ai-invariants/gates.md:52-53`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-17] ai-conversations 当前会话缺 `aria-current` — 当前项状态对屏幕阅读器不可编程感知

_Justification: active item only conveys state via `data-active` + border/background color; zero `aria-current`/`aria-selected` in the package. WCAG 1.3.1 / 4.1.2 — SR users cannot tell which conversation is current. P2 (a11y)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:70-78`
- **复核状态:** 独立复核通过（成立，P2）

## [P2-18] user-edit 编辑态 Textarea 无 accessible name

_Justification: edit-mode `<Textarea>` has no aria-label/label/placeholder (contrast: ai-sender Textarea at `:167` has one, and p2-a11y-i18n tests cover it — the edit surface is uncovered). WCAG 4.1.2 — P2 (a11y)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:81-87`
- **复核状态:** 独立复核通过（成立，P2）

---

# P3 / Observation Items (recorded, no remediation plan)

- **[P3] tiptap 外部 value 同步在编辑聚焦期间被永久丢弃** — `tiptap-sender.tsx:313-323`: `if (editor.isFocused) return;` with deps `[editor, value]` (no focus retry) → host-driven external value changes during focus are silently dropped forever; host-contract fragility (host integration only; internal ai-sender wiring unaffected). _Verified live._
- **[P3] `ChatToolCallUIState.result` 纯写入字段** — engine writes result text each tool round (`tool-execution.ts:81-89`) but zero renderer consumption (verified: no `state?.result` in renderers); orphan state field — either consume or drop.
- **[P3] ai-attachments 对象 URL revoke 缺"宿主替换/清空"路径 + blob URL 随消息进入引擎后卸载即破图** — `ai-attachments.tsx:70-89`: revoke only on remove/unmount; controlled-mode host replacement leaks until unmount; blob URLs sent into engine messages break after unmount (固有 blob 限制); 受控→非受控切换时列表瞬间消失（`internalAttachments` 恒空）。
- **[P3] ai-feedback 复制降级路径假成功** — `ai-feedback.tsx:134-145`: no-clipboard fallback resolves successfully then `setCopied(true)` — "已复制" shown without copying, contradicting the file header comment.
- **[P3] engine.md §7.2 `processingState` 取值含笔误 `string`** — `engine.md:81` lists `'string'` among literals; live `types.ts:110-113` has only 3.
- **[P3] 测试模块级 `let` 无 beforeEach/afterEach 重置** — `ai-chat-conversation-change.test.tsx:52` (`captured`, reset only in test bodies) and `ai-chat-lifecycle-stability.test.tsx:54-55` (reset inside single test). No current order dependence (each test resets manually); hygiene hardening for future cases.
- **[P3] ai-suggestions `role="list"` 无 `listitem` 子项；ai-chat `<section>` 无 aria-label；ai-feedback like/dislike 无 `aria-pressed`；user-edit 取消按钮文案用 `flux.ai.stop`（Stop 而非 Cancel）** — 4 a11y micro-gaps (verified live).
- **[P3] rich-text 弹出层无 `aria-controls`/`aria-activedescendant`，option 为可聚焦 Button（Tab 可逃逸）** — `tiptap-sender.tsx:211-219` + `suggestion-popup.tsx`; combobox semantics incomplete (template-bar shows the known-correct pattern via `onMouseDown preventDefault`).
- **[P3] 虚拟化阈值切换瞬间行布局翻转 + trigger 不含中部编辑签名** — `ai-message-list.tsx:45-53`: estimateSize 120 corrected by `measureElement` (self-correcting), downgraded from P2 by verification; trigger only has tail signature (middle edits don't re-scroll — arguable correct behavior).
- **[P3] ai-tool-call.tsx:212 `text-white` 硬编码** — matches repo-wide convention (carousel/timeline/kanban/barcode all do the same); observation only.
- **[P3] renderers/ 文件命名 `ai-*.tsx` vs 其他包 `*-renderer.tsx`** — package-internally consistent, cross-package style difference; observation only.
- **[P3] engineNullSwitch 已复核干净** — subscription/transition effects rebuild cleanly on engine swap; only the P2-8 window issue stands.
- **[P3] timestamp/data-part fallback catches** — verified fail-safe (locale failure → manual HH:MM format; stringify failure → String(value)); no issue.
- **[P3] bubble matcher catch（历史 P2）** — confirmed **already fixed** (`ai-bubble/index.tsx:228-229` `console.warn('...[ai-bubble] custom content matcher threw; skipping', err)`); not re-reported.

# Dimensions Confirmed CLEAN / No-Report (what was checked)

- **01 Dependency graph:** no internal subpath imports; no reverse deps; no cycles; exports map (`"."` / `"./rich-text"` / `"./styles.css"`) aligned with build; workspace declarations consistent (P2-15 dompurify aside).
- **05 Reactive precision:** getSnapshot stability (ReactMessageAdapter caches snapshot); per-kind subscription channels (`state-adapter.ts:52-83`); `useScopeSelector` paths-based; no large-object effect deps; virtualizer usage standard; `use-message` single subscription point. Zero findings.
- **07 Lifecycle:** all engine/streaming/abort logic lives in the runtime layer (no polling/cache/debounce in React effects); unmount cleanups (media streams, editor destroy, objectURL, subscriptions, global listeners) all present except P2-2 ordering; save-modify-restore patterns try/finally-protected; `useEffectEvent` usage compliant. No findings beyond P2-2.
- **08 Validation:** N/A (no form fields in AI package; design §3 explicitly does not bind to form owner).
- **10 Styling:** all `nop-ai-*` markers pure; 16 `[data-slot]` hits all attribute-equals scoped with unique ai-prefixed names (no cross-package leak); no BEM; theme-independent (CSS vars); `prefers-reduced-motion` honored. Zero findings.
- **11 UI components:** all imports via `@nop-chaos/ui`; raw elements justified (file input — no ui equivalent; anchors; code blocks; Tiptap host surface); zero direct radix/base-ui deps. Zero findings.
- **13 Type safety:** no long assertion chains; remaining `any`/`as` at legit schema-payload/browser-API boundaries (low-code exceptions honored). Zero findings.
- **17 Naming:** `ChatMessage`/`MessageEngine`/`AiConnector`/`ai:*` event types consistent with terminology.md; `create*`/`use*`/`register*` prefixes uniform; `AiResponseProvider` legacy names zero residual. Zero findings (file-naming observation only).
- **19 Error propagation:** `lastError` parity on all four failure branches (connector-missing/stream/tool-no-executor/plugin); bubble matcher catch fixed with structured log; no `enabled:false`/`silent:true` diagnostic suppression; tool-execution preserves original Error in `metadata.toolError`. Zero findings beyond P1-2/P1-5/P2-1.
- **23 Test effectiveness:** zero fake-green / defect-pinning; zero `vi.mock` in the whole package (integration tests use REAL engines + REAL renderers); invariant suites assert state values not "no-throw"; no dead-code-with-tests; no timezone-sensitive tests; `a11y.test.tsx` has real DOM attribute assertions (`role="log"`, `aria-live`, `aria-busy`). Only coverage gap: P2-9 (useAutoScroll).

# Cross-Cutting Patterns

1. **UI-state fields on engine messages with write-once-false or no consumer (P1-7, P1-8, P2-4, P3-result):** `ChatToolCallUIState.open`, `thinking.open`, `toolCall.approval` (bubble path), `toolCall.result` all have dead or half-alive consumer surfaces. Same family as the historical A-8 editing-state lesson: UI state that engine holds must have a live write-back or be local-only. Recommend a field-by-field audit of `ChatMessageUIState` with a consumer-presence gate.
2. **`engineCache.keys()` as conversation-list proxy (P1-3, P1-4):** two distinct ghost-rehydration defects share the root cause — enumerating "sessions I have an engine for" instead of "sessions that exist". The list mirror (`conversationsRef.current`) is the correct enumeration source. Recommend extending invariant ④/⑥ gates to assert clearAll drains the list mirror + pendingSaves keys.
3. **Invariant-predicate blind spots adjacent to ⑩ (P1-1, P1-2, P2-1):** `isVacuousAssistantResidue` covers only empty-content-no-finishReason; the tool-call-request shape and the branch-stamp abort/throw paths are outside ⑩ and ⑧ respectively. These are exactly the "sibling method missed" failures the mission was founded on — recommend new invariant members.
4. **Doc-interface drift (P2-10..P2-13, P2-16):** four separate engine.md interface blocks are stale (method count 11 vs 12; UseMessageOptions 3 vs 9; UseConversationOptions 4 vs 6; dead example path), plus systematic line-number drift in the invariant catalog after I4. Same "closure scoped to one file while the concept spans multiple" anti-pattern noted in the 0707 audit.

# Conclusion

`flux-renderers-ai` remains mechanically healthy: all invariant gates ①-⑩ hold (`check:ai-engine-invariants` exit 0), typecheck + 572/572 tests green, no P0, no fake-green test patterns, and the engine/adapter concurrency-family fixes from Cycles 1-2 are confirmed live. However this audit surfaces **9 NEW material (P1) defects** — 4 engine/adapter (tool-residue commit on abort, dangling tool_calls protocol violation, two clearAll ghost-rehydration members, request-payload hygiene), 3 renderer-family UI dead-ends (tool-card expand, reasoning panel, mixed-content renderer shadowing), 1 projection staleness across session switches, and 1 request-payload leak — plus 18 P2 residual items. The P1 cluster shares two root patterns (engine-held UI state without live consumer; `engineCache.keys()` as list proxy) that map naturally onto new invariant members for the next loop cycle. A remediation plan should target the 9 P1s; the P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
