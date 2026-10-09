# 100 Tree Handle Double-Translate Centering Fix

## Problem

In the taskflow designer's Tree tab, the blue circular "+" button on every chain connector appeared offset to the right — its center was not on the vertical connector line (the line hugged the circle's left edge). Reported by the user after the plan-557 tree card redesign ("+ 号的位置总是偏右，为什么不是中心处于线的上方").

## Diagnostic Method

- Hard part #1: the + button itself was NOT wrong — it is centered on its card (layout offsetLeft 100 = 50% of the 200px card, by design). The thing that was wrong was the LINE.
- Hard part #2: the connector line is an xyflow edge whose position is computed from handle bounds, so the offset lived in the HANDLE position — but the handle's own offsetLeft (100) also looked "centered" until transforms were accounted for.
- The CSS stack combines THREE translation sources (xyflow base `transform`, Tailwind `translate` property, inline overrides) at canvas zoom ≠ 1, which defeats naive pixel algebra; resolved empirically by toggling one channel at a time in the live DOM:
  - `handle.style.transform = 'none'` → handle center jumped exactly to the card center (457.9 visual).
  - `handle.style.translate = 'none'` → no movement (inline style loses to the `!`-important class).
  - restored → back to 454 (6px layout left of card center).
- Final arithmetic closed the case: handle center = left(100) + translate(-6) + width/2(+6) should equal 100, but the measured center was 94 — the extra -6 came from the second (Tailwind `translate`) channel stacking on top of the xyflow `transform` channel.

## Root Cause

- The tree-mode handles in `render-ports.tsx` carried BOTH centering mechanisms: xyflow's base handle CSS `transform: translate(-50%, 6px)` AND the Tailwind class `!-translate-x-1/2` (independent CSS `translate: -50%` property). The two channels stack: total shift -12px on a 12px handle → handle center landed 6px left of the card center.
- Chain edge lines connect handle centers, so every chain line ran 6px left of the card center, while the + button centered on the card — perceived as "+ 偏右".
- The same double-shift existed in the dingtalk-workflow-tree reference (same renderer/classes) — it was merely less visible there because of the larger cards.

## Fix

- Removed the redundant Tailwind translate classes (`!-translate-x-1/2`, `!-translate-y-1/2`) from the tree handle set in `render-ports.tsx` (both TB and LR directions). The xyflow base centering alone places the handle center exactly on the card center; the edge lines follow.

## Tests

- `tests/e2e/taskflow-designer-ui.spec.ts` — "Tree chain + button is concentric with the connector line": extracts every vertical edge segment (mapped from path-local to screen coordinates via the path bbox→rect scale) and asserts every + button center sits ≤2 screen px on a connector segment AND on a card center, and every segment runs through a card center. Verified discriminative: re-introducing the double-translate turns it red ("+ at 457.9 must sit on a connector segment"), removing it turns it green.
- Sampling note: edges re-mount on container resizes, so the readout self-polls (yielding between samples) until a settled frame with ≥3 vertical segments.

## Affected Files

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx`
- `tests/e2e/taskflow-designer-ui.spec.ts`

## Notes For Future Refactors

- Never add Tailwind translate utilities (`-translate-x-*`/`-translate-y-*`) to designer handles — the xyflow base handle CSS already centers via its own `transform`; the CSS `translate` property composes with `transform` and double-shifts.
- The card width and the xyflow node wrapper width must stay in sync: the wrapper's inline width comes from xyflow's node measurement, so any card `min-width` change (plan 557: 130/140 → 200/220) must be paired with `tree.layoutSize`/`appearance` updates or the card overflows the wrapper and handle/line anchoring drifts again.
