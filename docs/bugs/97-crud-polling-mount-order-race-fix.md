# 97 CRUD Polling Mount-Order Race Fix

## Problem

A CRUD using `polling` could stall permanently when its `data-source` was
registered **after** the polling hook mounted (e.g. async schema resolution,
late host wiring). The polling loop silently stopped issuing requests and
never recovered — no error, no retry.

## Diagnostic Method

- Hard part: the race only triggers with a specific mount order, so normal
  test setups (data source present at mount) never reproduce it.
- Started from `use-crud-polling.ts` and looked for any assumption that the
  source exists when the hook first runs.
- Rejected "polling timer is broken" — the timer code was correct once the
  source existed; the gap was the missing transition _into_ the polled state
  after a late source registration.
- Decisive evidence: with the source absent at mount, the hook's initial
  scheduling path bailed out and no later notification re-entered it.

## Root Cause

- `use-crud-polling.ts` assumed the data source was present at mount time. If
  registration happened later (after the mount-order race), the polling loop
  never started and there was no recovery path.

## Fix

- Added a 250 ms retry timer (`use-crud-polling.ts:88,121-142`) that
  re-checks for the data source and (re)enters the polling schedule until the
  source is available — the polling state machine can now transition in
  after a late registration.

## Tests

- `packages/flux-renderers-data/src/__tests__/crud-lifecycle.test.tsx:337`
  (test-first, red before the fix): late data-source registration after
  polling mount — asserts polling starts and keeps running.

## Affected Files

- `packages/flux-renderers-data/src/use-crud-polling.ts`

## Notes For Future Refactors

- Mount-order assumptions are a recurring source of timing defects: any hook
  that needs a runtime dependency must handle the dependency arriving after
  mount (retry/transition), not just at mount.
- Keep the retry bounded (250 ms) so a permanently-missing source does not
  become a hot loop.
