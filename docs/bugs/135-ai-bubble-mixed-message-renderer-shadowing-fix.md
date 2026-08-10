# 135 AI Bubble Mixed-Message Renderer Shadowing (markdown hid tools/reasoning/image, P1-9)

## Problem

- On mixed messages — the standard R1 shape (text + `reasoning_content`) and the interleaved shape (text + `tool_calls`) — only the text rendered: the reasoning panel and tool cards never appeared.
- Mechanism: each content slice selected exactly ONE renderer by ascending priority (first match wins); markdown (`NORMAL=0`) matched any non-empty text slice and shadowed tools/reasoning/image (`CONTENT=10`) whenever the message had text. `resolveContentSlices` produced a single slice for string content, so there was no second path for tools/reasoning to match non-empty-text messages. The existing test covered only the `content:''` branch.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-9.

## Diagnostic Method

- Diagnosis difficulty: low — trace `AiBubbleView` slice assembly → `pickRenderer` (ascending priority, first match) → markdown matcher claims non-empty text → tools/reasoning matchers never consulted on text-bearing messages.
- Decisive evidence: RED regression — `AiBubbleView` with text + `reasoning_content` rendered no `ai-bubble-reasoning`; text + `tool_calls` rendered no `ai-tool-call`.

## Root Cause

- Slice-level first-match-wins selection conflated two different match surfaces: content-slice predicates (markdown / image / data-part) and message-level field predicates (tools / reasoning / error). The former must coexist with the latter, not replace it.

## Fix

- **Decision (方案 a)**: message-level renderers run ONCE per message in parallel with the slice-level pass. `BubbleContentRendererMatch` gains an optional `messageLevel?: boolean` (additive, no signature break); default renderers mark tools / reasoning / error `messageLevel: true`; `AiBubbleView` splits the registry and renders both passes.
- Constraints preserved: while `message.loading === true` (first chunk pending) the message-level pass is skipped so the LOADING placeholder wins alone (unchanged spinner semantics); the `content:''` branch keeps rendering via the message-level matchers (zero regression).
- `pickRenderer`'s faulty-matcher guard extracted into a shared `tryMatch` used by both passes.

## Tests

- `tool-call-and-content.test.tsx` — P1-9 mixed-content integration block (8 assertions): text+reasoning, text+tool_calls, streaming first-chunk arrival, error+text, text+image parts, text+data-part, `content:''` zero-regression, loading-exclusive.
- RED→GREEN evidence: 4 failed pre-fix (text+reasoning / text+tool_calls / streaming arrival / error+text) → all green; AI package 70 files / 608 tests.

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-bubble/types.ts` (`messageLevel` field)
- `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx` (two-pass assembly)
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts` (messageLevel marks)
- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/tool-call-and-content.test.tsx`

## Notes For Future Refactors

- Renderers that inspect message-level fields (tool_calls / reasoning_content / metadata.isError) MUST be registered with `messageLevel: true` — a slice-level matcher on non-empty text (markdown) will shadow them otherwise.
- The `!isStreaming` gate on the message-level pass is load-bearing: removing it would break the LOADING(-1) first-match-wins spinner exclusivity during streaming.
