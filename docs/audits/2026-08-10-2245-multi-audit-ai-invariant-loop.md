> Audit Status: closed（原 open → 2026-08-11 mission-driver 起草轮 planned：P0 FIND-01 + P1 FIND-02/FIND-03/FIND-04/FIND-05/FIND-06 已路由三 plan——FIND-01/FIND-06 入 `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md`；FIND-03 入 `docs/plans/2026-08-11-0008-2-engine-loop-termination-and-error-carrier-remediation.md`；FIND-02/FIND-04/FIND-05 入 `docs/plans/2026-08-11-0008-3-conversation-adapter-host-contract-remediation.md`；16 条 P2 已移入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog「2026-08-10-2245 双审计 P2 填充」节 → **2026-08-11 plan `2026-08-11-0008-1` 收口翻 closed**（renderer 契约接线族 FIND-01 [P0] + FIND-06 [P1] 全修复落地，见该 plan Closure；engine/adapter 族 FIND-03 / FIND-02/FIND-04/FIND-05 由 plan `2026-08-11-0008-2`/`0008-3` 独立 closure surface 跟踪））
> Audit Type: multi-dimensional
> Mission: ai-invariant-loop

# Multi-Dimensional Audit — Mission `ai-invariant-loop` (`packages/flux-renderers-ai`) — Round 3

