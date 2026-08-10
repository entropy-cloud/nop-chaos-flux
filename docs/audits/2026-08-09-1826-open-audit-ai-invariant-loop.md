> Audit Status: closed（原 open → 2026-08-10 mission-driver 起草轮 planned：P1-1 入 `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`（Phase 4，plugin ctx 写隔离 + 不变式 ⑪）；8 条 P2 已移入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog「2026-08-09-1826 双审计 P2 填充」节 → **2026-08-10 plan `2026-08-10-1301-1` 收口翻 closed**（open P1-1 plugin ctx 写隔离修复落地 + 不变式 ⑪ 沉淀，见该 plan Closure））
> Audit Type: open-ended
> Mission: ai-invariant-loop

# Open-Ended Adversarial Audit — Mission `ai-invariant-loop` (`packages/flux-renderers-ai`)

**Date:** 2026-08-10 · **Auditor:** opencode (per `docs/skills/open-ended-adversarial-review-prompt.md`)
**Scope:** `packages/flux-renderers-ai/` — all source read completely (engine, adapters, renderers, rich-text, schemas, registry, storage types, package config); gates run; invariant catalog / gates registry / engine.md / prior audits cross-checked for dedup.
**Round files:** `docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/round-01..03.md`
**Mechanical baseline at audit time:** `check:ai-engine-invariants` exit 0 (zero violations) · AI package 69 files / 572 tests green · `check:react19` clean. Live code is the post-Cycle-2/I6 baseline (HEAD de36e8e9); the sibling multi-audit (`2026-08-09-1826-multi-audit-ai-invariant-loop.md`) P1-1..P1-9 / P2-1..P2-18 are **not re-reported** here.

**Perspectives used:** contract archaeologist, abnormal-path detective, dead-code sweeper, new-developer. Entry points came from code signals, not the dimension table.

---

# P1 Findings (material — should be fixed)

## [P1-1] Plugin hook context exposes the engine's LIVE internal message array — the documented `onTurnStart` usage pattern silently corrupts engine state

_Justification: engine.md §8.3 documents `onTurnStart` for "skill 注入 system prompt" — the most natural plugin implementation mutates `ctx.request.messages`, which (without a host `systemPrompt`) IS the engine's internal array. A plugin push permanently enters engine history, bypasses `mutate`/notify, and flows into the next request payload and autoSave snapshots. Verified by runtime probe (identity + corruption + onTurnEnd all confirmed). Registered candidate family "plugin 生命周期" covers hook concurrency/error isolation/unregister interleavings only — write isolation is a gate blind spot._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:572-599` (`buildContext`), `:253-256` (onTurnStart call site), `:376` (onTurnEnd call site); contract doc `docs/components/flux-renderers-ai/engine.md:186` (§8.3 table)
- **Evidence:**
  ```ts
  const allMessages = adapter.getState().messages; // LIVE internal array
  const history = isPlaceholder ? allMessages.slice(0, -1) : allMessages;
  const requestMessages: ChatMessage[] = systemPrompt
    ? [{ id: 'system-prompt', role: 'system', content: systemPrompt }, ...history]
    : history; // LIVE when no systemPrompt
  ```
  `onTurnStart` runs before any placeholder is pushed (tail = user message) and `onTurnEnd` after the turn (tail = committed assistant) → both receive `ctx.request.messages === engine.getState().messages` (same reference). Probe results: (1) identity confirmed at both hooks; (2) `ctx.request.messages.push({role:'system',...})` from onTurnStart leaves the message permanently in `state.messages`; (3) `ctx.state` is the live state object. The `onBeforeRequest`/`onAfterRequest`/`onCompletionChunk` contexts are incidentally copies (placeholder pushed first) — so the trap is exactly the two hooks documented for system-prompt injection.
- **Risk:** host plugin following the documented pattern corrupts conversation history without any notification; corrupted history is sent to the model and persisted by autoSave. Engine's every other exit (O-2 `getMessages` shallow isolation, Decision-A projection clone, K-⑩ snapshot surfaces) is reference-isolated — the plugin ctx is the single unpoliced write surface ("same family, missed method" shape the mission exists to catch).
- **Fix:** unconditionally shallow-copy `requestMessages` in `buildContext` (the array layer; deep copies per-plugin would be overkill), document `MessageEngineContext` fields as read-only, and add a runtime parameterized member (Invariant ⑨ extension or new ⑪) asserting `ctx.request.messages !== engine.getState().messages` inside hooks.
- **误报排除:** distinct from multi-audit P1-5 (engine→connector payload hygiene — the wire direction) — this is plugin→engine write direction, previously unaudited.
- **复核状态:** runtime probe 3/3 passed on live code (probe file removed after run).
- **信心:** 确定

