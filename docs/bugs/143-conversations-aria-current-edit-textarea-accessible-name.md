# 143 Current-Conversation aria-current + Edit-Mode Textarea Accessible Name (multi P2-17 / P2-18)

## Problem

- **multi P2-17**: `ai-conversations` conveyed the current conversation only via `data-active` + border/background color — no `aria-current` / `aria-selected` (WCAG 1.3.1 / 4.1.2). Screen-reader users could not determine the active item.
- **multi P2-18**: the user-message edit-mode `<Textarea>` (`ai-bubble/user-edit.tsx`) had no `aria-label` / label association / placeholder — no programmatic accessible name (WCAG 4.1.2). The `ai-sender` Textarea precedent (`:167` label) was not mirrored on the edit surface; the p2-a11y-i18n suite covered the sender face only.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-17 / P2-18.

## Diagnostic Method

- Diagnosis difficulty: low — DOM attribute inspection.
- RED proofs: render the conversations list with an activeId → assert `aria-current="true"` on the active `<li>` and absence on inactive ones; render a user message with `state.editing.active` → assert the edit Textarea exposes a non-empty accessible name.

## Root Cause

- P2-17: the "current item" pattern relied on visual/data-\* state only; no ARIA current-state attribute was emitted.
- P2-18: the Textarea was authored without any naming attribute; the edit surface predates the sender a11y收敛.

## Fix

- P2-17: active `<li>` emits `aria-current="true"` (presence-only omission otherwise), tracking `activeId` across re-renders.
- P2-18: edit-mode Textarea gets `aria-label={t('flux.ai.editMessage')}` (aligned with the ai-sender translated-label precedent).

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-conversations-a11y.test.tsx` (new) — active item `aria-current="true"`; inactive omits; re-render with a new activeId moves the attribute.
- `packages/flux-renderers-ai/src/renderers/__tests__/p2-a11y-i18n.test.tsx` — edit-mode Textarea accessible name non-empty.

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx`

## Notes For Future Refactors

- "Current/selected item" list surfaces must emit an ARIA current-state attribute (`aria-current` for lists, `aria-selected` for option-like popups — `suggestion-popup.tsx` already uses the latter); category sweep confirmed `ai-suggestions` / `ai-prompts` have no active-item state (static chips), so no other surface was affected.
- Any new interactive surface in the bubble edit flow must carry an accessible name (translated label, not placeholder-dependent).
