# 10 Flow Designer Expression Parsing and Selection Loop Fixes

## Problem

- Flow Designer page crashed with `Unexpected token } in 1:21` when rendering templates containing ternary expressions like `${isDirty ? "warning" : "success"}`
- Clicking nodes triggered `Maximum update depth exceeded` infinite loop error
- Clicking nodes also triggered `Cannot read properties of undefined (reading 'stopPropagation')` error

## Root Cause

### Expression Parsing

1. `parseTemplateSegments` used regex `/\$\{([^}]+)\}/g` which stopped at first `}`, breaking on nested braces in ternary expressions
2. `compileNode` used regex `/^\$\{[\s\S]+\}$/` to detect pure expressions, but it incorrectly matched templates like `${a} and ${b}` (stops at first `}`)
3. `toEvalContext` didn't handle `ScopeRef` type, treating it as plain object and breaking variable resolution

### Selection Loop

1. xyflow's `onSelectionChange` fires frequently, including during initial render
2. `handleSelectionChange` called `props.onNodeSelect()` every time, even when selection hadn't changed
3. This triggered state update → re-render → `onSelectionChange` → infinite loop

### Event Parameter

1. xyflow callbacks pass `undefined` for event when triggered programmatically (e.g., `onSelectionChange`)
2. `designer-canvas.tsx` callbacks required `event: React.MouseEvent` and called `event.stopPropagation()` directly

## Fix

### Expression Parsing

- Rewrote `parseTemplateSegments` with brace-depth tracking to correctly find matching `}` for each `${`
- Added `isPureExpression()` function with proper depth tracking to distinguish `${expr}` from `${a} text ${b}`
- Added `isScopeRef` type guard and updated `toEvalContext` to handle `ScopeRef` correctly

### Selection Loop

- Added `lastSelectionRef` to track last triggered selection
- `handleSelectionChange` now only triggers callbacks when selection actually changes

### Event Parameter

- Changed all callback signatures to use `event?: React.MouseEvent`
- Changed all `event.stopPropagation()` to `event?.stopPropagation()`

## Tests

- `packages/flux-formula/src/index.test.ts` - ternary expressions in templates, pure expression detection
- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` - selection change handling
- `apps/playground/src/pages/FlowDesignerPage.test.tsx` - page renders without crashing

## Affected Files

- `packages/flux-formula/src/index.ts`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
- `packages/flow-designer-renderers/src/styles.css`
- `apps/playground/src/styles.css`

## Notes For Future Refactors

- **Template expression parsing**: Any regex-based approach to parse `${...}` will fail on nested braces. Always use brace-depth tracking.
- **xyflow callbacks**: Event parameter may be `undefined` when triggered programmatically. Always make it optional.
- **Selection state tracking**: When integrating external libraries with React state, always track "last seen" state to prevent feedback loops.
- **ScopeRef vs plain object**: `toEvalContext` must handle both `ScopeRef` (from Zustand stores) and plain objects (from tests/simple usage).
