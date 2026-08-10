# 141 Tiptap Popup Keyboard Deadzone on Zero-Match Queries (multi P2-3)

## Problem

- When a slash/mention popup was open but the query matched ZERO items, the popup was not rendered (visually gone) — yet the editor's `handleKeyDown` still returned `true` for Enter/Arrow keys. The user was left in a keyboard deadzone: no popup, no submit, no caret movement — only Escape escaped.
- The `:332-335` comment claimed "handleKeyDown returns false (lets keys pass through) because popupItems.length === 0" — the implementation never checked the length (comment/implementation contradiction, the audit's flag).
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-3.

## Diagnostic Method

- Diagnosis difficulty: low — type a non-matching query (`/zzz`, `@zzz`), press Enter, observe the submit keymap never runs.
- RED proof: slash + mention arms — popup open with zero matches → `fireEvent.keyDown(Enter)` → assert `onSubmit` fires (key falls through to the `aiSenderSubmitKeymap`). Pre-fix both RED (Enter swallowed).

## Root Cause

- `handleKeyDown` (registered once inside the `useEditor` closure) gated only on `state.kind === 'none'`. It could not read the fresh `popupItems` array directly (the closure is built in `editor-options useMemo` with deps `[extraExtensions]` — stale), so the zero-match case was indistinguishable from a live popup.

## Fix

- Mirror `popupItems.length` into a `popupItemsLengthRef`, kept in sync by the same effect that refreshes `popupControlsRef` (deps `[popupItems]` — the established ref-mirror pattern).
- `handleKeyDown` now returns `false` (keys pass through) when `popupItemsLengthRef.current === 0` — implementation now matches the (previously aspirational) comment; the IME guard and the Arrow/Enter/Escape interception for live popups are unchanged.

## Tests

- `packages/flux-renderers-ai/src/rich-text/__tests__/tiptap-extensions.test.tsx` — slash zero-match Enter → submit fires; mention zero-match Enter → submit fires; ArrowDown/ArrowUp pass through without re-opening the popup and Enter after arrows still submits. All RED pre-fix.

## Affected Files

- `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx`
- `packages/flux-renderers-ai/src/rich-text/__tests__/tiptap-extensions.test.tsx`

## Notes For Future Refactors

- Keyboard interception inside `useEditor` closures must always read refs, never memoized arrays (`popupStateRef` / `popupControlsRef` / `popupItemsLengthRef` are the three mirror slots).
- If the zero-match behavior ever changes (e.g. a "no results" popup that should keep swallowing keys), update the length mirror AND the render guard together — the render guard (`popupState.kind !== 'none' && popupItems.length > 0`) and the key handler must agree.
