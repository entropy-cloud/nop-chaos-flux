# 16 Dialog Drag Pointer Capture & Boundary Clamp Fix

## Problem

- JSON preview dialog drag became "stuck" after a few drag operations — the dialog would follow the cursor even after releasing the mouse button
- Dialog could not be dragged past a certain point toward the left edge of the screen (roughly at the right side of the JSON button)
- After several drag interactions, the dialog would jump or stop responding to drag input entirely

## Diagnostic Method

- **Diagnosis difficulty: high.** Two independent bugs with overlapping symptoms made it hard to isolate causes.

### Bug 1: Stuck drag (pointer capture)

- Added `console.log` to `stopDrag` — it was never called when the drag became stuck
- Tested with slow vs fast drags: fast drags caused the pointer to leave the dialog element before `pointerup` fired
- Without pointer capture, `pointermove` and `pointerup` events only fire on the element while the pointer is over it
- Confirmed via `addEventListener` inspection that `pointermove`/`pointerup` were attached to the dialog element, not `document`

### Bug 2: Left boundary too restrictive (offset-based clamping)

- Original clamp logic: `Math.max(-(rect.width - 30), Math.min(vw - 30, offset))` — this uses raw offset values
- This formula is correct for centered dialogs (`translate(-50%, -50%)`) where offset is relative to center
- The JSON dialog uses `noCenter` mode (positioned at `top: 12px; right: 12px`), where `baseTransform` is empty string `""`
- With empty `baseTransform`, offset is relative to the top-left corner of the positioned element, but the clamp formula assumed center-relative offsets
- Logged actual `rect.left` during drag: the dialog's left edge was already at ~800px (near the right side), so clamping `offset.x` to `-(rect.width - 30)` didn't prevent it from going off-screen to the right, while the `vw - 30` upper bound was far too generous for the left direction

## Root Cause

### Bug 1: Missing pointer capture

- `pointermove` and `pointerup` listeners were attached to the dialog element via `addEventListener`
- Without `setPointerCapture`, fast pointer movement causes the pointer to leave the element
- When the pointer leaves, `pointermove` stops firing, and `pointerup` never fires on the element
- `dragStateRef.current` stays non-null, so the next `pointerdown` finds a stale drag state

### Bug 2: Offset-based boundary clamp wrong for non-centered dialogs

- Original clamp used raw offset values compared against viewport dimensions
- This only works when `baseTransform` centers the dialog (`translate(-50%, -50%)`) and offset is relative to center
- For non-centered dialogs (e.g., `top: 12px; right: 12px` with empty `baseTransform`), the relationship between offset and screen position is different
- The clamp prevented the dialog from moving far enough left because it treated the offset as center-relative

## Fix

### Bug 1: Add pointer capture

- Call `el.setPointerCapture(e.pointerId)` in `handlePointerDown`
- Add `lostpointercapture` listener alongside `pointermove`/`pointerup`/`pointercancel` — fires when capture is lost for any reason
- Call `el.releasePointerCapture(e.pointerId)` in `stopDrag` (wrapped in try/catch since the pointer may already be released)
- Pointer capture ensures all pointer events are directed to the captured element regardless of pointer position

### Bug 2: Position-based boundary clamp

- Apply the raw transform first (`el.style.transform = ...`), then read `el.getBoundingClientRect()` for the actual screen position
- Compare actual screen coordinates (`rect.left`, `rect.right`, `rect.top`, `rect.bottom`) against viewport bounds
- Reverse-calculate the clamped offset from the desired position adjustment
- This works regardless of `baseTransform` because it operates on screen coordinates, not offset values

## Tests

- No new automated test — drag behavior is difficult to unit test reliably. Manual verification confirmed both fixes.
- E2E test `tests/e2e/flow-designer-ui.spec.ts` covers dialog open/close but not drag behavior.

## Affected Files

- `packages/ui/src/components/ui/use-dialog-drag.ts` — pointer capture + position-based clamp
- `packages/ui/src/components/ui/dialog.tsx` — `baseTransform` defaults, `noCenter` handling

## Notes For Future Refactors

1. **Always use `setPointerCapture` for drag implementations.** Without it, any drag that moves the pointer outside the target element will break. This is a web platform best practice, not a workaround.
2. **Boundary clamping must be based on actual screen position (`getBoundingClientRect`), not offset values.** Offset-to-screen mapping depends on `baseTransform`, CSS positioning, and other factors that vary per use case.
3. **`baseTransform` defaults matter.** The empty string `""` (not `"none"`) is the correct neutral base for non-centered dialogs. `transform: "none translate(...)"` is invalid CSS — `none` cannot be combined with `translate()`.
4. **`lostpointercapture` is essential cleanup.** Browser may release capture for reasons outside your control (e.g., element removed from DOM, pointer disconnect). Without this listener, the drag state leaks.