---

# P2 Findings (non-blocking — follow-up backlog)

## [P2-1] `useConversation`-built engines never sync a changed `connector` — partial silent no-op (new instance of the 2151 "hot-swap scope" family)

_Justification: `useMessage` hot-swaps `connector` on its self-built engine (`use-message.ts:97-102`); `useConversation` builds engines with `connectorRef.current` captured at build time (`use-conversation.ts:168-183`) and never calls `setConnector` anywhere (grep zero hits). After a host connector swap, existing conversation engines keep the old connector forever while newly built ones use the new one — old conversations silently keep stale credentials/model. 2151 covered `useMessage` mount-time-only options; the conversation-manager path was never checked (the m4 "never touch an external engine's connector" rule does not apply — these engines are self-built). Fix: fan-out `engine.setConnector(connector)` over `engineCache` on connector change, or document the build-time-capture limitation._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:84-87,168-183`
- **信心:** 确定

## [P2-2] `createEngineOptions` type allows `engine` but `buildEngine` silently drops it

_Justification: `Omit<UseMessageOptions, 'connector'>` (`use-conversation.ts:18`) admits `engine?: MessageEngine | null`, but `buildEngine` (`:168-183`) forwards only 8 fields. A host passing `createEngineOptions: { engine: myEngine }` gets a self-built engine with zero warning — type contract admits a silently-ignored option. Fix: widen the Omit to `'connector' | 'engine'`._

- **File:** `packages/flux-renderers-ai/src/adapters/use-conversation.ts:18,168-183`
- **信心:** 确定

## [P2-3] `autofocus` is a dead contract field on both `ai-chat` and `ai-sender` (schema + registry, zero consumers)

_Justification: declared in `AiChatSchema` (`schemas.ts:23`) and `AiSenderSchema` (`schemas.ts:132`), registered as props (`ai-renderer-definitions.ts:55,122`), but no renderer reads `resolved.autofocus` (grep zero hits outside the declarations). Designers will expose a control that silently does nothing — same family as the already-reported `disabled` (P2-5 of the sibling multi-audit), different field, not previously covered. Fix: implement (focus the input) or drop the field + registry entries._

- **File:** `packages/flux-renderers-ai/src/schemas.ts:23,132`; `src/ai-renderer-definitions.ts:55,122`
- **信心:** 确定

## [P2-4] `buildImageContentParts` is a dead module-level export with duplicated inline logic in the real send path

_Justification: `ai-attachments.tsx:373-377` exports the helper but only the test consumes it (`ai-attachments.test.tsx:191-198`); `handleUpload` (`:190-196`) re-implements the same filter+map inline. Two copies of the multimodal-assembly logic → future drift (e.g. adding `detail`/`file` parts). Fix: have `handleUpload` call the helper (or delete it)._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:373-377,190-196`
- **信心:** 确定

## [P2-5] `cloneMessages`/`cloneMessage` have no fallback when `structuredClone` throws

_Justification: `ai-chat.tsx:46-54` — the shallow-copy fallback only covers "no `structuredClone`", not "`structuredClone` threw". `metadata` (`[key: string]: unknown`) and `data-${string}` content parts (`data: unknown`) are host-writable extension surfaces; a host embedding a function/symbol/DOM node crashes the whole ai-chat render at every turn boundary (`DataCloneError`) with no degradation. Engine-produced content is cloneable, so this is host-input-dependent — one-line `try/catch` fix._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:46-54`
- **信心:** 很可能 (host-input-dependent; engine-internal content all cloneable)

## [P2-6] O-2 comment claims "the engine itself never mutates those nested objects in place" — false during streaming

_Justification: `create-engine.ts:139-141` — `applyChunk` mutates the in-flight assistant object in place between `commitAssistant` calls, and after the first commit `assistant` re-binds to the state's element (`:463`), so nested `tool_calls` arrays are merged in place on live state objects. No observable defect (commit-per-chunk granularity keeps renders consistent), but the comment misleads maintainers and contradicts the neighboring snapshot-identity defense comments. Fix: reword the comment (and consider freezing/structural sharing if a future change stops committing per chunk)._

- **File:** `packages/flux-renderers-ai/src/engine/create-engine.ts:133-145`
- **信心:** 确定 (comment drift; behavior verified benign)

## [P2-7] `ai-feedback` cannot express "no action bar" — explicit `actions: []` yields the default bar

_Justification: `normalizeActions` (`ai-feedback.tsx:107-111`) maps empty array → `DEFAULT_ACTIONS` (copy/refresh). A host wanting zero actions has no way to say so via schema (must unmount the renderer). "Empty = default" is a defensible convention but is undocumented here; at minimum a doc line is warranted._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:107-111`
- **信心:** 确定

