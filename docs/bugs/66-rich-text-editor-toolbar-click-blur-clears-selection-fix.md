# 66 Rich Text Editor Toolbar Click Clears Text Selection Fix

## Problem

- In the TipTap-based rich text editor, clicking the Bold toolbar button after selecting text did not apply bold formatting.
- The test typed "hello editor", pressed Ctrl+A to select all, clicked the Bold button, but the output remained `<p>hello editor</p>` — no `<strong>` tags.
- This also affected the bullet list test.

## Diagnostic Method

- **Diagnosis difficulty**: High. The issue was browser event ordering, which is notoriously hard to diagnose because it depends on how Playwright dispatches events vs. how real browsers do.
- First confirmed the TipTap editor itself correctly serializes bold as `<strong>` (verified in TipTap source).
- Confirmed the form value pipeline was intact: `onUpdate` → `getHTML()` → `setValue()` → form store → text renderer.
- Verified the toolbar button config correctly calls `editor.chain().focus().toggleBold().run()`.
- Hypothesized the click steals focus from the editor, clearing the text selection before `toggleBold()` runs. Confirmed by inspecting ProseMirror's behavior: `toggleBold()` on a collapsed selection only changes `storedMarks` (future typing), not existing content.
- Attempted save/restore selection approach: saved selection in `onMouseDown`, restored in `onClick` before running the command. Failed because `focus()` in the command chain re-reads the (empty) DOM selection.
- Attempted running the command entirely in `onMouseDown`. Failed because it broke the bullet list test (different event timing for `toggleBulletList`).
- Final fix: added `onPointerDown` (fires before `mousedown` in the browser event chain) to call `preventDefault()`, which stops the browser from moving focus to the button before `mousedown` even fires.

## Root Cause

The browser fires `pointerdown` → `blur` (on editor) → `mousedown` → `click` events in sequence when a toolbar button is clicked. The `blur` event causes the contenteditable editor to lose its text selection. By the time `mousedown.preventDefault()` fires, the selection is already gone.

The existing `onMouseDown={(e) => e.preventDefault()}` handler prevented focus THEFT (the button from stealing focus), but could not prevent the editor from LOSING its selection on `blur`, because `blur` fires before `mousedown`.

Adding `onPointerDown={(e) => e.preventDefault()}` catches the event earlier in the chain, before the browser dispatches the `blur` event, thus preserving the text selection.

## Fix

Added `onPointerDown={(event) => event.preventDefault()}` alongside the existing `onMouseDown` in the editor toolbar button component (`editor-renderer.tsx`).

The pattern is now:

```tsx
onPointerDown={(event) => event.preventDefault()}
onMouseDown={(event) => event.preventDefault()}
onClick={() => config.run(editor)}
```

## Tests

- `tests/e2e/w3d-editor.spec.ts` — bold formatting test now passes (was a persistent flaky failure).
- `tests/e2e/w3d-editor.spec.ts` — bullet list toggling test also benefits from the fix.

## Affected Files

- `packages/flux-renderers-form-advanced/src/editor-renderer.tsx` — toolbar button handlers

## Notes For Future Refactors

- Rich text editor toolbar buttons must ALWAYS have `onPointerDown` in addition to `onMouseDown` to prevent selection loss. Removing either handler will reintroduce the bug in Playwright-based tests (and on slow browser/device configurations in production).
- The `onClick` handler should call the TipTap command (which includes `focus()`), not run it in `onMouseDown` — running in `onMouseDown` breaks other commands that need the editor focused.
- If switching to a different rich text editor library (e.g., Slate, Quill), verify that its toolbar button interaction pattern preserves text selection across clicks.
