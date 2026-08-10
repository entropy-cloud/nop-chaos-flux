# 145 buildImageContentParts Duplication + structuredClone DataCloneError Crash (open P2-4 / open P2-5)

## Problem

- **open P2-4**: `ai-attachments.tsx` exported module-level `buildImageContentParts` (multimodal `image_url` assembly) but the real `handleUpload` path duplicated the same filter+map inline — two copies of the assembly logic with drift risk.
- **open P2-5**: `cloneMessages`/`cloneMessage` (ai-chat.tsx) fell back to a shallow copy only when `structuredClone` was MISSING. A host writing a non-cloneable value (function / symbol / DOM node) into `metadata` / `data-*` parts made `structuredClone` THROW `DataCloneError` with no degradation — every boundary render crashed the whole tree (projection + onResponseComplete handoff).
- Evidence: open-audit `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md` P2-4 / P2-5.

## Diagnostic Method

- Diagnosis difficulty: medium — the clone crash is render-time only with host-specific input shapes; unit tests must inject the uncloneable value through the real engine path.
- RED proofs (`ai-chat-clone-fallback.test.tsx`, new, 2 cases): (1) external engine seeded with `metadata: { fn: () => {} }` → `AiChatRenderer` render throws `DataCloneError` (runtime error-retry tree); (2) a connector whose final chunk carries `metadata: { fn }` → `onResponseComplete` never arrives (cloneMessage throws inside the subscribe callback). Both red pre-fix.
- P2-4 was verified by a mixed image+pdf upload case asserting only image parts reach `engine.sendMessage`.

## Root Cause

- The clone fallback only covered "runtime lacks `structuredClone`", not "runtime throws". `DataCloneError` is exactly what happens when host input contains functions/symbols/DOM nodes — the engine contract allows arbitrary `metadata` (index signature), and `ai-citations`/`ai-token-usage`/host data-parts all flow through it.
- The upload helper predates the attachments renderer; `handleUpload` re-implemented it instead of reusing the exported function.

## Fix

- `cloneMessages`/`cloneMessage`: wrap `structuredClone` in try/catch → on throw, degrade to the same shallow copy used for missing-`structuredClone` runtimes. Engine self-produced content (always cloneable) keeps the deep path.
- `handleUpload` now calls `buildImageContentParts(attachments)` — single source of assembly; the inline filter+map removed.

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-clone-fallback.test.tsx` (new) — uncloneable metadata render + completion handoff both survive (shallow-copy degradation), snapshot still delivered with content + metadata identity.
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-attachments.test.tsx` — new P2-4 arm (image+pdf → only `image_url` parts sent) + existing multimodal send / onUpload arms green.

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx` (clone fallback)
- `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx` (handleUpload reuse)

## Notes For Future Refactors

- Any `structuredClone` over host-injected data MUST assume it can throw (functions/symbols/DOM nodes are legal values in `ChatMessageMetadata`'s index signature); treat "missing" and "throwing" as one degradation surface.
- The projection (`Decision-A`) and event-handoff copies are the two boundary-clone call sites — keep their fallback semantics identical.
- Attachment assembly has exactly one home (`buildImageContentParts`); grep `image_url` before adding a third assembly site — the bubble `image.tsx` renderer only READS parts, it never assembles them.
