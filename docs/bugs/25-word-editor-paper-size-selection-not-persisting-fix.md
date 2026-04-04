# 25 Word Editor Paper Size Selection Not Persisting in UI

## Problem

- After selecting a different paper size (e.g., A3) from the toolbar dropdown, the dropdown immediately reverted to showing "A4"
- The canvas-editor correctly applied the new paper size (visual change was visible), but the UI state was out of sync
- Orientation toggle also did not update the tooltip text to reflect the new direction

## Diagnostic Method

- **Diagnosis difficulty: low.** The `NativeSelect` in `PageControls.tsx` had a hardcoded `value="a4"` — no store subscription was used to determine the current paper size
- `handlePaperSize()` called `bridge.command.executePaperSize()` but did not update the Zustand store
- `handleOrientation()` similarly called the bridge command without syncing to the store
- The store already had `paperSettings` state and a `setPaperSettings()` method, but neither handler used them

## Root Cause

- `PageControls` read `paperSettings` from the store via `useSyncExternalStoreWithSelector` but never used it for the paper size dropdown value
- The dropdown `value` was hardcoded to `"a4"` instead of being derived from `paperSettings.width/height`
- Paper size and orientation changes were applied to canvas-editor but not reflected back to the store, creating a one-way data flow break

## Fix

- Added `paperSizeKey` computed value: reverse-matches `paperSettings.width` and `paperSettings.height` against `PAPER_SIZE_PRESETS` to find the current preset key (defaults to `'a4'`)
- Changed `NativeSelect value` from `"a4"` to `{paperSizeKey}`
- Updated `handlePaperSize()` to call `store.setPaperSettings()` after the bridge command
- Updated `handleOrientation()` to call `store.setPaperSettings()` after the bridge command

## Tests

- All 24 word-editor E2E tests pass (no regression)
- Manual verification: selecting A3, A5, B4, B5 all correctly persist in the dropdown

## Affected Files

- `packages/word-editor-renderers/src/toolbar/PageControls.tsx` — added `paperSizeKey` computation, synced store on paper size/orientation change

## Notes For Future Refactors

1. **All toolbar controls that mutate editor state must sync back to the store.** The store is the single source of truth for UI state. Bridge commands affect the canvas but do not automatically update the store.

2. **Reverse-matching preset keys from raw values** — When a dropdown displays preset names (A4, A3, etc.) but the store holds raw dimensions (595×842), derive the display key by matching against the preset registry. This avoids duplicating the mapping logic.

3. **If paper settings gain new dimensions** (e.g., custom sizes not in presets), the `paperSizeKey` fallback to `'a4'` will show an incorrect value. Consider adding a `'custom'` option or storing the key directly in the store alongside raw dimensions.
