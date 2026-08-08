# 96 Infinite Scroll Retry Skipping Current Page Fix

## Problem

In CRUD infinite-scroll mode, when a page load failed and the user hit
retry, the retry issued the **next** page instead of re-issuing the failed
one — data gaps appeared (failed page silently skipped) and the scroll
position no longer matched the loaded items.

## Diagnostic Method

- Hard part: retry lives on the UI path (`handleRetry`) while page advancing
  happens in the load pipeline; the bug is an interaction between the two.
- Read the retry handler first (`crud-renderer.tsx`) and traced what state it
  touched before re-dispatching the load.
- Hypothesis "retry just re-runs loadAction" rejected: the handler also
  advanced the page counter, which was only correct when the previous page
  had succeeded.
- Decisive evidence: `handleRetry` (`crud-renderer.tsx:347-357`) bumped the
  page index unconditionally, so a failed page was never retried as itself.

## Root Cause

- `handleRetry` bumped the page counter even when the previous load had
  failed. The retry therefore requested `page + 1`, skipping the failed page
  and desynchronizing data from the scroll position.
- Single shared retry path was used by both `loadAction`-driven and
  source-driven infinite scrolls, so the defect spanned both load modes.

## Fix

- `handleRetry` no longer bumps the page counter (`crud-renderer.tsx:347-357`,
  `onRetry` `:645`); retry re-issues the current (failed) page. Fixed page
  logic stays in the load pipeline where it belongs.

## Tests

- `packages/flux-renderers-data/src/__tests__/crud-loadaction-infinite.test.tsx:256`
  — `loadAction` mode retry re-issues current page.
- `packages/flux-renderers-data/src/__tests__/crud-infinite-scroll.test.tsx:194`
  — source-driven mode retry re-issues current page.
- Both test-first, red before the fix (retry advanced to next page).

## Affected Files

- `packages/flux-renderers-data/src/crud-renderer.tsx`

## Notes For Future Refactors

- Retry semantics must always be "re-issue the last failed unit", never
  "advance and issue" — page advancement must stay in the success path.
- Keep `handleRetry` behavior identical across `loadAction` and source load
  modes; they share one handler.
