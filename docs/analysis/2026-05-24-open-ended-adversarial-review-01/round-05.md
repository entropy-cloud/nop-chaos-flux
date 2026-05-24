# Open-Ended Adversarial Review — 2026-05-24 — Round 05

**Execution date**: 2026-05-24
**Result directory**: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/`
**Exploration areas**: `word-editor-renderers`, selection projection fidelity, toolbar active-state truthfulness
**Discovery source**: final fresh-pass validation after excluding all earlier report/designer/action-engine findings

---

## Finding 1: Word Editor live selection projection drops `superscript` and `subscript`, so host scope and toolbar state lie about current formatting

- **Where**:
  - `types/hufe921__canvas-editor.d.ts:61-79`
  - `packages/word-editor-core/src/editor-store.ts:6-44,111-115`
  - `packages/word-editor-renderers/src/word-editor-manifest.ts:98-123`
  - `packages/word-editor-renderers/src/editor-canvas.tsx:103-123`
  - `packages/word-editor-renderers/src/toolbar/font-controls.tsx:119-129`
  - `docs/components/word-editor-page/design.md:114-131`
- **What**: the canvas-editor range-style payload type includes `superscript` and `subscript`, the editor store reserves those booleans in selection state, the public manifest publishes them, and the owner doc says `selection` is the live formatting snapshot. But `onRangeStyleChange` never copies `payload.superscript` or `payload.subscript` into the store. As a result, both fields stay at their default `false` even when the underlying selection is superscripted or subscripted.
- **Why it matters**: this breaks a live supported projection, not just an internal toolbar nicety. Any schema fragment or host consumer reading `selection.superscript` / `selection.subscript` receives stale falsehoods, and the built-in toolbar active state also renders the corresponding buttons as inactive when the current selection actually uses those formats. That is exactly the kind of “looks fine until you trust the public contract” drift that can hide in editor integrations.
- **Confidence**: Certain
- **Non-duplication note**: this does not overlap the earlier Report Designer, Flow Designer, Spreadsheet, or shared action-engine findings. It is a new live host-projection defect in Word Editor selection state.

## Round Assessment

This round found a simpler but still high-value pattern: **a public projection field is declared end to end, but one adapter copy step silently forgets to carry it across**. These omissions are dangerous because the public contract, runtime state type, and UI consumer all appear aligned until you inspect the one missing bridge.

Immediate improvement direction: include `superscript` and `subscript` in the `onRangeStyleChange` store update path, then add a regression test that verifies both host projection and toolbar active-state rendering for those formats.

## Blind-Spot Self-Assessment

This round only checked the Word Editor selection formatting bridge. I did not audit whether other range-style fields in the canvas-editor payload are similarly omitted, and I did not inspect whether save/export snapshots preserve superscript/subscript independently of the live selection projection. A final stop-check should look for one more genuinely different issue; otherwise this execution can end.