**Date:** 2026-08-10 · **Auditor:** opencode (deep-audit skill, per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/flux-renderers-ai/` — code, config, tests, and public contracts (exports / API surface), cross-referenced against architecture docs (`docs/components/flux-renderers-ai/engine.md`, `renderers.md`, `design.md`, `docs/audits/ai-invariants/*`) for documented contract drift.
**Baseline:** v1 (no compatibility burden / no transitional main-path allowances).
**Mission context:** successor audit after `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` (9 P1 + 18 P2, remediated via plans `1301-1/1301-2` + `1606-1/1606-2/1606-3`, 2026-08-10) and invariant gates ①-⑪ (`docs/audits/ai-invariants/gates.md`). This audit re-baselines after the remediation wave and surfaces only **NEW** findings not covered by registered gates, prior audit closures, or follow-up backlog entries.

## Methodology

Followed `docs/skills/deep-audit-prompts.md`: read calibration (`deep-audit-calibration-patterns.md`) + reopened adjudications + mission context (invariant catalog + gates registry + roadmap + prior audit closures); ran tooling baselines first; dispatched 6 parallel deep-dive sub-agents (Wave 1: dims 01/03, 04/05, 06/07/19, 09/10/11, 14/23, 16/17/20); then dispatched 4 **independent verification sub-agents** who re-checked every candidate against live code (fresh sessions, no reuse of deep-dive conclusions) and output retain/downgrade/reject per item. Only independently verified findings appear below. Two Wave-1 agents returned empty results and were re-dispatched with the same scope.

## Mechanical Gates (baseline run by main agent at audit time)

| Gate                                                   | Result                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:ai-engine-invariants`                      | **exit 0 — zero violations** (registered red all cleared, ⑧ multi P2-1 expansion included)                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` | PASS (part of repo-wide baseline)                                                                                                                                   |
| `pnpm --filter @nop-chaos/flux-renderers-ai test`      | **659 / 659 pass (76 files)** — above the I5 full-green baseline (572)                                                                                              |
| `check:audit-runtime-raw-schema-reads` (AI)            | 0 hits (compile-once hard gate)                                                                                                                                     |
| `check:audit-missing-renderer-markers` (AI)            | 0 hits                                                                                                                                                              |
| `check:audit-styling-suspects` (AI)                    | 16 hits, all the pre-registered attribute-equals `[data-slot='ai-*']` false positives — zero new                                                                    |
| `check:audit-async-failure-paths` (AI)                 | candidates re-verified individually by the dim 06/07/19 deep-dive — all fail-safe/intentional except findings below                                                 |
| `check:audit-test-global-leaks` (AI)                   | 8 candidates — 4 pre-reset, 2 registered prior-P3 pattern, 1 new instance (FIND-21), 1 scanner noise                                                                |
| `check:oversized-code-files` (AI)                      | no >700 errors; warnings resolved by 1606-1 module extraction (`create-engine.ts` 698, `use-conversation.ts` 696 are now within the cohesive-orchestrator envelope) |

## Verification Discipline

- 1 P0 candidate, 5 P1 candidates, and 16 P2 candidates were independently re-verified against live code by fresh verification agents (4 agents, item-by-item retain/downgrade/reject output).
- 1 candidate downgraded (jsonrepair double declaration P2 → P2-trivial, zero functional impact); 1 candidate line-corrected (`branching.ts` fallback at :34-35, not :44-47); 1 candidate fact-corrected (dual-named controller interfaces are 3/4 members identically shaped, not byte-identical); several findings had scope/window conditions precision-fixed by verifiers (clearAll race window, projection blind-spot impact surface).
- Prior-remediation completeness verified: P1-1/P1-2/P1-5, P2-1/P2-2/P2-6, P1-6/P1-7/P1-8/P1-9, P2-3/P2-4/P2-5, P2-10..P2-18 fixes are all live with genuine regression tests — except the residual surfaces reported below (FIND-01, FIND-06, FIND-19).

## Priority Summary

| Priority                                                                    | Count  | Drives remediation plan? |
| --------------------------------------------------------------------------- | ------ | ------------------------ |
| **P0** (blocking: contract break + fake-green test for changed behavior)    | **1**  | **Yes**                  |
| **P1** (material: real defect / contract drift / residual of P1-family fix) | **5**  | **Yes**                  |
| **P2** (non-blocking polish / doc rot / naming / narrow-path nits)          | **16** | No (follow-up backlog)   |

**Outcome:** audit has issues → remediation plan must cover the 1 P0 + 5 P1s; the 16 P2s triage to the `ai-invariant-loop-roadmap.md` follow-up backlog.

---

# P0 Findings (blocking — must fix)

## [FIND-01][P0] `onApproval` 事件在 ai-chat / ai-bubble 的 RendererDefinition.fields 中未注册 — schema 层 HITL 审批结构性不可达，且 P2-4 修复的回归测试用 spy 注入绕过编译器（假绿）

_Justification: public schema contract (`AiChatSchema.onApproval` / `AiBubbleSchema.onApproval` with an explicit doc-comment promise of full threading) never fires at runtime — `classifyField` puts undeclared `on*` keys into `kind:'prop'`, `props.events` is built only from `eventPlans`, so `props.events.onApproval` is permanently `undefined`; the P2-4 remediation's regression test injects the event via a spy wrapper, bypassing the compiled pipeline, and would fail against a real compiled render — an absent/fake test for changed behavior._

- **File:** `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:47-77` (ai-chat fields, no `onApproval`), `:99-109` (ai-bubble fields, no `onApproval`); contrast `:197-202` (ai-tool-call **does** declare `{ key: 'onApproval', kind: 'event' }` at :201); `src/schemas.ts:88-95`, `:135-141` (schema + threading promise); `packages/flux-compiler/src/schema-compiler/fields.ts:44-50` (classification); `packages/flux-react/src/node-renderer-resolved.tsx:243-271` (events from `eventPlans` only); `src/renderers/__tests__/ai-bubble-hitl.test.tsx:78-90,110-119,145-152` (spy injection)
- **Evidence:**
  ```ts
  // ai-renderer-definitions.ts — ai-chat fields end at onBranchChange; ai-bubble has only onBranchChange as event
  { key: 'onBranchChange', kind: 'event' },
  // schemas.ts:93-95 — public promise, never delivered
  /** P2-4 (2026-08-10 multi-audit): HITL approval dispatch for the bubble path.
   *  Threaded from `ai-chat` schema events → AiChatContextValue → AiMessageList → AiBubbleView ... */
  onApproval?: ActionSchema;
  // fields.ts:44-50 — undeclared on* key falls to prop
  if (/^on[A-Z]/.test(key)) {
    if (COMMON_EVENT_FIELDS.has(key)) return { key, kind: 'event' };
    return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };   // onApproval lands here
  }
  // ai-bubble-hitl.test.tsx:80-86 — test bypasses the compiler
  const wrappedEvents = { ...props.events, onApproval: ((event) => { captured.push(event); }) as never };
  ```
- **Current:** `COMMON_EVENT_FIELDS` (`flux-core/src/constants.ts:14-21`) = onChange/onBlur/onFocus/onKeyDown/onKeyUp/onInput; `onApproval` not among them and not declared in either definition → `kind:'prop'` → never enters `eventPlans` → `props.events.onApproval === undefined`. ai-chat's context callback (`ai-chat.tsx:259-262`) is unconditionally defined and dispatches `eventsRef.current.onApproval?.()` → silent no-op (buttons stay enabled, clicks do nothing); the standalone ai-bubble path gates on `props.events?.onApproval` (`ai-bubble/index.tsx:321-336`) → `undefined` → `hitl-no-handler` guard (`ai-tool-call.tsx:211`) → button disabled. `AI_NAMESPACE_ACTIONS` has 7 actions and no tool-call-approval — no bypass channel. The test schema (`ai-bubble-hitl.test.tsx:110-119`) does not even contain `onApproval`; assertions (`:145,:152`) can only pass via the injected spy — under a real compiled render `captured` stays empty and the test fails.
- **Risk:** schema-driven HITL approval (the exact feature the P2-4 remediation claimed to wire, per `renderers.md:459,618,623`) is dead on the default chat/bubble message flow; users clicking approve/reject get no reaction; the fake-green test guarantees future refactors keep it broken silently.
- **Fix:** add `{ key: 'onApproval', kind: 'event' }` to both ai-chat and ai-bubble `fields` in `ai-renderer-definitions.ts` (align with ai-tool-call :201); rewrite `ai-bubble-hitl.test.tsx` to declare `onApproval: { actionType: ... }` in the schema and assert dispatch through the real compiled pipeline (remove spy injection).
- **误报排除:** not P2-4 duplicate — P2-4 (FallbackToolCallCard dropping the prop) is fixed; this is the residual gap in the same chain: the schema→events compile source was never wired, and the remediation test masks it. `contract-honesty.ts` only checks declared-but-unconsumed event keys, not consumed-but-undeclared ones.
- **复核状态:** 独立复核通过（成立，P0）

---

# P1 Findings (material — must fix)

Each P1 was independently re-verified against live code (file:line + behavior trace).

## [FIND-02][P1] `clearAll` 延迟原子清空与「clearAll 之后新建会话」的 saveConversation 反向竞态 — 新会话存储记录被 `storage.clearAll()` 抹掉

_Justification: real data-loss window on the documented path: `clearAll` snapshots the drain, clears `pendingSavesRef`, then asynchronously runs `storage.clearAll()`; a `createConversation` registered in that window passes its settlement mirror-check (creation synchronously re-populates `conversationsRef`) and its save lands after the drain → the atomic clear wipes the new session's record → ghost-free-creation in reverse (record lost on remount). Window = atomic-clear storage + non-empty drain; no test covers the clearAll-first + create order._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:639-642` (drain snapshot + `pendingSavesRef.clear()`), `:649-661` (`drain.then(() => storage.clearAll())`), `:399` (sync mirror write), `:422-432` (create save chain)
- **Evidence:**
  ```ts
  const drain = Promise.allSettled(ids.map((id) => pendingSavesRef.current.get(id) ?? Promise.resolve()));
  pendingSavesRef.current.clear();                       // :642 — post-clearAll writes are outside the drain
  void drain.then(() => {
    if (storage?.clearAll) Promise.resolve(storage.clearAll()).catch(...);  // :651 — atomic clear lands after
  });
  // createConversation save chain (:422-432): prevPending is now undefined, mirror check at :426 passes
  // because :399 already wrote conversationsRef.current = [info, ...]
  ```
