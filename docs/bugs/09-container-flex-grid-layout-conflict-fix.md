# 09 Container Flex/Grid Layout Conflict Fix

## Problem

- Validation Lab section in AmisBasicPage displayed two cards vertically instead of horizontally
- Cards "Key-value child cells" and "Array child items" should be side-by-side in a 2-column grid
- CSS class `na-demo-grid` with `display: grid` was not taking effect

## Root Cause

- `ContainerRenderer` always created an internal flex div, regardless of whether flex properties were needed
- CSS rule `.na-container { display: grid }` applied to outer div
- CSS rule `.na-demo-grid { display: grid }` also applied to outer div
- But the internal flex div (`flex flex-row`) contained the actual content, overriding grid behavior
- Result: grid layout on outer div had no visible effect because content was inside the flex div

## Fix

- Modified `ContainerRenderer` to conditionally create the internal flex div
- Only create flex div when `wrap`, `gap`, `align`, or non-`row` direction is specified
- Otherwise render body content directly, allowing CSS class to control layout

## Tests

- Manual verification in playground: Validation Lab now shows two cards side-by-side

## Affected Files

- `packages/flux-renderers-basic/src/index.tsx` - ContainerRenderer conditional flex div

## Notes For Future Refactors

- Container layout has two modes: CSS-driven (via className) and props-driven (via wrap/gap/align/direction)
- When using CSS classes like `na-demo-grid`, do not also specify wrap/gap props to avoid conflicts
- The `na-container` base class sets `display: grid` - this is the default, but can be overridden by specific classes
