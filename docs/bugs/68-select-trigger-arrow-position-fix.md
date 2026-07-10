# 68 Select Trigger Arrow Position Fix

## Problem

- The select component's dropdown arrow icon appeared on the left side instead of the right side
- The trigger area did not properly distribute space between the value text and the arrow icon
- Clicking the select showed "no results found" even when options were available

## Diagnostic Method

- Compared the current implementation with amis-react19's select component
- Investigated the `ComboboxTrigger` component in `packages/ui/src/components/ui/combobox.tsx`
- Found that `ComboboxPrimitive.Trigger` from `@base-ui/react` does not have flex layout by default
- The `justify-between` className was passed but had no effect without a flex parent

## Root Cause

- The `ComboboxPrimitive.Trigger` component renders as an inline element without flex layout
- The ChevronDownIcon was placed after children in the JSX but appeared on the left because the trigger lacked `flex items-center justify-between` styles
- amis-react19 uses a different approach with `ResultBox` component that has explicit flex layout and arrow positioning

## Fix

- Added `flex items-center justify-between gap-1.5` to the base className of `ComboboxTrigger`
- Added `shrink-0` to the ChevronDownIcon to prevent it from shrinking

## Tests

- Existing select tests pass (`packages/flux-renderers-form/src/__tests__/select-responsive.test.tsx`)
- Manual verification in playground

## Affected Files

- `packages/ui/src/components/ui/combobox.tsx`

## Notes For Future Refactors

- The `@base-ui/react` Combobox primitive may update its default styles in future versions
- If the trigger layout breaks again, check the base-ui documentation for styling changes
