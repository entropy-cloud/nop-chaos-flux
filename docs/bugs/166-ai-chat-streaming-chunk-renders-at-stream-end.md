# 166 — ai-chat streaming chunks render only at stream end (context value not invalidated per chunk)

> Status: fixed (2026-09-19, plan `docs/plans/472-visual-quality-v2-ai-conversation-visuals-plan.md` Phase 1; visual-quality roadmap V2. 先红后绿回归：单测 `ai-chat-streaming-context.test.tsx`（context 身份先红）+ e2e `ai-widgets-fixture.spec.ts` streaming 渐进用例（stash 修复后真实红态取证）)
> Discovered by: D1 plan `2026-08-24-1045-2` Phase 3 dev spot check (`_tmp` probe, headless Chromium against real playground dev server)

## Symptom

On `# /ai-widgets` with the D1 fixtures (`createMockAiEnv({ delayMs: 200, fixtures: true })`), sending any message shows an empty assistant bubble for the ENTIRE stream duration (12–24s depending on preset), then the full markdown content appears at once when the stream finishes. No token-by-token growth, no visible streaming cursor during the stream.

Before D1 this was invisible: every demo used the default mock (`15ms` × ~10 chunks ≈ 120ms full stream), so pop-at-end and progressive rendering were visually indistinguishable.

## Diagnosis (programmatic, no screenshots)

Probe (`_tmp/ai-widgets-stream-probe.mjs`, since deleted): sampled the live DOM every 1.5s after submit on `# /ai-widgets`:

```
t=1s..15s  {"bubble":true,"md":false,"cursor":false,"len":0}
t=16s      {"bubble":true,"md":true, "cursor":false,"len":424}   # full default preset, stream just ended
```

Isolation steps that RULE OUT the mock/connector/engine store:

- The mock generator yields chunks progressively (verified standalone: chunk at t=0,56,108,…ms).
- `createStreamBasedAiConnector` maps and yields per chunk (`ai-connector-factory.ts:59-70`).
- The engine applies and commits per chunk: `applyChunk(assistant, chunk)` + `commitAssistant()` inside the consume loop (`engine/create-engine.ts:531-548`), and the React adapter rebuilds a fresh snapshot object per notify (`adapters/react-adapter.ts:36-39`) — `useSyncExternalStore` in `useEngineView` therefore re-renders `AiChatRenderer` per chunk.

## Root cause

Two deliberate design decisions compose into the gap:

1. `commitAssistant()` (`engine/create-engine.ts:492-500`) replaces the assistant element **in place** inside the same `messages` array (`draft.messages[assistantIndex] = { ...assistant }`). This is the documented "streaming no-clone discipline" (`design.md` projection trigger notes: streaming keeps the array reference stable to avoid a per-chunk `structuredClone`).
2. `ai-chat.tsx:482-485` memoizes the context value with the `messages` ARRAY REFERENCE as a dep (`useMemo(() => ({ ..., messages, ... }), [engine, messages, ...])`, the AI-31 stabilization). During streaming that reference never changes, so the context value keeps its identity and every context consumer — `AiMessageListView` reads `ctx.messages` (`ai-message-list.tsx:62-63`) — bails out of re-rendering on every chunk.

The store-level per-chunk re-render of `AiChatRenderer` is wasted: nothing it renders observes the mutated element until a NON-messages dep flips — which happens only at terminal state (`isProcessing`/`requestState`), i.e. stream end. This contradicts `design.md` §"消费路径" (`engine.messages` → `useAiChatContext()` 订阅), which promises context consumers see streaming accumulation.

## Impact

