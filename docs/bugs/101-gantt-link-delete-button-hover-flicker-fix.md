# 101 Gantt Link Delete Button Hover Flicker Fix

## Problem

In the gantt chart, hovering a connector line makes the red X (delete link) button appear at the link midpoint — but the button flickers rapidly (mount/unmount oscillation, ~15 cycles per second) whenever the pointer rests on or near where the X spawns, making it nearly impossible to click. Reported by the user ("鼠标放到 gantt 图上的连线上的 x 按钮上，会反复闪烁").

## Diagnostic Method

- The flicker mechanism was visible directly in `gantt-links.tsx`: the X renders conditionally (`{isHovered && <foreignObject>…}`) at the link midpoint, which sits INSIDE the wide (strokeWidth 10, pointerEvents: all) invisible hit polyline. Pointer over the X → hit polyline `mouseleave` → `setHoveredLink(null)` → X unmounts → pointer now over the polyline again → `mouseenter` → X remounts → loop.
- Live confirmation (Playwright): parking the pointer at the link midpoint and sampling the button via a MutationObserver-style probe counted 15 mounts / 15 unmounts within one second.
- A wrong hypothesis was rejected first: the + button centering fix (docs/bugs/100) touched the same renderer but is unrelated (that fix is pure CSS on tree-mode handles; this is the scheduling gantt's link layer).

## Root Cause

- The hover-clearing handler (`onMouseLeave → setHoveredLink(null)`) lived on the hit polyline itself. The conditionally-rendered X overlaps the polyline at the midpoint, so moving the pointer onto the X fired the polyline's mouseleave and unmounted the X under the pointer — the textbook hover-oscillation for conditionally-rendered hover affordances.

## Fix

- Moved the hover enter/leave handling up to the link's `<g>` group (`gantt-links.tsx`): entering the polyline sets the hovered id; the clear handler fires only on the group's mouseleave. Moving between the polyline and the X (both children of the group) no longer clears the state, so the X stays mounted and clickable while the pointer rests on it; leaving the link area entirely still dismisses it.
- Also removed the click/Enter handler's hover toggle (`setHoveredLink(id === hoveredLink ? null : id)`) — with group-level enter/leave owning the state, the pointer-driven hover made the click-time toggle a no-op fight.

## Tests

- `tests/e2e/gantt-bars-and-links.spec.ts` — "link delete button is stable when hovering the link midpoint (no flicker)": scrolls/hovers until a link hover engages, moves onto the X, and samples mount/unmount for ~1s. Verified discriminative — pre-fix tree: `X flickered: {"mounts":15,"unmounts":15,"presentAtEnd":false}` (red); post-fix: mounts 1, unmounts 0, present at end (green).

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx`
- `tests/e2e/gantt-bars-and-links.spec.ts`

## Notes For Future Refactors

- Any hover affordance rendered conditionally inside its own trigger's hover area must scope the leave-clearing to a common ancestor (the `<g>` group here), never to the trigger element — otherwise the affordance steals the pointer and oscillates.
- The link hit polyline intentionally lets pointerdown fall through to task bars (elementFromPoint re-dispatch); keep that behavior when touching the hit area.