- **Current:** the K3/④ timing guards cover "gated old writes must drain before delete/clear" (direction: old writes before the clear); this finding is the inverse direction — the clear lands after an unchained new write. Verified tests cover only `create+clearAll` (create first) and `clearAll+create` with a storage that has **no** `clearAll` implementation; the atomic-clear + clearAll-first combination has zero coverage.
- **Risk:** host programmatic `clearAll(); createConversation(...)` (or fast UI "clear → new chat") under IndexedDB-like async storage: new session exists in memory, its record is wiped → reload loses it; same ghost family as the fixed FP-2/P1-3/P1-4, opposite direction.
- **Fix:** make the atomic clear target a snapshot of conversations existing at clearAll time (per-id fan-out over the snapshot instead of `storage.clearAll()`, or a list-mirror-union drain that includes post-clearAll writes); add a clearAll-first + create regression test.
- **误报排除:** invariant ④ fan-out-source gate covers enumeration source only (`engineCache ∪ pendingSaves ∪ conversationsRef`); the timing window between the drain and the deferred `storage.clearAll()` is outside every gate surface.
- **复核状态:** 独立复核通过（成立，P1）

## [FIND-03][P1] K-⑩ 空产物 drop 使 A-5 错误气泡 + 重试按钮在「零 chunk 失败轮」结构性不可达 — ⑩ 修复引入的用户可见回归

_Justification: git-verified regression (compare `84271072~1`: catch path used to `commitAssistant()` the empty placeholder, which carried the error bubble + retry button; K-⑩ now splices it): on zero-chunk failure turns (auth 401/429, network error before first byte, `onBeforeRequest` rejection) the assistant carrier is removed, `ai-message-list`'s `isError` binds only to a trailing assistant message, so the in-list error UI and retry entry never render — the engine-, buildContext- and autoSave-side cleanup is correct (invariant ⑩), but the A-5 error surface lost its carrier on the most common failure path._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:583-585` (`commitOrDropResidue` in runOnce catch), `src/engine/utils.ts:156-162` (`isVacuousAssistantResidue`), `src/renderers/ai-message-list.tsx:110,126` (`isError` binding), `src/renderers/ai-bubble/renderers/error.tsx:7-13` (documented A-5 contract)
- **Evidence:**
  ```ts
  // create-engine.ts catch path
  } catch (error) {
    assistant.loading = false;
    commitOrDropResidue();            // :585 — content:'' + no finishReason → splice removes the carrier
  // ai-message-list.tsx
  isError={inError && idx === messages.length - 1 && message.role === 'assistant'}  // trailing assistant gone
  // error.tsx: "Shown when the engine requestState === 'error' ... Surfaces a retry entry"
  ```
