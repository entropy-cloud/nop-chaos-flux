# 144 AI Renderer Disabled-Contract Consumption + autofocus Dead-Field Removal (multi P2-5 / open P2-3)

## Problem

- **multi P2-5**: all 14 AI renderers ignored the compiler-level node control `props.meta.disabled` (layout/content/scheduling/industrial all consume it) — a page-level `disabled: true` had zero effect on any AI renderer. `AiSenderExtensionProps.disabled` was declared but never passed (the reference Tiptap sender already consumed it, so the chain was broken one hop upstream).
- **open P2-3**: `autofocus` was declared in `AiChatSchema`/`AiSenderSchema` + registered in `ai-renderer-definitions.ts` (2 entries each) but no renderer ever read it — designers would expose a control that silently does nothing.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-5; open-audit `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md` P2-3.

## Diagnostic Method

- Diagnosis difficulty: low — grep for `meta.disabled` / `autofocus` across the AI package confirmed zero consumers outside declarations.
- RED proofs (`p2-5-disabled-contract.test.tsx`, new, 9 cases): inject `meta.disabled=true` via `createMockRendererProps` into ai-sender / ai-voice-input / ai-feedback / ai-tool-call / ai-suggestions / ai-prompts / ai-attachments / ai-conversations + the full ai-chat schema harness (embedded sender) → assert the interaction surface is disabled (DOM `disabled`). All 9 arms red pre-fix.

## Root Cause

- The AI package predates the cross-package `meta.disabled` consumption contract; interactive widgets were authored gated on their own local state (`loading`, `unsupported`, `noHandler`) only.
- `autofocus` was added to the schema during the P0 design sweep and never wired (the sender already has `refocusAfterSubmit` focus management, orthogonal to an initial-focus field).

## Fix

- **P2-5 裁定（decision table in plan 2026-08-10-1606-3 Phase 1）**: interactive renderers consume `props.meta.disabled === true` — ai-chat (forwards to embedded sender), ai-sender (textarea + submit/stop + keydown/cancel guards + extension `disabled` wiring), ai-voice-input (mic + start/click guards), ai-suggestions (pills + overflow), ai-prompts (cards), ai-feedback (action bar), ai-tool-call (toggle + pending-approval approve/reject), ai-attachments (pick/upload/remove + drop/paste/input/upload guards), ai-conversations (create/item/rename/delete + commitRename guard). Display renderers (ai-message-list / ai-bubble / ai-welcome / ai-citations / ai-token-usage) adjudicated NOT consumed with recorded reasons.
- **P2-3 裁定 = drop**: `autofocus` removed from both schemas + both registry entries + 6 committed declaration/doc surfaces (`flux-guide/flux-types/schema.d.ts` ×2, `renderers.md` ×2, `design-patterns/ai.md` ×2); `renderers.md` §4.1 stale `disabled?: boolean` AiSenderSchema prop corrected to the meta-level contract.

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/p2-5-disabled-contract.test.tsx` (new) — 9 disabled arms + 5 sanity arms (`meta.disabled=false` interactive).
- Full AI package suite green (659 tests at Phase 2 close; no regression in the meta-parsing path).

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-sender.tsx` / `ai-chat.tsx` / `ai-voice-input.tsx` / `ai-suggestions.tsx` / `ai-prompts.tsx` / `ai-feedback.tsx` / `ai-tool-call.tsx` / `ai-attachments.tsx` / `ai-conversations.tsx`
- `packages/flux-renderers-ai/src/schemas.ts` / `src/ai-renderer-definitions.ts`
- `flux-guide/flux-types/schema.d.ts` / `docs/components/flux-renderers-ai/renderers.md` / `flux-guide/design-patterns/ai.md`

## Notes For Future Refactors

- The cross-package contract is now: interactive widget renderers MUST gate their interaction surface on `props.meta.disabled === true` (native `disabled` on the controls + handler guards for imperative paths); display renderers may adjudicate not-consumed but must record the reason (plan decision table).
- New AI renderers must grep the sibling packages (layout/content/scheduling/industrial) for the meta contract before adding interactive controls; a cheap registry-consumer gate is a recorded non-blocking follow-up (open-audit cross-cutting suggestion).
- Schema field additions must have a renderer reader; `autofocus`-family dead fields are dropped, not documented around (`rg autofocus` now only hits historical audit records + the `jsx-a11y/no-autofocus` eslint config + the pre-existing rename-input `autoFocus` in ai-conversations).
