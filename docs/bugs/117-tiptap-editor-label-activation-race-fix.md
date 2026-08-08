# 117 Tiptap Editor Label-Activation Race Fix

## Problem

- The TipTap rich-text editor lost the first 1-7 typed keystrokes after a mouse click into the content (`w3d-editor.spec.ts:28` — "hello editor" became "ditor"), and on fresh pages typing produced a stray `<strong>` mark without any toolbar interaction (`rich2:<p><strong>hello editor</strong></p>`).
- Intermittent: isolated reruns went 3/15 green; the failure variants ("hel", "hello edi", "ell", "ditor") pointed at a click+type focus race, not a deterministic bug.
- Also observed in `c3-5-host-surfaces.spec.ts:27/:81` (same TipTap family).

## Diagnostic Method

- Diagnosis difficulty: high — the editor code was unchanged since CV, so the race looked environmental; only systematic browser-level instrumentation revealed the real trigger.
- Investigation path:
  1. Programmatic DOM probes (`page.evaluate`) showed `editor.state.storedMarks` flipping to `["bold"]` right after a plain mouse click into an empty paragraph, before any typing — and no Tiptap transaction carried the mark.
  2. Event capture showed the click sequence: `mousedown/up/click` on the contenteditable `<p>`, then a **second `click` event on the bold toolbar button** with `detail: 0` (synthetic, not a real mouse click) and the contenteditable's coordinates.
  3. `focusin/focusout` capture revealed the full cycle: `focusin editor-content → focusin editor-toolbar-bold → focusin editor-content` — the toolbar button gained focus during the contenteditable click.
  4. Rejected hypotheses: ProseMirror `setStoredMarks` caller trace (no transaction), `HTMLButtonElement.prototype.click` monkeypatch (no programmatic `.click()`), toolbar/PM geometry overlap (button at y≈315, PM at y≈350 — no overlap).
  5. Decisive evidence: inspecting the field frame DOM showed the editor is wrapped in a `<label class="nop-field">` whose **implicit labelable control is the first labelable descendant — the bold toolbar `<button>`** (`label.control === BUTTON.editor-toolbar-bold`). Clicking anywhere inside a `<label>` forwards activation to its control per the HTML spec.

## Root Cause

- `FieldFrame` wraps every form field in a `<label>` root by default (`rootTag ?? 'label'`).
- The editor renderer's toolbar contains `<button>` elements, and the contenteditable `<div>` is **not** a labelable element — so the label's implicit control resolves to the first labelable descendant, the bold toolbar button.
- Clicking the editor content activated the label control: the browser dispatched `focusin` + a synthetic `click` on the bold button, which ran `toggleBold` (storing a bold mark → stray `<strong>` on subsequent input) and moved focus away from the contenteditable mid-keystroke (dropping the first typed characters).

## Fix

- Set `frameRootTag: 'div'` on the `editor` renderer definition (`editorRendererDefinition` in `packages/flux-renderers-form-advanced/src/editor-renderer.tsx`), matching the existing pattern used by combo/picker/array-field/condition-builder renderers that contain interactive controls.
- A `div` frame root removes label activation semantics entirely: toolbar buttons are no longer the label's implicit control, so clicks on the content no longer toggle marks or steal focus.

## Tests

- `packages/flux-renderers-form-advanced/src/__tests__/editor-renderer.test.tsx` — regression test asserting `editorRendererDefinition.frameRootTag === 'div'` (locks the label-activation safety property).
- e2e stability evidence: `w3d-editor.spec.ts` + `c3-5-host-surfaces.spec.ts` 30/30 green across 3 repeat runs (previously `w3d-editor:28` 3/15).

## Affected Files

- `packages/flux-renderers-form-advanced/src/editor-renderer.tsx`
- `packages/flux-renderers-form-advanced/src/__tests__/editor-renderer.test.tsx`

## Notes For Future Refactors

- Any renderer whose field frame will contain `<button>` / other labelable controls must set `frameRootTag: 'div'` (or `fieldset` for checkbox/radio groups) — a `<label>` root silently routes clicks to the first labelable descendant.
- When diagnosing "focus race" / "stray mark" bugs in form fields, inspect the field frame DOM element first: `document.querySelector('[data-testid=...]').tagName` and `.control` reveal label-activation forwarding immediately.