- **Current:** verified 4 sub-claims: (1) zero-chunk failure leaves only the user message; (2) `isError` guard is then never true; (3) `ai-chat` root `data-state="error"` is a selector attribute with no visible UI; (4) `error-retry.test.tsx` only uses synthetic `metadata.isError` messages, never a real engine failure turn. `engine-invariants-i4.test.ts:140-157` pins the engine-side drop (correct for the protocol-cleanliness goal), but no test covers the render surface.
- **Risk:** on the most common failure class, users see no in-list error and no retry entry; only `onError` schema event (host must wire it) or root attribute reveal the failure — silent for default wiring.
- **Fix:** keep the drop for history/persistence, but give the error surface a carrier — e.g. render a list-level error banner when `requestState==='error'` and the trailing message is not assistant, or retain a `metadata.isError`-marked assistant carrier in the projection surface only; add a real-engine zero-chunk failure → error-UI integration test.
- **误报排除:** not a K-⑩ design complaint — the drop is correct on engine/buildContext/autoSave faces; this is the fourth, previously unguarded face (render surface) of the same cleanup, exactly the "三落地面缺第四面" family. No bug note or gate covers it.
- **复核状态:** 独立复核通过（成立，P1，git 历史铁证）

## [FIND-04][P1] `ai:send` / `component:sendMessage` 对失败轮与忙时静默丢弃统一返回 `{ok:true}` — 命令边界的失败保真度缺口

_Justification: `sendMessage`'s documented void-settle contract (never rejects) means the action provider and component handle can never surface failure through `ActionResult.error` — the repository convention (flow-designer `toActionResult`, word-editor provider) maps command failures to `{ok:false}`; worst case is the `isProcessing` busy silent-drop (`create-engine.ts:206-208`): a second send is dropped with no message sent yet reports success._

- **File:** `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts:90-91`, `src/adapters/ai-component-handle.ts:67-72,108-110` (dead catch), `src/engine/create-engine.ts:206-208` (busy drop), `:356-377,:583-603` (error swallowing into state, documented at `:389-393`)
- **Evidence:**
  ```ts
  // ai-action-provider.ts
  await engine.sendMessage(text);
  return ok(); // :91 — unconditional
  // create-engine.ts busy path
  if (adapter.getState().isProcessing) return; // :207 — message never sent, still ok:true upstream
  ```
- **Current:** verified `sendMessage` never rejects on any of the four failure branches (connector-missing / stream error / tool-no-executor / plugin throw) — all settle into `requestState`/`lastError`. The provider/handle return without checking state; the same provider already returns `ok:false` for the null-engine window (`:74-79,87-89`), so it can distinguish "engine not ready" but not "request failed". `action-provider.test.tsx:36-51` asserts only the success path and arg-validation; no test asserts the failure-turn `ActionResult`.
- **Risk:** schema-level `onError` routing and host code checking `result.ok` (or `{ok:true, error}` consumers) treat failed sends as successes; double-send reports "success" for the dropped second message.
- **Fix:** after `await engine.sendMessage(...)`, snapshot `engine.getState().requestState` and return `fail(lastError)` on 'error' (and `{ok:false, error:'engine busy'}` on the busy drop); add failure-turn + busy-drop regression tests.
- **误报排除:** not a complaint about the engine's void-settle contract (that is documented design); this is the **mapping layer** fidelity gap — the mapping layer can read `getState()` without changing the engine contract. Prior dim-19 checks covered engine-side `lastError` parity, not the action/component exit.
- **复核状态:** 独立复核通过（成立，P1）

## [FIND-05][P1] 外部 engine 契约缺口：native-adapter 默认构造绑定 `useMessage`/`ai-chat` engine prop → `useSyncExternalStore` getSnapshot 每次新引用 → 无限渲染循环

_Justification: `createMessageEngine`'s **default** adapter is the non-caching native adapter (`state-adapter.ts` `getState()` builds a fresh object per call); `useEngineView` feeds it raw into `useSyncExternalStore`; `ai-chat`'s duck-type guard only checks `subscribe/getState/sendMessage` presence. The documented host path (engine.md §8.5 external engine + §8.2 native as "production default") therefore crashes with "Maximum update depth exceeded". In-repo consumers all pass `createReactMessageAdapter` explicitly; the crash is host-side but on the documented path._

- **File:** `packages/flux-renderers-ai/src/adapters/use-engine-view.ts:42-47`, `src/engine/state-adapter.ts:30-33`, `src/engine/create-engine.ts:63`, `src/renderers/ai-chat.tsx:29-37`, `docs/components/flux-renderers-ai/engine.md:185-188,257` (native = production default, no adapter precondition documented)
- **Evidence:**
  ```ts
  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);  // raw getSnapshot
  // state-adapter.ts:30-33 — fresh object per call
  getState() { const { messages, requestState, ... } = this.state; return { messages, requestState, ... }; }
  const adapter = options.adapter ?? createNativeMessageAdapter();  // create-engine.ts:63 — default is native
  ```
