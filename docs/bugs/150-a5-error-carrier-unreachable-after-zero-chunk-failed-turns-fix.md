# 150 A-5 Error Carrier Unreachable After Zero-Chunk Failed Turns Fix

## Problem

- A failed turn that produces zero chunks (auth 401/429, network failure before the first byte, `onBeforeRequest` rejection) left **no error UI at all**: the empty assistant placeholder is dropped by the invariant ⑩ vacuous-residue cleanup (`commitOrDropResidue` / `isVacuousAssistantResidue`), so the message list ends with the user message.
- The bubble-level error renderer (A-5) binds to `requestState === 'error'` **and** a trailing assistant message (`ai-message-list` `isError` projection `idx === messages.length - 1 && message.role === 'assistant'`) — with the residue dropped that binding is structurally impossible, so the error bubble + retry entry never rendered.
- The `ai-chat` root `data-state="error"` attribute is a selector-only signal with no visible UI; existing `error-retry.test.tsx` cases only used synthetic `metadata.isError` messages, so the real-engine failure round was uncovered.

## Diagnostic Method

- FIND-03 (`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`) traced the condition algebra: `isError` binding requires last-message assistant; K-⑩ drop guarantees last-message user on zero-chunk rounds → intersection empty.
- Decisive evidence: an integration test driving a real engine with a 401-throwing connector rendered no error UI (RED pre-fix); `engine-invariants-i4.test.ts:139-157` already pinned the engine-side drop (protocol-clean goal — keep it).

## Root Cause

- The A-5 error surface was modeled exclusively on the "in-flight assistant placeholder" carrier; the ⑩ residue-drop policy (protocol cleanliness) removed that carrier for zero-chunk failures without providing an alternative render surface.

## Fix

- Added a **list-level error banner** as the A-5 carrier for dropped-residue failed turns: `ListErrorBanner` in `ai-bubble/renderers/error.tsx` (`data-slot="ai-message-list-error"`, retry `data-slot="ai-message-list-error-retry"`), reusing the existing `requestFailed`/`retry` i18n keys, the retry `void` discipline, and a shared last-user-text scanning helper (`lastUserTextBefore`).
- `ai-message-list.tsx` renders it when `requestState === 'error'` **and** the last message is not an assistant; when the last message IS an assistant (partial content committed before a mid-stream failure) the bubble-level error continues to fire and the banner does not double-render. Aborted turns (`requestState === 'aborted'`) render nothing.
- Engine / history / persistence drop semantics unchanged (invariant ⑩ goal preserved).

## Tests

- `renderers/__tests__/ai-message-list-error-banner.test.tsx` — real engine integration: connector 401 zero-chunk turn → banner + retry visible, bubble error absent; clicking retry re-sends the last user text and the new turn succeeds (banner disappears); `onBeforeRequest` rejection → same surface; partial-content failure → bubble error wins, no banner; aborted turn → no banner.
- `engine-invariants-i4.test.ts` — untouched engine-side drop assertions stay green (zero regression).

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/error.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-message-list-error-banner.test.tsx`

## Notes For Future Refactors

- The A-5 surface is now two-carrier: bubble-level (last message assistant) and list-level (last message not assistant). The condition is exclusive by construction — do not add a third banner that can overlap either.
- The banner must stay a render-only surface: do not resurrect dropped residues into history to make the old bubble binding fire — the ⑩ protocol-clean drop is the deliberate contract.
- Retry semantics: re-sends the last user message text via the context `sendMessage`; keep the `void` prefix (no floating promises).