- G10 ("流式节奏肉眼可见") only half-closes in D1: the 200ms cadence makes stream DURATION human-scale, but token-by-token rhythm stays invisible until this bug is fixed.
- e2e fixtures must budget anchor waits at FULL stream duration (D1's `ai-widgets-fixture.spec.ts` uses 30s anchor timeouts for this reason).
- The D1 default fixture is permanently constrained to ≤ ~42 chunks (`ai-widgets-fixture.ts` header note) because the pre-existing `ai-widgets-demo.spec.ts:111` `Hello` assertion allows only 10s and content lands at stream end. If this bug is fixed, that constraint can be relaxed but does not need to be.

## Fix direction (for the successor that owns `flux-renderers-ai` render path)

Either:

- (a) engine: replace the `messages` array reference per chunk commit (e.g. `draft.messages = [...draft.messages]` before the element swap) AND adjust the ai-chat projection guard — trigger ③ (`engineIdentitySwap = snapSourceRef !== messages`) currently fires on any array-ref change and would clone per chunk, violating the documented cost discipline; or
- (b) renderer: keep the array stable but make the context value invalidation content-aware (e.g. a cheap per-chunk bump signal from the adapter — content-length/fingerprint of the streaming tail), so `AiMessageListView` re-renders per chunk while the turn-boundary projection snapshot stays untouched.

Both need regression coverage: a DOM-level test asserting the bubble text grows DURING a >1s stream (unit via jsdom with a slow connector, or e2e on `# /ai-widgets` sampling before stream end), plus the existing projection test set (`ai-chat-projection.test.tsx`) staying green.

## Protection today

`tests/e2e/ai-widgets-fixture.spec.ts` (D1) pins the end-state content of all six fixtures; it does NOT (and cannot, while this bug is open) assert mid-stream growth. The compact-default constraint is documented in `apps/playground/src/ai/ai-widgets-fixture.ts`.

## Fix record (plan 472, 2026-09-19)

Two-layer fix in the render layer (engine/adapter no-clone discipline untouched):

1. **Per-chunk DOM invalidation — `useEngineContentTick` (the primary mechanism)**: `ai-message-list` subscribes to the engine via the new `useEngineContentTick` hook (`useSyncExternalStore`, returns the last message's accumulated content length) and threads the tick into the streaming bubble as a `streamSignature` prop that is READ in render output. This matters because execution-phase instrumentation proved that **React Compiler keys its memo cache on values actually read during render and ignores `useMemo` deps arrays** — with the compiler enabled, deps-only signals (snapshot identity, content fingerprints) stay frozen for the whole stream (browser probe: zero list renders between submit and stream end; 238 per-chunk renders with the compiler disabled). Reading the tick as a prop puts it inside the compiler's cache keys, forcing the bubble subtree to re-render per chunk in compiled builds.
2. **Context-level fingerprint (non-compiled consumers)**: the AI-31 context memo computes `streamSignature: streamFingerprint(messages)` inside the callback (last message id + content length [string|parts] + reasoning_content length + tool_call arguments total length). The array reference stays stable by design; metadata/finishReason-only chunks intentionally do not flip anything (terminal deps drive that render switch).
3. **Streaming cursor signal**: the cursor previously keyed on `message.loading`, which the engine clears at the FIRST chunk (and the empty-content markdown early-return prevented mounting it before) — it never rendered. The display-level signal is now derived in `ai-message-list` (`isProcessing && last message && role==='assistant'`), threaded via `streaming` props to the bubble (`data-streaming`) and the markdown cursor. Message-level renderer gating (tools/reasoning cards) keeps using `message.loading` so cards keep growing mid-stream. Standalone bubbles fall back to `message.loading`.

Verification: unit `ai-chat-streaming-context.test.tsx` (context identity per chunk, red before fix) + e2e `ai-widgets-fixture.spec.ts` "content grows per chunk with a visible cursor" (red with fix stashed, green restored) + AI-family e2e regression 133/133.

Known scope notes: the D1 fixture ≤~42-chunks constraint note and the `ai-widgets-demo.spec.ts:111` 10s `Hello` budget can now be relaxed (not required); the coverage `slow` connector gained a 900ms pre-first-chunk gap so the loading placeholder is observable now that it correctly exists only during that window.