- **Current:** `react-adapter-identity.test.ts:78-91` already proves the base adapter violates snapshot stability (`expect(a).not.toBe(b)`); the only enforcement is a code comment in `use-engine-view.ts:30-35` and a test comment (`ai-chat-external-engine.test.tsx:44`) — no runtime guard, no doc. All in-repo paths (use-message, use-conversation buildEngine, playground) pass the React adapter, so the defect is host-facing: a host following engine.md §8.5 with the natural `createMessageEngine({connector})` default gets a page-crash loop.
- **Risk:** documented integration path = page freeze; the duck-type guard gives false confidence.
- **Fix:** either (a) guard in `useEngineView`/`ai-chat`: detect unstable getSnapshot (compare first two calls) and `console.warn` once with a pointer to `createReactMessageAdapter`, or (b) document the adapter precondition in engine.md §8.5 and add a host-facing regression test (native engine bound to the view must produce a diagnosable error, not an infinite loop).
- **误报排除:** not "host responsibility" — v1 baseline + the path is §8.5-documented + failure mode is a hard crash; prior dim-05 verified only the React adapter side, not the default/native side.
- **复核状态:** 独立复核通过（成立，P1）

## [FIND-06][P1] P1-6 投影重建修复完整性缺口：触发谓词仍漏两类"无信号"替换 — 等长原地元素替换（盲区 A）与 idle→processing 会话交换（盲区 B）

_Justification: the P1-6 fix expanded the rebuild trigger to 4 signals (isProcessing flip / terminal arrival / idle array-ref change / idle length change), but all four are coarse-grained; two documented-path replacements emit no signal: (A) equal-length in-place element replacement (`cleanDanglingAssistantAt` strip path after abort-mid-executor, `commitAssistant`) leaves `${messages}` regions holding the pre-strip ghost tool_calls until the next turn boundary (possibly never); (B) switching to a background-streaming session (documented switch-while-stream keeps the engine running) short-circuits `idleMessageReplacement` via `!isProcessing` — the projection shows the previous session for the whole streaming duration. Same symptom family as the fixed P1-6, residual members._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:317-336` (trigger predicate), `:274-276` (projection feeds auxiliary regions only), `src/engine/tool-execution.ts:145-158` (`draft.messages[index] = cleaned`), `src/engine/create-engine.ts:483-491` (`commitAssistant`), `src/engine/utils.ts:208-214` (strip-keeps-text branch)
- **Evidence:**
  ```ts
  const idleMessageReplacement =
    !isProcessing &&
    (projection.snapSourceRef !== messages || projection.snapLength !== messages.length); // :325-327
  const shouldClone = crossedBoundary || terminalCrossed || idleMessageReplacement; // :328
  // Blind spot A: abort() flips requestState synchronously (terminalCrossed clone reads UN-cleaned messages),
  // then the async executor settle runs cleanDanglingAssistantAt → in-place swap, same ref, same length → no signal.
  // Blind spot B: A(idle) → B(processing): snapSourceRef changes but !isProcessing gates idleMessageReplacement;
  // crossedBoundary requires processing→idle, terminalCrossed false while 'processing'.
  ```
- **Current:** verified both blind spots have concrete reachable paths (A: abort-mid-executor with strip-keeps-text; B: switch-while-stream per `use-conversation.ts:73-75,356-357` + ai-chat null-switch window). Impact is limited to the auxiliary `${messages}`-bound regions (header/beforeMessages/afterMessages/footer/emptyState) — the main list reads live context — but those regions show stale-session data or ghost tool-call cards for long windows. The P1-6 comment claiming "rebuild triggers are now 1..4" is over-claimed.
- **Risk:** multi-session chat (documented main path): summary/counter/empty-state regions disagree with the visible list; ghost tool-cards in host-rendered auxiliary areas after aborted tool turns.
- **Fix:** add an element-identity fingerprint to the idle guard (e.g. last-message id + finishReason + tool_calls length), and on engine-identity swap (A→B) clone unconditionally (remove the `!isProcessing` gate or add an engine-identity signal); add two regressions: swap-to-streaming shows B's data immediately; abort-mid-executor strip removes ghost tool_calls from the projection.
- **误报排除:** the turn-boundary snapshot design itself is documented and correct; the defect is the residual no-signal replacement surfaces outside P1-6's four triggers — same family, new members, not re-reporting P1-6.
- **复核状态:** 独立复核通过（成立，P1）

---

# P2 Findings (non-blocking — follow-up backlog)

Each P2 was independently verified against live code.

## [FIND-07][P2] `contentResolverName` 死契约字段 — schema、RendererDefinition、renderers.md 三方声明，全包零消费，且承诺的"按名注册"机制不存在

_Justification: `schemas.ts:123` + `ai-renderer-definitions.ts:105` + `renderers.md:125` ("注册的内容解析器名字（默认 'default'）") declare the field; `rg contentResolver` finds zero consumers and no registry; the real mechanism is the injected `contentRenderers` matcher array — a different concept. Same family as the closed autofocus dead-field adjudication (1606-3: drop by default)._

- **File:** `packages/flux-renderers-ai/src/schemas.ts:123`, `src/ai-renderer-definitions.ts:105`, `docs/components/flux-renderers-ai/renderers.md:125`, `src/renderers/ai-bubble/index.tsx:286-341` (zero reads)
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-08][P2] `ConversationStorageErrorEvent` 被公开 `UseConversationOptions.onStorageError` 签名引用，但未从包入口导出 — 宿主无法经公共 API 命名该类型

_Justification: invariant ④'s host observation channel type is unreachable: `index.ts:129-134` exports the options but not the event type; `ConversationStorageStrategy` (index.ts:111) is exported — asymmetry; exports map has no deep paths._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:36,39-51`, `src/index.ts:129-134` (vs :111), `docs/components/flux-renderers-ai/engine.md:283`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-09][P2] `@tiptap/core` 生产代码值导入（rich-text 子路径）但仅声明在 devDependencies — 与同族 `@tiptap/react`/`@tiptap/starter-kit` 的 optional peer 处理不一致

