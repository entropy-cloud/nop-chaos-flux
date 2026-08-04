# 82 Cards Item Keyboard Activation Double-Dispatch Fix

## Problem

- Pressing **Enter or Space** on a focused cards item (interactive mode — `selectionMode` set or `onItemClick` bound) dispatched the item action **twice** (`cards-renderer.tsx`).
- The card item is rendered via the `@nop-chaos/ui` `Card` primitive, which already implements keyboard activation: when an `onClick` handler is present it sets `role="button"`/`tabIndex={0}` and its `onKeyDown` wrapper maps Enter/Space → `event.currentTarget.click()` → the renderer's `onClick` (see `packages/ui/src/components/ui/card.tsx:23-36`).
- The renderer ALSO attached its own `onKeyDown` (`handleKeyDown`) that handled Enter/Space independently → per key press: `handleClick` fired once (from the synthesized click) AND `handleKeyDown` fired once → `onSelect` ×2 + `onItemClick` ×2.
- Selection side-effects were masked by React event batching (both `onSelect` calls computed from the same `prev` snapshot, so single-mode net-selected), but the **action dispatch was genuinely duplicated** — any `onItemClick` action with side effects (`setValue`, remote calls) executed twice.

## Diagnostic Method

- C6.2 component audit, dimension 7 (事件与 action 契约) + dimension 8 (a11y 键盘完整路径) + dimension 12 (组合宿主) — checklist: "键盘完整操作路径（非仅 tab 序）".
- Traced the keyboard path: ui Card's `onKeyDown` wrapper (click synthesis) + renderer's own `handleKeyDown` both handling Enter/Space.
- All existing unit tests drove interaction exclusively via `fireEvent.click` — the keyboard path had zero coverage (false-green blind spot, dimension 16).

## Root Cause

- `cards-renderer.tsx` `CardItemView` duplicated the Enter/Space keyboard activation that the ui `Card` primitive already provides; the two handlers stacked on the same key event.

## Fix

- Removed the renderer's own `handleKeyDown`/`onKeyDown` from `CardItemView` — keyboard activation is delegated to the ui `Card` primitive's single path (keydown → `click()` → `handleClick`), which fires `onSelect` + `onItemClick` exactly once.
- No DOM/contract changes: `data-slot="cards-item"`, `data-selected`, `aria-selected`, `tabIndex`, click behavior unchanged.

## Tests

- `packages/flux-renderers-content/src/cards-keyboard.test.tsx` — 4 cases, test-first (2 failed against the old implementation with `capture-count` proving the double dispatch "Expected 1, Received 2"):
  1. Enter on a single-mode card selects it (single toggle, stays selected).
  2. Enter dispatches `onItemClick` exactly once.
  3. Space on a multiple-mode card selects it and dispatches exactly once.
  4. Enter on an already-selected single-mode card deselects it (single toggle off).
- Full package suite 248 → 252 green; `typecheck/build/lint` green.

## Affected Files

- `packages/flux-renderers-content/src/cards-renderer.tsx`
- `packages/flux-renderers-content/src/cards-keyboard.test.tsx` (new)

## Notes For Future Refactors

- The ui `Card` primitive is interactive-capable: consumers must NOT re-implement Enter/Space handling on top of `onClick` — the primitive already synthesizes clicks from keyboard input when `onClick` is present.
- Keyboard interaction paths need dedicated test coverage (`fireEvent.keyDown`), not just `fireEvent.click` — click-only coverage missed a duplicated-dispatch contract defect.
