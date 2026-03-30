# 19 Code Editor Label Click Forwarding Triggers Fullscreen Fix

## Problem

- Clicking anywhere in the code editor text area (JSON Editor with fullscreen support) triggered fullscreen mode instead of placing the cursor
- The fullscreen toggle button (⛶) was in a toolbar strip above the editor, but clicking the CodeMirror editor text area activated it
- After entering fullscreen, clicking the editor text area would exit fullscreen (via the × close button)

## Diagnostic Method

- Initial suspicion: event propagation from a parent container's `onClick` handler
- Inspected the renderer JSX — `onClick={toggleFullscreen}` was only on the `<button>`, not on any parent `<div>`
- Checked `wrap: true` in the renderer definition — this causes `FieldFrame` to wrap the component in `<label>` (see `packages/flux-react/src/field-frame.tsx` line 75)
- **Decisive evidence**: HTML spec — a `<label>` element forwards clicks to its first *labelable* descendant (`<button>`, `<input>`, `<select>`, etc.). The fullscreen `<button>` was the first labelable element inside the `<label>`, so clicking anywhere in the label (including the editor area) triggered it
- Confirmed via Playwright: `document.querySelector('.nop-code-editor__toolbar-fullscreen')` returned `<button>`, and clicking the editor textbox triggered fullscreen
- Same issue affected the fullscreen header close `<button>` — clicking editor text in fullscreen exited fullscreen

## Root Cause

- `codeEditorRendererDefinition` has `wrap: true`, so `FieldFrame` renders `<label class="nop-field">` wrapping the entire component
- `<label>` click forwarding is a native HTML behavior — it finds the first labelable descendant and activates it
- Both the toolbar fullscreen button and the header close button were `<button>` elements (labelable), so they received forwarded clicks from anywhere inside the `<label>`
- This is a cross-package interaction: `flux-code-editor` (renderer) + `flux-react` (FieldFrame wrapper)

## Fix

- Changed both interactive elements from `<button>` to `<span role="button" tabIndex={0}>`
- `<span>` is **not** a labelable element — the `<label>` no longer forwards clicks to it
- Keyboard accessibility preserved via `role="button"`, `tabIndex={0}`, and `onKeyDown` handler (Enter/Space)
- Added `:focus-visible` CSS rules for keyboard focus indication

### Affected Files

- `packages/flux-code-editor/src/code-editor-renderer.tsx` — toolbar button + header close button changed to `<span>`
- `apps/playground/src/styles.css` — added `:focus-visible` styles for both buttons

## Tests

- 34/34 unit + integration tests pass (no new tests added — behavior is a DOM interaction issue best verified via Playwright)
- Playwright manual verification:
  - Click editor text → does NOT trigger fullscreen
  - Click ⛶ button → enters fullscreen
  - Click editor text in fullscreen → does NOT exit
  - Click × → exits fullscreen
  - Press Esc → exits fullscreen
  - No console errors

## Affected Files

- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `apps/playground/src/styles.css`

## Notes For Future Refactors

1. **Any interactive element inside a `wrap: true` renderer must NOT use `<button>`.** Use `<span role="button" tabIndex={0}>` instead. The `<label>` wrapper will always forward clicks to labelable elements.
2. **This applies to all renderers with `wrap: true`.** If a renderer needs internal clickable controls, they cannot be `<button>`, `<input>`, `<select>`, `<textarea>`, or `<meter>` — all are labelable per HTML spec.
3. **A code comment is present** explaining the `<span>` choice — do not "fix" it back to `<button>` without understanding the `<label>` forwarding issue.
4. **Alternative fix**: change `FieldFrame` to use `<div>` instead of `<label>` when the child is a code editor. This would be a broader framework change with its own trade-offs.