_Justification: `tiptap-sender.tsx:19` imports `Extension` (value import, runtime base class); `dist/rich-text/tiptap-sender.js:19` confirms the bare import survives build; the manifest declares it only in devDependencies while the sibling Tiptap packages are optional peers; a host selecting the rich-text subpath has no declared channel to install it. Mitigated by `private:true` (workspace-only consumer today)._

- **File:** `packages/flux-renderers-ai/package.json:33-49,53`, `src/rich-text/tiptap-sender.tsx:19`, `dist/rich-text/tiptap-sender.js:19`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-10][P2] engine.md §7.1 `ChatMessageUIState` 代码块与 live `types.ts` 漂移 — P1-8 修复后 `thinking` 形状未同步（且 §7.1 还漏 `editing` 字段），与已同步的 §8.3 注记自相矛盾

_Justification: engine.md:51-55 still shows `thinking?: { open: boolean }`; live `types.ts:75` is `{ open?: boolean; startedAt?: number; endedAt?: number }` plus `editing` at :82; §8.3 (engine.md:203) already documents the new contract — the authoritative data-model block is the selective miss._

- **File:** `docs/components/flux-renderers-ai/engine.md:51-55` vs `packages/flux-renderers-ai/src/engine/types.ts:67-84`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-11][P2] engine.md §9.4 示例代码使用不存在的 `runtime.registerImport` API（P2-13 同族未修净，且扩散至 design.md/implementation.md）

_Justification: `rg registerImport` zero hits in packages/apps/scripts; the real mechanism is schema `xui:imports` + `env.importLoader` (`apps/playground/src/ai/mock-ai-env.ts:90-115`); §9.4's own prose (:437 "在 xui:imports 注册") contradicts its code block; the same fictional API appears in design.md:504 and implementation.md:162._

- **File:** `docs/components/flux-renderers-ai/engine.md:437-448`, `design.md:504`, `implementation.md:162`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-12][P2] autoSave 不覆盖 connector-missing 轮 — 用户消息只进内存不进 storage，reload 后静默丢失

_Justification: the autoSave trigger predicate is `wasProcessing && isDone` (`use-conversation-autosave.ts:38-44`); the connector-missing branch (`create-engine.ts:209-231`) goes idle→error without ever entering 'processing', so the pushed user message is never saved; session metadata persists but message content is lost on remount. Narrow path (connector null at runtime + reload before next successful turn) — P2._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation-autosave.ts:38-44`, `src/engine/create-engine.ts:209-231`; no test covers connector-missing + autoSaveMessages
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-13][P2] ai-message-list 空态分支丢弃 `props.meta.className` — schema className 在空会话时静默消失

_Justification: empty branch (`ai-message-list.tsx:64`) uses `cn('nop-ai-message-list')` without `props.className`; non-empty branch (:81) includes it; same-package precedent (ai-prompts.tsx:49, ai-suggestions.tsx:89) keeps className in empty states — breaks the canonical-root className routing contract on the empty path._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:61-76` vs `:78-90`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-14][P2] `jsonrepair` 同时声明在 dependencies 与 devDependencies — 重复清单条目（零功能影响）

_Justification: package.json:31 (dependencies, correct — production import at `ai-tool-call.tsx:11`) and :57 (devDependencies, redundant); no functional impact; manifest hygiene/audit ambiguity only._

- **File:** `packages/flux-renderers-ai/package.json:31,57`
- **复核状态:** 独立复核通过（成立，P2-trivial）

## [FIND-15][P2] invariant ⑧ 新增测试文件 `engine-invariants-p2.test.ts` 未进入 engine.md 运行命令清单与 gates.md ⑧ 行

_Justification: the 1606-1 extraction created `engine-invariants-p2.test.ts` (⑧ break/throw/regenerate-sequence members at :52/:103/:129) but engine.md:522's 6-file command list and gates.md:19's ⑧ run-command both omit it (gates.md ⑧ row's "同上" points at the ⑥⑦ file) — following the documented focused command silently skips 3 of the 4 branch-stamp leak arms. `pnpm test` full-run still covers it._

- **File:** `docs/components/flux-renderers-ai/engine.md:520-526`, `docs/audits/ai-invariants/gates.md:19`, `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p2.test.ts:45-160`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-16][P2] invariant-catalog §4.1 `controller` 锚点 `:425-430` 在 P2-16 校准后仍漂移 ~240 行（live 定义在 `use-conversation.ts:664-669`）

_Justification: P2-16's calibration table covered the method rows but missed the "adapter 非函数字段" note; :425-430 is now the createConversation pending-save drain chain; the controller object literal is at :664-669. Semantic/detection method still correct._

