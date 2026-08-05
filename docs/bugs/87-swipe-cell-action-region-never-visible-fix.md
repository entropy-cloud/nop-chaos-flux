# 87 Swipe-cell Action Region Never Visible in Real Browser (stale translateX(-100%))

## Problem

- `swipe-cell`'s revealed action regions were **never visible in a real browser**. The left region was positioned with a static `transform: translateX(-100%)` and the right region with `translateX(100%)`, anchored at the row's left/right edge. With the row's `overflow: hidden` clip box, the regions sat permanently OUTSIDE the clip (left region at `[rowLeft - width, rowLeft]`, right region at `[rowRight, rowRight + width]`).
- When the cell committed open, only the content pane translated (`translateX(+leftWidth)` / `-rightWidth`), opening an empty gap at the row edge — the action buttons stayed clipped off-screen and unreachable by pointer (elementFromPoint hit the stage/dialog body instead of the button).
- Consequences: `onAction` could only fire via synthetic events (tests); real user taps landed on the empty gap; the core swipe-to-act interaction was broken in every real browser.
- Found by the C7 Phase 3 host scenario `host-sw-action` (bug 73 pattern check — "unit green but real browser wrong"): unit tests asserted the content offset (`effectiveOffset` clamp, MA-09/OA-02, MM-05) and the `inert` gating, but never the region's SCREEN position inside the clip.

## Diagnostic Method

- Real-browser geometry probe: measured the left region's `getBoundingClientRect()` while open-left — the button sat at `x = rowLeft - buttonWidth` (outside the row), and `document.elementFromPoint(buttonCenter)` returned the stage background, not the button. Trusted pointerdown therefore landed outside the cell (triggering `closeOnOutside`), and the trusted click target was the stage — the native capture click listener never saw the button.

## Root Cause

- The region transforms were hardcoded to the "hidden" position (`-100%`/`+100%`) in every state; there was no transition to `translateX(0%)` when the matching side committed open. The content pane's offset logic was correct; the region reveal logic was missing.

## Fix

- `packages/flux-renderers-mobile/src/swipe-cell.tsx` (NEW-C7-02): the region transform now follows the committed open state —
  - left region: `translateX(0%)` when `open-state === 'open-left'`, else `translateX(-100%)`;
  - right region: `translateX(0%)` when `open-state === 'open-right'`, else `translateX(100%)`;
  - both regions get the same `transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` transition as the content pane (only when not actively dragging), so the reveal animates in sync with the rebound.

## Tests

- `swipe-cell.test.tsx` — 2 new cases, test-first (fail against the pre-fix code):
  1. `lands the revealed region inside the row clip when open (NEW-C7-02)` — closed: left `-100%`/right `+100%`; open-left: left `translateX(0%)`, right still `+100%`.
  2. `lands the right region inside the row clip when open-right (NEW-C7-02)` — open-right: right `translateX(0%)`, left still `-100%`.
- Real-browser proof: `tests/e2e/component-lab/c7-host-surfaces.spec.ts` `host-sw-action` — CDP touch swipe reveals the left region, a REAL trusted click on the action button dispatches `onAction` with `${side}|${$slot.index}` → `open-left|0` resolved (evaluationBindings + row-scope proof), and the cell auto-rebounds to closed.
- Full mobile package suite 168 → 170 green; c7 host spec 6/6; mobile/m5/m2 e2e green.

## Affected Files

- `packages/flux-renderers-mobile/src/swipe-cell.tsx`
- `packages/flux-renderers-mobile/src/swipe-cell.test.tsx`
- `apps/playground/src/component-lab/renderers/data-c7-host.ts` (host scenario)
- `tests/e2e/component-lab/c7-host-surfaces.spec.ts`

## Notes For Future Refactors

- For transform-revealed regions, the REGION's screen position inside the clip must be asserted, not only the content's offset — the content offset alone cannot prove the region is reachable.
- Host scenarios with CDP `Input.dispatchTouchEvent` (trusted touch) are the reliable way to exercise touch-only components in Playwright; JS-synthetic `TouchEvent` dispatch and `page.mouse`-as-touch both proved unreliable in this app (React delegation did not process them).