## [P2-8] `ai-citations` year false-positive: `[2026]` in body text renders an empty citation card

_Justification: `CITATION_RE` (`ai-citations.tsx:258`) matches any `[N]` with N>0; the index filter only drops ≤0 (`:282-292`). "Since [2026]" → clickable sup + "citationNoSource" popover. Inherent format ambiguity, low probability, user-visible. Fix: cap indices to a plausible bound or require a source match before rendering the card._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-citations.tsx:258,282-292`
- **信心:** 确定

---

# Dedup & Not-Reported (verified against live code)

- **Not re-reported (sibling multi-audit `2026-08-09-1826`, still live):** P1-1 tool-residue commit on abort, P1-2 dangling tool_calls, P1-3/P1-4 clearAll ghost-rehydration members, P1-5 request-payload hygiene, P1-6 projection staleness, P1-7/P1-8 dead expand controls, P1-9 renderer shadowing; P2-1..P2-18; P3 list.
- **Not re-reported (prior 4 AI audits + invariant catalog):** concurrency-guard family, stale-closure family, storage-silent-drop family, K1-K4, N1-N5 (⑥-⑩ registered gates — all zero-hit), useMessage mount-time-only options (2151 accepted limitation), bubble matcher catch (already fixed).
- **Checked clean:** 13 hand-written `useMemo`/`useCallback` sites all carry concrete justification comments (AI-31 / Provider boundary / exhaustive-deps / test-evidenced identity) — per `react19-best-practices-review.md` §React Compiler these are redundant but not reportable; `check:react19` clean; `structuredClone(Error)` is legal (Error is cloneable); virtualizer/autoScroll interplay; region renders before early returns; namespace/component-handle method lists vs design.md §14.2/§14.3; styling markers + `data-slot` scope (16 hits re-verified false positives); i18n keys.

---

# 总评

The engine/adapter core is in its healthiest post-Cycle-2 state — all ten invariant gates hold, 572/572 tests green, and the concurrency/stale-closure/storage families are genuinely dead. The most valuable directions right now:

1. **The plugin write-isolation gap (P1-1)** is the cleanest signal that the invariant-loop methodology is working and has a next family to sediment: the engine isolates references at every _exit_ (getMessages, projection, snapshots) but never at the _plugin entry_ — and the documented plugin use case is precisely the unsafe pattern. It maps naturally onto a new invariant member (ctx read-only surface) for the next cycle.
2. **The "documented contract field with no consumer" family** (P2-3 autofocus, P2-2 createEngineOptions.engine, P2-4 dead helper, plus the already-reported `disabled`) is a recurring schema/registry hygiene cost — a cheap static gate (registry-declared fields must have a reader in the renderer module) would retire the whole family.
3. **Host-contract silent no-ops** (P2-1 connector staleness in useConversation) recur across the adapter layer; the fix pattern (fan-out `setConnector` over the cache) is small and the doc note is one line.

# 盲区自评

- This audit did **not** re-verify the multi-audit's P1-1..P1-9 claim-by-claim (dedup assumption); if a remediation plan starts from those, a fresh session should re-anchor each against live line numbers.
- I did not exercise the e2e/playwright AI surface (13 files) — timing-dependent UI behaviors (autoScroll pinning, virtualizer threshold crossing, IME edge cases) may hide issues only visible in a browser.
- I did not deep-audit the locale files / i18n coverage beyond the automated `check:i18n-keys`, nor the playground's connector implementations beyond what `engine.md` references.
- Next-round entry point suggestion: an adversarial pass on **plugin→connector→storage data flow end-to-end** (a plugin-modified history reaching a real `env.stream` payload and a storage serializer), and a consumer-presence gate over `ChatMessageUIState` fields (the P1-7/P1-8/P2-4 family's structural root).
- Per the skill's disk rules this execution's per-round files are saved under `docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/` (round-01..round-03); this file is the consolidated report.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