- **File:** `docs/audits/ai-invariants/invariant-catalog.md:125` vs `packages/flux-renderers-ai/src/adapters/use-conversation.ts:664-669`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-17][P2] engine.md:123-127 / types.ts:332-336 的「design.md §14.3 line 556」行锚失效（design.md 已增长 ~110 行）

_Justification: §14.3 now starts at design.md:655 (setMessages row at :665); :556 is now an unrelated §11.5 token-usage row; the section reference survives but the precise line anchor is stale in both the doc and the code comment._

- **File:** `docs/components/flux-renderers-ai/engine.md:123-127`, `packages/flux-renderers-ai/src/engine/types.ts:332-336`, `docs/components/flux-renderers-ai/design.md:655-666`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-18][P2] cycle2-findings / cycle2-adjudication 的 `文件:行` 引用在 1606-1 模块抽取后失效（autoSave 已迁 `use-conversation-autosave.ts`；create-engine.ts 锚点部分漂移）

_Justification: K-⑩-3's `use-conversation.ts:190/:203-209` refs now point at unrelated code (real logic: `use-conversation-autosave.ts:42/:85`); W-E/W-⑨-c create-engine refs drifted ~90 lines; 3/5 create-engine refs still roughly accurate. Historical audit records (status `active` header) should carry an anchor-epoch note._

- **File:** `docs/audits/ai-invariants/cycle2-findings.md:74,170,173`, `cycle2-adjudication.md:43,76,79`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-19][P2] `AiConversationController` 与 `AiConversationControllerBridge` — 同包双命名公共接口（3/4 成员逐一同构，renameConversation 仅返回类型宽度差）

_Justification: both exported from index.ts (:124-126, :129-134); no doc explains the difference; the hook produces the Bridge while props/action-provider consume the Controller; structurally assignable today, but any future member addition forks the contract. Not cross-package (excluded from calibration Pattern 10); same-package terminology noise._

- **File:** `packages/flux-renderers-ai/src/adapters/ai-conversation-controller.ts:19-24`, `src/adapters/use-conversation.ts:689-694`, `src/index.ts:124-126,129-134`
- **复核状态:** 独立复核通过（成立，P2，表述修正：3/4 成员同构）

## [FIND-20][P2] ai-attachments 根节点 `role="region"` 无 accessible name — landmark 语义失效

_Justification: root div (`ai-attachments.tsx:214-227`) declares `role="region"` (:222) with no `aria-label`/`aria-labelledby`; an unnamed region is not exposed as a landmark (WCAG 4.1.2/1.3.1). Either add `aria-label={t('flux.ai.attachments')}` or drop the role._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:214-227`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-21][P2] `ai-bubble-hitl.test.tsx` 模块级 `let captured` 无 afterEach 重置 — 已登记 P3 模式（reset-only-in-test-body）的第三个未点名实例

_Justification: module-top `let captured` (:73) with reset only inside the single test body (:104); afterEach (:23-25) only does cleanup; zero current leakage (one test), but exact-length assertions (`:145`) become a future cross-test hazard. Siblings: ai-chat-conversation-change.test.tsx, ai-chat-subscribe.test.tsx; correct pattern exists (ai-chat-projection.test.tsx:83-88)._

- **File:** `packages/flux-renderers-ai/src/renderers/__tests__/ai-bubble-hitl.test.tsx:73,23-25,104`
- **复核状态:** 独立复核通过（成立，P2）

## [FIND-22][P2] `branching.ts` 的「prev 无数字后缀」fallback 分支零测试覆盖

_Justification: fallback at `branching.ts:34-35` (`seq += 1; return \`branch-${seq}\``) fires when `regenerate()` follows a custom non-numeric branchId (`create-engine.ts:683-684`); engine-branches.test.ts covers mint/numeric-increment/explicit-pass-through/no-op/in-flight only — deleting the fallback leaves tests green._

- **File:** `packages/flux-renderers-ai/src/engine/branching.ts:32-35`, `src/engine/__tests__/engine-branches.test.ts:24-127`
- **复核状态:** 独立复核通过（成立，P2，行号修正 :34-35）

---

# Dimensions Confirmed CLEAN / No-Report (what was checked)

