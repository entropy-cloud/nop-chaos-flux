# 48 Tabs Form Panel Unmount Reset Fix

## Problem

- In `/#/lab/tabs`, the `Tabs with forms` scenario lost typed input after switching to another tab and back.
- The visible symptom looked like form state corruption, but only happened when the form lived inside an inactive tab panel.

## Diagnostic Method

- Checked existing `tabs` and `form` tests first and found coverage for active-tab switching, but no regression test for tab-contained form draft retention.
- Re-read the `tabs` design and form validation docs to confirm the intended model: tabs change visibility, but should not own or reset form values.
- Inspected the live `TabsRenderer` and shared `@nop-chaos/ui` tabs primitive to find where inactive panels are mounted.
- Confirmed the decisive evidence in Base UI typings: `TabsPanel` defaults `keepMounted` to `false`, so switching tabs unmounted the inactive panel and recreated the nested form runtime on return.

## Root Cause

- `packages/ui/src/components/ui/tabs.tsx` wrapped Base UI `TabsPrimitive.Panel` without opting into `keepMounted`.
- Because the inactive panel was removed from the DOM, any form renderer inside that panel unmounted and rebuilt with fresh local state when the tab became active again.

## Fix

- Updated the shared `TabsContent` primitive in `packages/ui/src/components/ui/tabs.tsx` to pass `keepMounted` by default.
- Added a cross-renderer regression test that renders `tabs` from `flux-renderers-basic` with nested `form` and `input-text` from `flux-renderers-form`, types into one tab, switches away, then verifies the original value is still present after switching back.
- Updated the tabs component design note to state the current live baseline: inactive tab panels stay mounted so nested owner runtimes such as forms keep their local draft state.

## Tests

- `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx` - verifies tab switches do not wipe nested form field values.

## Affected Files

- `packages/ui/src/components/ui/tabs.tsx`
- `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx`
- `docs/components/tabs/design.md`

## Notes For Future Refactors

- If tabs ever introduce configurable lazy mounting, the contract must distinguish performance-oriented deferred initial mount from destructive unmount-on-hide behavior.
- Do not move this responsibility into form runtime workarounds; the visibility container should preserve nested owner lifetime unless the schema explicitly asks otherwise.
