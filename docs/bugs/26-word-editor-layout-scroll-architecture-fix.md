# 26 Word Editor Layout Scroll Architecture Fix

## Problem

- After inserting multiple pages in the word editor, the overall page showed incorrect browser-level scrollbars
- The header and toolbar scrolled with the content instead of staying fixed at the top
- The left sidebar (Datasets/Fields) and right sidebar (Outline) did not scroll independently
- The content area background and side control panels did not extend properly with the document

## Diagnostic Method

- **Diagnosis difficulty: medium.** The issue was architectural — the entire layout used default flex behavior without explicit scroll containment
- The `<main>` element had `h-screen` but no `overflow-hidden`, allowing the browser to create a document-level scrollbar
- The `<section>` containing the canvas had no overflow constraint, so canvas-editor's internal multi-page rendering pushed the entire page height beyond the viewport
- Header and toolbar lacked `shrink-0`, so they could compress when content grew

## Root Cause

Three layout issues:

1. **No scroll containment at root level** — `<main>` used `h-screen` without `overflow-hidden`, so content exceeding viewport height created a browser scrollbar

2. **Header and toolbar not pinned** — Without `shrink-0`, flex children could shrink when the canvas content grew, causing the toolbar to compress or scroll out of view

3. **Side panels shared the same scroll context** — Left sidebar, canvas area, and right sidebar all lived in a single flex container without independent overflow management

## Fix

### `WordEditorPage.tsx` layout restructuring

- Added `overflow-hidden` to `<main>` — eliminates browser-level scrollbar, confines all scrolling to internal regions
- Added `shrink-0` to `<header>` — pins header at top, never compresses
- Wrapped `RibbonToolbar` in `<div className="shrink-0">` — pins toolbar below header
- Content area `<div>` uses `flex-1 min-h-0 overflow-hidden` — fills exact remaining viewport space
- Left sidebar: `overflow-hidden` with internal `TabsContent` managing its own scroll
- Canvas section: `overflow-hidden` — canvas-editor manages page scrolling internally
- Right sidebar: `overflow-y-auto` — independent scroll for long outlines

### `EditorCanvas.tsx` paper settings timing

- Moved `applyPaperSettings()` into `bridge.mount()` as an optional parameter — ensures paper dimensions are set before initial render, preventing flash of wrong page size
- Removed redundant `bridge.applyPaperSettings()` call after mount

### `canvas-editor-bridge.ts` mount signature

- Added optional `paperSettings` parameter to `mount()` — applies paper size, direction, and margins immediately after Editor instantiation

## Tests

- All 24 word-editor E2E tests pass
- Manual verification: multi-page documents scroll correctly within canvas area, header/toolbar remain fixed

## Affected Files

- `packages/word-editor-renderers/src/WordEditorPage.tsx` — layout restructure with scroll containment
- `packages/word-editor-renderers/src/EditorCanvas.tsx` — paper settings passed to mount
- `packages/word-editor-core/src/canvas-editor-bridge.ts` — mount accepts optional paperSettings

## Notes For Future Refactors

1. **The word editor uses a "fixed chrome + scrollable content" pattern.** Any new top-level elements (e.g., status bar, floating panels) must respect the `overflow-hidden` root and use `shrink-0` if they should never compress.

2. **Canvas-editor manages its own scrolling.** The `<section>` wrapper should remain `overflow-hidden` — adding `overflow-auto` creates double scrollbars (browser + canvas-editor internal).

3. **Paper settings must be applied during mount, not after.** Calling `applyPaperSettings()` after `mount()` causes a flash where the canvas renders with default dimensions before resizing.

4. **Side panel scroll independence** — If a new panel is added, decide whether it should scroll independently (`overflow-y-auto`) or share the canvas scroll context. The current design keeps panels independent.