- **01 Dependency graph:** no internal subpath imports (`@nop-chaos/.*src/` zero hits); no reverse deps (only apps/playground imports the package); no cycles; exports map (`"."`/`"./rich-text"`/`"./styles.css"`) aligned with dist; `tsconfig.build.json` excludes tests/test-support cleanly; devDeps flux-formula/flux-runtime used only by test support — legitimate. (FIND-09/FIND-14 aside.)
- **05 Reactive precision:** `ReactMessageAdapter` getSnapshot cached; per-kind subscription channels (`state-adapter.ts:52-83`) correct; no large-object effect deps; no void useMemo; virtualizer usage standard. Zero findings beyond FIND-05/FIND-06.
- **07 Lifecycle:** all 24 non-test useEffects classified — no runtime logic in React effects; unmount cleanups (media streams, editor destroy, objectURL, subscriptions, global listeners, focus restore) all present; save-modify-restore try/finally-protected; `useEffectEvent` usage compliant; no render-phase store mutation. Zero findings beyond FIND-03 (error-carrier ownership).
- **08 Validation:** N/A (no form fields in AI package; design §3 does not bind to form owner).
- **10 Styling:** all `nop-ai-*` markers pure; 16 `[data-slot]` hits all pre-registered attribute-equals scoped; no BEM; theme-independent; `prefers-reduced-motion` honored. Zero findings.
- **11 UI components:** all imports via `@nop-chaos/ui`; raw elements all justified (file input, img, pre/code, a, time/sup/svg, ul/ol, Tiptap host surface); zero radix/base-ui direct deps. Zero findings.
- **13 Type safety:** no long assertion chains; remaining `any`/`as` at legit schema-payload/browser boundaries. Zero findings.
- **19 Error propagation (engine side):** `lastError` parity on all four failure branches verified; tool-execution preserves original Error; no diagnostic suppression flags; prior P1-1/P1-2/P1-5 fixes verified complete with genuine regression tests (delete-fix-code-goes-red confirmed). The action-boundary gap is FIND-04.
- **23 Test effectiveness:** zero `vi.mock` in the package; zero tautological asserts; 9 `not.toThrow` all have companion assertions; no dead-code-with-tests; no timezone-sensitive tests; all P1 remediation regression tests verified behavior-real (P1-1 three arms, P1-2 five arms, P1-3/P1-4 two scenarios, P1-5 whitelist dual-case, P1-6 four scenarios, P1-7/P1-8/P1-9 interaction asserts). Only FIND-22 coverage gap.
- **Prior P2-5 verification:** all 9 interactive renderers + ai-chat consume `props.meta.disabled` with regression tests; ai-bubble non-consumption is a registered 1606-3 adjudication decision — not re-reported.
- **Prior P2-10..13 verification:** engine.md §8.1 (12 methods incl. setMessageEditing), §8.5 (9 fields), §8.6 (6 fields), §9.3 (real path/function) all now match live code — only residual doc drifts are FIND-10/FIND-11/FIND-15..FIND-18.

# Cross-Cutting Patterns

1. **Schema-declared contracts with a broken compile/registry link (FIND-01):** schema type + doc comment + renderer consumption all exist; the `RendererDefinition.fields` registration is the single missing link, and the regression test masks it via injection. Same "closure scoped to one file while the concept spans three" anti-pattern as the 0707 audit — the compiler classification step (`fields.ts`) is a checkable surface that no gate covers (`contract-honesty` only checks the reverse direction). Recommend a gate: declared `on*` keys in schema types ∩ consumed `events.*` keys ⊆ registered event fields.
2. **Invariant-face completeness: the fourth face (FIND-03):** invariant ⑩ cleans engine history, buildContext payload, and autoSave — the render error surface (A-5) lost its carrier. Mirrors the P2-14 "三落地面缺第四面" finding; the mission's own founding lesson (same family, missed sibling) applies to cleanup surfaces too.
3. **Timing windows outside gate surfaces (FIND-02, FIND-06):** all registered gates assert state shapes or enumeration sources; none cover inter-method timing (clearAll drain vs post-clear writes; projection signal vs in-place swap). These are exactly the "new interleavings" the Loop Rule expects I2 adversarial probing to find — candidates for Cycle 3 invariant members.
4. **Doc anchor rot accumulates faster than calibration can catch up (FIND-15..FIND-18):** three separate calibration passes (P2-16, 1606-3 Phase 5) each fixed the table rows but missed note rows, run-command lists, and historical records; recommend a single "anchor-epoch + live-verify" boilerplate note on all ai-invariants docs (catalog §2 already has the pattern).
5. **Host-facing contract hardening (FIND-05, FIND-08, FIND-09):** the package's documented host surfaces (external engine binding, storage error typing, rich-text subpath deps) all have soft spots that compile-time and in-repo tests cannot see; three independent findings in one wave — worth a focused host-contract review in remediation.

# Conclusion

`flux-renderers-ai` remains mechanically healthy: invariant gates ①-⑪ hold (`check:ai-engine-invariants` exit 0), typecheck + 659/659 tests green, prior P1/P2 remediation verified complete with behavior-real regression tests. However this round surfaces **1 P0** (onApproval compile-registration break with fake-green test — a documented public contract that never fires), **5 P1** (clearAll×create reverse race, A-5 error-surface regression from K-⑩, action-boundary ok:true fidelity gap, native-adapter infinite render loop on the documented host path, P1-6 projection residual blind spots), and **16 P2** items (dead contract field, unexported public type, manifest inconsistencies, doc anchor rot, naming/a11y/test-hygiene nits). The P0+P1 cluster shares the mission's founding pattern — same-family residual members surfaced after a remediation wave — and maps naturally onto new invariant members (compile-registration gate, fourth-face cleanup gate, timing-window members). A remediation plan should target the 1 P0 + 5 P1s; the 16 P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
