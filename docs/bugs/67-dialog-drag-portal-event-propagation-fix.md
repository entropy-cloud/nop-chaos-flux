# 67 Dialog Drag Portal Event Propagation Fix

## Problem

When a picker dialog opens from inside a host dialog (e.g. CRUD edit dialog → click department picker), attempting to drag the picker dialog by its header actually drags the host dialog underneath.

Reproduced in the crud-demo playground: open the user edit dialog, click the department picker field, try to drag the picker popup by its header.

## Diagnostic Method

- Initial hypothesis: `@base-ui/react/dialog` `modal={true}` applies `inert` on siblings, causing focus/pointer conflicts between stacked dialogs. Mitigated by setting `modal={false}` on non-topmost surface dialogs (`dialog-host.tsx`), but the drag issue persisted.
- Next hypothesis: `closest('[data-slot="dialog-header"]')` in `useDialogDrag` was matching the wrong dialog's header. This was plausible because both dialogs have the same `data-slot` attribute. But `closest` walks the DOM tree from the event target upward, and both dialogs are portaled to `<body>` as separate DOM subtrees — so each dialog's `closest` correctly finds only its own header.
- Root cause found by tracing React 19 event propagation through portal boundaries. The picker dialog is rendered inside the host dialog's React component tree (both use `<DialogPortal>`), even though both portal to `<body>`. React's event system propagates events through the **React component tree**, not the DOM tree. A `pointerdown` on the picker dialog's popup bubbles through: picker → DialogContent → ... → host dialog's DialogContext → host dialog's DialogPrimitive.Root.
- The host dialog's `DialogPrimitive.Popup` has `onPointerDown={handlePointerDown}`, which IS on the React event path. When the handler fires: `target.closest('[data-slot="dialog-header"]')` walks the DOM and finds the picker's header (truthy). Then `el.setPointerCapture(e.pointerId)` on the **host** dialog's popup element steals the pointer capture from the picker dialog. Subsequent `pointermove` events go to the host dialog, making it drag instead of the picker.
- Confirmed by adding `console.log(el === e.currentTarget)` in the handler — `el` (internalRef.current) was the host popup while `e.currentTarget` was also the host popup (the handler is attached there), but `e.target` was deep inside the picker's portal content, confirming `el.contains(e.target)` is false.

## Root Cause

- React 19's event system propagates events through the React component tree for portaled content. A child dialog's pointer events reach the parent dialog's React event handlers.
- `useDialogDrag`'s `handlePointerDown` lacked a containment check, so it would act on events whose target was outside the dialog's own DOM subtree.
- `setPointerCapture` on one dialog's popup replaces any prior capture on the same pointer ID, so the parent dialog can steal capture from a child dialog.

## Fix

- Added `el.contains(e.target as Node)` guard at the start of `useDialogDrag`'s `handlePointerDown` callback (`packages/ui/src/components/ui/use-dialog-drag.ts:162`). If the event target is not within the dialog's own popup DOM element, the drag is not initiated.
- This prevents any dialog from responding to pointer events that originated from a child portal dialog, matching the behavior amis-react19 achieves by keeping all dialogs as flat React tree siblings.

## Tests

No tests added. The fix is a defensive guard in the drag handler; the scenario requires a mounted DOM interaction with two portal-nested dialogs, which is difficult to unit-test. Manual verification in the playground confirmed the picker dialog is now draggable and does not drag the host dialog.

## Affected Files

- `packages/ui/src/components/ui/use-dialog-drag.ts` — added `el.contains(e.target)` guard in `handlePointerDown`

## Notes For Future Refactors

- Any new feature that renders a portaled component (dialog, popover, tooltip) inside an existing dialog will face the same React event propagation issue. The `contains` guard pattern should be applied to any custom pointer/touch event handler on the parent dialog that checks attributes via `closest()`.
- If the project ever migrates dialogs to a flat React tree structure (similar to amis-react19's approach), this guard can be removed.
