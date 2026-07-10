# 67 Input Number Native Spin Buttons Fix

## Problem

- The input-number component displayed both native browser spin buttons (up/down arrows) and custom stepper buttons
- This created a confusing UI with duplicate controls

## Diagnostic Method

- Compared with amis-react19's approach which uses `rc-input-number` component
- Investigated the current implementation which uses `<Input type="number">`
- Found that native browser spin buttons are always shown for `type="number"` inputs

## Root Cause

- The HTML `<input type="number">` element natively displays spin buttons in most browsers
- amis-react19 uses `rc-input-number` which internally handles hiding native spin buttons
- Our implementation uses a plain `<Input type="number">` with custom stepper buttons

## Fix

- Added CSS rules to `packages/ui/src/styles/base.css` to hide native browser spin buttons:
  - `input[type="number"]::-webkit-outer-spin-button` and `::-webkit-inner-spin-button` set to `display: none` for WebKit browsers
  - `input[type="number"] { -moz-appearance: textfield; }` for Firefox

## Tests

- Existing input-number tests pass
- Manual verification in playground

## Affected Files

- `packages/ui/src/styles/base.css`

## Notes For Future Refactors

- If the project moves to a dedicated number input component (like `rc-input-number`), this CSS may become redundant
- The CSS approach is a standard solution used by many UI libraries
